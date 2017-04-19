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


var mservice = new Microservice({
  mongoUrl: process.env.MONGO_URL + process.env.MONGO_OPTIONS,
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
    POST: mservice.post,
    GET: mservice.get,
    PUT: mservice.put,
    DELETE: mservice.delete,
    SEARCH: mservice.search
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
 * Update route infor each 10 sec.
 */
function cleanRouteTable() {
  debug.log('Clean routes');
  MongoClient.connect(process.env.MONGO_URL, function(err, db) {
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
