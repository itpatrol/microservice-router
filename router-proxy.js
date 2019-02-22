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
  }
});

if (!mControlCluster.isMaster) {
  var globalServices = [];
  updateRouteVariable();
  var interval = 6000;
  if (process.env.INTERVAL) {
    interval = process.env.INTERVAL;
  }
  setInterval(function() { updateRouteVariable()}, interval);
}

function applyAccessToken(requestDetails) {
  if (requestDetails.url.indexOf('?') != -1) {
    let cutPosition = requestDetails.url.lastIndexOf('?');
    let accessToken = requestDetails.url.substring(cutPosition + 1);
    requestDetails.url = requestDetails.url.substring(0, cutPosition);
    if (!accessToken || accessToken == '') {
      return;
    }
    if (accessToken != process.env.SECURE_KEY) {
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
function ProxyRequestGet(jsonData, requestDetails, callback) {
  applyAccessToken(requestDetails);
  if (requestDetails.url == '') {
    var Explorer = new ExplorerClass(requestDetails, callback);
    return Explorer.process();
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
  applyAccessToken(requestDetails);
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
  applyAccessToken(requestDetails);
  let cutPosition = requestDetails.url.lastIndexOf('/');
  let route = requestDetails.url.substring(0, cutPosition);
  let path = requestDetails.url.substring(cutPosition + 1);
  proxyRequest(route, path, 'PUT', jsonData, requestDetails, callback);
}

/**
 * Proxy DELETE requests.
 */
function ProxyRequestDELETE(jsonData, requestDetails, callback) {
  applyAccessToken(requestDetails);
  let cutPosition = requestDetails.url.lastIndexOf('/');
  let route = requestDetails.url.substring(0, cutPosition);
  let path = requestDetails.url.substring(cutPosition + 1);
  proxyRequest(route, path, 'DELETE', jsonData, requestDetails, callback);
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

  proxyRequest(route, path, 'SEARCH', jsonData, requestDetails, callback);
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
        'Access-Control-Allow-Headers': 'content-type, signature, access_token, token, Access-Token',
        'Access-Control-Expose-Headers': 'x-total-count',
      }
    });
  }
  let route = requestDetails.url;
  let path = '';
  if (requestDetails.url.charAt(requestDetails.url.length - 1) == '/') {
    route = requestDetails.url.substring(0, requestDetails.url.length - 1);
  }
  proxyRequest(route, path, 'OPTIONS', jsonData, requestDetails, callback);
}
/**
 * Check Conditions for request.
 */
function checkConditions(conditions, requestDetails, jsonData) {
  if (conditions.headers && conditions.headers.length) {
    for (let header of conditions.headers ) {
      if (!requestDetails.headers[header.name]) {
        return false
      }
      let receivedHeaderValue = requestDetails.headers[header.name]
      if (header.isRegex) {
        let pattern = new RegExp(header.value, "i")
        if (!pattern.test(receivedHeaderValue)) {
          return false
        }
      } else {
        if (receivedHeaderValue !== header.value) {
          return false
        }
      }
    }
  }
  // check methods
  if (conditions.methods && conditions.methods.length) {
    if (conditions.methods.indexOf(targetRequest.method) == -1) {
      return false;
    }
  }
  // check payload
  if (conditions.payload && conditions.payload.length
    && jsonData) {
    for (let payload of conditions.payload ) {
      if (!jsonData[payload.name]) {
        return false
      }
      let receivedPayloadValue = jsonData[payload.name]
      if (header.isRegex) {
        let pattern = new RegExp(payload.value, "i")
        if (!pattern.test(receivedPayloadValue)) {
          return false
        }
      } else {
        if (receivedPayloadValue !== payload.value) {
          return false
        }
      }
    }
  }
  return true
}

/**
 * Check if route match request.
 */
