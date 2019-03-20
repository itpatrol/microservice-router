const expect  = require("chai").expect;
const sift = require('sift').default
const nock = require('nock');

const sendRequest = require('../includes/sendRequest.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')

describe('sendRequest', function(){
  beforeEach(function() {
    nock('http://test.com')
    .post('/')
    .reply(function(uri, requestBody) {
      return {
        headers: this.req.headers,
        body: JSON.parse(requestBody)
      }
    });
  });
  it('general headers and body', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let options = {
      uri: 'http://test.com',
      headers: {
        test:"test"
      },
      method: 'post',
      body: targetRequest.requestDetails._buffer
    }
    sendRequest(options, targetRequest, routeItems, function(err, response, body) {
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
    sendRequest(options, targetRequest, routeItems, function(err, response, body) {
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
    sendRequest(options, targetRequest, routeItems, function(err, response, body) {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })
  it('Request with no metric check', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let options = {
      uri: 'http://test.com',
      headers: {
        test:"test"
      },
      method: 'post',
      body: targetRequest.requestDetails._buffer
    }
    targetRequest.isMetric = true
    sendRequest(options, targetRequest, routeItems, function(err, response, body) {
      let json = JSON.parse(body)
      expect(json.headers.test).to.equal("test")
      expect(json.body.test).to.equal("test")
      done()
    })
    
  })
})
