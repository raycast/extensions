#!/bin/bash

echo "🚀 WebBlocker Extension Quick Test"
echo "=================================="
echo ""

echo "1. Extension files present:"
ls -1 src/*.tsx | head -4
echo ""

echo "2. Configuration files:"
echo "✅ raycast.json: $(test -f raycast.json && echo "Present" || echo "Missing")"
echo "✅ package.json: $(test -f package.json && echo "Present" || echo "Missing")"
echo ""

echo "3. TypeScript compilation:"
if [ -d "dist" ]; then
    echo "✅ Compiled files: $(ls dist/*.js | wc -l | xargs) JS files"
else
    echo "❌ No dist folder - run 'npm run build'"
fi
echo ""

echo "4. Extension path for Raycast import:"
echo "📁 $(pwd)"
echo ""

echo "5. Next steps:"
echo "   • Open Raycast preferences (⌘+,)"
echo "   • Go to Extensions → Add Extension"
echo "   • Import from the path above"
echo "   • Test the commands!"
echo ""

echo "🧪 After importing, test these commands in Raycast:"
echo "   1. 'Add Website to Block'"
echo "   2. 'View Blocked Sites'"
echo "   3. 'Enable Site Blocking' (requires password)"
echo "   4. 'Disable Site Blocking'"