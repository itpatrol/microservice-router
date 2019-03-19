/**
 * Send Hook Notify
 *
 * @param Object targetRequest request details
 * @param String phase(optional) hook phase: before, after, metric
 * @param Object object all available routes
 *
 * @return 
 */
'use strict';

const debug = require('debug')('proxy:send-hook-notify');

const getHookHeaders = require('./getHeaders.js')
const sendRequest = require('./sendRequest.js')
const findHookTarget = require('./findHookTarget.js')

function processNotify(notifyTargets, targetRequest, phase, globalServices, callback) {
  if (!notifyTargets.length) {
    return callback()
  }
  // TODO apply tags based vouting here
  let routerItem = notifyTargets.pop()
  let requestOptions = {
    uri: routerItem.url + targetRequest.path,
    method: 'NOTIFY',
    headers: getHookHeaders(targetRequest, routerItem, phase, 'notify', routerItem.group, true),
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
      debug('notify failed %O', err);
      return processNotify(notifyTargets, targetRequest, phase, globalServices, callback)
    }
    debug('notify sent');
    callback()
  })
}

function processNotifyGroup(notifyGroups, notifyTargets, targetRequest, phase, globalServices){
  if (notifyGroups.length){
    let currentNotifyGroup = notifyGroups.shift()
    let currentNotifyTargets = notifyTargets.filter(function(a) {
      return a.group == currentNotifyGroup
    })
    debug('notify Groups %s %O', currentNotifyGroup, notifyGroups);
  
    processNotify(currentNotifyTargets, targetRequest, phase, globalServices, function(){
      processNotifyGroup(notifyGroups, notifyTargets, targetRequest, phase, globalServices)
    })
  }
}

module.exports = function(targetRequest, phase, globalServices){
  let notifyTargets = findHookTarget(targetRequest, phase, 'notify', false, globalServices)
  debug('Notify: Phase %s for %s result: %O', phase, targetRequest.route, notifyTargets);
  if (notifyTargets instanceof Array) {
    let notifyGroups = []
    for (let target of notifyTargets) {
      if (target.group) {
        if (notifyGroups.indexOf(target.group) == -1) {
          notifyGroups.push(target.group)
        }
      }
    }
    notifyGroups.sort()
    debug('notify Groups %O', notifyGroups);
    if (notifyGroups.length){
      processNotifyGroup(notifyGroups, notifyTargets, targetRequest, phase, globalServices)
    }
  }
}
