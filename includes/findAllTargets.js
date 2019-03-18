/**
 * Find all targets function
 */
'use strict';

const debug = require('debug')('proxy:find-all-targets');
const matchRoute = require('./matchRoute.js')

module.exports = function(targetRequest, type, globalServices) {
  debug('Find all routes %s', targetRequest.route);

  var availableRoutes = [];
  for (let i in globalServices) {
    if (globalServices[i].type && globalServices[i].type.toLowerCase() !== type) {
      continue
    }
    // For easy deployment when service need to stop receiving new requests.
    if (!globalServices[i].online) {
      continue
    }
    // Making copy of the router.
    let routeItem = JSON.parse(JSON.stringify(globalServices[i]));
    routeItem.matchVariables = {};
    if (matchRoute(targetRequest, routeItem)) {
      availableRoutes.push(routeItem);
    }
  }
  debug('Available routes type: %s route: %s availableRoutes: %s', type, targetRequest.route,
    JSON.stringify(availableRoutes , null, 2));
  if (availableRoutes.length == 0) {
    debug('Not found for %s', targetRequest.route);
    return new Error('Endpoint not found');
  }
  return availableRoutes;
}
