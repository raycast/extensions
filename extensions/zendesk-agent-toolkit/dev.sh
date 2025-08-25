#!/bin/bash

# Script to run Raycast extension with correct Node version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm use 22
echo "Using Node.js version: $(node --version)"
echo "Starting Raycast extension development server..."

npm run dev
