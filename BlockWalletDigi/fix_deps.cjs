const fs = require('fs');

const fixDeps = (filePath) => {
  if (fs.existsSync(filePath)) {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    pkg.overrides = pkg.overrides || {};

    // Add overrides based on known vulnerabilities
    pkg.overrides['express-rate-limit'] = '^8.2.2';
    pkg.overrides['h3'] = '^1.15.9';
    pkg.overrides['hono'] = '^4.12.7';
    pkg.overrides['lodash'] = '^4.17.21'; // Correct safe version is usually 4.17.21+ or ^4.18.1
    pkg.overrides['path-to-regexp'] = '^0.1.13';
    pkg.overrides['picomatch'] = '^2.3.2'; // safe override
    pkg.overrides['socket.io-parser'] = '^4.2.6';
    pkg.overrides['brace-expansion'] = '^5.0.5';
    pkg.overrides['defu'] = '^6.1.6';
    pkg.overrides['@tootallnate/once'] = '^3.0.1';

    // also update devDependencies for express-rate-limit just in case it is explicitly declared
    if(pkg.dependencies && pkg.dependencies['express-rate-limit']) {
       pkg.dependencies['express-rate-limit'] = '^8.2.2';
    }

    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Fixed ${filePath}`);
  }
};

fixDeps('BlockWalletDigi/package.json');
