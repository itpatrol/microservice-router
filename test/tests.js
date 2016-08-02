const expect  = require("chai").expect;
const MicroserviceClient = require('zenci-microservice-client');

require('dotenv').config();

describe('Router CRUD API',function(){
  var client = new MicroserviceClient({
    URL: "http://localhost:" + process.env.PORT,
    secureKey: process.env.SECURE_KEY
  });
  var RecordID;
  var RecordToken;

  it('POST should return 200',function(done){
    client.post({
        path: 'test',
        url: 'http://localhost:2000',
      }, function(err, handlerResponse){
        expect(err).to.equal(null);
        RecordID = handlerResponse.id;
        RecordToken = handlerResponse.token;
        done();
    });
  });

  it('SEARCH should return 200',function(done){
    client.search({ "path": "test" }, function(err, handlerResponse){
      expect(err).to.equal(null);
      expect(handlerResponse).to.not.equal(null);
      done();
    });
  });

  it('GET should return 200',function(done){
    client.get(RecordID, RecordToken, function(err, handlerResponse){
      expect(err).to.equal(null);
      done();
    });
  });


  it('DELETE should return 200',function(done){
    client.delete(RecordID, RecordToken, function(err, handlerResponse){
      expect(err).to.equal(null);
      done();
    });
  });

  it('GET after delete should return nothing',function(done){
    client.get(RecordID, RecordToken, function(err, handlerResponse){
      expect(handlerResponse).to.equal(null);
      done();
    });
  });

});
