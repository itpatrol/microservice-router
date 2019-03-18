const request = require('request');

const findAllTargets = require('./findAllTargets.js')
const findHookTarget = require('./findHookTarget.js')
const sendBroadcastMessage = require('./sendBroadcastMessage.js')
const decodeData = require('./decodeData.js')


/**
 * Process before Hooks.
 */
function hookCall(targetRequest, globalServices, phase, callback) {
  
  let getHeaders = function(router, hookType){
    let headers = {};
    // TODO verify date,content-type, transfer-encoding headers
    let skipHeaders = [
      'host', // issue to properly connect
      'connection', // if it is closed, behavior is unexpected
      'transfer-encoding', //we need to ignore that one.
      'content-length', //issue with recounting length of the package
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
  let broadcastTargets = findHookTarget(targetRequest, phase, 'broadcast', false, globalServices)
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
        _request(getBroadcastRequest, callbackBroadcastRequest, targetRequest, false, globalServices)
      }
    }
    _request(getBroadcastRequest, callbackBroadcastRequest, targetRequest, false, globalServices)
  }

  // send Notify
  let notifyTargets = findHookTarget(targetRequest, phase, 'notify', false, globalServices)
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
        debug.debug('notify Groups %s %O', currentNotifyGroup, notifyGroups);
        if (!currentNotifyGroup) {
          return false
        }
        let notifyGroupTargets = findHookTarget(targetRequest, phase, 'notify', currentNotifyGroup, globalServices)
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
          _request(getNotifyRequest, callbackNotifyRequest, targetRequest, false, globalServices)
        }
      }
      _request(getNotifyRequest, callbackNotifyRequest, targetRequest, false, globalServices)
    }
  }


  // send adapter
  let adapterTargets = findHookTarget(targetRequest, phase, 'adapter', false, globalServices)
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
    let adapterGroupTargets = findHookTarget(targetRequest, phase, 'adapter', currentAdapterGroup, globalServices)
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
          if (i.substring(0, 6) == 'x-set-') {
            let headerName = i.substr(6)
            targetRequest.requestDetails.headers[headerName] = response.headers[i];
          }
        }
      }
      
    } else {
      debug.log('adapter processed');
      targetRequest.requestDetails._buffer = body
      // need to set headers x-set-XXXXX
      debug.debug('Adapter Headers received: %O code: %s', response.headers, response.statusCode);
      for (var i in response.headers) {
        if (i.substring(0, 6) == 'x-set-') {
          let headerName = i.substr(6)
          targetRequest.requestDetails.headers[headerName] = response.headers[i];
        }
      }
      delete targetRequest.requestDetails.headers['content-length']
      if (phase == 'before') {
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
      return _request(getAdapterRequest, callbackAdapterRequest, targetRequest, false, globalServices)
    }
    // return back via callback
    callback()
  }
  _request(getAdapterRequest, callbackAdapterRequest, targetRequest, false, globalServices)

}


/**
 * decode buffer to specidied by content-type format.
 */




