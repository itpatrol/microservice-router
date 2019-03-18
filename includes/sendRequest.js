/**
 * Find all targets for hook
 *
 * @param Object RequestOptions options for request module
 * @param Object targetRequest request details
 * @param Object object all available routes
 * @param Function callback that receive answer
 *
 * @return array of objects with available routes
 */
'use strict';

const request = require('request');
const debug = require('debug')('proxy:request');
const debugBody = require('debug')('proxy:request-body');
const url = require('url');

module.exports = function(requestOptions, targetRequest, globalServices, callback){
  // Validate URI 
  let uri = url.parse(requestOptions.uri);
  if (!(uri.host || (uri.hostname && uri.port)) && !uri.isUnix) {
    return callback(new Error('Invalid URI' + requestOptions.uri))
  }
  let startTime = Date.now();
  debug('requestOptions: %O', requestOptions);
  request(requestOptions, function(error, response, body) {
    debug('requestOptions: %O answer err %O body %s', requestOptions, error, body);
    let endTime = Date.now();
    let executeTime = endTime - startTime
    if (error) {
      // TODO add limit to re send
      debug('_request %O Error received: %O', requestOptions, error);
    } else {
      debugBody('_request %O Body: %s', requestOptions, body);
    }
    return callback(error, response, body)
  })
}
