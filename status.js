'use strict';
const fs = require('fs');
require('dotenv').config();
var pidproxy;
var pid;

try {
  pidproxy = fs.readFileSync(process.env.PIDFILE + '.proxy').toString('utf8');
  pid = fs.readFileSync(process.env.PIDFILE).toString('utf8');
}catch(e) {}

console.log(JSON.stringify({
  'microservice-router:admin': {
    pid: pid,
    start: 'start-admin',
    stop: 'stop-admin'
  },
  'microservice-router:proxy': {
    pid: pidproxy,
    start: 'start-proxy',
    stop: 'stop-proxy'
  }
}));
