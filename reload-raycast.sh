#!/bin/bash

echo "🔄 Forcing Raycast to reload icons..."
echo ""

# Step 1: Kill Raycast
echo "1️⃣  Stopping Raycast..."
killall "Raycast" 2>/dev/null
killall "Raycast Helper" 2>/dev/null
killall "Raycast Helper (Renderer)" 2>/dev/null
sleep 2
echo "   ✅ Raycast stopped"
echo ""

# Step 2: Clear ALL Raycast caches
echo "2️⃣  Clearing all caches..."
rm -rf ~/Library/Caches/com.raycast.macos/* 2>/dev/null
rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions/* 2>/dev/null
rm -rf ~/Library/Application\ Support/com.raycast.macos/store.db* 2>/dev/null
echo "   ✅ Caches cleared"
echo ""

# Step 3: Verify icons are in place
echo "3️⃣  Verifying icon files..."
if [ -f "icon.png" ] && [ -f "command-icon.png" ]; then
    echo "   ✅ icon.png found ($(du -h icon.png | cut -f1))"
    echo "   ✅ command-icon.png found ($(du -h command-icon.png | cut -f1))"
else
    echo "   ❌ ERROR: Icon files not found!"
    exit 1
fi
echo ""

# Step 4: Wait a moment
echo "4️⃣  Waiting for system to settle..."
sleep 2
echo "   ✅ Ready"
echo ""

# Step 5: Reopen Raycast
echo "5️⃣  Starting Raycast..."
open -a "Raycast"
sleep 3
echo "   ✅ Raycast started"
echo ""

echo "🎉 Done! Icons should now be visible."
echo ""
echo "👀 To verify:"
echo "   1. Open Raycast (Cmd+Space or your hotkey)"
echo "   2. Type 'webblock' or 'add website'"
echo "   3. Look for your custom icon next to each command!"
echo ""
echo "⚠️  If icons still don't show:"
echo "   - Restart your Mac"
echo "   - Or run: killall Raycast && open -a Raycast"
