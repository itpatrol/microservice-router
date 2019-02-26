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
  proxyRequest(route, path, 'OPTIONS', jsonData, requestDetails, callback);
}

/**
 * Source: https://gist.github.com/jasonrhodes/2321581
 * A function to take a string written in dot notation style, and use it to
 * find a nested object property inside of an object.
 *
 * Useful in a plugin or module that accepts a JSON array of objects, but
 * you want to let the user specify where to find various bits of data
 * inside of each custom object instead of forcing a standardized
 * property list.
 *
 * @param String nested A dot notation style parameter reference (ie "urls.small")
 * @param Object object (optional) The object to search
 *
 * @return the value of the property in question
 */
function getProperty( propertyName, object ) {
  let parts = propertyName.split( "." ),
      length = parts.length,
      i,
      property = object || this;
  for ( i = 0; i < length; i++ ) {
    if (!property[parts[i]]) {
      return new Error('Property Does not exists')
    }
    property = property[parts[i]];
  }
  return property;
}
/**
 * Check Conditions for request.
 */
function checkConditions(conditions, requestDetails, jsonData) {
  debug.debug('checkConditions %O requestDetails: %O json: %O', conditions,
  requestDetails, jsonData)
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
    if (conditions.methods.indexOf(requestDetails.method) == -1) {
      return false;
    }
  }
  // check payload
  if (conditions.payload && conditions.payload.length
    && jsonData) {
    for (let payload of conditions.payload ) {
      debug.debug('Checking for condition %O', payload)
      let receivedPayloadValue = getProperty(payload.name, jsonData)
      debug.debug('receivedPayloadValue %O', receivedPayloadValue)
      if (receivedPayloadValue instanceof Error) {

        return false
      }
      if (payload.isRegex) {
        let pattern = new RegExp(payload.value, "i")
        debug.debug('pattern.test %O', pattern.test(receivedPayloadValue))
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
      if (!checkConditions(routeItem.conditions,
                          targetRequest.requestDetails, targetRequest.jsonData)) {
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
    if (!checkConditions(routeItem.conditions,
                        targetRequest.requestDetails, targetRequest.jsonData)) {
      return false
    }
  }
  return true;
}

/**
 * Process before Hooks.
 */
function hookCall(targetRequest, phase, callback) {
  
  let getHeaders = function(router, hookType){
    let headers = {};
    let skipHeaders = [
      'host',
      'content-type',
      'date',
      'connection',
      'transfer-encoding'
    ]
    for (var i in targetRequest.requestDetails.headers) {
      if (skipHeaders.indexOf(i) != -1) {
        continue
      }
      headers[i] = targetRequest.requestDetails.headers[i];
    }
    for (var i in router.matchVariables) {
      headers['mfw-' + i] = router.matchVariables[i];
    }
    headers['x-origin-url'] = targetRequest.route
    headers['x-origin-method'] = targetRequest.method
    headers['x-hook-phase'] = phase
    headers['x-hook-type'] = hookType
    headers['x-endpoint-scope'] = targetRequest.endpoint.scope
    debug.debug('%s headers %O', targetRequest.route, headers);
    return headers;
  }
  // send Broadcast
  let broadcastTargets = findHookTarget(targetRequest, phase, 'broadcast')
  debug.debug('Bradcast: Phase %s for %s result: %O', phase, targetRequest.route, broadcastTargets);
  if (broadcastTargets instanceof Array) {
    let getBroadcastRequest = function(){
      if (broadcastTargets instanceof Error) {
        return broadcastTargets
      }
      if (!broadcastTargets.length) {
        return false
      }
      let router = broadcastTargets.pop()
      debug.log('Notify route %s result %O', targetRequest.route, router);
      let headers = getHeaders(router, 'broadcast')
      // Sign request for hook
      headers['x-hook-signature'] = 'sha256=' 
      + signature('sha256',
        targetRequest.requestDetails._buffer,
        router.secureKey);
      return {
        uri: router.url + targetRequest.path,
        method: 'NOTIFY',
        headers: headers,
        body: targetRequest.requestDetails._buffer
      }
    }
    let callbackBroadcastRequest = function(err, response, body){
      // No action on broadcast hook.
      if (err) {
        debug.log('broadcast failed %O', err);
      }
      debug.log('broadcast sent');
      // If more in queue left - send more
      if (broadcastTargets.length) {
        _request(getBroadcastRequest, callbackBroadcastRequest)
      }
    }
    _request(getBroadcastRequest, callbackBroadcastRequest)
  }

  // send Notify
  let notifyTargets = findHookTarget(targetRequest, phase, 'notify')
  debug.debug('Notify: Phase %s for %s result: %O', phase, targetRequest.route, notifyTargets);
  if (notifyTargets instanceof Array) {
    let notifyGroups = []
    for (let target of notifyTargets) {
      if (target.group) {
        if (notifyGroups.indexOf(target.group) == -1) {
          notifyGroups.push(target.group)
        }
      }
    }
    notifyGroups.sort()
    debug.debug('notify Groups %O', notifyGroups);
    if (notifyGroups.length){
      let currentNotifyGroup = notifyGroups.shift()
      let getNotifyRequest = function(){
        debug.debug('notify Groups %s %O',currentNotifyGroup, notifyGroups);
        if (!currentNotifyGroup) {
          return false
        }
        let notifyGroupTargets = findHookTarget(targetRequest, phase, 'notify', currentNotifyGroup)
        debug.debug('Notify: Phase %s result: %O', phase, notifyGroupTargets);
        if (notifyGroupTargets instanceof Error) {
          return notifyGroupTargets
        }
        if (!notifyGroupTargets.length) {
          return false
        }
        let router = false
        if (notifyGroupTargets.length == 1) {
          router = notifyGroupTargets.pop()
        } else {
          // TODO: add diferent strategy to choose one of the routes
          router =  getMinLoadedRouter(notifyGroupTargets);
        }
        debug.log('Notify route %s result %O', targetRequest.route, router);
        let headers = getHeaders(router, 'notify')
        headers['x-hook-group'] = currentNotifyGroup
        // Sign request for hook
        headers['x-hook-signature'] = 'sha256=' 
        + signature('sha256',
          targetRequest.requestDetails._buffer,
          router.secureKey);
        return {
          uri: router.url + targetRequest.path,
          method: 'NOTIFY',
          headers: headers,
          body: targetRequest.requestDetails._buffer
        }
      }
      let callbackNotifyRequest = function(err, response, body) {
        if (err) {
          debug.log('notify failed %O', err);
        }
        debug.log('notify sent');
        // If more groups left - send more
        if (notifyGroups.length) {
          currentNotifyGroup = notifyGroups.shift()
          _request(getNotifyRequest, callbackNotifyRequest)
        }
      }
      _request(getNotifyRequest, callbackNotifyRequest)
    }
  }


  // send adapter
  let adapterTargets = findHookTarget(targetRequest, phase, 'adapter')
  debug.debug('Adapter: Phase %s for %s result: %O', phase, targetRequest.route, adapterTargets);
  if (adapterTargets instanceof Error) {
    // No adapters found. return true, no error but nothing to process.
    debug.debug('No adapter groups found');
    return callback(true)
  }

  let adapterGroups = []
  for (let target of adapterTargets) {
    if (target.group) {
      if (adapterGroups.indexOf(target.group) == -1) {
        adapterGroups.push(target.group)
      }
    }
  }
  adapterGroups.sort()
  debug.debug('adapter Groups %O', adapterGroups);
  if (!adapterGroups.length) {
    // No adapters found. return true, no error but nothing to process.
    debug.debug('No adapter groups found');
    return callback(true)
  }
  let currentAdapterGroup = adapterGroups.shift()
  let getAdapterRequest = function(){
    if (!currentAdapterGroup) {
      return false
    }
    let adapterGroupTargets = findHookTarget(targetRequest, phase, 'adapter', currentAdapterGroup)
    if (adapterGroupTargets instanceof Error) {
      return adapterGroupTargets
    }
    if (!adapterGroupTargets.length) {
      return false
    }
    let router = false
    if (adapterGroupTargets.length == 1) {
      router = adapterGroupTargets.pop()
    } else {
      // TODO: add diferent strategy to choose one of the routes
      router =  getMinLoadedRouter(adapterGroupTargets);
    }
    debug.log('Notify route %s result %O', targetRequest.route, router);
    let headers = getHeaders(router, 'adapter')
    headers['x-hook-group'] = currentAdapterGroup
    // Sign request for hook
    headers['x-hook-signature'] = 'sha256=' 
    + signature('sha256',
      targetRequest.requestDetails._buffer,
      router.secureKey);
    return {
      uri: router.url + targetRequest.path,
      method: 'NOTIFY',
      headers: headers,
      body: targetRequest.requestDetails._buffer
    }
  }
  let callbackAdapterRequest = function(err, response, body) {
    let headerStatusName = 'x-hook-adapter-status-' + currentAdapterGroup + '-' + phase
    if (err || response.statusCode != 200) {
      if (err) {
        debug.log('adapter failed %O', err);
        // TODO status header for adapter
        targetRequest.requestDetails.headers[headerStatusName] = 'error: ' + err.message
      } else {
        debug.log('Adapter failed with code: %s body: %s', response.statusCode, body)
        for (var i in response.headers) {
          if (i.substring(0,6) == 'x-set-') {
            let headerName = i.substr(6)
            targetRequest.requestDetails.headers[headerName] = response.headers[i];
          }
        }
      }
      
    } else {
      debug.log('adapter processed');
      let bodyJSON = false
      try {
        bodyJSON = JSON.parse(body);
      } catch (e) {
        debug.debug('JSON.parse(body) Error received: %O', e);
        debug.log('Notify before reseived not json')
      }
      if (bodyJSON) {
        // need to replace body data
        targetRequest.requestDetails._buffer = body
      }
      // need to set headers x-set-XXXXX
      debug.debug('Adapter Headers received: %O code: %s', response.headers, response.statusCode);
      for (var i in response.headers) {
        if (i.substring(0,6) == 'x-set-') {
          let headerName = i.substr(6)
          targetRequest.requestDetails.headers[headerName] = response.headers[i];
        }
      }
      if (phase == 'before') {
        delete targetRequest.requestDetails.headers['content-length']
        // resign it
        if (targetRequest.requestDetails.headers.signature) {
          targetRequest.requestDetails.headers.signature = 'sha256=' 
          + signature('sha256',
            targetRequest.requestDetails._buffer,
            targetRequest.endpoint.secureKey);
        }
      }
    }
    
    // If more groups left - send more
    if (adapterGroups.length) {
      currentAdapterGroup = adapterGroups.shift()
      return _request(getAdapterRequest, callbackAdapterRequest)
    }
    // return back via callback
    callback()
  }
  _request(getAdapterRequest, callbackAdapterRequest)

}

/**
 * Find all hook routes by stage.
 */
function findHookTarget(targetRequest, phase, type, group){
  debug.debug('Find all hooks route: %s phase: %s type: %s group: %s',
    targetRequest.route, phase, type, group);
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
    for (let hook of target.hook) {
      if (hook.phase !== phase) {
        continue
      }
      if (hook.type !== type) {
        continue
      }
      let targetCopy = JSON.parse(JSON.stringify(target))
      delete targetCopy.hook
      if (hook.group) {
        targetCopy.group = hook.group
      } else {
        targetCopy.group = '_default'
      }

      finalHookTable.push(targetCopy)
    }
  }
  if (typeof group !== "undefined") {
    finalHookTable = finalHookTable.filter(function(elem){
      return elem.group == group
    })
  }
  if (!finalHookTable.length) {
    debug.debug('Not found for %s', targetRequest.route);
    debug.log('Hook instance %s not found', group);
    return new Error('Hook instance not found');
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
  debug.debug('Available routes type: %s route: %s availableRoutes: %s', type, targetRequest.route,
    JSON.stringify(availableRoutes , null, 2));
  if (availableRoutes.length == 0) {
    debug.debug('Not found for %s', targetRequest.route);
    return new Error('Endpoint not found');
  }
  return availableRoutes;
}

/**
 * Get Router with minimum CPU used.
 */
function getMinLoadedRouter(availableRoutes) {
  let minRouter = availableRoutes.pop();
  let totalCPU = {
    cpu:0,
    loadavg: 0
  }
  if(minRouter.metrics) {
    totalCPU = minRouter.metrics.reduce(function(a, b) {

      return {
        cpu : parseFloat(a.cpu) + parseFloat(b.cpu) + a.loadavg[0] + b.loadavg[0],
        loadavg: [0]
      };
    });
  }
  minRouter.cpu = totalCPU.cpu;
  debug.debug('MinRouter %O', minRouter);
  for (let i in availableRoutes) {
    let totalCPU = {
      cpu:0,
      loadavg: 0
    }
    if(availableRoutes[i].metrics) {
      totalCPU = availableRoutes[i].metrics.reduce(function(a, b) {
        return {
          cpu : parseFloat(a.cpu) + parseFloat(b.cpu) + a.loadavg[0] + b.loadavg[0],
          loadavg: [0]
        };
      });
    }
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
  let requestOptions = getRequest()
  
  if (requestOptions instanceof Error) {
    return callback(requestOptions)
  }
  if (requestOptions === false) {
    return callback(false)
  }
  
  // Validate URI 
  let uri = url.parse(requestOptions.uri);
  if (!(uri.host || (uri.hostname && uri.port)) && !uri.isUnix) {
    return callback(new Error('Invalid URI' + requestOptions.uri))
  }
  request(requestOptions, function(error, response, body) {
    if (error) {
      // TODO add limit to re send
      debug.debug('_request Error received: %O', error);
      debug.debug('_request Restart request: %O', requestOptions);
      return _request(getRequest, callback);
    }
    
    debug.debug('%s body: %s', requestOptions.uri, body);
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
  let endpointTargets = findAllTargets(targetRequest, 'handler');
  if (endpointTargets instanceof Error) {
    debug.debug('Route %s err %O', route, endpointTargets);
    return callback(endpointTargets, null);
  }

  targetRequest.endpoint = {
    scope: endpointTargets[0].scope,
    secureKey: endpointTargets[0].secureKey
  }

  hookCall(targetRequest, 'before', function(){
    //used later in sendBroadcastMessage
    let router = false
    // process request to endpoint
    let getEndpointRequest = function(){
      let endpointTargets = findAllTargets(targetRequest, 'handler');
      if (endpointTargets instanceof Error) {
        return endpointTargets
      }
      if (!endpointTargets.length) {
        return false
      }
      
      if (endpointTargets.length == 1) {
        router = endpointTargets.pop();
      } else {
        // TODO: add diferent strategy to choose one of the routes
        router =  getMinLoadedRouter(endpointTargets);
      }
      debug.log('Endpoint route %s result %O', route, router);
      let headers = {};
      let i;
      for (i in requestDetails.headers) {
        if (i != 'host') {
          headers[i] = requestDetails.headers[i];
        }
      }

      for (i in router.matchVariables) {
        headers['mfw-' + i] = router.matchVariables[i];
      }
      return {
        uri: router.url + path,
        method: method,
        headers: headers,
        body: requestDetails._buffer
      }
    }
    let callbackEndpointRequest = function(err, response, body){
      if (err) {
        debug.log('endpoint failed %O', err);
        if (err !== false) {
          // TODO call after hooks
          return callback(err, null)
        }
        // TODO call after hooks
        return callback(new Error('Endpoint not found'), null)
      }
      let bodyJSON = false
      try {
        bodyJSON = JSON.parse(body);
      } catch (e) {
        debug.debug('JSON.parse(body) Error received: %O', e);
        return callback(new Error('Service respond is not JSON.'));
      }
      debug.debug('%s body: %O', route, bodyJSON);

      // process after hooks
      // hookCall requestDetails.headers and _buffer should contain response data.
      let answerDetails = {
        headers: response.headers,
        _buffer: body,
        method: method
      }
      let targetAnswer = {
        route: route,
        path: path,
        method: method,
        jsonData: bodyJSON,
        requestDetails: answerDetails,
        endpoint: targetRequest.endpoint
      }
      hookCall(targetAnswer, 'after', function(){
        let body = false
        // Double check updated _buffer after proxy.
        try {
          body = JSON.parse(answerDetails._buffer);
        } catch (e) {
          debug.debug('JSON.parse(body) Error received: %O', e);
          return callback(new Error('Service respond is not JSON.'));
        }
        // prefix with base_URL all urls
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

        let responseHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT, SEARCH',
          'Access-Control-Allow-Headers': 'content-type, signature, access_token,'
            + ' token, Access-Token',
          'Access-Control-Expose-Headers': 'x-total-count',
        };
        for (var i in answerDetails.headers) {
          if (i.substring(0,1) == 'x') {
            responseHeaders[i] = answerDetails.headers[i];
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

      })
    }
    _request(getEndpointRequest, callbackEndpointRequest)
    
  })
}

/**
 * Proxy request to backend server.
 * deprecated. WS need to be replaced by boracast hook
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

/**
 * Send broadcast message to UDP client.
 * deprecated. WS need to be replaced by boracast hook
 */
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
      debug.debug('Updated router table %O', newServices);
      globalServices = newServices;
    });
  });
}
