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
const getProperty = require('./getProperty.js')
const mingo = require('mingo')

module.exports = function(conditions, requestDetails, jsonData) {
  debug('checkConditions %O requestDetails: %O json: %O', conditions, requestDetails, jsonData)
  if (conditions.headers ) {
    let query = new mingo.Query(conditions.headers);
    if(!query.test(requestDetails.headers)){
      return false
    }
    //return mingo.find([requestDetails.headers], conditions.headers).count()

  }
  // check methods
  if (conditions.methods && conditions.methods.length) {
    if(conditions.methods instanceof Array) {
      for(let i in conditions.methods) {
        conditions.methods[i] = conditions.methods[i].toUpperCase()
      }
    } else if(conditions.methods.toUpperCase){
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
    //return mingo.find([jsonData], conditions.payload).count()
    let query = new mingo.Query(conditions.payload);
    if(!query.test(jsonData)) {
      return false
    }
  }
  return true
}