function matchRoute(targetRequest, routeItem) {
  let routeItems = targetRequest.route.split('/');

  
  if (routeItem.path && routeItem.path.length == 1 && routeItem.path[0] == '*') {
    if (routeItem.conditions) {
      if (!checkConditions(routeItem.conditions, targetRequest.requestDetails, targetRequest.jsonData)) {
        return false
      }
    }
    return true
  }
  // Check path and if match, set routeItem.matchVariables with values.
  let checkPath = function(paths){
    for (let path of paths) {
      // If route qual saved path
      if (path == targetRequest.route) {
        return true;
      }
  
      // If routeItems.length == 1, and did not match
      if (routeItems.length == 1) {
        if (path != targetRequest.route) {
          continue;
        }
      }
  
      var pathItems = path.split('/');
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
  }
  if (!checkPath(routeItem.path)) {
    return false
  }
  if (routeItem.conditions) {
    if (!checkConditions(routeItem.conditions, targetRequest.requestDetails, targetRequest.jsonData)) {
      return false
    }
  }
  return true;
}
/**
 * Process before Hooks.
 */
function HookCall(targetRequest, phase, callback) {
  
  
  // send Broadcast
  let beforeBroadcastTargets = findHookTarget(targetRequest, phase, 'broadcast')
  _request(function(){
    if (beforeBroadcastTargets instanceof Error) {
      return beforeBroadcastTargets
    }
    if (!beforeBroadcastTargets.length) {
      return false
    }
    let router = beforeBroadcastTargets.pop()
    debug.log('Notify route %s result %O', targetRequest.route, router);

    let headers = {};
    for (var i in targetRequest.requestDetails.headers) {
      if (i != 'host') {
        headers[i] = targetRequest.requestDetails.headers[i];
      }
    }
    for (var i in router.matchVariables) {
      headers['mfw-' + i] = router.matchVariables[i];
    }

    headers['x-origin-method'] = targetRequest.method
    debug.debug('%s headers %O', targetRequest.route, headers);
    return {
      uri: router.url + targetRequest.path,
      method: 'NOTIFY',
      headers: headers,
      body: targetRequest.requestDetails._buffer
    }
  }, function(err, response, body){
    // No action on broadcast hook.
    if (err) {
      debug.log('broadcast failed %O', err);
    }
    debug.log('broadcast sent');
  })
  // send Notify
  _request(function(){
    let beforeNotifyTargets = findHookTarget(targetRequest, phase, 'notify')
    if (beforeNotifyTargets instanceof Error) {
      return beforeNotifyTargets
    }
    let router = false
    if (beforeNotifyTargets.length == 1) {
      router = beforeNotifyTargets.pop();
    }
    // TODO: add diferent strategy to choose one of the routes
    router =  getMinLoadedRouter(beforeNotifyTargets);
    debug.log('Notify route %s result %O', targetRequest.route, router);

    let headers = {};
    for (var i in targetRequest.requestDetails.headers) {
      if (i != 'host') {
        headers[i] = targetRequest.requestDetails.headers[i];
      }
    }
    for (var i in router.matchVariables) {
      headers['mfw-' + i] = router.matchVariables[i];
    }

    headers['x-origin-method'] = targetRequest.method
    debug.debug('%s headers %O', targetRequest.route, headers);
    return {
      uri: router.url + targetRequest.path,
      method: 'NOTIFY',
      headers: headers,
      body: targetRequest.requestDetails._buffer
    }
  }, function(err, response, body){
    // No action on notify hook.
    if (err) {
      debug.log('notify failed %O', err);
    }
    debug.log('notify sent');
  })

  // send proxy
  _request(function(){
    let beforeProxyTargets = findHookTarget(targetRequest, phase, 'proxy')
    if (beforeProxyTargets instanceof Error) {
      return beforeProxyTargets
    }
    let router = false
    if (beforeNotifyTargets.length == 1) {
      router = beforeNotifyTargets.pop();
    }
    // TODO: add diferent strategy to choose one of the routes
    router =  getMinLoadedRouter(beforeNotifyTargets);
    debug.log('Notify route %s result %O', targetRequest.route, router);
    let headers = {};
    for (var i in targetRequest.requestDetails.headers) {
      if (i != 'host') {
        headers[i] = targetRequest.requestDetails.headers[i];
      }
    }
    for (var i in router.matchVariables) {
      headers['mfw-' + i] = router.matchVariables[i];
    }
    headers['x-origin-method'] = targetRequest.method
    debug.debug('%s headers %O', targetRequest.route, headers);
    return {
      uri: router.url + targetRequest.path,
      method: 'NOTIFY',
      headers: headers,
      body: targetRequest.requestDetails._buffer
    }
  }, function(err, response, body){
    if (err) {
      debug.log('proxy failed %O', err);
      return callback(err)
    }
    callback(null, response, body)
  });
}

/**
 * Find all hook routes by stage.
 */
function findHookTarget(targetRequest, phase, type){
  let allHookTargets = findAllTargets(targetRequest, 'hook')
  if (allHookTargets instanceof Error) {
    return allHookTargets
  }
  let finalHookTable = []
  for (let target of allHookTargets){
    // skip hooks with no hook properties
    if (!target.hook || !target.hook.length) {
      continue
    }
    for (let phase of target.phase) {
      if (hook.phase !== phase) {
        continue
      }
      if (hook.type !== type) {
        continue
      }
      let targetCopy = JSON.parse(JSON.stringify(target))
      delete targetCopy.hook
      targetCopy.weight = hook.weight
      finalHookTable.push(targetCopy)
    }
  }
  if (finalHookTable.length) {
    finalHookTable.sort(function(a, b){
      if (a.weight < b.weight) {
        return -1
      }
      if (a.weight > b.weight) {
        return 1
      }
      return 0
    })
  }
  return finalHookTable
}

/**
 * Find all routes.
 */
function findAllTargets(targetRequest, type) {
  debug.debug('Find all routes %s', targetRequest.route);

  var availableRoutes = [];
  for (let i in globalServices) {
    if (globalServices[i].type && globalServices[i].type.toLowerCase() !== type) {
      continue
    }
    // For easy deployment when service need to stop receiving new requests.
    if (!globalServices[i].online) {
      continue
    }
    // Making copy of the router.
    let routeItem = JSON.parse(JSON.stringify(globalServices[i]));
    routeItem.matchVariables = {};
    if (matchRoute(targetRequest, routeItem)) {
      availableRoutes.push(routeItem);
    }
  }
  debug.debug('Available routes type: %s route: %s availableRoutes: %s', type, route,
    JSON.stringify(availableRoutes , null, 2));
  if (availableRoutes.length == 0) {
    debug.debug('Not found for %s', route);
    return new Error('Endpoint not found');
  }
  return availableRoutes;
}
/**
 * Find target URL.
 */
function findTarget(targetRequest) {
  debug.debug('Find route %s', targetRequest.route);

  let availableRoutes = FindAllTargets(targetRequest, 'handler');
  if (availableRoutes instanceof Error) {
    return availableRoutes
  }
  if (availableRoutes.length == 1) {
    return availableRoutes.pop();
  }
  // TODO: add diferent strategy to choose one of the routes
  return getMinLoadedRouter(availableRoutes);
}

/**
 * Get Router with minimum CPU used.
 */
function getMinLoadedRouter(availableRoutes) {
  let minRouter = availableRoutes.pop();
  let totalCPU = minRouter.metrics.reduce(function(a, b) {

    return {
      cpu : parseFloat(a.cpu) + parseFloat(b.cpu) + a.loadavg[0] + b.loadavg[0],
      loadavg: [0]
    };
  });
  minRouter.cpu = totalCPU.cpu;
  debug.debug('MinRouter %O', minRouter);
  for (let i in availableRoutes) {
    let totalCPU = availableRoutes[i].metrics.reduce(function(a, b) {
      return {
        cpu : parseFloat(a.cpu) + parseFloat(b.cpu) + a.loadavg[0] + b.loadavg[0],
        loadavg: [0]
      };
    });
    availableRoutes[i].cpu = totalCPU.cpu;
    if (availableRoutes[i].cpu < minRouter.cpu) {
      minRouter = availableRoutes[i];
    }
    debug.debug('MinRouter %O', minRouter);
    debug.debug('availableRoutes %s %O',i, availableRoutes[i]);
  }
  return minRouter;
}

function _request(getRequest, callback) {
  let request = getRequest()
  
  if (request instanceof Error) {
    return callback(request)
  }
  if (request === false) {
    return callback(false)
  }
  request(request, function(error, response, body) {
    if (error) {
      debug.debug('_request Error received: %O', error);
      debug.debug('_request Restart request: %O', request);
      debug.debug('_request %s Data %O', route, jsonData);
      return _request(getRequest, callback);
    }
    
    debug.debug('%s body: %s', request.uri, body);
    return callback(null, response, body)
  })
}

/**
 * Proxy request to backend server.
 */
function proxyRequest(route, path, method, jsonData, requestDetails, callback) {
  debug.debug('Route base: %s', route);
  let targetRequest = {
    route: route,
    path: path,
    method: method,
    jsonData: jsonData,
    requestDetails: requestDetails
  }
  let endPointTarget = findTarget(targetRequest)
  if (endPointTarget instanceof Error) {
    debug.debug('Route %s err %O', route, endPointTarget)
    return callback(endPointTarget, null)
  }

  HookCall(targetRequest, 'before', function(err, response, body){
    if (!err) {
      debug.debug('%s body: %O', route, body);
      let bodyJSON = false
      try {
        bodyJSON = JSON.parse(body);
      } catch (e) {
        debug.debug('JSON.parse(body) Error received: %O', e);
        debug.log('Notify before reseived not json')
      }
      if (bodyJSON) {
        // need to replace body data
        
      }
      // need to set headers x-set-XXXXX
    }

    // process request to endpoint

    // process after hooks
  })


  FindTarget(targetRequest, 'handler', function(err, router) {
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

      if (error) {
        debug.debug('%s Error received: %s', route, error.message);
        debug.debug('%s Restart request: %s %s %s', route, path, method);
        debug.debug('%s Data %O', route, jsonData);
        return proxyRequest(route, path, method, jsonData, requestDetails, callback);
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        debug.debug('JSON.parse(body) Error received: %O', e);
        return callback(new Error('Service respond is not JSON.'));
      }
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
      var responseHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT, SEARCH',
        'Access-Control-Allow-Headers': 'content-type, signature, access_token, token, Access-Token',
        'Access-Control-Expose-Headers': 'x-total-count',
      };
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

  for (let routeItem of globalServices) {
    if (routeItem.type !== 'websocket') {
      continue
    }
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
      globalServices = newServices;
    });
  });
}
