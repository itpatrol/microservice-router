/**
 * Find all targets for hook
 *
 * @param Object targetRequest  request details
 * @param String phase(optional) hook phase: before, after, metric
 * @param String type(optional) hook type: adapter, notify, broadcast
 * @param String group(optional) hook group defined by routeItem
 * @param Object object all available routes
 *
 * @return array of objects with available routes
 */
'use strict';

const debug = require('debug')('proxy:find-hook-target');
const findAllTargets = require('./findAllTargets.js')

module.exports = function(targetRequest, phase, type, group, allRegisteredRoutes){
  debug('Find all hooks route: %s phase: %s type: %s group: %s',
    targetRequest.route, phase, type, group);
  let allHookTargets = findAllTargets(targetRequest, 'hook', allRegisteredRoutes)
  if (allHookTargets instanceof Error) {
    return allHookTargets
  }
  let finalHookTable = []
  for (let target of allHookTargets){
    // skip hooks with no hook properties
    if (!target.hook || !target.hook.length) {
      continue
    }
    for (let hook of target.hook) {
      if (phase){
        if(hook.phase !== phase) {
          continue
        }
      }
      if (hook.type !== type) {
        continue
      }
      let targetCopy = JSON.parse(JSON.stringify(target))
      delete targetCopy.hook
      if (hook.group) {
        targetCopy.group = hook.group
      } else {
        targetCopy.group = '_default'
      }

      finalHookTable.push(targetCopy)
    }
  }
  if (group) {
    finalHookTable = finalHookTable.filter(function(elem){
      return elem.group == group
    })
  }
  if (!finalHookTable.length) {
    debug('Hook instance %s not found', group);
    return new Error('Hook instance not found');
  }
  return finalHookTable
}
