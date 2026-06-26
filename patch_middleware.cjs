const fs = require('fs');
const file = 'packages/shared-auth/src/middleware.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("import { verifyAccessToken } from './jwt';", "import { verifyAccessToken } from './jwt.js';");
fs.writeFileSync(file, content);
console.log('Patched middleware.ts');
