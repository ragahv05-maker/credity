const fs = require('fs');

const fixDeps = (filePath) => {
  if (fs.existsSync(filePath)) {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    pkg.overrides = pkg.overrides || {};

    // The previous error in lint was `TypeError: expand is not a function`. The memory states:
    // "When resolving the brace-expansion vulnerability via overrides in ESM packages, always use version ^5.0.5."
    // Let's ensure brace-expansion is specifically ^5.0.5 and NOT any other version.
    pkg.overrides['brace-expansion'] = '^5.0.5';

    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Fixed ${filePath}`);
  }
};

fixDeps('BlockWalletDigi/package.json');
fixDeps('CredVerseIssuer 3/package.json');
