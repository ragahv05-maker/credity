const fs = require('fs');

const fixDeps = (filePath) => {
  if (fs.existsSync(filePath)) {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    pkg.overrides = pkg.overrides || {};

    // update lodash to safe version
    pkg.overrides['lodash'] = '^4.17.21';

    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Fixed ${filePath}`);
  }
};

fixDeps('BlockWalletDigi/package.json');
