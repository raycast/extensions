#!/bin/bash

# Nuclear Icon Reset Script
# This script tries EVERY possible solution to fix Raycast icon caching

set -e

EXT_DIR="/Users/ahmadbulbul/Developer/RayCast_WebBlocker_Extention"
cd "$EXT_DIR"

echo "💥 NUCLEAR ICON RESET - WebBlocker"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Stop Raycast
echo "1️⃣  Stopping Raycast completely..."
killall Raycast 2>/dev/null || echo "   (Raycast wasn't running)"
sleep 3
echo "   ✅ Raycast stopped"
echo ""

# Step 2: Create completely clean icons using ImageIO
echo "2️⃣  Creating completely clean icon files..."
for icon_map in \
  "Icons/Add_Website_To_Block.png:add-website-icon.png" \
  "Icons/Enable_Website_Blocking.png:enable-blocking-icon.png" \
  "Icons/Disable_Website_Blocking.png:disable-blocking-icon.png" \
  "Icons/Manage_Blocked_Websites.png:manage-sites-icon.png" \
  "Icons/Force_ReBlock.png:refresh-blocking-icon.png"
do
  source_icon=$(echo "$icon_map" | cut -d: -f1)
  target_icon=$(echo "$icon_map" | cut -d: -f2)
  
  echo "   🔄 Processing $target_icon..."
  
  # Remove existing file
  rm -f "$target_icon"
  
  # Create completely clean version using multiple steps
  # Step 1: Convert with sips (strips metadata)
  sips -s format png "$source_icon" --out "${target_icon}.tmp" > /dev/null 2>&1
  
  # Step 2: Re-process to ensure clean format
  sips -s format png "${target_icon}.tmp" --out "$target_icon" > /dev/null 2>&1
  
  # Step 3: Remove temp file
  rm -f "${target_icon}.tmp"
  
  # Step 4: Strip all extended attributes
  xattr -c "$target_icon" 2>/dev/null || true
  
  # Step 5: Set clean permissions
  chmod 644 "$target_icon"
  
  echo "   ✅ $target_icon created and cleaned"
done
echo ""

# Step 3: Verify all icons
echo "3️⃣  Verifying icon integrity..."
for icon in add-website-icon.png enable-blocking-icon.png disable-blocking-icon.png manage-sites-icon.png refresh-blocking-icon.png; do
  if [ -f "$icon" ]; then
    # Check file format
    format_check=$(file "$icon" | grep "PNG image data")
    if [ -n "$format_check" ]; then
      size=$(sips -g pixelWidth "$icon" 2>/dev/null | grep pixelWidth | awk '{print $2}')
      attrs_count=$(xattr -l "$icon" 2>/dev/null | wc -l)
      echo "   ✅ $icon: ${size}x${size} PNG, $attrs_count extended attributes"
    else
      echo "   ❌ $icon: Invalid format!"
    fi
  else
    echo "   ❌ $icon: Missing!"
  fi
done
echo ""

# Step 4: Nuclear cache clearing
echo "4️⃣  Nuclear cache clearing..."
rm -rf ~/Library/Caches/com.raycast.macos 2>/dev/null || true
rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions* 2>/dev/null || true
rm -rf ~/Library/Application\ Support/com.raycast.macos/store 2>/dev/null || true
rm -rf ~/Library/Application\ Support/com.raycast.macos/*cache* 2>/dev/null || true
rm -rf ~/Library/Saved\ Application\ State/com.raycast.macos.savedState 2>/dev/null || true
echo "   ✅ All caches nuked"
echo ""

# Step 5: Rebuild extension
echo "5️⃣  Rebuilding extension..."
npm run build > /dev/null 2>&1
echo "   ✅ Extension rebuilt"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "💥 NUCLEAR RESET COMPLETE!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📋 What was done:"
echo "   • Raycast completely stopped"
echo "   • Icons recreated using multiple cleaning passes"
echo "   • All extended attributes stripped" 
echo "   • All Raycast caches deleted (nuclear option)"
echo "   • Extension rebuilt from scratch"
echo ""
echo "⚠️  CRITICAL FINAL STEPS (you must do manually):"
echo ""
echo "Option 1: Simple Restart"
echo "   1. Wait 30 seconds (let system settle)"
echo "   2. Open Raycast"
echo "   3. Go to Preferences → Extensions"
echo "   4. Find WebBlocker → Click '...' → 'Reload Extension'"
echo ""
echo "Option 2: Complete Re-import (if Option 1 fails)"
echo "   1. Preferences → Extensions"
echo "   2. Find WebBlocker → Remove Extension"
echo "   3. Import Extension → Select: $EXT_DIR"
echo ""
echo "Option 3: System Restart (if all else fails)"
echo "   1. Restart your Mac"
echo "   2. Open Raycast after restart"
echo "   3. Re-import extension if needed"
echo ""
echo "The icons should now display correctly! 🎨"
echo ""