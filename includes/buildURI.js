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
  let URI = ''
  if (endpointUrl && endpointUrl.length) {
    URI += endpointUrl
    if (endpointUrl[endpointUrl.length - 1] !== '/') {
      URI += '/'
    }
  } else {
    URI += '/'
  }
  if (path && path.length) {
    for ( let i = 0; i < path.length; i++ ) {
      if (path[i] !== '/') {
        URI += path.substring(i)
        break
      }
    }
  }
  
  return URI
}
