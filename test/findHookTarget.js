const expect  = require("chai").expect;
const sift = require('sift').default

const findHookTarget = require('../includes/findHookTarget.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')

/* Debuging code
for (let targetRequest of targetRequests) {
  let result = findHookTarget(targetRequest, 'after', 'notify', false, routeItems)
  if(!(result instanceof Error)) {
    console.log('match')
    console.log('targetRequest', targetRequest)
    console.log('routeItems', result)
    console.log("\n")
  }
}
*/

describe('findHookTarget', function(){
  it('checking post repos/test', function(done){
    let subTargetRequest = sift({
      route: 'repos/test',
      method: 'POST'
    }, targetRequests)
      for (let targetRequest of subTargetRequest) {
        let targets = findHookTarget(targetRequest, 'after', 'notify', false, routeItems)
        expect(targets).to.be.an('array').that.is.not.empty;
        for (let routeItem of targets) {
          expect(routeItem.path).to.be.an('array').that.include('repos/:owner');
          expect(routeItem.matchVariables).to.be.an('object').to.have.property('owner', 'test');
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
        let targets = findHookTarget(targetRequest, 'after', 'notify', false, routeItems)
        expect(targets).to.be.an.instanceof(Error)
      }
      done()
  })

  it('checking for null phase', function(done){
    for (let targetRequest of targetRequests) {
      let targets = findHookTarget(targetRequest, null, 'notify', false, routeItems)
      for (let routeItem of targets) {
        expect(routeItem.hook.phase).to.exist;
      }

    }
    done()
  })
  it('checking for group repo-email', function(done){
    for (let targetRequest of targetRequests) {
      let targets = findHookTarget(targetRequest, null, 'notify', "repo-email", routeItems)
      if(!targets.length) {
        expect(targets).to.be.an.instanceof(Error)
      } else {
        for (let routeItem of targets) {
          expect(routeItem.hook.phase).to.exist;
          expect(routeItem.hook.group).to.equal("repo-email");
        }
      }

    }
    done()
  })
  it('checking for false phase', function(done){
    for (let targetRequest of targetRequests) {
      let targets = findHookTarget(targetRequest, false, 'notify', false, routeItems)

      for (let routeItem of targets) {
        expect(routeItem.hook.phase).to.exist;
      }
    }
    done()
  })

  it('finding Hook when they are missing', function(done){
    let subTargetRequest = sift({
      route: 'repos/ownername/reponame/files',
      method: 'POST'
    }, targetRequests)
    routeItems

    let routeNoHookItems =  sift({
      "type": {$ne: "hook"},
    }, routeItems)

      for (let targetRequest of subTargetRequest) {
        let targets = findHookTarget(targetRequest, 'before', 'notify', false, routeNoHookItems)
        expect(targets).to.be.an.instanceof(Error)
      }
      done()
  })
})
