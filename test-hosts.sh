#!/bin/bash

echo "🧪 Testing WebBlocker hosts file operations"
echo "==========================================="
echo ""

echo "Current /etc/hosts content (last 10 lines):"
echo "---"
sudo tail -10 /etc/hosts
echo "---"
echo ""

echo "Testing if we can detect WebBlocker entries:"
if sudo grep -q "# WebBlocker" /etc/hosts; then
    echo "✅ WebBlocker entries found in hosts file"
    echo "Entries:"
    sudo grep "# WebBlocker" /etc/hosts
else
    echo "ℹ️  No WebBlocker entries found in hosts file"
fi
echo ""

echo "Checking backup file:"
if [ -f /etc/hosts.webblocker.bak ]; then
    echo "✅ Backup file exists: /etc/hosts.webblocker.bak"
    echo "Backup size: $(stat -f%z /etc/hosts.webblocker.bak 2>/dev/null || echo 'unknown') bytes"
else
    echo "ℹ️  No backup file found"
fi
echo ""

echo "🎯 To test the extension:"
echo "1. Open Raycast"
echo "2. Add a test website (e.g., youtube.com)"
echo "3. Enable site blocking - should only ask for password ONCE"
echo "4. Check if website is blocked in browser"
echo "5. Disable site blocking - should work without infinite loops"