const fs = require('fs');

const fixDeps = (filePath) => {
  if (fs.existsSync(filePath)) {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    pkg.overrides = pkg.overrides || {};

    // update brace-expansion to safe version (^5.0.5 fails because it's esm sometimes but overrides require it in ESM projects so let's stick to it, maybe direct dependency is causing issue)
    if(pkg.dependencies && pkg.dependencies['brace-expansion']) {
       pkg.dependencies['brace-expansion'] = '^5.0.5';
    }
    if(pkg.devDependencies && pkg.devDependencies['brace-expansion']) {
       pkg.devDependencies['brace-expansion'] = '^5.0.5';
    }

    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Fixed ${filePath}`);
  }
};

fixDeps('BlockWalletDigi/package.json');
fixDeps('CredVerseIssuer 3/package.json');
