/**
 * Find all targets for hook
 *
 * @param Object targetRequest request details
 * @param Object routeItem ob route table
 * @param String phase(optional) hook phase: before, after, metric
 * @param String hookType(optional) hook type: adapter, notify, broadcast
 * @param String hookGroup(optional) user defined routerItem group
 * @param Boolean generate Signature(optional)
 * @param Object object headers
 *
 * @return array of objects with available routes
 */
'use strict';

const debug = require('debug')('proxy:get-hook-headers');
const signature = require('./signature.js');
const skipHeaders = [
  'host', // issue to properly connect
  'connection', // if it is closed, behavior is unexpected
  'transfer-encoding', //we need to ignore that one.
  'content-length', //issue with recounting length of the package
]

module.exports = function(targetRequest, routeItem, phase, hookType, hookGroup, isSignature) {
  let headers = {};
  for (let i in targetRequest.requestDetails.headers) {
    if (skipHeaders.indexOf(i) != -1) {
      continue
    }
    headers[i] = targetRequest.requestDetails.headers[i];
  }
  for (let i in routeItem.matchVariables) {
    headers['mfw-' + i] = routeItem.matchVariables[i];
  }
  headers['x-origin-url'] = targetRequest.route
  headers['x-origin-method'] = targetRequest.method
  headers['x-endpoint-scope'] = targetRequest.endpoint.scope
  if (phase) {
    headers['x-hook-phase'] = phase
  }
  if (hookType) {
    headers['x-hook-type'] = hookType
  }
  if (hookGroup) {
    headers['x-hook-group'] = hookGroup
  }
  
  if (isSignature) {
    headers['x-hook-signature'] = 'sha256=' 
      + signature('sha256', targetRequest.requestDetails._buffer, routeItem.secureKey)
  }
  debug.debug('TargetRequest %O routeItem %O phase %s hookType headers %O', targetRequest,
  routeItem, phase, hookType, headers);
  return headers
}
