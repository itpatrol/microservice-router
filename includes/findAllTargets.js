/**
 * Find all targets function
 *
 * @param Object targetRequest  request details
 * @param String routeType(optional) of router: hook, handler, metric
 * @param Object object all available routes
 *
 * @return the value of the property in question
 */
'use strict';

const debug = require('debug')('proxy:find-all-targets');
const matchRoute = require('./matchRoute.js')

module.exports = function(targetRequest, routeType, allRegisteredRoutes) {
  debug('Find all routes %s', targetRequest.route);

  var availableRoutes = [];
  for (let i in allRegisteredRoutes) {
    if (allRegisteredRoutes[i].type 
      && allRegisteredRoutes[i].type.toLowerCase() !== routeType) {
      continue
    }
    // For easy deployment when service need to stop receiving new requests.
    if (!allRegisteredRoutes[i].online) {
      continue
    }
    // Making copy of the router.
    let routeItem = JSON.parse(JSON.stringify(allRegisteredRoutes[i]));
    routeItem.matchVariables = {};
    if (matchRoute(targetRequest, routeItem)) {
      availableRoutes.push(routeItem);
    }
  }
  debug('Available routes type: %s route: %s availableRoutes: %s', routeType,
  targetRequest.route,  JSON.stringify(availableRoutes , null, 2));
  if (availableRoutes.length == 0) {
    debug('Not found for %s', targetRequest.route);
    return new Error('Endpoint not found');
  }
  return availableRoutes;
}
