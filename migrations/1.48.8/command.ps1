# First update them
npm install --save-dev @raycast/eslint-config

# Remove specific dependencies from package.json using Node.js
node -e "var package = require('./package.json');

delete package.devDependencies['@typescript-eslint/eslint-plugin'];
delete package.devDependencies['@typescript-eslint/parser'];
delete package.devDependencies['eslint-config-prettier'];

require('fs').writeFileSync('./package.json', JSON.stringify(package, null, '  ') + '\n')"

# Update the lock file
npm install
