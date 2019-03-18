/**
 * get Headers for Hook
 *
 * @param Object targetRequest request details
 * @param String phase(optional) hook phase: before, after, metric
 * @param Object object all available routes
 *
 * @return array of objects with available routes
 */
'use strict';

const debug = require('debug')('proxy:send-hook-broadcast');

const getHookHeaders = require('./getHookHeaders.js')
const sendRequest = require('./sendRequest.js')

function processBroadcast (broadcastTargets, targetRequest, phase, globalServices) {
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
  sendRequest(requestOptions, targetRequest, globalServices, function(err){
    if (err) {
      debug.log('broadcast failed %O', err);
    } else {
      debug.log('broadcast sent');
    }
    if (broadcastTargets.length) {
      processBroadcast()
    }
  })
}

module.exports = function(targetRequest, phase, globalServices){
  let broadcastTargets = findHookTarget(targetRequest, phase, 'broadcast', false, globalServices)
  debug('Broadcast: Phase %s for %s result: %O', phase, targetRequest.route, broadcastTargets);
  if (broadcastTargets instanceof Array) {
    processBroadcast()
  }
}
