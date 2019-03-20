const expect  = require("chai").expect;
const sift = require('sift').default
var http = require('http');

const request = require('../includes/request.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')

let MAGIC_NUMBER = 9 //Amount of notifications that need to be send based on current routeItems file records

describe('sendHookMetricNotify', function(){
  before(function(){
    this.receivedData1 = []
    this.receivedData2 = []
    this.httpMetric1Server = http.createServer().listen(8895);
    this.httpMetric1Server.on('request', (request, response) => {
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
        this.receivedData1.push(JSON.parse(body))
        body = JSON.parse(body)
        body.extra = true
        response.write(JSON.stringify(body))
        response.end();
        
      });
    });
    this.httpMetric2Server = http.createServer().listen(8896);
    this.httpMetric2Server.on('request', (request, response) => {
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
        this.receivedData2.push(JSON.parse(body))
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
    this.receivedData1 = []
    this.receivedData2 = []
  })
  after(function(){
    this.httpMetric1Server.close()
    this.httpMetric2Server.close()
    this.httpEndPointServer.close()
  })
  it('Endpoint response', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this
    request(targetRequest, routeItems, function(err, response) {
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("test")
      setTimeout(function(){
        done()
      }, 100)
    })
    
  })
  it('Metric 1 request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this

    request(targetRequest, routeItems, function(err, response) {
      setTimeout(function(){
        //console.log(self.receivedData1)
        let TotalLength = self.receivedData1.length + self.receivedData2.length
        expect(TotalLength).to.equal(MAGIC_NUMBER)
        done()
      }, 100)
    })
    
  })
  it('Metric 2 request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this
    request(targetRequest, routeItems, function(err, response) {
      setTimeout(function(){
        let TotalLength = self.receivedData1.length + self.receivedData2.length
        expect(TotalLength).to.equal(MAGIC_NUMBER)
        done()
      }, 100)
    })
  })
})
