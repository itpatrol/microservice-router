const expect  = require("chai").expect;
const sift = require('sift').default
var http = require('http');

const sendRequest = require('../includes/sendRequest.js')
let targetRequests = JSON.parse(JSON.stringify(require('./targetRequests.js')))
let routeItems = JSON.parse(JSON.stringify(require('./routeItems.js')))

describe('sendRequest', function(){
  before(function(){

    this.routeItems = sift({
      endpointUrl: {
        $in: ["http://127.0.0.1:8808/"]
      }
    }, routeItems)



    for (let targetRequest of this.routeItems) {
      if (targetRequest.endpointUrl == "http://127.0.0.1:8808/") {
        targetRequest.endpointUrl = "http://127.0.0.1:4908/"
      }
    }

    this.httpEndPointServer = http.createServer().listen(4908);
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

  it('general headers and body', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let options = {
      uri: 'http://127.0.0.1:4908',
      headers: {
        test:"test"
      },
      method: 'post',
      body: targetRequest.requestDetails._buffer
    }
    sendRequest(options, targetRequest, this.routeItems, function(err, response, body) {
      let json = JSON.parse(body)
      expect(json.headers.test).to.equal("test")
      expect(json.body.test).to.equal("test")
      done()
    })

  })
  it('error if url is invalid', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let options = {
      uri: 'testcom',
      headers: {
        test:"test"
      },
      method: 'post',
      body: targetRequest.requestDetails._buffer
    }
    sendRequest(options, targetRequest, this.routeItems, function(err, response, body) {
      expect(err).to.be.an.instanceof(Error)
      done()
    })

  })
  it('error if no response', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let options = {
      uri: 'http://127.0.0.1:9999',
      headers: {
        test:"test"
      },
      method: 'post',
      body: targetRequest.requestDetails._buffer
    }
    sendRequest(options, targetRequest, this.routeItems, function(err, response, body) {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })
  it('Request with no metric check', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let options = {
      uri: 'http://127.0.0.1:4908',
      headers: {
        test:"test"
      },
      method: 'post',
      body: targetRequest.requestDetails._buffer
    }
    targetRequest.isMetric = true
    sendRequest(options, targetRequest, this.routeItems, function(err, response, body) {
      let json = JSON.parse(body)
      expect(json.headers.test).to.equal("test")
      expect(json.body.test).to.equal("test")
      done()
    })

  })
})
