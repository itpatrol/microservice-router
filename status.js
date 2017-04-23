'use strict';
const fs = require('fs');
require('dotenv').config();

var pidproxy = fs.readFileSync(process.env.PIDFILE + '.proxy').toString('utf8');
var pid = fs.readFileSync(process.env.PIDFILE).toString('utf8');

console.log(JSON.stringify({
  "microservice-router:admin" : {
    pid: pid,
    start: 'start-admin',
    stop: 'stop-admin'
  },
  "microservice-router:proxy" : {
    pid: pidproxy,
    start: 'start-proxy',
    stop: 'stop-proxy'
  }
}));
