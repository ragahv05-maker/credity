const fs = require('fs');

function patchFile(path, lineNumber) {
    let content = fs.readFileSync(path, 'utf-8');
    let lines = content.split('\n');

    // Add @ts-ignore before the line
    lines.splice(lineNumber - 1, 0, '  // @ts-ignore - Sentry error handler type mismatch');

    fs.writeFileSync(path, lines.join('\n'), 'utf-8');
    console.log(`Patched ${path}`);
}

patchFile('./BlockWalletDigi/server/index.ts', 117);
patchFile('./CredVerseIssuer 3/server/index.ts', 162);
