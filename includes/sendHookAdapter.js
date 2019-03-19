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

const debug = require('debug')('proxy:send-hook-adapter');

const getHookHeaders = require('./getHeaders.js')
const sendRequest = require('./sendRequest.js')
const findHookTarget = require('./findHookTarget.js')
const BuildURI = require('./buildURI.js')
const signature = require('./signature.js');

function processAdapter(adapterTargets, targetRequest,
                        phase, globalServices, callbackAdapterGroup) {
  if (!adapterTargets.length) {
    return callbackAdapterGroup()
  }
  // TODO apply tags based vouting here
  let routerItem = adapterTargets.pop()
  let requestOptions = {
    uri: BuildURI(routerItem.endpointUrl, targetRequest.path),
    method: 'NOTIFY',
    headers: getHookHeaders(targetRequest, routerItem, phase, 'adapter', routerItem.group, true),
    body: targetRequest.requestDetails._buffer
  }
  sendRequest(requestOptions, targetRequest, globalServices, function(err, response, body){
    let headerStatusName = 'x-hook-adapter-status-' + routerItem.group + '-' + phase
    if (err) {
      debug('Adapter failed %O', err);
      // It's communication error and we need to try next adapter
      if (!adapterTargets.length) {
        // no more adapters in current group. Set Status.
        targetRequest.requestDetails.headers[headerStatusName] = 'error: ' + err.message
        return callbackAdapterGroup()
      }
      return processAdapter(adapterTargets, targetRequest,
                            phase, globalServices, callbackAdapterGroup)
    }
    if (response.statusCode != 200) {
      debug('Adapter failed with code: %s body: %s', response.statusCode, body)
      for (let i in response.headers) {
        if (i.substring(0, 6) == 'x-set-') {
          let headerName = i.substr(6)
          targetRequest.requestDetails.headers[headerName] = response.headers[i];
        }
      }
      // TODO Maybe if addapter return !200 code, we need to return it to client
      return callbackAdapterGroup()
    }
    debug('adapter processed');
    targetRequest.requestDetails._buffer = body
    debug('Adapter Headers received: %O code: %s', response.headers, response.statusCode);
    for (let i in response.headers) {
      if (i.substring(0, 6) == 'x-set-') {
        let headerName = i.substr(6)
        targetRequest.requestDetails.headers[headerName] = response.headers[i];
      }
    }
    delete targetRequest.requestDetails.headers['content-length']
    if (phase == 'before') {
      // resign it
      if (targetRequest.requestDetails.headers.signature) {
        targetRequest.requestDetails.headers.signature = 'sha256=' 
        + signature('sha256',
          targetRequest.requestDetails._buffer,
          targetRequest.endpoint.secureKey);
      }
    }
    callbackAdapterGroup()
  })
}

function processAdapterGroup(adapterGroups, adapterTargets, targetRequest,
                              phase, globalServices, callback){
  if (!adapterGroups.length){
    debug('No more adapter groups left');
    return callback(false)
  }

  let currentAdapterGroup = adapterGroups.shift()
  let currentAdapterTargets = adapterTargets.filter(function(a) {
    return a.group == currentAdapterGroup
  })
  processAdapter(currentAdapterTargets, targetRequest,
                  phase, globalServices, function(){
    processAdapterGroup(adapterGroups, adapterTargets, targetRequest,
                        phase, globalServices, callback)
  })

}

module.exports = function(targetRequest, phase, globalServices, callback){
  let adapterTargets = findHookTarget(targetRequest, phase, 'adapter', false, globalServices)
  debug('Adapter: Phase %s for %s result: %O', phase, targetRequest.route, adapterTargets);
  if (adapterTargets instanceof Error) {
    // No adapters found. return true, no error but nothing to process.
    debug('No adapter groups found');
    return callback(adapterTargets)
  }
  let adapterGroups = []
  for (let target of adapterTargets) {
    if (target.group) {
      if (adapterGroups.indexOf(target.group) == -1) {
        adapterGroups.push(target.group)
      }
    }
  }
  if (!adapterGroups.length) {
    // No adapters found. return true, no error but nothing to process.
    debug('No adapter groups found');
    return callback(new Error('No adapter groups found'))
  }
  adapterGroups.sort()
  debug('adapter Groups %O', adapterGroups);
  processAdapterGroup(adapterGroups, adapterTargets, targetRequest, phase, globalServices, callback)
}
