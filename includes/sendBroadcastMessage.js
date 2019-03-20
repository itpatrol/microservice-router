/**
 * Find all targets function
 *
 * @param Object targetRequest  request details
 * @param Object or Buffer to send
 * @param Object object all available routes
 *
 * @return nothing
 */
'use strict';

const debug = require('debug')('proxy:send-udp-broadcast');
const signature = require('./signature.js');
const dgram = require('dgram');
const url = require('url');

/**
 * Send broadcast message to UDP client.
 * deprecated. WS need to be replaced by boracast hook
 */
function sendBroadcastMessageToClient(bufferedMessage, URL) {
  let client = dgram.createSocket('udp4');
  client.send(bufferedMessage, URL.port, URL.hostname, function(err) {
    if (err) {
      debug('UDP broadcast Error: %O', err);
      client.close();
    }
  });
  client.on('message', function(message) {
    debug('Received from server: ' + message);
    client.close();
  });
}

/**
 * Proxy request to backend server.
 * deprecated. WS need to be replaced by boracast hook
 */
module.exports = function (targetRequest, message, allRegisteredRoutes) {
  debug('UDP broadcast %O %s %s %O', targetRequest, message);

  for (let routeItem of allRegisteredRoutes) {
    if (routeItem.type !== 'websocket') {
      continue
    }
    var broadcastMessage = {
      method: targetRequest.method,
      route: targetRequest.router.path,
      scope: targetRequest.router.scope,
      loaders: targetRequest.router.matchVariables,
      path: targetRequest.requestDetails.url
    };
    switch (routeItem.methods[targetRequest.method.toLowerCase()]) {
      case 'data': {
        broadcastMessage.message = message;
        break;
      }
      case 'meta': {
        broadcastMessage.meta = true;
        break;
      }
      default: {
        continue;
      }
    }
    var URL = url.parse(routeItem.endpointURL);

    broadcastMessage.signature = ['sha256',
      signature('sha256', JSON.stringify(broadcastMessage), routeItem.secureKey)];

    debug('UDP broadcast to %O %O', routeItem, URL);
    var bufferedMessage = Buffer.from(JSON.stringify(broadcastMessage));
    sendBroadcastMessageToClient(bufferedMessage, URL);
  }
}
