/**
 * Build URI from routeItem.endpointUrl and targetRequest.path
 *
 * @param String endpointUrl
 * @param String endpointUrl
 *
 * @return String URI
 */
'use strict';

module.exports = function(endpointUrl, path){
  let URI = endpointUrl
  if (endpointUrl[endpointUrl.length - 1] != '/') {
    URI += '/'
  }
  URI += path
  return URI
}
