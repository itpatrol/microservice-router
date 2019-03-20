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

module.exports = function(conditions, requestDetails, jsonData) {
  debug('checkConditions %O requestDetails: %O json: %O', conditions, requestDetails, jsonData)
  if (conditions.headers && conditions.headers.length) {
    for (let header of conditions.headers ) {
      if (!requestDetails.headers[header.name]) {
        return false
      }
      let receivedHeaderValue = requestDetails.headers[header.name]
      if (header.isRegex) {
        let pattern = new RegExp(header.value, "i")
        if (!pattern.test(receivedHeaderValue)) {
          return false
        }
      } else {
        if (receivedHeaderValue !== header.value) {
          return false
        }
      }
    }
  }
  // check methods
  if (conditions.methods && conditions.methods.length) {
    if (conditions.methods.toUpperCase) {
      if (requestDetails.method != conditions.methods.toUpperCase()) {
        return false
      }
    } else {
      for (let i in conditions.methods) {
        conditions.methods[i] = conditions.methods[i].toUpperCase()
      }
      if (conditions.methods.indexOf(requestDetails.method) === -1) {
        return false;
      }
    }
    
  }
  // check payload
  if (conditions.payload && conditions.payload.length && jsonData) {
    if (typeof jsonData != "object") {
      return false
    }
    for (let payload of conditions.payload ) {
      debug('Checking for payload conditions %O', payload)
      let receivedPayloadValue = getProperty(payload.name, jsonData)
      debug('receivedPayloadValue %O', receivedPayloadValue)
      if (receivedPayloadValue instanceof Error) {
        return false
      }
      if (payload.isRegex) {
        let pattern = new RegExp(payload.value, "i")
        debug('pattern.test %O', pattern.test(receivedPayloadValue))
        if (!pattern.test(receivedPayloadValue)) {
          return false
        }
      } else {
        if (receivedPayloadValue !== payload.value) {
          return false
        }
      }
    }
  }
  return true
}