function _request(getRequest, callback, targetRequest, noMetric, globalServices) {
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

  let getHeaders = function(router, hookType){
    let headers = {};
    // TODO verify date,content-type, transfer-encoding headers
    let skipHeaders = [
      'host',
      'date',
      'connection',
      'content-length',
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
    headers['x-endpoint-scope'] = targetRequest.endpoint.scope
    debug.debug('%s headers %O', targetRequest.route, headers);
    return headers;
  }
  let startTime = Date.now();
  debug.request('requestOptions: %O', requestOptions);
  request(requestOptions, function(error, response, body) {
    debug.request('requestOptions: %O answer err %O body %s', requestOptions, error, body);
    let endTime = Date.now();
    let executeTime = endTime - startTime
    
    debug.debugMetric('requestOptions: %O executeTime: %s', requestOptions, executeTime);
    if (!noMetric) {
      let metricTargets = findAllTargets(targetRequest, 'metric', globalServices)
      debug.debugMetric('findHookTarget: for %s result: %O', targetRequest.route, metricTargets);
    
      if (metricTargets instanceof Array) {
        let getMetricRequest = function(){
          if (metricTargets instanceof Error) {
            return metricTargets
          }
          if (!metricTargets.length) {
            return false
          }
          let router = metricTargets.pop()
          debug.log('Metric route %s result %O', targetRequest.route, router);
          
          let statusCode = 0
          if (error) {
            statusCode = error.code
          } else {
            if (response.statusCode) {
              statusCode = response.statusCode
            }
          }

          let metricJSON = {
            startTime: startTime,
            endTime: endTime,
            executeTime: executeTime,
            code: statusCode,
            method: requestOptions.method,
            headers: requestOptions.headers,
            uri: requestOptions.uri,
            route: targetRequest.route,
          }
          if (body && body.length) {
            metricJSON.responseLength = body.length;
          }
          if (requestOptions.body && requestOptions.body.length) {
            metricJSON.requestLength = requestOptions.body.length;
          }
          if (!router.meta) {
            metricJSON.request = targetRequest.requestDetails._buffer;
            metricJSON.response = body;
          }
          let metricBody = JSON.stringify(metricJSON)
          let headers = getHeaders(router, 'metric')
          // Sign request for hook
          headers['x-hook-signature'] = 'sha256='
            + signature('sha256', metricBody, router.secureKey);
          
          return {
            uri: router.url + targetRequest.path,
            method: 'NOTIFY',
            headers: headers,
            body: metricBody,
            timeout: 300 // For metrics we limit to 300 ms.
          }
        }
        let callbackMetricRequest = function(err, response, body){
          // No action on broadcast hook.
          if (err) {
            debug.log('metric failed %O', err);
          }
          debug.log('metric sent');
          debug.debugMetric('Metric targetRequest %O ', targetRequest);
          // If more in queue left - send more
          if (metricTargets.length) {
            _request(getMetricRequest, callbackMetricRequest, targetRequest, true, globalServices)
          }
        }
        _request(getMetricRequest, callbackMetricRequest, targetRequest, true, globalServices)
      } else {
        debug.debugMetric('no metric enpoints');
      }
    } else {
      debug.debugMetric('metric disabled');
    }
    
    if (error) {
      // TODO add limit to re send
      debug.debug('_request Error received: %O', error);
      debug.debug('_request Restart request: %O', requestOptions);
      // Do not try to redeliver metrics. can lock a event loop
      if (!noMetric) {
        return _request(getRequest, callback, targetRequest, false, globalServices);
      }
    }
    
    debug.debug('%s body: %s', requestOptions.uri, body);
    return callback(null, response, body)
  })
}







module.exports = function(targetRequest, globalServices, callback){
  debug.debug('Route base: %s', targetRequest.route);

  let endpointTargets = findAllTargets(targetRequest, 'handler', globalServices);
  if (endpointTargets instanceof Error) {
    debug.debug('Route %s err %O', targetRequest.route, endpointTargets);
    return callback(endpointTargets, null);
  }

  targetRequest.endpoint = {
    scope: endpointTargets[0].scope,
    secureKey: endpointTargets[0].secureKey
  }

  hookCall(targetRequest, globalServices, 'before', function(){
    //used later in sendBroadcastMessage
    let router = false
    // process request to endpoint
    let getEndpointRequest = function(){
      if (endpointTargets.length == 1) {
        router = endpointTargets.pop();
      } else {
        // TODO: add diferent strategy to choose one of the routes
        router =  getMinLoadedRouter(endpointTargets);
      }
      debug.log('Endpoint route %s result %O', targetRequest.route, router);
      let headers = {};
      let i;
      let skipHeaders = [
        'host',
        'connection',
        'content-length'
      ]
      for (i in targetRequest.requestDetails.headers) {
        if (skipHeaders.indexOf(i) != -1) {
          continue;
        }
        headers[i] = targetRequest.requestDetails.headers[i];
      }

      for (i in router.matchVariables) {
        headers['mfw-' + i] = router.matchVariables[i];
      }
      return {
        uri: router.url + targetRequest.path,
        method: targetRequest.method,
        headers: headers,
        body: targetRequest.requestDetails._buffer
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
      let bodyJSON = ""
      try {
        bodyJSON = decodeData(response.headers['content-type'], body)
      } catch (e) {
        debug.debug('decodeData Error received: %O', e);
        return callback(e);
      }
      debug.debug('%s body: %O', route, body);
      
      // process after hooks
      // hookCall requestDetails.headers and _buffer should contain response data.
      let answerDetails = {
        headers: response.headers,
        _buffer: body,
        method: targetRequest.method
      }
      let targetAnswer = {
        route: targetRequest.route,
        path: targetRequest.path,
        method: targetRequest.method,
        jsonData: bodyJSON,
        requestDetails: answerDetails,
        endpoint: targetRequest.endpoint
      }
      hookCall(targetAnswer, globalServices, 'after', function(){

        // Double check updated _buffer after proxy.
        let body = false
        try {
          body = decodeData(answerDetails.headers['content-type'], answerDetails._buffer)
        } catch (e) {
          debug.debug('decodeData Error received: %O', e);
          return callback(e);
        }
        if (typeof body == "object") {
          // prefix with base_URL all urls
          if (targetRequest.method != 'OPTIONS') {
            if (body.url) {
              // Make sure that url is not absolute
              if (body.url.indexOf('http://') == -1
                && body.url.indexOf('https://') == -1) {
                body.url = process.env.BASE_URL + body.url;
              }
            } else if (body.id) {
              body.url = process.env.BASE_URL + route + '/' + body.id;
            }
          }
        }
        if (body instanceof Array) {
          for (var i in body) {
            if (body[i].url) {
              // Make sure that url is not absolute
              if (body[i].url.indexOf('http://') == -1
                && body[i].url.indexOf('https://') == -1 ) {
                body[i].url =  process.env.BASE_URL + body[i].url;
              }
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
          if (i.substring(0, 1) == 'x') {
            responseHeaders[i] = answerDetails.headers[i];
          }
        }
        // deprecated. websoket need to be rewriten as a hook broadcast
        if (response.statusCode == 200) {
          sendBroadcastMessage(targetRequest.router,
            targetRequest.method, targetRequest.requestDetails.url, body);
        }
        callback(null, {
          code: response.statusCode,
          answer: body,
          headers: responseHeaders
        });

      })
    }
    _request(getEndpointRequest, callbackEndpointRequest, targetRequest, false, globalServices)
    
  })
}