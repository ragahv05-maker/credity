const fs = require('fs');

const fixDeps = (filePath) => {
  if (fs.existsSync(filePath)) {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    pkg.overrides = pkg.overrides || {};

    // update brace-expansion to safe version (^5.0.5 fails because it's esm sometimes but overrides require it in ESM projects so let's stick to it, maybe direct dependency is causing issue)
    delete pkg.dependencies['brace-expansion'];
    delete pkg.devDependencies['brace-expansion'];

    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Fixed ${filePath}`);
  }
};

fixDeps('BlockWalletDigi/package.json');
fixDeps('CredVerseIssuer 3/package.json');
