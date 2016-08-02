/**
 * Github Status microservice
 */
'use strict';

const Cluster = require('zenci-manager');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;

require('dotenv').config();

var mControlCluster = new Cluster({
  pid: process.env.PIDFILE + 'proxy',
  port: process.env.PROXY_PORT,
  count: process.env.WORKERS,
  callbacks: {
//    POST: mservice.post,
    GET: ProxyRequestGet
//    PUT: mservice.put,
//    DELETE: mservice.delete,
//    SEARCH: mservice.search
  }
});

function ProxyRequestGet(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split("/");

  var route = "";
  for(var i = 0; i < url.length -1; i++) {
    if(i != url.length - 2) {
      route = route + url[i] + "/";
    } else {
      route = route + url[i]
    }
  }
  console.log("Route base: %s", route);
  FindTarget(route, function(err, router) {
    console.log(err);
    console.log(router);
    if(err) {
      return callback(err, null);
    }

    request({
      uri: router.url + url[url.length - 1],
      method: 'GET',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return  ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}

function FindTarget(route, callback) {
  MongoClient.connect(process.env.MONGO_URL, function(err, db) {
    if(err) {
      return callback(err, null);
    }

    var collection = db.collection(process.env.MONGO_TABLE);
    var query = {
      path: route,
      type: 'master'
    };
    collection.find(query).toArray(function(err, results) {
      if (err) {
        return callback(err, null);
      }
      if (!results || results.length == 0) {
        return callback(new Error('Not found'), null);
      }
      var random = Math.floor(Math.random() * (results.length) + 1) - 1;
      return callback(null, results[random]);
    });
  });
}