/**
 * Github Status microservice
 */
'use strict';

const Cluster = require('@microservice-framework/microservice-cluster');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const debugF = require('debug');
const dgram = require('dgram');
const client = dgram.createSocket('udp4');
const url = require('url');
const signature = require('./includes/signature.js');
const ExplorerClass = require('./includes/explorerClass.js');

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
    SEARCH: ProxyRequestSEARCH,
    OPTIONS: ProxyRequestOPTIONS,
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
  if (requestDetails.url == '') {
    var Explorer = new ExplorerClass(requestDetails);
    return Explorer.process(callback);
  }
  let cutPosition = requestDetails.url.lastIndexOf('/');
  let route = requestDetails.url.substring(0, cutPosition);
  let path = requestDetails.url.substring(cutPosition + 1);
  proxyRequest(route, path, 'GET', jsonData, requestDetails, callback);
}

/**
 * Proxy POST requests.
 */
function ProxyRequestPOST(jsonData, requestDetails, callback) {
  let route = requestDetails.url;
  let path = '';
  if (requestDetails.url.charAt(requestDetails.url.length - 1) == '/') {
    route = requestDetails.url.substring(0, requestDetails.url.length - 1);
  }
  proxyRequest(route, path, 'POST', jsonData, requestDetails, callback);
}

/**
 * Proxy PUT requests.
 */
function ProxyRequestPUT(jsonData, requestDetails, callback) {
  let cutPosition = requestDetails.url.lastIndexOf('/');
  let route = requestDetails.url.substring(0, cutPosition);
  let path = requestDetails.url.substring(cutPosition + 1);
  proxyRequest(route, path, 'PUT', jsonData, requestDetails, callback);
}

/**
 * Proxy DELETE requests.
 */
function ProxyRequestDELETE(jsonData, requestDetails, callback) {
  let cutPosition = requestDetails.url.lastIndexOf('/');
  let route = requestDetails.url.substring(0, cutPosition);
  let path = requestDetails.url.substring(cutPosition + 1);
  proxyRequest(route, path, 'DELETE', jsonData, requestDetails, callback);
}


/**
 * Proxy SEARCH requests.
 */
function ProxyRequestSEARCH(jsonData, requestDetails, callback) {
  let route = requestDetails.url;
  let path = '';
  if (requestDetails.url.charAt(requestDetails.url.length - 1) == '/') {
    route = requestDetails.url.substring(0, requestDetails.url.length - 1);
  }

  proxyRequest(route, path, 'SEARCH', jsonData, requestDetails, callback);
}


/**
 * Proxy OPTIONS requests.
 */
function ProxyRequestOPTIONS(jsonData, requestDetails, callback) {
  let route = requestDetails.url;
  let path = '';
  if (requestDetails.url.charAt(requestDetails.url.length - 1) == '/') {
    route = requestDetails.url.substring(0, requestDetails.url.length - 1);
  }
  proxyRequest(route, path, 'OPTIONS', jsonData, requestDetails, callback);
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
    // Making copy of the router.
    let routeItem = JSON.parse(JSON.stringify(routes[i]));
    routeItem.matchVariables = {};
    if (matchRoute(route, routeItem)) {
      availableRoutes.push(routeItem);
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
  return callback(null, getMinLoadedRouter(availableRoutes));
}

/**
 * Get Router with minimum CPU used.
 */
function getMinLoadedRouter(availableRoutes) {
  let minRouter = availableRoutes.pop();
  minRouter.cpu = minRouter.metrics.reduce(function(a, b) {
    return a.cpu + b.cpu + a.loadavg[0] + b.loadavg[0];
  });
  debug.debug('MinRouter %O', minRouter);
  for (let i in availableRoutes) {
    availableRoutes[i].cpu = availableRoutes[i].metrics.reduce(function(a, b) {
      return a.cpu + b.cpu + a.loadavg[0] + b.loadavg[0];
    });
    if (availableRoutes[i].cpu < minRouter.cpu) {
      minRouter = availableRoutes[i];
    }
    debug.debug('MinRouter %O', minRouter);
    debug.debug('availableRoutes %s %O',i, availableRoutes[i]);
  }
  return minRouter;
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

    debug.log('Route %s result %O', route, router);
    debug.debug('%s Request: %s %s', route, path, method);
    debug.debug('%s Data %O', route, jsonData);
    debug.debug('%s requestDetails %O', route, requestDetails);

    var headers = {};
    for (var i in requestDetails.headers) {
      if (i != 'host') {
        headers[i] = requestDetails.headers[i];
      }
    }

    for (var i in router.matchVariables) {
      headers['mfw-' + i] = router.matchVariables[i];
    }

    debug.debug('%s headers %O', route, headers);
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
        debug.debug('%s Data %O', route, jsonData);
        return proxyRequest(route, path, method, jsonData, requestDetails, callback);
      }
      body = JSON.parse(body);
      debug.debug('%s body: %O', route, body);

      if (method != 'OPTIONS') {
        if (body.url) {
          body.url = process.env.BASE_URL + body.url;
        } else if (body.id) {
          body.url = process.env.BASE_URL + route + '/' + body.id;
        }
      }

      if (body instanceof Array) {
        for (var i in body) {
          if (body[i].url) {
            body[i].url =  process.env.BASE_URL + body[i].url;
          } else if (body[i].id) {
            body[i].url = process.env.BASE_URL + route  + '/' + body[i].id;
          }
        }
      }
      var responseHeaders = {};
      for (var i in response.headers) {
        if (i.substring(0,1) == 'x') {
          responseHeaders[i] = response.headers[i];
        }
      }

      if (response.statusCode == 200) {
        sendBroadcastMessage(router, method, requestDetails.url, body);
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
 * Proxy request to backend server.
 */
function sendBroadcastMessage(router, method, path, message) {
  debug.debug('UDP broadcast %O %s %s %O', router, method, path, message);

  for (var i in routes) {
    var routeItem = routes[i];
    if (routeItem.path.indexOf('ws') != -1) {

      var broadcastMessage = {
        method: method,
        route: router.path,
        scope: router.scope,
        loaders: router.matchVariables,
        path: path
      };
      switch (routeItem.methods[method.toLowerCase()]) {
        case 'data': {
          broadcastMessage.message = message;
          break;
        }
        case 'meta': {
          broadcastMessage.meta = true;
          break;
        }
        default: {
          continue;
        }
      }
      var URL = url.parse(routeItem.url);

      broadcastMessage.signature = ['sha256',
        signature('sha256', JSON.stringify(broadcastMessage), routeItem.secureKey)];

      debug.debug('UDP broadcast to %O %O', routeItem, URL);
      var bufferedMessage = Buffer.from(JSON.stringify(broadcastMessage));
      sendBroadcastMessageToClient(bufferedMessage, URL);
    }
  }
}

function sendBroadcastMessageToClient(bufferedMessage, URL) {
  let client = dgram.createSocket('udp4');
  client.send(bufferedMessage, URL.port, URL.hostname, function(err) {
    if (err) {
      debug.debug('UDP broadcast Error: %O', err);
      client.close();
    }
  });
  client.on('message', function(message, remote) {
    debug.debug('Received from server: ' + message);
    client.close();
  });
}

/**
 * Update route infor each 10 sec.
 */
function updateRouteVariable() {

  MongoClient.connect(process.env.MONGO_URL + process.env.MONGO_PREFIX +
    process.env.MONGO_OPTIONS, function(err, db) {
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
