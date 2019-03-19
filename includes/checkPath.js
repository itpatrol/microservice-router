/**
 * Check if path match route path.
 * 
 * @param Object targetRequest  request details
 * @param Object routeItem ob route table
 *
 * @return Boolean true if conditions are met
 */
'use strict';

module.exports = function(targetRequest, routeItem) {
  let targetRoutePathItems = targetRequest.route.split('/');
  
  // routeItem is array of supporthed path (endpoints like /foo /bar/:test/foo)
  for (let path of routeItem.path) {
    // If route qual saved path
    if (path == targetRequest.route) {
      return true;
    }

    // If targetRoutePathItems.length == 1, and did not match
    if (targetRoutePathItems.length == 1) {
      if (path != targetRequest.route) {
        continue;
      }
    }

    let pathItems = path.split('/');
    if (pathItems.length != targetRoutePathItems.length) {
      continue;
    }
    var fullPathMatched = true;
    routeItem.matchVariables = {}
    for (var i = 0; i < targetRoutePathItems.length; i++) {
      if (pathItems[i].charAt(0) == ':') {
        routeItem.matchVariables[pathItems[i].substring(1)] = targetRoutePathItems[i];
      } else {
        if (targetRoutePathItems[i] != pathItems[i]) {
          fullPathMatched = false;
          break;
        }
      }
    }
    if (fullPathMatched) {
      return true;
    }
  }
}
