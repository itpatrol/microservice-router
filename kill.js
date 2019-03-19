'use strict';
const fs = require('fs');
require('dotenv').config();

if (process.env.PROXY && process.env.PIDFILE) {
  try {
    let pid = fs.readFileSync(process.env.PIDFILE + '.proxy');
    process.kill(pid, 'SIGINT');
  } catch (e) {}
}

if (process.env.ADMIN && process.env.PIDFILE) {
  try {
    let pid = fs.readFileSync(process.env.PIDFILE);
    process.kill(pid, 'SIGINT');
  } catch (e) {}
}
