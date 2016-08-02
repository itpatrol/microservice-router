/**
 * Github Status microservice
 */
'use strict';

const Cluster = require('zenci-manager');
const Microservice = require('zenci-microservice');

require('dotenv').config();

var mservice = new Microservice({
  mongoUrl: process.env.MONGO_URL,
  mongoTable: process.env.MONGO_TABLE,
  secureKey: process.env.SECURE_KEY,
  schema: process.env.SCHEMA
});

var mControlCluster = new Cluster({
  pid: process.env.PIDFILE,
  port: process.env.PORT,
  count: process.env.WORKERS,
  callbacks: {
    validate: mservice.validate,
    POST: mservice.post,
    GET: mservice.get,
    PUT: mservice.put,
    DELETE: mservice.delete,
    SEARCH: mservice.search
  }
});
