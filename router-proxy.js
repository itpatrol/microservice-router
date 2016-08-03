/**
 * Github Status microservice
 */
'use strict';

const Cluster = require('zenci-manager');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;

require('dotenv').config();

var mControlCluster = new Cluster({
  pid: process.env.PIDFILE + 'proxy',
  port: process.env.PROXY_PORT,
  count: process.env.WORKERS,
  callbacks: {
    POST: ProxyRequestPOST,
    GET: ProxyRequestGet,
    PUT: ProxyRequestPUT,
    DELETE: ProxyRequestDELETE,
    SEARCH: ProxyRequestSEARCH
  }
});

if(!mControlCluster.isMaster) {
  var routes = [];
  updateRouteVariable(routes);
  var interval = 6000;
  if (process.env.INTERVAL) {
    interval = process.env.INTERVAL;
  }
  setInterval(function(){
//    console.log('Current routes');
//    console.log(routes);
    updateRouteVariable(routes)}, interval);
}

/**
 * Proxy GET requests.
 */
function ProxyRequestGet(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length - 1; i++) {
    if (i != url.length - 2) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  console.log('Route base: %s', route);

  FindTarget(route, function(err, router) {
    console.log(err);
    console.log(router);
    if (err) {
      return callback(err, null);
    }

    request({
      uri: router.url + url[url.length - 1],
      method: 'GET',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}

/**
 * Proxy POST requests.
 */
function ProxyRequestPOST(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length; i++) {
    if (i != url.length - 1) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  console.log('Route base: %s', route);

  FindTarget(route, function(err, router) {
    console.log(err);
    console.log(router);
    if (err) {
      return callback(err, null);
    }

    request({
      uri: router.url,
      method: 'POST',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}

/**
 * Proxy PUT requests.
 */
function ProxyRequestPUT(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length - 1; i++) {
    if (i != url.length - 2) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  console.log('Route base: %s', route);

  FindTarget(route, function(err, router) {
    console.log(err);
    console.log(router);
    if (err) {
      return callback(err, null);
    }

    request({
      uri: router.url + url[url.length - 1],
      method: 'PUT',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}

/**
 * Proxy DELETE requests.
 */
function ProxyRequestDELETE(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length - 1; i++) {
    if (i != url.length - 2) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  console.log('Route base: %s', route);

  FindTarget(route, function(err, router) {
    console.log(err);
    console.log(router);
    if (err) {
      return callback(err, null);
    }

    request({
      uri: router.url + url[url.length - 1],
      method: 'DELETE',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}


/**
 * Proxy SEARCH requests.
 */
function ProxyRequestSEARCH(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length; i++) {
    if (i != url.length - 1) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  console.log('Route base: %s', route);

  FindTarget(route, function(err, router) {
    console.log(err);
    console.log(router);
    if (err) {
      return callback(err, null);
    }

    request({
      uri: router.url,
      method: 'SEARCH',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}

/**
 * Finx target URL.
 */
function FindTarget(route, callback) {
  console.log('Find route %s', route);
  console.log(routes);
  
  var availableRoutes = [];
  for (var i in routes) {
    if (routes[i].path == route) {
      availableRoutes.push(routes[i])
    }
  }
  console.log('Available routes for %s', route);
  console.log(availableRoutes);
  if (availableRoutes.length == 0) {
    return callback(new Error('Not found'), null);
  }
  if (availableRoutes.length == 1) {
    return callback(null, availableRoutes.pop());
  }

  var random = Math.floor(Math.random() * (availableRoutes.length) + 1) - 1;
  return callback(null, availableRoutes[random]);
  /*  MongoClient.connect(process.env.MONGO_URL, function(err, db) {
      if (err) {
        return callback(err, null);
      }

      var collection = db.collection(process.env.MONGO_TABLE);
      var query = {
        path: route,
        type: 'master'
      };
      collection.find(query).toArray(function(err, results) {
        if (err) {
          return callback(err, null);
        }
        if (!results || results.length == 0) {

          // If it is not default, search for default for not found.
          if( route != 'default' ) {
            return FindTarget('default', callback);
          }

          return callback(new Error('Not found'), null);
        }

        // If we have only one route, do not do random search.
        if(results.length == 1) {
          return callback(null, results.pop());
        }

        var random = Math.floor(Math.random() * (results.length) + 1) - 1;
        return callback(null, results[random]);
      });
    });*/
}

/**
 * Update route infor each 10 sec.
 */
function updateRouteVariable() {
//  console.log('Update routes');
//  console.log(routes);
  MongoClient.connect(process.env.MONGO_URL, function(err, db) {
    if (err) {
      // If error, do nothing.
      console.log(err);
      return;
    }

    var collection = db.collection(process.env.MONGO_TABLE);
    var query = {
      type: 'master'
    };
    collection.find(query).toArray(function(err, results) {
      if (err) {
        // If error, do nothing.
        console.log(err);
        return;
      }
      if (!results || results.length == 0) {
        // If there is no results, do nothing
        return;
      }
      var newRoutes = [];
      for (var i in results) {
        // get only changed in 60 sec.
        if (results[i].changed > Date.now() - 60 * 1000) {
          newRoutes.push(results[i]);
        }
      }
      routes = newRoutes;
//      console.log('Routes updated');
//      console.log(routes);
    });
  });
}