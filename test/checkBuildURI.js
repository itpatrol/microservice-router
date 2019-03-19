const expect  = require("chai").expect;

const buildURI = require('../includes/buildURI.js')

describe('buildURI', function(){
  it('Build without ending slash', function(done){
    expect(buildURI('http://test', 'id')).to.equal('http://test/id')
    done();
  });
  it('Build with ending slash', function(done){
    expect(buildURI('http://test/', 'id')).to.equal('http://test/id')
    done();
  });
  it('Build with begining slash', function(done){
    expect(buildURI('http://test', '/id')).to.equal('http://test/id')
    done();
  });

})