/**
 * Simple production build: copy www assets and stamp build version.
 * No bundler required — game is vanilla ES modules.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const stamp = {
  name: pkg.name,
  version: pkg.version,
  builtAt: new Date().toISOString(),
};

fs.writeFileSync(path.join(www, 'build-info.json'), JSON.stringify(stamp, null, 2));
console.log(`Getaway Rush v${pkg.version} build stamped → www/build-info.json`);
console.log('Web assets are ready in /www for browsers and Capacitor.');
