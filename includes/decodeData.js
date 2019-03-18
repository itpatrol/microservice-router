/**
 * Decode buffer to specidied by content-type format.
 *
 * @param String phase(optional) hook phase: before, after, metric
 * @param Buffer type(optional) hook type: adapter, notify, broadcast
 *
 * @return return buffer or object
 */
'use strict';

module.exports = function(contentType, buffer){
  let data = false
  switch (contentType) {
    case undefined: // version 1.x compatibility. If no content-type provided, assume json.
    case 'application/json': {
      data = JSON.parse(buffer);
      break;
    }
    // Todo support more decoders here?
    default: {
      data = buffer
    }
  }
  return data
}
