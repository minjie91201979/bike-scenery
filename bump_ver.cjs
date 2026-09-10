const fs = require('fs');
const gradle = 'android/app/build.gradle';
let g = fs.readFileSync(gradle, 'utf8');
g = g.replace(/versionCode\s+\d+/, 'versionCode 3');
g = g.replace(/versionName\s+"[^"]+"/, 'versionName "1.0.2"');
fs.writeFileSync(gradle, g);
console.log('versionCode 3');
