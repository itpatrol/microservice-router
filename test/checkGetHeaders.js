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
      console.log('getHeaders', getHeaders(targetRequest, routeItem,
        routeItem.hook.phase, routeItem.hook.type, routeItem.hook.group, true ))  
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
  for (let routeItem of result) {
    if (Object.keys(routeItem.matchVariables).length) {
      describe('getHeaders:matchVariables on ' + targetRequest.route, function(){
        let headers = getHeaders(targetRequest, routeItem )
        if (routeItem.matchVariables) {
          for (let key in routeItem.matchVariables) {
            it('checking mfw-' + key + ': ' + routeItem.matchVariables[key], function(done) {
              expect(headers['mfw-' + key]).to.equal(routeItem.matchVariables[key])
              done()
            })
          }
        }
      })
    }
    if (routeItem.hook){
      
      describe('getHeaders:hook: ' + targetRequest.route, function(){
        let headers = getHeaders(targetRequest, routeItem, routeItem.hook.phase,
          routeItem.hook.type, routeItem.hook.group, true )

        it('checking x-origin-url', function(done) {
          expect(headers['x-origin-url']).to.equal(targetRequest.route)
          done()
        })

        it('checking x-origin-method', function(done) {
          expect(headers['x-origin-method']).to.equal(targetRequest.method)
          done()
        })

        it('checking x-endpoint-scope', function(done) {
          expect(headers['x-endpoint-scope']).to.equal(targetRequest.endpoint.scope)
          done()
        })

        it('checking x-hook-phase', function(done) {
          expect(headers['x-hook-phase']).to.equal(routeItem.hook.phase)
          done()
        })
          
        it('checking x-hook-type', function(done) {
          expect(headers['x-hook-type']).to.equal(routeItem.hook.type)
          done()
        })
        it('checking x-hook-group', function(done) {
          expect(headers['x-hook-group']).to.equal(routeItem.hook.group)
          done()
        })
        
        it('checking x-hook-signature', function(done) {
          let hash = 'sha256=' 
          + signature('sha256', targetRequest.requestDetails._buffer, routeItem.secureKey)
          expect(headers['x-hook-signature']).to.equal(hash)
          done()
        })
      })
    } else {
      describe('getHeaders:requestHeaders ' + targetRequest.route, function(){
        if (Object.keys(targetRequest.requestDetails.headers).length) {
          let headers = getHeaders(targetRequest, routeItem )
          for (let key in targetRequest.requestDetails.headers) {
            it('check header ' + key, function(done) {
              expect(headers[key]).to.equal(targetRequest.requestDetails.headers[key])
              done()
            })
          }
        } else {
          it('no headers', function(done) {
            done()
          })
        }
      })
    }
  }
}


