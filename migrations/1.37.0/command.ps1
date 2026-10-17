# First update them
npm install --save react@18.1.0 react-reconciler@0.28.0 --force
npm install --save-dev @types/react@18.0.9 @types/node@16.10.3 --force

# Remove them from package.json using Node.js
node -e "var package = require('./package.json');

delete package.dependencies.react;
delete package.dependencies['react-reconciler'];
delete package.devDependencies['@types/react'];
delete package.devDependencies['@types/node'];

if (package.dependencies['react-devtools']) {
  package.dependencies['react-devtools'] = '4.24.6'
}

require('fs').writeFileSync('./package.json', JSON.stringify(package, null, '  ') + '\n')"

# Update the lock file
npm install
