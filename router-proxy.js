/**
 * Github Status microservice
 */
'use strict';

const Cluster = require('@microservice-framework/microservice-cluster');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const debugF = require('debug');
const dgram = require('dgram');
const url = require('url');
const signature = require('./includes/signature.js');
const ExplorerClass = require('./includes/explorerClass.js');
const proxyRequest = require('./includes/request.js')

var debug = {
  log: debugF('proxy:log'),
  debug: debugF('proxy:debug'),
  debugMetric: debugF('proxy:metric'),
  request: debugF('proxy:request'),
  debugHook: debugF('proxy:hook')
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

var mControlCluster = new Cluster({
  pid: process.env.PIDFILE + '.proxy',
  port: process.env.PROXY_PORT,
  count: process.env.WORKERS,
  hostname: process.env.HOSTNAME,
  callbacks: {
    POST: ProxyRequestPOST,
    GET: ProxyRequestGet,
    PUT: ProxyRequestPUT,
    DELETE: ProxyRequestDELETE,
    SEARCH: ProxyRequestSEARCH,
    OPTIONS: ProxyRequestOPTIONS,
    shutdown: ProxyRequestShutdown,
    init: ProxyRequestInit,
  }
});


var globalServices = [];

function ProxyRequestInit(callback){
  updateRouteVariable();
  var interval = 6000;
  if (process.env.INTERVAL) {
    interval = process.env.INTERVAL;
  }
  let updateInerval = setInterval(function() { updateRouteVariable()}, interval);
  callback(updateInerval)
}

/**
 * clear interval on shutdown.
 */
function ProxyRequestShutdown(updateInerval){
  if (updateInerval) {
    clearInterval(updateInerval)
  }
}

/**
 * Apply access token if provided as a part of URL.
 */
function applyAccessToken(requestDetails) {
  if (requestDetails.url.indexOf('?') != -1) {
    let cutPosition = requestDetails.url.lastIndexOf('?');
    let accessToken = requestDetails.url.substring(cutPosition + 1);
    requestDetails.url = requestDetails.url.substring(0, cutPosition);
    if (!accessToken || accessToken == '') {
      return;
    }
    if (accessToken != process.env.SECURE_KEY) {
      // eslint-disable-next-line camelcase
      requestDetails.headers.access_token = accessToken;
      requestDetails.headers['access-token'] = accessToken;
    } else {
      requestDetails.isSecure = true;
      requestDetails.SecureKey = accessToken;
    }
  }
}

/**
 * Proxy GET requests.
 */
function ProxyRequestGet(url, requestDetails, callback) {
  applyAccessToken(requestDetails);
  if (requestDetails.url == '') {
    var Explorer = new ExplorerClass(requestDetails, callback);
    return Explorer.process();
  }
  let cutPosition = requestDetails.url.lastIndexOf('/');
  let route = requestDetails.url.substring(0, cutPosition);
  let path = requestDetails.url.substring(cutPosition + 1);
  let targetRequest = {
    route: route,
    path: path,
    method: 'GET',
    jsonData: url,
    requestDetails: requestDetails
  }
  proxyRequest(targetRequest, callback);
}

/**
 * Proxy POST requests.
 */
function ProxyRequestPOST(jsonData, requestDetails, callback) {
  applyAccessToken(requestDetails);
  let route = requestDetails.url;
  let path = '';
  if (requestDetails.url.charAt(requestDetails.url.length - 1) == '/') {
    route = requestDetails.url.substring(0, requestDetails.url.length - 1);
  }
  let targetRequest = {
    route: route,
    path: path,
    method: 'POST',
    jsonData: jsonData,
    requestDetails: requestDetails
  }
  proxyRequest(targetRequest, callback);
}

/**
 * Proxy PUT requests.
 */
function ProxyRequestPUT(jsonData, requestDetails, callback) {
  applyAccessToken(requestDetails);
  let cutPosition = requestDetails.url.lastIndexOf('/');
  let route = requestDetails.url.substring(0, cutPosition);
  let path = requestDetails.url.substring(cutPosition + 1);
  let targetRequest = {
    route: route,
    path: path,
    method: 'PUT',
    jsonData: jsonData,
    requestDetails: requestDetails
  }
  proxyRequest(targetRequest, callback);
}

/**
 * Proxy DELETE requests.
 */
function ProxyRequestDELETE(url, requestDetails, callback) {
  applyAccessToken(requestDetails);
  let cutPosition = requestDetails.url.lastIndexOf('/');
  let route = requestDetails.url.substring(0, cutPosition);
  let path = requestDetails.url.substring(cutPosition + 1);
  let targetRequest = {
    route: route,
    path: path,
    method: 'DELETE',
    jsonData: url,
    requestDetails: requestDetails
  }
  proxyRequest(targetRequest, callback);
}


/**
 * Proxy SEARCH requests.
 */
function ProxyRequestSEARCH(jsonData, requestDetails, callback) {
  applyAccessToken(requestDetails);
  let route = requestDetails.url;
  let path = '';
  if (requestDetails.url.charAt(requestDetails.url.length - 1) == '/') {
    route = requestDetails.url.substring(0, requestDetails.url.length - 1);
  }
  let targetRequest = {
    route: route,
    path: path,
    method: 'SEARCH',
    jsonData: jsonData,
    requestDetails: requestDetails
  }
  proxyRequest(targetRequest, callback);
}


/**
 * Proxy OPTIONS requests.
 */
function ProxyRequestOPTIONS(jsonData, requestDetails, callbacks, callback) {
  applyAccessToken(requestDetails);
  if (requestDetails.headers['access-control-request-method']) {
    return callback(null, {
      code: 200,
      answer: {},
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT, SEARCH',
        'Access-Control-Allow-Headers': 'content-type, signature, access_token,'
          + ' token, Access-Token',
        'Access-Control-Expose-Headers': 'x-total-count',
      }
    });
  }
  let route = requestDetails.url;
  let path = '';
  if (requestDetails.url.charAt(requestDetails.url.length - 1) == '/') {
    route = requestDetails.url.substring(0, requestDetails.url.length - 1);
  }
  let targetRequest = {
    route: route,
    path: path,
    method: 'OPTIONS',
    jsonData: jsonData,
    requestDetails: requestDetails
  }
  proxyRequest(targetRequest, callback);
}

/**
 * Update route infor each 10 sec.
 */
function updateRouteVariable() {

  MongoClient.connect(MongoURL, function(err, db) {
    if (err) {
      // If error, do nothing.
      debug.debug('Error %s', err.message);
      return;
    }

    var collection = db.collection(process.env.MONGO_TABLE);

    collection.find({}).toArray(function(err, results) {
      db.close();
      if (err) {
        // If error, do nothing.
        debug.debug('Error %s', err.message);
        return;
      }
      if (!results || results.length == 0) {
        // If there is no results, do nothing
        debug.debug('No records found');

        return;
      }
      let newServices = [];
      for (let route of results) {
        // get only changed in 60 sec.
        if (route.changed > Date.now() - 60 * 1000) {
          if (!route.type) {
            // Version 1.x compatibility.
            route.type = 'handler'
            if (route.path == 'ws') {
              route.type = 'websocket'
            }
          }
          if (typeof route.online === "undefined") {
            // Version 1.x compatibility.
            route.online = true
          }
          newServices.push(route);
        }
      }
      debug.debug('Updated router table %O', newServices);
      globalServices = newServices;
    });
  });
}
