/**
 * Check if route match request.
 * 
 * @param Object targetRequest  request details
 * @param Object routeItem ob route table
 *
 * @return Boolean true if conditions are met
 */
'use strict';

const debug = require('debug')('proxy:match-route');
const checkPath = require('./checkPath.js')
const checkConditions = require('./checkConditions.js')

module.exports = function(targetRequest, routeItem) {
  if (routeItem.type == "metric") {
    if (!routeItem.conditions) {
      return true
    }
    return checkConditions(routeItem.conditions, targetRequest.requestDetails, targetRequest.jsonData)
  }
  if (routeItem.path && routeItem.path.length == 1 && routeItem.path[0] == '*') {
    if (!routeItem.conditions) {
      return true
    }
    return checkConditions(routeItem.conditions, targetRequest.requestDetails, targetRequest.jsonData)
  }
  if (!checkPath(targetRequest, routeItem)) {
    return false
  }
  if (!routeItem.conditions) {
    return true
  }
  return checkConditions(routeItem.conditions, targetRequest.requestDetails, targetRequest.jsonData)
}
