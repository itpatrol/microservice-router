const request = require('request');

const findAllTargets = require('./findAllTargets.js')
const findHookTarget = require('./findHookTarget.js')
const sendBroadcastMessage = require('./sendBroadcastMessage.js')
const decodeData = require('./decodeData.js')
const getHookHeaders = require('./getHookHeaders.js')
const sendRequest = require('./sendRequest.js')
const sendHookBroadcast = require('./sendHookBroadcast.js')


/**
 * Process before Hooks.
 */
function hookCall(targetRequest, globalServices, phase, callback) {
  
  sendHookBroadcast(targetRequest, phase, globalServices)
  

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
      let currentNotifyTargets = notifyTargets.filter(function(a) {
        return a.group == currentNotifyGroup
      })

      let processNotify = function() {
        debug.debug('notify Groups %s %O', currentNotifyGroup, notifyGroups);
        if (!currentNotifyTargets.length) {
          if(!notifyGroups.length) {
            return
          }
          // Try next group if available 
          if(notifyGroups.length) {
            currentNotifyGroup = notifyGroups.shift()
            currentNotifyTargets = notifyTargets.filter(function(a) {
              return a.group == currentNotifyGroup
            })
            return processNotify()
          }
          return
        }
        // TODO apply tags based vouting here
        let routerItem = currentNotifyTargets.pop()
        let requestOptions = {
          uri: routerItem.url + targetRequest.path,
          method: 'NOTIFY',
          headers: getHookHeaders(targetRequest, routerItem, phase, 'notify', currentNotifyGroup, true),
          body: targetRequest.requestDetails._buffer
        }
        sendRequest(requestOptions, targetRequest, globalServices, function(err){
          if (err) {
            debug.log('notify failed %O', err);
            // Try next in line
            return processNotify()
          }
          
          debug.log('notify sent');
          if(!notifyGroups.length) {
            return
          }
          //try next group
          currentNotifyGroup = notifyGroups.shift()
          currentNotifyTargets = notifyTargets.filter(function(a) {
            return a.group == currentNotifyGroup
          })
          return processNotify()
        })
      }
      processNotify();
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
  let currentAdapterGroupTargets = adapterTargets.filter(function(a) {
    return a.group == currentAdapterGroup
  })

  let processAdapter = function() {
    debug.debug('Adapter Groups %s %O', currentAdapterGroup, adapterGroups);
    if (!currentAdapterGroupTargets.length) {
      if(!adapterGroups.length) {
        return callback(true)
      }
      // Try next group if available 
      currentAdapterGroup = adapterGroups.shift()
      currentAdapterGroupTargets = adapterTargets.filter(function(a) {
        return a.group == currentAdapterGroup
      })
      return processAdapter()
    }
    // TODO apply tags based vouting here
    let routerItem = currentAdapterGroupTargets.pop()
    let requestOptions = {
      uri: routerItem.url + targetRequest.path,
      method: 'NOTIFY',
      headers: getHookHeaders(targetRequest, routerItem, phase, 'adapter', currentAdapterGroup, true),
      body: targetRequest.requestDetails._buffer
    }
    sendRequest(requestOptions, targetRequest, globalServices, function(err, response, body){
      let headerStatusName = 'x-hook-adapter-status-' + currentAdapterGroup + '-' + phase
      if (err) {
        // It's communication error and we need to try next adapter
        if (!currentAdapterGroupTargets.length) {
          // no more adapters in current group. Set Status.
          targetRequest.requestDetails.headers[headerStatusName] = 'error: ' + err.message
          
        }
        // Go to next Adapter to next Group
        return processAdapter()
      }
      if(response.statusCode != 200) {
        debug.log('Adapter failed with code: %s body: %s', response.statusCode, body)
        for (var i in response.headers) {
          if (i.substring(0, 6) == 'x-set-') {
            let headerName = i.substr(6)
            targetRequest.requestDetails.headers[headerName] = response.headers[i];
          }
        }
        // TODO Maybe if addapter return !200 code, we need to return it to client
        // Go to next group
        if (adapterGroups.length) {
          currentAdapterGroup = adapterGroups.shift()
          currentAdapterGroupTargets = adapterTargets.filter(function(a) {
            return a.group == currentAdapterGroup
          })
          return processAdapter()
        }
        // No more groups, return via callback
        return callback()
      }
      
      debug.log('adapter processed');
      //Apply body converted by adapter 
      targetRequest.requestDetails._buffer = body
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
      //try next group
      if (adapterGroups.length) {
        currentAdapterGroup = adapterGroups.shift()
        currentAdapterGroupTargets = adapterTargets.filter(function(a) {
          return a.group == currentAdapterGroup
        })
        return processAdapter()
      }
      // return back via callback
      callback()
    })
  }
  processAdapter();
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
          let headers = getHookHeaders(targetRequest, router, false, 'metric', false, false)
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
      return callback(error, response, body)
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