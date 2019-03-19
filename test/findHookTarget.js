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

})