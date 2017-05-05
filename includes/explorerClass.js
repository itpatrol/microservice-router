/**
 * Process Test task.
 */
'use strict';

const EventEmitter = require('events').EventEmitter;
const util = require('util');
const debugF = require('debug');
const MongoClient = require('mongodb').MongoClient;
const MicroserviceClient = require('@microservice-framework/microservice-client');
const doT = require('dot');
doT.templateSettings.strip = false;
const dots = doT.process({ path: "./html", strip: false});


function ExplorerClass(requestDetails, callback) {
  EventEmitter.call(this);
  var self = this;
  self.requestDetails = requestDetails;
  self.mode = 'json';
  self.servicesCount = 0;
  self.map = [];
  self.callback = callback;
  if(requestDetails.headers.accept.indexOf('text/html') != -1) {
    self.mode = 'html';
  }
  self.once('error', function(err) {
    self.debug.explorer('Error %O', err);
    return self.callback(err, null);
  });
  self.once('services', function(services) {
    self.debug.explorer('services %O', services);
    for(let path in services) {
      self.servicesCount = self.servicesCount + 1;
      let service = services[path];
      self.processService(path, service);
    }
  });
  self.once('done', function(map) {
    self.debug.explorer('map %s %s: %O', requestDetails.headers.accept, self.mode, map);
    if(self.mode == 'json') {
      return self.callback(null, {
        code: 200,
        answer: map
      });
    }
    return self.processMapToHTML(map);
  });
  self.on('errorService', function(err, path, service) {
    self.debug.explorer('Error options %O %s %O', err, path, service);
    self.map.push({
      path: path,
      scope: service.scope,
      provides: service.provides,
      err: err.message,
    });
    if(self.map.length == self.servicesCount) {
      self.emit('done', self.map);
    }
  });

  self.on('service', function(path, service, options) {
    self.debug.explorer('Service %s, %O, %O', path, service, options);

    self.map.push({
      path: path,
      scope: service.scope,
      provides: service.provides,
      options: options
    });
    if(self.map.length == self.servicesCount) {
      self.emit('done', self.map);
    }
  });

}
util.inherits(ExplorerClass, EventEmitter);

ExplorerClass.prototype.debug = {
  explorer: debugF('proxy:explorer')
};

/**
 * Process explorer request.
 *
 * @param {object} module - module data.
 */
ExplorerClass.prototype.processMapToHTML = function(map) {;
  var self = this;
  let servicesHTML = '';
  for(var i in map) {
    if(!map[i].err) {
      servicesHTML = servicesHTML + dots.service(map[i]);
    }
  }
  return self.callback(null, {
    code: 200,
    answer: dots.html({lines: servicesHTML}),
    headers: {
      'content-type': 'text/html'
    }
  });
}
/**
 * Process explorer request.
 *
 * @param {object} module - module data.
 */
ExplorerClass.prototype.processService = function(path, service) {
  var self = this;
  let clientSettings = {
    URL: service.url
  }
  if (self.requestDetails.headers.access_token) {
    clientSettings.accessToken = self.requestDetails.headers.access_token;
  } else if(self.requestDetails.isSecure){
    clientSettings.secureKey = service.secureKey;
  }
  let msClient = new MicroserviceClient(clientSettings);
  msClient.options({}, function(err, options){
    if(err) {
      return self.emit('errorService', err, path, service);
    }
    return self.emit('service', path, service, options);
  });
}
/**
 * Process explorer request.
 *
 * @param {object} module - module data.
 */
ExplorerClass.prototype.process = function() {
  var self = this;
  MongoClient.connect(process.env.MONGO_URL + process.env.MONGO_PREFIX +
    process.env.MONGO_OPTIONS, function(err, db) {
    if (err) {
      // If error, do nothing.
      return self.emit('error', err);
    }

    var collection = db.collection(process.env.MONGO_TABLE);

    collection.find({}).toArray(function(err, results) {
      db.close();
      if (err) {
        // If error, do nothing.
        return self.emit('error', err);
      }
      if (!results || results.length == 0) {
        return self.emit('error', new Error('No services available'));
      }
      let services = {};
      let found = false;
      for (let i in results) {
        let service = results[i];
        for (let j in service.path){
          let path = service.path[j];
          services[path] = service;
          found= true;
        }
      }
      if(!found) {
        return self.emit('error', new Error('No services available'));
      }
      self.emit('services', services);
    });
  });
}

module.exports = ExplorerClass;
