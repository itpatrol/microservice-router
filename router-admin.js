/**
 * Github Status microservice
 */
'use strict';

const Cluster = require('@microservice-framework/microservice-cluster');
const Microservice = require('@microservice-framework/microservice');
const MongoClient = require('mongodb').MongoClient;
const debugF = require('debug');

var debug = {
  log: debugF('router:log'),
  debug: debugF('router:debug')
};

require('dotenv').config();


var MongoURL = '';
if (process.env.MONGO_URL) {
  MongoURL = MongoURL + process.env.MONGO_URL;
}

if (process.env.MONGO_PREFIX) {
  MongoURL = MongoURL + process.env.MONGO_PREFIX;
}

if (process.env.MONGO_OPTIONS) {
  MongoURL = MongoURL + process.env.MONGO_OPTIONS;
}


var mservice = new Microservice({
  mongoUrl: MongoURL,
  mongoTable: process.env.MONGO_TABLE,
  secureKey: process.env.SECURE_KEY,
  schema: process.env.SCHEMA
});

var mControlCluster = new Cluster({
  pid: process.env.PIDFILE,
  port: process.env.PORT,
  count: process.env.WORKERS,
  hostname: process.env.HOSTNAME,
  callbacks: {
    validate: mservice.validate,
    POST: adminPOST,
    GET: mservice.get,
    PUT: mservice.put,
    DELETE: mservice.delete,
    SEARCH: adminSearch
  }
});

if (mControlCluster.isMaster) {
  var interval = 6000;
  if (process.env.INTERVAL) {
    interval = process.env.INTERVAL;
  }
  setInterval(cleanRouteTable , interval);
}

/**
 * POST Handler.
 */
function adminPOST(jsonData, requestDetails, callback) {
  // Version 1.x compatibility.
  if (!jsonData.type) {
    jsonData.type = "handler"
  }
  if (jsonData.path === 'ws') {
    jsonData.type = "websocket"
  }
  if (!jsonData.online) {
    jsonData.online = true
  }
  mservice.post(jsonData, requestDetails, callback)
}

/**
 * SEARCH handler.
 */
function adminSearch(jsonData, requestDetails, callback) {
  // Version 1.x compatibility.
  if(jsonData.query) {
    if(!jsonData.query.handler) {
      jsonData.query.handler = { $eq: 'handler'}
    }
    if(!jsonData.query.online) {
      jsonData.query.online = true
    }
  } else {
    if(!jsonData.handler) {
      jsonData.handler = { $eq: 'handler'}
    }
    if(!jsonData.online) {
      jsonData.online = true
    }
  }
  mservice.search(jsonData, requestDetails, callback)
}

/**
 * Update route infor each 10 sec.
 */
function cleanRouteTable() {
  debug.log('Clean routes');
  MongoClient.connect(MongoURL, function(err, db) {
    if (err) {
      // If error, do nothing.
      debug.debug('Error %s', err.message);

      return;
    }

    var collection = db.collection(process.env.MONGO_TABLE);
    var query = {
      changed: {
        $lt: Date.now() - 60 * 1000
      }
    };
    collection.deleteMany(query, function(err, results) {
      db.close();
      if (err) {
        // If error, do nothing.
        debug.debug('Error %s', err.message);
        return;
      }
      debug.log('Deleted %s routes', results.deletedCount);
    });
  });
}
