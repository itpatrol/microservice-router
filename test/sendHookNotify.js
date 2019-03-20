const expect  = require("chai").expect;
const sift = require('sift').default
var http = require('http');

const request = require('../includes/request.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')

describe('sendHookNotify', function(){
  before(function(){
    this.receivedData1 = false
    this.receivedData2 = false
    this.httpNotify1Server = http.createServer().listen(8891);
    this.httpNotify1Server.on('request', (request, response) => {
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
    this.httpNotify2Server = http.createServer().listen(8892);
    this.httpNotify2Server.on('request', (request, response) => {
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
    this.httpNotify1Server.close()
    this.httpNotify2Server.close()
    this.httpEndPointServer.close()
  })
  it('Endpoint response', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    
    request(targetRequest, routeItems, function(err, response) {
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("test")
      done()
    })
    
  })
  it('Notify 1 request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this
    
    request(targetRequest, routeItems, function(err, response) {
      expect(self.receivedData1.body.test).to.equal("test")
      expect(self.receivedData1.headers.test).to.equal("test")
      done()
    })
    
  })
  it('Notify 2 request not received', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this
    
    request(targetRequest, routeItems, function(err, response) {
      expect(self.receivedData2).to.equal(false)
      done()
    })
    
  })
})
