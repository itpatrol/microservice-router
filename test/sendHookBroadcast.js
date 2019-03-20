const expect  = require("chai").expect;
const sift = require('sift').default
var http = require('http');

const request = require('../includes/request.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')

describe('sendHookBroadcast', function(){
  before(function(){
    this.receivedData1 = false
    this.receivedData2 = false
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
        this.receivedData1 = JSON.parse(body)
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
        this.receivedData2 = JSON.parse(body)
        body = JSON.parse(body)
        body.extra = true
        response.write(JSON.stringify(body))
        response.end();
        
      });
    });
    this.httpEndPointServer = http.createServer().listen(8808);
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
    this.receivedData1 = false
    this.receivedData2 = false
  })
  after(function(){
    this.httpBroadcast1Server.close()
    this.httpBroadcast2Server.close()
    this.httpEndPointServer.close()
  })
  it('Endpoint response', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    
    request(targetRequest, routeItems, function(err, response) {
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("test")
      setTimeout(function(){
        done()
      },50)
    })
    
  })
  it('Broadcast 1 request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this
    
    request(targetRequest, routeItems, function(err, response) {
      setTimeout(function(){
        expect(self.receivedData1.body.test).to.equal("test")
        expect(self.receivedData1.headers.test).to.equal("test")
        done()
      },50)
    })
    
  })
  it('Broadcast 2 request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this
    
    request(targetRequest, routeItems, function(err, response) {
      setTimeout(function(){
        expect(self.receivedData2.body.test).to.equal("test")
        expect(self.receivedData2.headers.test).to.equal("test")
        done()
      },50)
    })
    
  })
  it('No Broadcast messages', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'

    let routeNoBCItems =  sift({
      "hook.type": {$ne: "broadcast"},
    }, routeItems)
    let self = this
    request(targetRequest, routeNoBCItems, function(err, response) {
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("test")
      setTimeout(function(){
        expect(self.receivedData2).to.equal(false)
        expect(self.receivedData1).to.equal(false)
        done()
      }, 100)
    })
    
  })
})
