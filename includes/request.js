const request = require('request');

const findAllTargets = require('./findAllTargets.js')
const findHookTarget = require('./findHookTarget.js')
const sendBroadcastMessage = require('./sendBroadcastMessage.js')
const decodeData = require('./decodeData.js')
const getHookHeaders = require('./getHeaders.js')
const sendRequest = require('./sendRequest.js')
const sendHookBroadcast = require('./sendHookBroadcast.js')
const sendHookNotify = require('./sendHookNotify.js')
const sendHookAdapter = require('./sendHookAdapter.js')
const getHeaders = require('./getHeaders.js')
const debug = require('debug')('proxy:request-wrapper');

/**
 * Process before Hooks.
 */
function hookCall(targetRequest, globalServices, phase, callback) {
  sendHookBroadcast(targetRequest, phase, globalServices)
  sendHookNotify(targetRequest, phase, globalServices)
  sendHookAdapter(targetRequest, phase, globalServices, callback)
}

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

function processEndpoint(endpointTargets, targetRequest, globalServices, callback) {
  if (!endpointTargets.length) {
    // TODO: policy for repeat.
    return callback(new Error('Endpoint not found'))
  }
  // TODO apply tags based vouting here
  let routerItem = endpointTargets.pop()
  let requestOptions = {
    uri: routerItem.url + targetRequest.path,
    method: targetRequest.method,
    headers: getHeaders(targetRequest, routerItem, false, false, false, false),
    body: targetRequest.requestDetails._buffer
  }
  sendRequest(requestOptions, targetRequest, globalServices, function(err, response, body){
    if(err) {
      return processEndpoint(endpointTargets, targetRequest, globalServices, callback)
    }
    callback(err, response, body)
  })

}

module.exports = function(targetRequest, globalServices, callback){
  debug('Route base: %s', targetRequest.route);

  let endpointTargets = findAllTargets(targetRequest, 'handler', globalServices);
  if (endpointTargets instanceof Error) {
    debug('Route %s err %O', targetRequest.route, endpointTargets);
    return callback(endpointTargets, null);
  }

  targetRequest.endpoint = {
    scope: endpointTargets[0].scope,
    secureKey: endpointTargets[0].secureKey
  }

  hookCall(targetRequest, globalServices, 'before', function(){
    processEndpoint(endpointTargets, targetRequest, globalServices, function(err, response, body) {
      if(err) {
        // TODO possible call hoot after
        return callback(err, null)
      }
      let bodyJSON = ""
      try {
        bodyJSON = decodeData(response.headers['content-type'], body)
      } catch (e) {
        debug('decodeData Error received: %O', e);
        return callback(e);
      }
      debug('Requesnt endpoint on %s body: %O', route, body);
      // Process after hooks
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
          sendBroadcastMessage(targetRequest, body, globalServices);
        }
        callback(null, {
          code: response.statusCode,
          answer: body,
          headers: responseHeaders
        });
      })
    })
  })
}
