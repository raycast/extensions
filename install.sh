#!/bin/bash
# Copyright © 2025
# All rights reserved.

echo "IP Finder - Raycast Extension Installer"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js 16 or higher from https://nodejs.org/"
    exit 1
fi

# Check if Raycast CLI is installed
if ! command -v ray &> /dev/null; then
    echo "Installing Raycast CLI..."
    npm install -g @raycast/api
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the extension
echo "Building extension..."
npm run build

echo ""
echo "Installation complete!"
echo ""
echo "To use the extension:"
echo "1. Open Raycast"
echo "2. Go to Extensions"
echo "3. Search for 'IP Finder'"
echo "4. The extension should now be available"
echo ""
echo "For development:"
echo "- Run 'npm run dev' to start development mode"
echo "- Run 'npm run lint' to check code quality"
echo ""
echo "Thank you for using IP Finder!" 