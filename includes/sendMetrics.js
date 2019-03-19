/**
 * Send Hook Notify
 *
 * @param Object targetRequest request details
 * @param String phase(optional) hook phase: before, after, metric
 * @param Object object all available routes
 * @param function callback when adapter processed
 *
 * @return 
 */
'use strict';

const debug = require('debug')('proxy:send-hook-metric');
const sendHookBroadcast = require('./sendHookBroadcast.js')
const sendHookNotify = require('./sendHookNotify.js')

module.exports = function(error, response, body, startTime, targetRequest, requestOptions, globalServices){
  let endTime = Date.now();
  let executeTime = endTime - startTime
  debug('requestOptions: %O executeTime: %s', requestOptions, executeTime);
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
  metricJSON.request = targetRequest.requestDetails._buffer;
  metricJSON.response = body;

  let targetMetrics = {
    route: targetRequest.route,
    path: targetRequest.path,
    method: targetRequest.method,
    jsonData: metricJSON,
    requestDetails: {
      headers: targetRequest.headers,
      _buffer: JSON.stringify(metricJSON),
      method: targetRequest.method
    },
    endpoint: targetRequest.endpoint, 
    isMetric: true
  }

  sendHookNotify(targetMetrics, 'metric', globalServices)
  sendHookBroadcast(targetMetrics, 'metric', globalServices)
}
