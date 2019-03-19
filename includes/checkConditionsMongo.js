/**
 * Check Conditions for request.
 * 
 * @param Object conditions object with headers, payload and methods properties
 * @param Object requestDetails http request details
 * @param Object requestDetails http request json body.
 *
 * @return Boolean true if conditions are met
 */
'use strict';
const debug = require('debug')('proxy:check-conditions');
const sift = require('sift').default

module.exports = function(conditions, requestDetails, jsonData) {
  debug('checkConditions %O requestDetails: %O json: %O', conditions, requestDetails, jsonData)
  if (conditions.headers ) {
    let result = sift(conditions.headers, [requestDetails.headers])
    if (!result.length){
      return false
    }

  }
  // check methods
  if (conditions.methods && conditions.methods.length) {
    if (conditions.methods instanceof Array) {
      for (let i in conditions.methods) {
        conditions.methods[i] = conditions.methods[i].toUpperCase()
      }
    } else if (conditions.methods.toUpperCase){
      conditions.methods = conditions.methods.toUpperCase()
    }
    if (conditions.methods.indexOf(requestDetails.method) === -1) {
      return false;
    }
  }
  // check payload
  if (conditions.payload) {
    if (typeof jsonData != "object") {
      return false
    }
    let result = sift(conditions.payload, [jsonData])
    if (!result.length){
      return false
    }
  }
  return true
}
