/**
 * Github Status microservice
 */
'use strict';

const framework = '@microservice-framework';
const Cluster = require(framework + '/microservice-cluster');
const Microservice = require(framework + '/microservice');
const MicroserviceRouterRegister = require(framework + '/microservice-router-register').register;
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
    init: hookInit,
    validate: mservice.validate,
    POST: adminPOST,
    GET: mservice.get,
    PUT: mservice.put,
    DELETE: mservice.delete,
    SEARCH: adminSearch,
    OPTIONS: mservice.options
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
 * Init Handler.
 */
function hookInit(cluster, worker, address) {
  if (worker.id == 1) {
    let interval = 6000;
    if (process.env.INTERVAL) {
      interval = process.env.INTERVAL;
    }
    var mserviceRegister = new MicroserviceRouterRegister({
      server: {
        url: 'http://' + process.env.HOSTNAME + ':' + process.env.PORT,
        secureKey: process.env.SECURE_KEY,
        period: interval,
      },
      route: {
        path: ['register'],
        url: 'http://' + process.env.HOSTNAME + ':' + process.env.PORT + '/',
        secureKey: process.env.SECURE_KEY,
        online: true,
        scope: 'admin'
      },
      cluster: cluster
    });
/*
    let record = {
      type: 'handler',
      path: ['register'],
      url: 'http://' + process.env.HOSTNAME + ':' + process.env.PORT,
      secureKey: process.env.SECURE_KEY,
      online: true,
      scope: 'admin',
      metrics: [
        {
          "cpu": "0.00",
          "memory": 5.40625,
          "loadavg": [
            1.19091796875,
            1.37646484375,
            1.38134765625
          ]
        },
        {
          "cpu": "0.00",
          "memory": 2.1796875,
          "loadavg": [
            1.19091796875,
            1.37646484375,
            1.38134765625
          ]
        }
      ]
    };
    
    mservice.post(record, {}, function(err, handlerResponse){
      if(err) {
        debug.log('self register err: %s', err.message)
        debug.debug('self register err: %O %O', err, handlerResponse)
        return
      }
      debug.log('self registered')
      debug.debug('self registered %O', handlerResponse)
    })*/
  }
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
  if (jsonData.query) {
    if (!jsonData.query.type) {
      jsonData.query.type = { $eq: 'handler'}
    }
    if (!jsonData.query.online) {
      jsonData.query.online = true
    }
  } else {
    if (!jsonData.type) {
      jsonData.type = { $eq: 'handler'}
    }
    if (!jsonData.online) {
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
