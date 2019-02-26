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
let templatePath = './html';
if (process.env.TEMPLATE_PATH) {
  templatePath = process.env.TEMPLATE_PATH;
}
const dots = doT.process({ path: templatePath, strip: false});


function ExplorerClass(requestDetails, callback) {
  EventEmitter.call(this);
  var self = this;
  self.requestDetails = requestDetails;
  self.mode = 'json';
  self.servicesCount = 0;
  self.accessTokenDetails = false;
  self.map = [];
  self.callback = callback;
  if (requestDetails.headers.accept.indexOf('text/html') != -1) {
    self.mode = 'html';
  }
  self.once('error', function(err) {
    self.debug.explorer('Error %O', err);
    return self.callback(err, null);
  });
  self.once('services', function(services) {
    self.debug.explorer('services %O', services);
    if (!self.requestDetails.isSecure) {
      let accessToken = ''
      if (self.requestDetails.headers.access_token) {
        accessToken = self.requestDetails.headers.access_token;
      };
      if (self.requestDetails.headers['access-token']) {
        accessToken = self.requestDetails.headers['access-token'];
      };
      if (services['auth']) {
        let clientSettings = {
          URL: services['auth'].url,
          secureKey: services['auth'].secureKey,
        }
        let msClient = new MicroserviceClient(clientSettings);
        msClient.search({
          accessToken: accessToken}, function(err, answer) {
            if (err) {
              return self.emit('done');
            }
            if (!answer[0]) {
              return self.emit('done');
            }
            self.accessTokenDetails = answer[0];
          });
      }
    }
    for (let path in services) {
      self.servicesCount = self.servicesCount + 1;
      let service = services[path];
      self.processService(path, service);
    }
  });
  self.once('done', function(map) {
    self.debug.explorer('map %s %s: %O', requestDetails.headers.accept, self.mode, map);
    let resultMap = [];
    for (var i in map) {
      if (!map[i].err) {
        resultMap.push(map[i]);
      }
    }
    resultMap.sort(function(a,b) {
      if (a.path < b.path) {
        return -1;
      }
      if (a.path > b.path) {
        return 1;
      }
      return 0;
    });
    if (self.mode == 'json') {
      return self.callback(null, {
        code: 200,
        answer: resultMap
      });
    }
    let accessToken = ''
    if (self.requestDetails.headers.access_token) {
      accessToken = self.requestDetails.headers.access_token;
    };
    if (self.requestDetails.headers['access-token']) {
      accessToken = self.requestDetails.headers['access-token'];
    };

    if (self.requestDetails.isSecure) {
      accessToken = self.requestDetails.SecureKey;
    }
    return self.processMapToHTML(resultMap, self.requestDetails.isSecure, accessToken);
  });
  self.on('errorService', function(err, path, service) {
    self.debug.explorer('Error options %O %s %O', err, path, service);
    if (typeof err === 'string') {
      err = new Error(err);
    }
    self.map.push({
      path: path,
      scope: service.scope,
      provides: service.provides,
      err: err.message,
    });
    if (self.map.length == self.servicesCount) {
      self.emit('done', self.map);
    }
  });

  self.on('service', function(path, service, options) {
    self.debug.explorer('Service %s, %O, %O', path, service, options);

    self.map.push({
      path: path,
      scope: service.scope,
      provides: service.provides,
      secureKey: service.secureKey,
      options: options
    });
    if (self.map.length == self.servicesCount) {
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
ExplorerClass.prototype.processMapToHTML = function(map, isSecure, accessToken) {;
  var self = this;

  let servicesHTML = '';
  for (var i in map) {
    map[i].isSecure = self.requestDetails.isSecure;
    var serviceHTML = '';
    try {
      serviceHTML = dots.service(map[i])
    } catch (e) {
      self.debug.explorer('Error on dot template error: %O service: %O', e, map[i]);
    }
    servicesHTML = servicesHTML + serviceHTML;
  }
  if (map.length == 0) {
    accessToken = false;
  }
  var version = 'unknown';
  if (process.env.mfw_package_version) {
    version = process.env.mfw_package_version;
  } else if (process.env.npm_package_version) {
    version = process.env.npm_package_version;
  }

  var name = 'unknown';
  if (process.env.mfw_package_name) {
    name = process.env.mfw_package_name;
  } else if (process.env.npm_package_name) {
    name = process.env.npm_package_name;
  }

  var description = '';
  if (process.env.mfw_package_description) {
    description = process.env.mfw_package_description;
  } else if (process.env.npm_package_description) {
    description = process.env.npm_package_description;
  }
  var expireIn = false;

  if (self.accessTokenDetails.expireAt !== -1) {
    let expireInsec = Math.round((self.accessTokenDetails.expireAt - Date.now()) / 1000);
    expireIn = '';
    if (expireInsec > 3600) {
      expireIn = expireIn + Math.floor(expireInsec / 3600) + ' hours ';
      expireInsec = expireInsec -  Math.floor(expireInsec / 3600) * 3600;
    }
    if (expireInsec > 60) {
      expireIn = expireIn + Math.floor(expireInsec / 60) + ' min ';
      expireInsec = expireInsec -  Math.floor(expireInsec / 60) * 60;
    }
    if (expireInsec > 0) {
      expireIn = expireIn + Math.round(expireInsec) + ' sec ';
    }
  }
  try {
    var html = {
      lines: servicesHTML,
      version: version,
      name: name,
      description: description,
      url: process.env.BASE_URL,
      isSecure: isSecure,
      accessToken: accessToken,
      accessTokenDetails: self.accessTokenDetails,
      expireIn: expireIn,
      scriptjs: dots.scriptsjs({
        isSecure: isSecure,
        accessToken: accessToken,
        url: process.env.BASE_URL.replace(/\/$/, ''),
      }),
      stylecss: dots.stylecss({})
    }
    return self.callback(null, {
      code: 200,
      answer: dots.html(html),
      headers: {
        'content-type': 'text/html'
      }
    });
  } catch (e) {
    return self.callback(e);
  }
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
  let accessToken = false;
  if (self.requestDetails.headers.access_token) {
    accessToken = self.requestDetails.headers.access_token;
  }
  if (self.requestDetails.headers['access-token']) {
    accessToken = self.requestDetails.headers['access-token'];
  }
  if (accessToken) {
    clientSettings.accessToken = accessToken;
  } else if (self.requestDetails.isSecure) {
    clientSettings.secureKey = service.secureKey;
  }
  let msClient = new MicroserviceClient(clientSettings);
  msClient.options({
    path: path
  }, function(err, options) {
    if (err) {
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

    collection.find({type: "handler"}).toArray(function(err, results) {
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
        for (let j in service.path) {
          let path = service.path[j];
          services[path] = service;
          found = true;
        }
      }
      if (!found) {
        return self.emit('error', new Error('No services available'));
      }
      self.emit('services', services);
    });
  });
}

module.exports = ExplorerClass;
