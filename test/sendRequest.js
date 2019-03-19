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
//      console.log('path:', this.req.path);
//      console.log('headers:', this.req.headers);
//      console.log('requestBody:', requestBody);
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
//      console.log('err:', err);
//      console.log('body:', body);
      let json = JSON.parse(body)
      expect(json.headers.test).to.equal("test")
      expect(json.body.test).to.equal("test")
      done()
    })
    
  })
})