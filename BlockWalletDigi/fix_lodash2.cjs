const fs = require('fs');

const fixDeps = (filePath) => {
  if (fs.existsSync(filePath)) {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    pkg.overrides = pkg.overrides || {};

    // update lodash to safe version
    pkg.overrides['lodash'] = '^4.18.1';

    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Fixed ${filePath}`);
  }
};

fixDeps('BlockWalletDigi/package.json');
fixDeps('CredVerseIssuer 3/package.json');
