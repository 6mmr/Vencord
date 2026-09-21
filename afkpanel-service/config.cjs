'use strict';
const fs = require('node:fs');
const path = require('node:path');

function loadConfig(file = path.join(__dirname, 'afkpanel.local.json')) {
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (typeof config.apiKey !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(config.apiKey)) throw Error('Set a valid service key in afkpanel.local.json.');
  if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) throw Error('The service port must be between 1024 and 65535.');
  if (!['127.0.0.1', '::1', '0.0.0.0'].includes(config.bind)) throw Error('Use a loopback address or 0.0.0.0 for bind.');
  if (!Number.isInteger(config.maxSessions) || config.maxSessions < 1 || config.maxSessions > 5) throw Error('maxSessions must be between 1 and 5.');
  if (typeof config.lavalinkFile !== 'string') throw Error('Set lavalinkFile to your private host.json file.');
  const nodes = JSON.parse(fs.readFileSync(path.resolve(path.dirname(file), config.lavalinkFile), 'utf8'));
  if (!Array.isArray(nodes)) throw Error('host.json must contain an array of Lavalink nodes.');
  const node = nodes.find((n, i) => n && (n.identifier || `node-${i + 1}`) === config.lavalinkNode);
  if (!node || typeof node.host !== 'string' || !/^[A-Za-z0-9.-]+$/.test(node.host)
    || !Number.isInteger(node.port) || node.port < 1 || node.port > 65535 || typeof node.secure !== 'boolean'
    || typeof node.password !== 'string' || !node.password.length || node.password.length > 512 || /[\r\n]/.test(node.password)) throw Error('Select a valid Lavalink node from host.json.');
  return { apiKey: config.apiKey, bind: config.bind, port: config.port, maxSessions: config.maxSessions,
    node: { host: node.host, port: node.port, secure: node.secure, password: node.password } };
}

module.exports = { loadConfig };
