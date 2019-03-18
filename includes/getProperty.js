/**
 * Source: https://gist.github.com/jasonrhodes/2321581
 * A function to take a string written in dot notation style, and use it to
 * find a nested object property inside of an object.
 *
 * Useful in a plugin or module that accepts a JSON array of objects, but
 * you want to let the user specify where to find various bits of data
 * inside of each custom object instead of forcing a standardized
 * property list.
 *
 * @param String nested A dot notation style parameter reference (ie "urls.small")
 * @param Object object (optional) The object to search
 *
 * @return the value of the property in question
 */
'use strict';

module.exports = function ( propertyName, object ) {
  let parts = propertyName.split( "." );
  let length = parts.length;
  let property = object;
  for ( let i = 0; i < length; i++ ) {
    if (property[parts[i]] === undefined) {
      return new Error('Property Does not exists')
    }
    property = property[parts[i]];
  }
  return property;
}
