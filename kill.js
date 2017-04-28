'use strict';
const fs = require('fs');
require('dotenv').config();

if (process.env.PROXY && process.env.PIDFILE) {
  try {
    var pid = fs.readFileSync(process.env.PIDFILE + '.proxy');
    process.kill(pid, 'SIGHUP');
  }catch(e) {}
}

if (process.env.ADMIN && process.env.PIDFILE) {
  try {
    var pid = fs.readFileSync(process.env.PIDFILE);
    process.kill(pid, 'SIGHUP');
  }catch(e) {}
}
