/**
 * Send Hook Broadcast
 *
 * @param Object targetRequest request details
 * @param String phase(optional) hook phase: before, after, metric
 * @param Object object all available routes
 *
 * @return 
 */
'use strict';

const debug = require('debug')('proxy:send-hook-broadcast');

const getHookHeaders = require('./getHeaders.js')
const sendRequest = require('./sendRequest.js')
const findHookTarget = require('./findHookTarget.js')

function processBroadcast(broadcastTargets, targetRequest, phase, globalServices) {
  if (!broadcastTargets.length) {
    return false
  }
  let routerItem = broadcastTargets.pop()
  let requestOptions = {
    uri: routerItem.url + targetRequest.path,
    method: 'NOTIFY',
    headers: getHookHeaders(targetRequest, routerItem, phase, 'broadcast', false, true),
    body: targetRequest.requestDetails._buffer
  }
  if(routerItem.hook.phase == "metric" && routerItem.hook.meta) {
    let jsonCopy = JSON.parse(JSON.stringify(targetRequest.jsonData))
    delete jsonCopy.request
    delete jsonCopy.response
    requestOptions.body = JSON.stringify(jsonCopy)
  }
  sendRequest(requestOptions, targetRequest, globalServices, function(err){
    if (err) {
      debug('broadcast failed %O', err);
    } else {
      debug('broadcast sent');
    }
    if (broadcastTargets.length) {
      processBroadcast(broadcastTargets, targetRequest, phase, globalServices)
    }
  })
}

module.exports = function(targetRequest, phase, globalServices){
  let broadcastTargets = findHookTarget(targetRequest, phase, 'broadcast', false, globalServices)
  debug('Broadcast: Phase %s for %s result: %O', phase, targetRequest.route, broadcastTargets);
  if (broadcastTargets instanceof Array) {
    processBroadcast(broadcastTargets, targetRequest, phase, globalServices)
  }
}
