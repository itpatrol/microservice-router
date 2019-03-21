const expect  = require("chai").expect;
const sift = require('sift').default
const dgram = require('dgram');
const signature = require('../includes/signature.js');

const sendBroadcastMessage = require('../includes/sendBroadcastMessage.js')
let targetRequests = JSON.parse(JSON.stringify(require('./targetRequests.js')))
let routeItems = JSON.parse(JSON.stringify(require('./routeItems.js')))


describe('sendBroadcastMessage', function(){
  let UDPServer
  before(function() {

    this.routeItems = sift({
      endpointUrl: {
        $in: ["http://127.0.0.1:1018/"]
      }
    }, routeItems)

    for (let targetRequest of this.routeItems) {
      if (targetRequest.endpointUrl == "http://127.0.0.1:1018/") {
        targetRequest.endpointUrl = "http://127.0.0.1:1019/"
      }
    }

    UDPServer = dgram.createSocket('udp4');
    UDPServer.bind('1019');
    UDPServer.on('error', function(err) {
      console.log('UDP Server error %O', err);
    });

  });
  after(function(){
    if (UDPServer) {
      UDPServer.close()
    }
  })
  it('send success udp message', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'

    let routeWSItems =  sift({
      path: 'ws',
    }, routeItems)

    targetRequest.router = routeWSItems[0]
    targetRequest.method = "POST"
    targetRequest.requestDetails.url = 'TEST'
    //console.log('targetRequest', targetRequest )

    sendBroadcastMessage(targetRequest, JSON.parse(targetRequest.requestDetails._buffer), this.routeItems)
    UDPServer.on('message', function(message, rinfo) {
      message = JSON.parse(message);
      let sign = message.signature;
      delete message.signature;
      let hash = signature(sign[0], JSON.stringify(message), targetRequest.router.secureKey)
      //console.log('RECEIVED', message, rinfo)
      expect(message.message.test).to.equal('test')
      expect(message.method).to.equal(targetRequest.method)
      expect(message.route[0]).to.equal(targetRequest.router.path[0])
      expect(message.scope).to.equal(targetRequest.router.scope)
      expect(message.path).to.equal(targetRequest.requestDetails.url)
      expect(sign[1]).to.equal(hash)
      done()
    })
  })
  it('send fail udp message', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'

    let routeWSItems =  sift({
      path: 'ws',
    }, routeItems)

    targetRequest.router = routeWSItems[0]
    targetRequest.requestDetails.url = 'TEST'
    UDPServer.close()

    sendBroadcastMessage(targetRequest, JSON.parse(targetRequest.requestDetails._buffer), this.routeItems)
    let messageReceived = false;
    UDPServer.on('message', function(message, rinfo) {
      messageReceived = JSON.parse(message);

    })
    setTimeout(function(){
      expect(messageReceived).to.equal(false)
      UDPServer = false
      done()
    }, 100)
  })
})
