#!/bin/bash

# Ultimate Icon Fix for WebBlocker Raycast Extension
# This script does EVERYTHING needed to fix icon display

set -e

echo "🚀 Ultimate WebBlocker Icon Fix"
echo "================================"
echo ""

EXT_DIR="/Users/ahmadbulbul/Developer/RayCast_WebBlocker_Extention"

cd "$EXT_DIR"

# Step 1: Verify we're in the right directory
echo "1️⃣  Verifying directory..."
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: Not in WebBlocker directory!"
    exit 1
fi
echo "   ✅ In correct directory: $EXT_DIR"
echo ""

# Step 2: Clean and rebuild
echo "2️⃣  Cleaning and rebuilding extension..."
npm run build > /dev/null 2>&1
echo "   ✅ Extension rebuilt"
echo ""

# Step 3: Verify icons are in root (not assets)
echo "3️⃣  Verifying icons are in root directory..."
required_icons=("icon.png" "add-website-icon.png" "enable-blocking-icon.png" "disable-blocking-icon.png" "manage-sites-icon.png" "refresh-blocking-icon.png")
all_found=true
for icon in "${required_icons[@]}"; do
    if [ ! -f "$icon" ]; then
        echo "   ❌ Missing: $icon"
        all_found=false
    fi
done
if [ "$all_found" = true ]; then
    echo "   ✅ All icons present in root directory"
else
    echo "   ❌ Some icons missing! Copying from assets..."
    for icon in "${required_icons[@]}"; do
        if [ -f "assets/$icon" ] && [ ! -f "$icon" ]; then
            cp "assets/$icon" "$icon"
            echo "   📋 Copied: $icon"
        fi
    done
fi
echo ""

# Step 4: Remove ALL extended attributes
echo "4️⃣  Cleaning extended attributes from all icons..."
for icon in *.png; do
    if [ -f "$icon" ]; then
        xattr -c "$icon" 2>/dev/null || true
    fi
done
echo "   ✅ Extended attributes cleared"
echo ""

# Step 5: Kill Raycast completely
echo "5️⃣  Stopping Raycast..."
killall Raycast 2>/dev/null || echo "   (Raycast wasn't running)"
sleep 3
echo "   ✅ Raycast stopped"
echo ""

# Step 6: Nuclear option - clear ALL Raycast caches
echo "6️⃣  Clearing ALL Raycast caches (nuclear option)..."
rm -rf ~/Library/Caches/com.raycast.macos 2>/dev/null || true
rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions_cache 2>/dev/null || true
rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions-cache 2>/dev/null || true
rm -rf ~/Library/Application\ Support/com.raycast.macos/store 2>/dev/null || true
echo "   ✅ All caches cleared"
echo ""

# Step 7: Start Raycast
echo "7️⃣  Starting Raycast..."
open -a Raycast
sleep 5
echo "   ✅ Raycast started"
echo ""

echo "✨ Icon fix complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 CRITICAL NEXT STEPS - YOU MUST DO THIS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option A: Reload Extension (Quick)"
echo "   1. Open Raycast (⌘+Space)"
echo "   2. Type: 'preferences' and press Enter"
echo "   3. Click 'Extensions' tab"
echo "   4. Find 'WebBlocker' in the list"
echo "   5. Click the '...' (three dots) menu next to it"
echo "   6. Click 'Reload Extension'"
echo ""
echo "Option B: Re-import Extension (If reload doesn't work)"
echo "   1. In Raycast Preferences → Extensions"
echo "   2. Find 'WebBlocker' and click 'Remove Extension'"
echo "   3. Click the '+' button (Add Extension)"
echo "   4. Select 'Import Extension'"
echo "   5. Navigate to: $EXT_DIR"
echo "   6. Click 'Import'"
echo ""
echo "Then test by searching 'webblock' in Raycast!"
echo ""
