const expect  = require("chai").expect;
const sift = require('sift').default

const checkPath = require('../includes/checkPath.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')

/*
Future debug code
for(let targetRequest of targetRequests) {
  for(let routeItem of routeItems) {
    if(checkPath(targetRequest, routeItem)) {
      console.log('match')
      console.log('targetRequest', targetRequest)
      console.log('routeItem', routeItem)
      console.log("\n")
    }
  }
}*/
describe('checkPath', function(){
  it('checking post register', function(done){
    let subTargetRequest = sift({
      route: 'register',
      method: 'POST'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        for (let routeItem of routeItems) {
          if (checkPath(targetRequest, routeItem)) {
            expect(routeItem.path).to.be.an('array').that.include('register');
          }
        }
      }
      done()
  })
  it('checking get register', function(done){
    let subTargetRequest = sift({
      route: 'register',
      method: 'GET'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        for (let routeItem of routeItems) {
          if (checkPath(targetRequest, routeItem)) {
            expect(routeItem.path).to.be.an('array').that.include('register');
          }
        }
      }
      done()
  })
  it('checking post repos/test', function(done){
    let subTargetRequest = sift({
      route: 'repos/test',
      method: 'POST'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        for (let routeItem of routeItems) {
          if (checkPath(targetRequest, routeItem)) {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner');
            expect(routeItem.matchVariables).to.be.an('object').to.have.property('owner', 'test');
            delete routeItem.matchVariables
          }
        }
      }
      done()
  })
  it('checking get repos/test/reponame', function(done){
    let subTargetRequest = sift({
      route: 'repos/test',
      method: 'GET'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        for (let routeItem of routeItems) {
          if (checkPath(targetRequest, routeItem)) {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner');
            expect(routeItem.matchVariables).to.be.an('object').to.have.property('owner', 'test');
            delete routeItem.matchVariables
          }
        }
      }
      done()
  })
  it('checking search repos', function(done){
    let subTargetRequest = sift({
      route: 'repos',
      method: 'SEARCH'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        for (let routeItem of routeItems) {
          if (checkPath(targetRequest, routeItem)) {
            expect(routeItem.path).to.be.an('array').that.include('repos');
            expect(routeItem).to.not.have.property('matchVariables');
          }
        }
      }
      done()
  })
  it('checking get repos/reponame', function(done){
    let subTargetRequest = sift({
      route: 'repos',
      path: 'reponame',
      method: 'GET'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        for (let routeItem of routeItems) {
          if (checkPath(targetRequest, routeItem)) {
            expect(routeItem.path).to.be.an('array').that.include('repos');
            expect(routeItem).to.not.have.property('matchVariables');
          }
        }
      }
      done()
  })
  it('checking post repos/ownername/reponame/files', function(done){
    let subTargetRequest = sift({
      route: 'repos/ownername/reponame/files',
      method: 'POST'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        for (let routeItem of routeItems) {
          if (checkPath(targetRequest, routeItem)) {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner/:repo/files');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('owner', 'ownername');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('repo', 'reponame');       
            delete routeItem.matchVariables   
          }
        }
      }
      done()
  })
  it('checking get repos/ownername/reponame/files/fileid', function(done){
    let subTargetRequest = sift({
      route: 'repos/ownername/reponame/files',
      path: 'fileid',
      method: 'GET'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        for (let routeItem of routeItems) {
          if (checkPath(targetRequest, routeItem)) {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner/:repo/files');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('owner', 'ownername');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('repo', 'reponame');  
            delete routeItem.matchVariables
          }
        }
      }
      done()
  })
  it('checking search repos/ownername/files', function(done){
    let subTargetRequest = sift({
      route: 'repos/ownername/files',
      method: 'SEARCH'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        for (let routeItem of routeItems) {
          if (checkPath(targetRequest, routeItem)) {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner/files');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('owner', 'ownername'); 
            delete routeItem.matchVariables        
          }
        }
      }
      done()
  })
  it('checking get repos/ownername/files/fileid', function(done){
    let subTargetRequest = sift({
      route: 'repos/ownername/files',
      path: 'fileid',
      method: 'GET'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        for (let routeItem of routeItems) {
          if (checkPath(targetRequest, routeItem)) {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner/files');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('owner', 'ownername'); 
            delete routeItem.matchVariables
          }
        }
      }
      done()
  })
})
