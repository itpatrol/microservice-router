const expect  = require("chai").expect;
const sift = require('sift').default
var http = require('http');

const sendRequest = require('../includes/request.js')
let targetRequests = JSON.parse(JSON.stringify(require('./targetRequests.js')))
let routeItems = JSON.parse(JSON.stringify(require('./routeItems.js')))


describe('sendHookAdapter (After)', function(){
  before(function(){
    this.receivedData = false

    this.routeItems = sift({
      endpointUrl: {
        $in: ["http://127.0.0.1:9000/", "http://127.0.0.1:8808/"]
      }
    }, routeItems)

    for (let targetRequest of this.routeItems) {
      if (targetRequest.endpointUrl == "http://127.0.0.1:8808/") {
        targetRequest.endpointUrl = "http://127.0.0.1:3019/"
      }
    }

    this.httpAdapterServer = http.createServer().listen(9000);
    this.httpAdapterServer.on('request', (request, response) => {
      let body = [];
      request.on('error', (err) => {
        console.error(err);
      }).on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        response.writeHead(200, {
          'Content-Type': 'application/json',
          'x-set-x-adapter-after-test': 'adapter-test'
        });
        this.receivedData = JSON.parse(body)
        body = JSON.parse(body)
        body.after = true
        response.write(JSON.stringify(body))
        response.end();

      });
    });
    this.httpEndPointServer = http.createServer().listen(3019);
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
  after(function(){
    this.httpAdapterServer.close()
    this.httpEndPointServer.close()
  })
  afterEach(function(){
    this.receivedData = false
  })
  it('Endpoint response', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("test")
      expect(response.answer.after).to.equal(true)
      done()
    })

  })
  it('Adapter transformed request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.answer.after).to.equal(true)
      done()
    })

  })
  it('Adapter set adapter-test header', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.headers['x-adapter-after-test']).to.equal('adapter-test')
      done()
    })

  })
  it('Adapter received request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(self.receivedData.body.test).to.equal("test")
      done()
    })

  })
  it('No Adapter received', function(done){
    let targetRequest = targetRequests[0];
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
