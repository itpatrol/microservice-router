const expect  = require("chai").expect;
const sift = require('sift').default
const dgram = require('dgram');
const signature = require('../includes/signature.js');

const sendBroadcastMessage = require('../includes/sendBroadcastMessage.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')


describe('sendBroadcastMessage', function(){
  let UDPServer
  before(function() {
    UDPServer = dgram.createSocket('udp4');
    UDPServer.bind('8888');
    UDPServer.on('error', function(err) {
      console.log('UDP Server error %O', err);
    });
    
  });
  after(function(){
    UDPServer.close()
  })
  it('general testing udp', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'

    let routeWSItems =  sift({
      path: 'ws',
    }, routeItems)

    targetRequest.router = routeWSItems[0]
    targetRequest.requestDetails.url = 'TEST'

    sendBroadcastMessage(targetRequest, JSON.parse(targetRequest.requestDetails._buffer), routeItems)
    UDPServer.on('message', function(message, rinfo) {
      message = JSON.parse(message);
      let sign = message.signature;
      delete message.signature;
      let hash = signature(sign[0], JSON.stringify(message), targetRequest.router.secureKey)
      expect(message.message.test).to.equal('test')
      expect(message.method).to.equal(targetRequest.method)
      expect(message.route[0]).to.equal(targetRequest.router.path[0])
      expect(message.scope).to.equal(targetRequest.router.scope)
      expect(message.path).to.equal(targetRequest.requestDetails.url)
      expect(sign[1]).to.equal(hash)
      done()
    })
  })
})
