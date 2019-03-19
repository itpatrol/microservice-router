const expect  = require("chai").expect;

const decodeData = require('../includes/decodeData.js')

describe('decodeData', function(){
  it('Content-type: application/json', function(done){
    let decoded = decodeData('application/json', '{"test":"test"}')
    expect(decoded).to.be.an('object').to.have.property('test', 'test');
    done();
  });
  it('Content-type: not provided. V1.3.x compatibility', function(done){
    let decoded = decodeData(undefined, '{"test":"test"}')
    expect(decoded).to.be.an('object').to.have.property('test', 'test');
    done();
  });
  it('Content-type: text/plain', function(done){
    let decoded = decodeData('text/plain', '{"test":"test"}')
    expect(decoded).to.be.an('string').to.equal('{"test":"test"}');
    done();
  });
  it('Content-type: application/json, broken JSON', function(done){
    let decoded = false
    try {
      decoded = decodeData('application/json', '{"test":"test"')
    } catch (e) {
      expect(e).to.be.an.instanceof(SyntaxError);
    }
    expect(decoded).to.equal(false);
    done();
  });
  

})