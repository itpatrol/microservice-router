const expect  = require("chai").expect;
const sift = require('sift').default
var http = require('http');

const sendRequest = require('../includes/request.js')
let targetRequests = JSON.parse(JSON.stringify(require('./targetRequests.js')))
let routeItems = JSON.parse(JSON.stringify(require('./routeItems.js')))


describe('sendHookAdapter (After) with error', function(){
  before(function(){
    this.receivedData = false

    this.routeItems = sift({
      endpointUrl: {
        $in: ["http://127.0.0.1:9000/", "http://127.0.0.1:8808/"]
      }
    }, routeItems)

    for (let targetRequest of this.routeItems) {
      if (targetRequest.endpointUrl == "http://127.0.0.1:8808/") {
        targetRequest.endpointUrl = "http://127.0.0.1:3018/"
      }
      if (targetRequest.endpointUrl == "http://127.0.0.1:9000/") {
        targetRequest.endpointUrl = "http://127.0.0.1:3015/"
      }
    }

    this.httpAdapterServer = http.createServer().listen(3015);
    this.httpAdapterServer.on('request', (request, response) => {
      let body = [];
      request.on('error', (err) => {
        console.error(err);
      }).on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        
        this.receivedData = JSON.parse(body)
        body = JSON.parse(body)
        body.after = true
        answer = JSON.stringify(body)
        let code = 503
        if (body.body.test == "broken") {
          code = 200
          answer = "{ test";
        }
        response.writeHead(code, {
          'Content-Type': 'application/json',
          'x-set-x-adapter-after-test': 'adapter-test'
        });
        response.write(answer)
        response.end();
        
      });
    });
    this.httpEndPointServer = http.createServer().listen(3018);
    this.httpEndPointServer.on('request', (request, response) => {
      // the same kind of magic happens here!
      let body = [];
      request.on('error', (err) => {
        console.error(err);
      }).on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        body = JSON.parse(body)
        response.setHeader('Content-Type', 'application/json');
        let answer = JSON.stringify({
          headers: request.headers,
          body: body
        })
        response.write(answer)
        response.end();
      });
    });
  })
  after(function(){
    this.httpAdapterServer.close()
    this.httpEndPointServer.close()
  })
  afterEach(function(){
    this.receivedData = false
  })
  it('Endpoint response', function(done){
    let targetRequest = JSON.parse(JSON.stringify(targetRequests[0]));
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("test")
      expect(response.answer).to.have.not.property('after')
      done()
    })
    
  })
  it('Adapter do not transformed request', function(done){
    let targetRequest = JSON.parse(JSON.stringify(targetRequests[0]));
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    
    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.answer).to.have.not.property('after')
      done()
    })
    
  })
  it('Adapter set adapter-test header', function(done){
    let targetRequest = JSON.parse(JSON.stringify(targetRequests[0]));
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    
    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.headers['x-adapter-after-test']).to.equal('adapter-test')
      done()
    })
    
  })
  it('Adapter send broken data', function(done){
    let targetRequest = JSON.parse(JSON.stringify(targetRequests[0]));
    targetRequest.requestDetails._buffer = '{"test": "broken"}'
    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.headers).to.has.property('x-hook-adapter-status-test1-after', 'error: Unexpected token t in JSON at position 2')
      done()
    })
    
  })
  it('Adapter received request', function(done){
    let targetRequest = JSON.parse(JSON.stringify(targetRequests[0]));
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this
    
    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(self.receivedData.body.test).to.equal("test")
      done()
    })
    
  })
  it('No Adapter received', function(done){
    let targetRequest = JSON.parse(JSON.stringify(targetRequests[0]));
    targetRequest.requestDetails._buffer = '{"test": "test"}'

    let routeNoAdapterItems =  sift({
      "hook.type": {$ne: "adapter"},
    }, this.routeItems)
    let self = this
    sendRequest(targetRequest, routeNoAdapterItems, function(err, response) {
      setTimeout(function(){
        expect(self.receivedData).to.equal(false)
        done()
      }, 100)
    })
    
  })
})
