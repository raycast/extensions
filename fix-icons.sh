#!/bin/bash

# WebBlocker Icon Fix Script
# This script completely resets the extension to fix icon display issues

set -e

echo "🔧 Fixing WebBlocker Icons..."
echo ""

# Step 1: Clean extended attributes from all PNG files
echo "1️⃣  Cleaning extended attributes from icon files..."
find assets/ -name "*.png" -exec xattr -c {} \; 2>/dev/null || true
echo "✅ Extended attributes cleaned"
echo ""

# Step 2: Verify all icons exist and are correct format
echo "2️⃣  Verifying icon files..."
for icon in assets/*.png; do
    if [ -f "$icon" ]; then
        size=$(sips -g pixelWidth -g pixelHeight "$icon" 2>/dev/null | grep "pixel" | awk '{print $2}')
        echo "   ✓ $(basename $icon) - ${size}x${size}"
    fi
done
echo ""

# Step 3: Rebuild the extension
echo "3️⃣  Rebuilding extension..."
npm run build > /dev/null 2>&1
echo "✅ Extension rebuilt"
echo ""

# Step 4: Kill Raycast
echo "4️⃣  Stopping Raycast..."
killall Raycast 2>/dev/null || echo "   (Raycast wasn't running)"
sleep 2
echo "✅ Raycast stopped"
echo ""

# Step 5: Clear all Raycast caches
echo "5️⃣  Clearing Raycast caches..."
rm -rf ~/Library/Caches/com.raycast.macos/* 2>/dev/null || true
rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions_cache/* 2>/dev/null || true
rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions-cache/* 2>/dev/null || true
echo "✅ Caches cleared"
echo ""

# Step 6: Restart Raycast
echo "6️⃣  Starting Raycast..."
open -a Raycast
sleep 3
echo "✅ Raycast started"
echo ""

echo "✨ Icon fix complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Open Raycast (⌘+Space)"
echo "   2. Go to Preferences → Extensions"
echo "   3. Find 'WebBlocker' in your imported extensions"
echo "   4. If icons still don't show, click the '...' menu and select 'Reload Extension'"
echo "   5. Search for 'webblock' to test the commands"
echo ""
