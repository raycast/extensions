#!/bin/bash

echo "🔄 Forcing Raycast to reload WebBlocker extension..."

# 1. Clean and rebuild
echo "1️⃣ Cleaning old files..."
npm run clean

echo "2️⃣ Building new files..."
npm run build

# 2. Kill Raycast to force reload
echo "3️⃣ Killing Raycast process..."
killall "Raycast" 2>/dev/null || echo "Raycast not running"

# 3. Wait a moment
sleep 2

# 4. Restart Raycast
echo "4️⃣ Restarting Raycast..."
open -a "Raycast"

echo ""
echo "✅ Done! Raycast should now load the updated extension."
echo ""
echo "📝 Next steps:"
echo "1. Wait for Raycast to fully load (a few seconds)"
echo "2. Open Raycast (⌘ + Space)"
echo "3. Type 'Enable Website Blocking'"
echo "4. You should see the NEW streamlined version!"
echo ""