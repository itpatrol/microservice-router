const expect  = require("chai").expect;

const getProperty = require('../includes/getProperty.js')

let data = {
  test: "testresult",
  sub: {
    test2: "test2result",
    sub: {
      test3: "test3result"
    }
  }
}

describe('getProperty', function(){
  it('getProperty("test", data)', function(done){
    expect(getProperty('test', data)).to.equal('testresult')
    done();
  });
  it('getProperty("sub.test2", data)', function(done){
    expect(getProperty('sub.test2', data)).to.equal('test2result')
    done();
  });
  it('getProperty("sub.sub.test3", data)', function(done){
    expect(getProperty('sub.sub.test3', data)).to.equal('test3result')
    done();
  });
})
