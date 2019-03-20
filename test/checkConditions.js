const expect  = require("chai").expect;

const checkConditions = require('../includes/checkConditions.js')

let requestDetails = {
  headers: {
    string: "test",
    number: "10",
    float: "10.1"
  },
  method: "POST",
}
let jsonData = {
  string: "test",
  number: 10,
  float: 10.1,
  sub: {
    string: "test",
    number: 10,
    float: 10.1,
  }
}

describe('conditions Check', function(){
  it('check missing string header', function(done){
    expect(checkConditions({
      headers: [{
        name: "string-missing",
        value: "test"
      }]
    }, requestDetails, jsonData)).to.equal(false)
    done();
  })
  it('check equal string header', function(done){
    expect(checkConditions({
      headers: [{
        name: "string",
        value: "test"
      }]
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check not equal string header', function(done){
    expect(checkConditions({
      headers: [{
        name: "string",
        value: "test1"
      }]
    }, requestDetails, jsonData)).to.equal(false)
    done();
  })
  it('check regex string header', function(done){
    expect(checkConditions({
      headers: [{
        name: "string",
        value: "test",
        isRegex: true
      }]
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check regex string header fail', function(done){
    expect(checkConditions({
      headers: [{
        name: "string",
        value: "test1",
        isRegex: true
      }]
    }, requestDetails, jsonData)).to.equal(false)
    done();
  })
  it('check payload is string', function(done){
    expect(checkConditions({
      payload: [{
        name: "string",
        value: "test"
      }]
    }, requestDetails, 'jsonData')).to.equal(false)
    done();
  })
  it('check payload equal string', function(done){
    expect(checkConditions({
      payload: [{
        name: "string",
        value: "test"
      }]
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check payload not equal string', function(done){
    expect(checkConditions({
      payload: [{
        name: "string",
        value: "test1"
      }]
    }, requestDetails, jsonData)).to.equal(false)
    done();
  })
  it('check payload regex string', function(done){
    expect(checkConditions({
      payload: [{
        name: "string",
        value: "test",
        isRegex: true
      }]
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check payload regex missing', function(done){
    expect(checkConditions({
      payload: [{
        name: "string",
        value: "test2",
        isRegex: true
      }]
    }, requestDetails, jsonData)).to.equal(false)
    done();
  })
  it('check subProperty missing payload', function(done){
    expect(checkConditions({
      payload: [{
        name: "sub.string2",
        value: "test"
      }]
    }, requestDetails, jsonData)).to.equal(false)
    done();
  })
  it('check subProperty equal string payload', function(done){
    expect(checkConditions({
      payload: [{
        name: "sub.string",
        value: "test"
      }]
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check subProperty not equal string payload', function(done){
    expect(checkConditions({
      payload: [{
        name: "sub.string",
        value: "test1"
      }]
    }, requestDetails, jsonData)).to.equal(false)
    done();
  })
  it('check subProperty regex string payload', function(done){
    expect(checkConditions({
      payload: [{
        name: "sub.string",
        value: "test",
        isRegex: true
      }]
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check method as a string', function(done){
    expect(checkConditions({
      methods: 'post'
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check method LowerCase', function(done){
    expect(checkConditions({
      methods: ['post']
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check method UpperCase', function(done){
    expect(checkConditions({
      methods: ['POST']
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check method CamelCase', function(done){
    expect(checkConditions({
      methods: ['PosT']
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check method CamelCase mismatch', function(done){
    expect(checkConditions({
      methods: ['Get']
    }, requestDetails, jsonData)).to.equal(false)
    done();
  })
  it('check method as a string LowerCase', function(done){
    expect(checkConditions({
      methods: 'post'
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check method as a string UpperCase', function(done){
    expect(checkConditions({
      methods: 'POST'
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check method as a string CamelCase', function(done){
    expect(checkConditions({
      methods: 'PosT'
    }, requestDetails, jsonData)).to.equal(true)
    done();
  })
  it('check method as a string CamelCase mismatch', function(done){
    expect(checkConditions({
      methods: 'Get'
    }, requestDetails, jsonData)).to.equal(false)
    done();
  })
})