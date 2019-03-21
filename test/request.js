const expect  = require("chai").expect;
const sift = require('sift').default
var http = require('http');

const sendRequest = require('../includes/request.js')
let targetRequests = JSON.parse(JSON.stringify(require('./targetRequests.js')))
let routeItems = JSON.parse(JSON.stringify(require('./routeItems.js')))


describe('sendEndpoint request', function(){
  before(function(){

    this.routeItems = sift({
      type: "handler",
      endpointUrl: {
        $in: ["http://127.0.0.1:8808/"]
      }
    }, routeItems)

    for (let targetRequest of this.routeItems) {
      if (targetRequest.endpointUrl == "http://127.0.0.1:8808/") {
        targetRequest.endpointUrl = "http://127.0.0.1:5808/"
      }
    }

    this.receivedData = false
    this.httpEndPointServer = http.createServer().listen(5808);
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
        let code = 200
        if (body.test == "503") {
          code = 503
        }

        let answer = false
        let headers = {
          'Content-Type': 'application/json',
        }
        switch (body.test) {
          case 'some': {
            answer = JSON.stringify({
              some: 'some'
            })
            break
          }
          case 'url' : {
            answer = JSON.stringify({
              url: 'http://ya.ru/test/2',
              id: 2
            })
            break
          }
          case 'urls' : {
            answer = JSON.stringify({
              url: 'https://ya.ru/test/2',
              id: 2
            })
            break
          }
          case 'urlshort' : {
            answer = JSON.stringify({
              url: 'test/2',
            id: 2
            })
            break
          }
          case 'id' : {
            answer = JSON.stringify({
              id: 2
            })
            break
          }
          case 'array' : {
            answer = JSON.stringify([{
              url: 'test/1',
              id: 1
            }, {
              url: 'test/2',
              id: 2
            }, {
              url: 'test/3',
              id: 3
            }, {
              id: 4
            }, {
              url: 'http://ya.ru'
            }, {
              url: 'https://ya.ru'
            }, {
              some: 'unknown'
            }])
            break
          }
          case 'string': {
            answer = "string"
            headers = {'content-type': 'text/plain'}
            break
          }
          case 'no-content-type': {
            answer = JSON.stringify({
              id: 2
            })
            headers = {}
          }
          default: {
            answer = JSON.stringify({
              headers: request.headers,
              body: body
            })
          }
        }
        response.writeHead(code, headers);
        response.write(answer)
        response.end();
      });
    });
  })
  after(function(){
    this.httpEndPointServer.close()
  })
  afterEach(function(){
    this.receivedData = false
  })
  it('Endpoint response 200 ', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("test")
      done()
    })

  })
  it('Endpoint response no id or url', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "some"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.answer).to.have.any.keys('url', 'id', 'some')
      done()
    })

  })
  it('Endpoint response with id ', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "id"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.answer).to.have.any.keys('url', 'id', 'some')
      done()
    })

  })
  it('Endpoint response with url ', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "url"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.answer.url).to.equal('http://ya.ru/test/2')
      expect(response.answer).to.have.any.keys('url', 'id', 'some')
      done()
    })

  })
  it('Endpoint response with https url ', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "urls"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.answer.url).to.equal('https://ya.ru/test/2')
      expect(response.answer).to.have.any.keys('url', 'id', 'some')
      done()
    })

  })
  it('Endpoint response with string ', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "string"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.answer).to.equal('string')
      expect(response.headers['content-type']).to.equal('text/plain')
      done()
    })

  })
  it('Endpoint response without content-type ', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "no-content-type"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.headers['content-type']).to.not.exist
      done()
    })

  })
  it('Endpoint response on OPTIONS', function(done){
    let targetRequest = JSON.parse(JSON.stringify(targetRequests[0]));
    targetRequest.requestDetails._buffer = '{"test": "no-content-type"}'
    targetRequest.method = 'OPTIONS'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      //console.log(err, response)
      expect(response.code).to.equal(200)
      expect(response.headers['content-type']).to.not.exist
      done()
    })

  })
  it('Endpoint response with short url ', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "urlshort"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.answer).to.have.any.keys('url', 'id', 'some')
      done()
    })

  })
  it('Endpoint response 200 array', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "array"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.answer).to.be.an('array')
      for (let i in response.answer) {
        expect(response.answer[i]).to.have.any.keys('url', 'id', 'some')
      }

      done()
    })

  })
  it('Endpoint response 503', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "503"}'

    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(response.code).to.equal(503)
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("503")
      done()
    })

  })
  it('No endpoint found', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let routeNoRegisterItems =  sift({
      path: { $ne: 'register'},
    }, this.routeItems)
    let self = this
    sendRequest(targetRequest, routeNoRegisterItems, function(err, response) {
      expect(err).to.be.instanceof(Error)
      done()

    })

  })
  it('No endpoint available', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    this.httpEndPointServer.close()
    let self = this
    sendRequest(targetRequest, this.routeItems, function(err, response) {
      expect(err).to.be.instanceof(Error)
      done()
      /*setTimeout(function(){
        expect(self.receivedData).to.equal(false)
        done()
      }, 100)*/
    })

  })
})
