const expect  = require("chai").expect;
const sift = require('sift').default
var http = require('http');

const request = require('../includes/request.js')
let targetRequests = JSON.parse(JSON.stringify(require('./targetRequests.js')))
let routeItems = JSON.parse(JSON.stringify(require('./routeItems.js')))


describe('sendHookBroadcast', function(){
  before(function(){

    this.routeItems = sift({
      endpointUrl: {
        $in: ["http://127.0.0.1:8889/", "http://127.0.0.1:8890/", "http://127.0.0.1:8808/"]
      }
    }, routeItems)



    for (let targetRequest of this.routeItems) {
      if (targetRequest.endpointUrl == "http://127.0.0.1:8808/") {
        targetRequest.endpointUrl = "http://127.0.0.1:4808/"
      }
    }
    this.receivedBroadcastData1 = false
    this.receivedBroadcastData2 = false
    this.httpBroadcast1Server = http.createServer().listen(8889);
    this.httpBroadcast1Server.on('request', (request, response) => {
      let body = [];
      request.on('error', (err) => {
        console.error(err);
      }).on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        response.writeHead(200, {
          'Content-Type': 'application/json',
        });
        this.receivedBroadcastData1 = JSON.parse(body)
        body = JSON.parse(body)
        body.extra = true
        response.write(JSON.stringify(body))
        response.end();
        
      });
    });
    this.httpBroadcast2Server = http.createServer().listen(8890);
    this.httpBroadcast2Server.on('request', (request, response) => {
      let body = [];
      request.on('error', (err) => {
        console.error(err);
      }).on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        response.writeHead(200, {
          'Content-Type': 'application/json',
        });
        this.receivedBroadcastData2 = JSON.parse(body)
        body = JSON.parse(body)
        body.extra = true
        response.write(JSON.stringify(body))
        response.end();
        
      });
    });
    this.httpEndPointServer = http.createServer().listen(4808);
    this.httpEndPointServer.on('request', (request, response) => {
      // the same kind of magic happens here!
      let body = [];
      request.on('error', (err) => {
        console.error(err);
      }).on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        response.setHeader('Content-Type', 'application/json');
        response.write(JSON.stringify({
          headers: request.headers,
          body: JSON.parse(body)
        }))
        response.end();
      });
    });
  })
  afterEach(function(){
    this.receivedBroadcastData1 = false
    this.receivedBroadcastData2 = false
  })
  after(function(){
    this.httpBroadcast1Server.close()
    this.httpBroadcast2Server.close()
    this.httpEndPointServer.close()
  })
  it('Endpoint response', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    
    request(targetRequest, this.routeItems, function(err, response) {
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("test")
      setTimeout(function(){
        done()
      }, 50)  
    })
    
  })
  it('Broadcast 1 request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this
    
    request(targetRequest, this.routeItems, function(err, response) {
      setTimeout(function(){
        expect(self.receivedBroadcastData1.body.test).to.equal("test")
        expect(self.receivedBroadcastData1.headers.test).to.equal("test")
        done()
      }, 1000)
    })
    
  })
  it('Broadcast 2 request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this
    
    request(targetRequest, this.routeItems, function(err, response) {
      setTimeout(function(){
        expect(self.receivedBroadcastData2.body.test).to.equal("test")
        expect(self.receivedBroadcastData2.headers.test).to.equal("test")
        done()
      }, 1000)
    })
    
  })
  it('No Broadcast messages', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'

    let routeNoBCItems =  sift({
      "hook.type": {$ne: "broadcast"},
    }, this.routeItems)
    let self = this
    request(targetRequest, routeNoBCItems, function(err, response) {
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("test")
      setTimeout(function(){
        expect(self.receivedBroadcastData2).to.equal(false)
        expect(self.receivedBroadcastData1).to.equal(false)
        done()
      }, 100)
    })
    
  })
})
