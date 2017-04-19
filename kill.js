'use strict';
const fs = require('fs');
require('dotenv').config();

if (process.env.PROXY && process.env.PIDFILE) {
  var pid = fs.readFileSync(process.env.PIDFILE + '.proxy');
  process.kill(pid, 'SIGHUP');
}

if (process.env.ADMIN && process.env.PIDFILE) {
  var pid = fs.readFileSync(process.env.PIDFILE);
  process.kill(pid, 'SIGHUP');
}
