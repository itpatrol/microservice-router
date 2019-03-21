const expect  = require("chai").expect;
const sift = require('sift').default

const findAllTargets = require('../includes/findAllTargets.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')

/* Debuging code
for (let targetRequest of targetRequests) {
  let result = findAllTargets(targetRequest, false, routeItems)
  console.log('match')
  console.log('targetRequest', targetRequest)
  console.log('routeItems', result)
  console.log("\n")
}
*/

describe('findAllTargets', function(){
  it('findAllTargets post register', function(done){
    let subTargetRequest = sift({
      route: 'register',
      method: 'POST'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        let targets = findAllTargets(targetRequest, false, routeItems)
        for (let routeItem of targets) {
          if (routeItem.path[0] != '*')  {
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
        let targets = findAllTargets(targetRequest, false, routeItems)
        for (let routeItem of targets) {
          if (routeItem.path[0] != '*')  {
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
        let targets = findAllTargets(targetRequest, false, routeItems)
        for (let routeItem of targets) {
          if (routeItem.path[0] != '*')  {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner');
            expect(routeItem.matchVariables).to.be.an('object').to.have.property('owner', 'test');
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
        let targets = findAllTargets(targetRequest, false, routeItems)
        for (let routeItem of targets) {
          if (routeItem.path[0] != '*')  {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('owner', 'test');
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
        let targets = findAllTargets(targetRequest, false, routeItems)
        for (let routeItem of targets) {
          if (routeItem.path[0] != '*')  {
            expect(routeItem.path).to.be.an('array').that.include('repos');
            expect(routeItem.matchVariables).to.be.an('object').to.be.empty;
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
        let targets = findAllTargets(targetRequest, false, routeItems)
        for (let routeItem of targets) {
          if (routeItem.path[0] != '*')  {
            expect(routeItem.path).to.be.an('array').that.include('repos');
            expect(routeItem.matchVariables).to.be.an('object').to.be.empty;
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
        let targets = findAllTargets(targetRequest, false, routeItems)
        for (let routeItem of targets) {
          if (routeItem.path[0] != '*')  {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner/:repo/files');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('owner', 'ownername');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('repo', 'reponame');
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
        let targets = findAllTargets(targetRequest, false, routeItems)
        for (let routeItem of targets) {
          if (routeItem.path[0] != '*')  {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner/:repo/files');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('owner', 'ownername');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('repo', 'reponame');
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
        let targets = findAllTargets(targetRequest, false, routeItems)
        for (let routeItem of targets) {
          if (routeItem.path[0] != '*')  {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner/files');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('owner', 'ownername');
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
        let targets = findAllTargets(targetRequest, false, routeItems)
        for (let routeItem of targets) {
          if (routeItem.path[0] != '*')  {
            expect(routeItem.path).to.be.an('array').that.include('repos/:owner/files');
            expect(routeItem.matchVariables).to.be.an('object')
            .to.have.property('owner', 'ownername')
          }
        }
      }
      done()
  })
})
