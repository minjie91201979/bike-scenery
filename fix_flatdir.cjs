const fs = require('fs');
const path = require('path');
const root = 'android';
const app = path.join(root, 'app', 'build.gradle');
let t = fs.readFileSync(app, 'utf8');
const old = [
  'repositories {',
  '    flatDir{',
  "        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'",
  '    }',
  '}',
  '',
  ''
].join('\n');
if (!t.includes(old)) {
  console.error('app block missing');
  process.exit(1);
}
fs.writeFileSync(app, t.replace(old, ''));
console.log('removed app flatDir');

const cordova = path.join(root, 'capacitor-cordova-android-plugins', 'build.gradle');
let ct = fs.readFileSync(cordova, 'utf8');
const old2 = [
  'repositories {',
  '    google()',
  '    mavenCentral()',
  '    flatDir{',
  "        dirs 'src/main/libs', 'libs'",
  '    }',
  '}',
  ''
].join('\n');
const new2 = [
  'repositories {',
  '    google()',
  '    mavenCentral()',
  '}',
  ''
].join('\n');
if (!ct.includes(old2)) {
  console.error('cordova block missing');
  process.exit(1);
}
fs.writeFileSync(cordova, ct.replace(old2, new2));
console.log('removed cordova flatDir');
