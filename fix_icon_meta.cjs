const fs = require('fs');
const bg = 'android/app/src/main/res/values/ic_launcher_background.xml';
fs.writeFileSync(bg, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#A8D4E8</color>
</resources>
`);
const gradle = 'android/app/build.gradle';
let g = fs.readFileSync(gradle, 'utf8');
g = g.replace('versionCode 1', 'versionCode 2');
g = g.replace('versionName "1.0"', 'versionName "1.0.1"');
fs.writeFileSync(gradle, g);
console.log('updated bg + version');
