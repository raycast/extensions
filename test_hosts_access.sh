#!/bin/bash

echo "Testing WebBlocker hosts file access..."

# Create a temporary test script
TEST_SCRIPT="/tmp/webblocker_test.sh"

cat > "$TEST_SCRIPT" << 'EOF'
#!/bin/bash
echo "Testing hosts file access..."
echo "Current hosts file size: $(wc -l < /etc/hosts) lines"
echo "Backup exists: $([ -f /etc/hosts.webblocker.bak ] && echo 'YES' || echo 'NO')"
echo "Test completed successfully"
EOF

chmod +x "$TEST_SCRIPT"

echo "Created test script at $TEST_SCRIPT"
echo ""
echo "You can test AppleScript execution with:"
echo "osascript -e 'do shell script \"$TEST_SCRIPT\" with administrator privileges'"
echo ""
echo "If this works, your extension should work too!"