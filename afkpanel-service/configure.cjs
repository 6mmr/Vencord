'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const target = path.join(__dirname, 'afkpanel.local.json');
try {
  fs.writeFileSync(target, JSON.stringify({
    apiKey: randomBytes(32).toString('hex'), bind: '127.0.0.1', port: 3847, maxSessions: 3,
    lavalinkFile: './host.json', lavalinkNode: 'local-primary'
  }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log('Created afkpanel.local.json. Keep it private. Set the Lavalink file and node there, then run npm start.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('afkpanel.local.json already exists; it was not changed.');
  else { console.error('Could not create the local configuration file.'); process.exitCode = 1; }
}
