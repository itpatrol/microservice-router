/**
 * Github Status microservice
 */
'use strict';

const Cluster = require('@microservice-framework/microservice-cluster');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const debugF = require('debug');

var debug = {
  log: debugF('proxy:log'),
  debug: debugF('proxy:debug')
};


require('dotenv').config();

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
    SEARCH: ProxyRequestSEARCH
  }
});

if (!mControlCluster.isMaster) {
  var routes = [];
  updateRouteVariable();
  var interval = 6000;
  if (process.env.INTERVAL) {
    interval = process.env.INTERVAL;
  }
  setInterval(function() { updateRouteVariable()}, interval);
}

/**
 * Proxy GET requests.
 */
function ProxyRequestGet(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length - 1; i++) {
    if (i != url.length - 2) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  var path = url[url.length - 1];
  proxyRequest(route, path, 'GET', jsonData, requestDetails, callback);
}

/**
 * Proxy POST requests.
 */
function ProxyRequestPOST(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length; i++) {
    if (i != url.length - 1) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  var path = '';
  proxyRequest(route, path, 'POST', jsonData, requestDetails, callback);
}

/**
 * Proxy PUT requests.
 */
function ProxyRequestPUT(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length - 1; i++) {
    if (i != url.length - 2) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  var path = url[url.length - 1];
  proxyRequest(route, path, 'PUT', jsonData, requestDetails, callback);
}

/**
 * Proxy DELETE requests.
 */
function ProxyRequestDELETE(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length - 1; i++) {
    if (i != url.length - 2) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  var path = url[url.length - 1];
  proxyRequest(route, path, 'DELETE', jsonData, requestDetails, callback);
}


/**
 * Proxy SEARCH requests.
 */
function ProxyRequestSEARCH(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length; i++) {
    if (i != url.length - 1) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  var path = '';
  proxyRequest(route, path, 'SEARCH', jsonData, requestDetails, callback);
}

/**
 * Compare route to router.path items.
 */
function matchRoute(route, routeItem) {
  let routeItems = route.split('/');
  var paths = routeItem.path;


  for (var i in paths) {
    // If route qual saved path
    if (paths[i] == route) {
      return true;
    }

    // If routeItems.length == 1, and did not match
    if (routeItems.length == 1) {
      if (paths[i] != route) {
        continue;
      }
    }

    var pathItems = paths[i].split('/');
    if (pathItems.length != routeItems.length) {
      continue;
    }
    var fullPathMatched = true;
    for (var i = 0; i < routeItems.length; i++) {
      if (pathItems[i].charAt(0) == ':') {
        routeItem.matchVariables[pathItems[i].substring(1)] = routeItems[i];
      } else {
        if (routeItems[i] != pathItems[i]) {
          fullPathMatched = false;
          break;
        }
      }
    }
    if (fullPathMatched) {
      return true;
    }
  }

  return false;
}

/**
 * Find target URL.
 */
function FindTarget(route, callback) {
  debug.debug('Find route %s', route);

  var availableRoutes = [];
  for (var i in routes) {
    routes[i].matchVariables = {};
    if (matchRoute(route, routes[i])) {
      availableRoutes.push(routes[i]);
    }
  }
  debug.debug('Available routes for %s %s', route, JSON.stringify(availableRoutes , null, 2));
  if (availableRoutes.length == 0) {
    debug.debug('Not found for %s', route);
    return callback(new Error('Endpoint not found'), null);
  }
  if (availableRoutes.length == 1) {
    return callback(null, availableRoutes.pop());
  }

  var random = Math.floor(Math.random() * (availableRoutes.length) + 1) - 1;
  debug.log(availableRoutes[random]);
  return callback(null, availableRoutes[random]);
}

/**
 * Proxy request to backend server.
 */
function proxyRequest(route, path, method, jsonData, requestDetails, callback) {
  debug.debug('Route base: %s', route);

  FindTarget(route, function(err, router) {
    if (err) {
      debug.debug('Route %s err %s', route, err.message);
      return callback(err, null);
    }

    debug.log('Route %s result %s', route, JSON.stringify(router , null, 2));
    debug.debug('%s Request: %s %s', route, path, method);
    debug.debug('%s Data %s', route, JSON.stringify(jsonData , null, 2));
    debug.debug('%s requestDetails %s', route, JSON.stringify(requestDetails , null, 2));

    var headers = {};
    for (var i in requestDetails.headers) {
      if (i != 'host') {
        headers[i] = requestDetails.headers[i];
      }
    }

    for (var i in router.matchVariables) {
      headers[i] = router.matchVariables[i];
    }

    debug.debug('%s headers %s', route, JSON.stringify(headers , null, 2));
    request({
      uri: router.url + path,
      method: method,
      headers: headers,
      body: requestDetails._buffer
    }, function(error, response, body) {
      debug.debug('%s Responce: %s', route, JSON.stringify(response, null, 2));
      if (error) {
        debug.debug('%s Error received: %s', route, error.message);
        debug.debug('%s Restart request: %s %s %s', route, path, method);
        debug.debug('%s Data %s', route, JSON.stringify(jsonData , null, 2));
        return proxyRequest(route, path, method, jsonData, requestDetails, callback);
      }
      body = JSON.parse(body);
      debug.debug('%s body: %s', route, JSON.stringify(body , null, 2));
      if (body.id) {
        body.url = process.env.BASE_URL + router.path + '/' + body.id;
      }
      if (body._id) {
        body.url = process.env.BASE_URL + router.path + '/' + body._id;
      }
      if (body instanceof Array) {
        for (var i in body) {
          if (body[i]._id) {
            body[i].url = process.env.BASE_URL + router.path  + '/' + body[i]._id;
          }
        }
      }
      var responseHeaders = {};
      for (var i in response.headers) {
        if (i.substring(0,1) == 'x') {
          responseHeaders[i] = response.headers[i];
        }
      }
      callback(null, {
        code: response.statusCode,
        answer: body,
        headers: responseHeaders
      });
    });
  })
}

/**
 * Update route infor each 10 sec.
 */
function updateRouteVariable() {

  MongoClient.connect(process.env.MONGO_URL + process.env.MONGO_PREFIX + process.env.MONGO_OPTIONS, function(err, db) {
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
      var newRoutes = [];
      for (var i in results) {
        // get only changed in 60 sec.
        if (results[i].changed > Date.now() - 60 * 1000) {
          newRoutes.push(results[i]);
        }
      }
      routes = newRoutes;
    });
  });
}
