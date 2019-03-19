const expect  = require("chai").expect;

const getHeaders = require('../includes/getHeaders.js')
const findAllTargets = require('../includes/findAllTargets.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')
const signature = require('../includes/signature.js');

/* debug code 
for (let targetRequest of targetRequests) {
  targetRequest.requestDetails._buffer = JSON.stringify(targetRequest.jsonData)
  let result = findAllTargets(targetRequest, false, routeItems)
  for(let routeItem of result) {
    console.log('match')
    console.log('targetRequest', targetRequest)
    console.log('routeItem', routeItem)
    if(routeItem.hook){
      console.log('getHeaders', getHeaders(targetRequest, routeItem, routeItem.hook.phase, routeItem.hook.type, routeItem.hook.group, true ))  
    } else {
      console.log('getHeaders', getHeaders(targetRequest, routeItem ))
    }
    console.log("\n")
  }
}
*/

for (let targetRequest of targetRequests) {
  targetRequest.requestDetails._buffer = JSON.stringify(targetRequest.jsonData)
  let result = findAllTargets(targetRequest, false, routeItems)
  for(let routeItem of result) {
    if(Object.keys(routeItem.matchVariables).length) {
      describe('getHeaders:matchVariables on ' + targetRequest.route, function(){
        it('checking checkMatchVariables', function(done) {
          let headers = getHeaders(targetRequest, routeItem )
          if(routeItem.matchVariables) {
            for(let key in routeItem.matchVariables) {
              expect(headers['mfw-' + key]).to.equal(routeItem.matchVariables[key])
            }
          }
          done()
        })
      })
    }
    if(routeItem.hook){
      
      describe('getHeaders:hook: ' + targetRequest.route, function(){
        it('checking for hook headers', function(done) {
          let headers = getHeaders(targetRequest, routeItem, routeItem.hook.phase, routeItem.hook.type, routeItem.hook.group, true )
          console.log(headers)
          expect(headers['x-origin-url']).to.equal(targetRequest.route)
          expect(headers['x-origin-method']).to.equal(targetRequest.method)
          expect(headers['x-endpoint-scope']).to.equal(targetRequest.endpoint.scope)
          expect(headers['x-hook-phase']).to.equal(routeItem.hook.phase)
          expect(headers['x-hook-type']).to.equal(routeItem.hook.type)
          expect(headers['x-hook-group']).to.equal(routeItem.hook.group)
          let hash = 'sha256=' 
          + signature('sha256', targetRequest.requestDetails._buffer, routeItem.secureKey)
          expect(headers['x-hook-signature']).to.equal(hash)
          done()
        })
      })
    } else {
      describe('getHeaders: ' + targetRequest.route, function(){
        it('checking for request headers', function(done) {
          let headers = getHeaders(targetRequest, routeItem )
          if(Object.keys(targetRequest.requestDetails.headers).length) {
            for(let key in targetRequest.requestDetails.headers) {
              expect(headers[key]).to.equal(targetRequest.requestDetails.headers[key])
            }
          }
          done()
        })
      })
    }
  }
}


