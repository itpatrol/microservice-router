const expect  = require("chai").expect;
const sift = require('sift').default
const nock = require('nock');
var http = require('http');

const sendRequest = require('../includes/sendRequest.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')

describe('sendRequest', function(){
  let httpAdapterServer
  let httpEndpointServer
  before(function(){
    httpAdapterServer = http.createServer().listen(8888);
    httpEndPointServer = http.createServer().listen(8808);
    httpEndPointServer.on('request', (request, response) => {
      // the same kind of magic happens here!
      console.log('endpoint before happen')
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
      uri: 'http://127.0.0.1:8808',
      headers: {
        test:"test"
      },
      method: 'POST',
      body: targetRequest.requestDetails._buffer
    }
    httpAdapterServer.on('request', (request, response) => {
      // the same kind of magic happens here!
      console.log('adapter before happen')
    });
    
    sendRequest(options, targetRequest, routeItems, function(err, response, body) {
      let json = JSON.parse(body)
      expect(json.headers.test).to.equal("test")
      expect(json.body.test).to.equal("test")
      done()
    })
    
  })
})