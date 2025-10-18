#!/bin/bash

# Icon Verification Script for WebBlocker
# This script checks if all icons are properly configured

echo "🔍 WebBlocker Icon Verification"
echo "================================"
echo ""

# Check 1: Verify package.json icon paths
echo "1️⃣  Checking package.json icon paths..."
if grep -q '"icon": "icon.png"' package.json; then
    echo "   ✅ Main extension icon path: icon.png"
else
    echo "   ❌ Main extension icon path is incorrect!"
fi

if grep -q '"icon": "add-website-icon.png"' package.json; then
    echo "   ✅ Add Website icon: add-website-icon.png"
else
    echo "   ❌ Add Website icon path is incorrect!"
fi

if grep -q '"icon": "enable-blocking-icon.png"' package.json; then
    echo "   ✅ Enable Blocking icon: enable-blocking-icon.png"
else
    echo "   ❌ Enable Blocking icon path is incorrect!"
fi

if grep -q '"icon": "disable-blocking-icon.png"' package.json; then
    echo "   ✅ Disable Blocking icon: disable-blocking-icon.png"
else
    echo "   ❌ Disable Blocking icon path is incorrect!"
fi

if grep -q '"icon": "manage-sites-icon.png"' package.json; then
    echo "   ✅ Manage Sites icon: manage-sites-icon.png"
else
    echo "   ❌ Manage Sites icon path is incorrect!"
fi

if grep -q '"icon": "refresh-blocking-icon.png"' package.json; then
    echo "   ✅ Refresh Blocking icon: refresh-blocking-icon.png"
else
    echo "   ❌ Refresh Blocking icon path is incorrect!"
fi
echo ""

# Check 2: Verify all icon files exist in root
echo "2️⃣  Checking if icon files exist in root directory..."
icons=("icon.png" "add-website-icon.png" "enable-blocking-icon.png" "disable-blocking-icon.png" "manage-sites-icon.png" "refresh-blocking-icon.png")

for icon in "${icons[@]}"; do
    if [ -f "$icon" ]; then
        size=$(sips -g pixelWidth "$icon" 2>/dev/null | grep pixelWidth | awk '{print $2}')
        echo "   ✅ $icon exists (${size}x${size})"
    else
        echo "   ❌ $icon NOT FOUND!"
    fi
done
echo ""

# Check 3: Verify no extended attributes
echo "3️⃣  Checking for extended attributes..."
has_attrs=false
for icon in "${icons[@]}"; do
    if [ -f "$icon" ]; then
        attrs=$(xattr "$icon" 2>/dev/null)
        if [ -n "$attrs" ]; then
            echo "   ⚠️  $icon has extended attributes: $attrs"
            has_attrs=true
        fi
    fi
done
if [ "$has_attrs" = false ]; then
    echo "   ✅ No problematic extended attributes found"
fi
echo ""

# Check 4: Verify compiled JS files exist
echo "4️⃣  Checking if compiled JavaScript files exist..."
js_files=("add-website.js" "streamlined-enable-blocking.js" "streamlined-disable-blocking.js" "view-blocked-sites.js" "refresh-blocking.js")

all_exist=true
for js in "${js_files[@]}"; do
    if [ -f "$js" ]; then
        echo "   ✅ $js exists"
    else
        echo "   ❌ $js NOT FOUND! Run 'npm run build'"
        all_exist=false
    fi
done
echo ""

# Check 5: Look for Raycast extension in common locations
echo "5️⃣  Checking Raycast extension status..."
ext_dir="$HOME/Library/Application Support/com.raycast.macos/extensions"
if [ -d "$ext_dir" ]; then
    echo "   ℹ️  Raycast extensions directory exists"
    # List any WebBlocker-related extensions
    if ls "$ext_dir" 2>/dev/null | grep -i "web" > /dev/null; then
        echo "   ℹ️  Found WebBlocker in extensions:"
        ls -la "$ext_dir" | grep -i "web"
    fi
else
    echo "   ℹ️  Extension directory not found (extension might be in development mode)"
fi
echo ""

# Summary
echo "📊 Summary"
echo "=========="
if [ "$all_exist" = true ]; then
    echo "✅ All checks passed! Icons should be working."
    echo ""
    echo "📝 If icons still don't show in Raycast:"
    echo "   1. Open Raycast Preferences (⌘+,)"
    echo "   2. Go to Extensions tab"
    echo "   3. Find 'WebBlocker' and click the '...' menu"
    echo "   4. Select 'Reload Extension'"
    echo "   5. If that doesn't work, remove and re-import the extension"
else
    echo "⚠️  Some issues found. Please fix them and try again."
fi
echo ""
