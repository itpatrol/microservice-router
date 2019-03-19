/**
 * Process proxy request
 *
 * @param Object targetRequest request details
 * @param Object object all available routes
 * @param function callback when request processed
 *
 * @return 
 */

'use strict';

const findAllTargets = require('./findAllTargets.js')
const sendBroadcastMessage = require('./sendBroadcastMessage.js')
const decodeData = require('./decodeData.js')
const sendRequest = require('./sendRequest.js')
const sendHookBroadcast = require('./sendHookBroadcast.js')
const sendHookNotify = require('./sendHookNotify.js')
const sendHookAdapter = require('./sendHookAdapter.js')
const getHeaders = require('./getHeaders.js')
const BuildURI = require('./buildURI.js')
const debug = require('debug')('proxy:request-wrapper');

/**
 * Process before Hooks.
 */
function hookCall(targetRequest, globalServices, phase, callback) {
  sendHookBroadcast(targetRequest, phase, globalServices)
  sendHookNotify(targetRequest, phase, globalServices)
  sendHookAdapter(targetRequest, phase, globalServices, callback)
}

function processEndpoint(endpointTargets, targetRequest, globalServices, callback) {
  if (!endpointTargets.length) {
    // TODO: policy for repeat.
    return callback(new Error('Endpoint not found'))
  }
  // TODO apply tags based vouting here
  let routerItem = endpointTargets.pop()
  let requestOptions = {
    uri: BuildURI(routerItem.endpointUrl, targetRequest.path),
    method: targetRequest.method,
    headers: getHeaders(targetRequest, routerItem, false, false, false, false),
    body: targetRequest.requestDetails._buffer
  }
  sendRequest(requestOptions, targetRequest, globalServices, function(err, response, body){
    if (err) {
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
      if (err) {
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
      debug('Requesnt endpoint on %s body: %O', targetRequest.route, body);
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
                body.url = BuildURI(process.env.BASE_URL, body.url)
              }
            } else if (body.id) {
              body.url = BuildURI(process.env.BASE_URL, BuildURI(targetRequest.route, body.id))
            }
          }
        }
        if (body instanceof Array) {
          for (let i in body) {
            if (body[i].url) {
              // Make sure that url is not absolute
              if (body[i].url.indexOf('http://') == -1
                && body[i].url.indexOf('https://') == -1 ) {
                body[i].url =  BuildURI(process.env.BASE_URL, body[i].url)
              }
            } else if (body[i].id) {
              body[i].url = BuildURI(process.env.BASE_URL,
                BuildURI(targetRequest.route, body[i].id))
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
        for (let i in answerDetails.headers) {
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
