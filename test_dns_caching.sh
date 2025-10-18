#!/bin/bash

echo "🧪 Testing DNS Cache Clearing for WebBlocker"
echo "============================================="

# Test domain
TEST_DOMAIN="youtube.com"

echo "1️⃣ Testing initial DNS resolution..."
echo "Before blocking - $TEST_DOMAIN should resolve to actual IP:"
nslookup $TEST_DOMAIN | grep "Address:" | tail -1

echo ""
echo "2️⃣ Simulating 'visiting the site first' (this caches the DNS)..."
# This simulates what happens when you visit a site before blocking
ping -c 1 $TEST_DOMAIN >/dev/null 2>&1
echo "✅ Site has been 'visited' - DNS is now cached"

echo ""
echo "3️⃣ Now we'll add $TEST_DOMAIN to hosts file..."
# Simulate adding to hosts file (you'll need to run this manually with admin rights)
echo "sudo echo '127.0.0.1 $TEST_DOMAIN # WebBlocker' >> /etc/hosts"
echo "(Run this command manually, then press Enter to continue)"
read -p "Press Enter when you've added the entry..."

echo ""
echo "4️⃣ Testing DNS resolution WITHOUT cache clearing..."
echo "After hosts file modification (with cached DNS):"
nslookup $TEST_DOMAIN | grep "Address:" | tail -1

echo ""
echo "5️⃣ Now clearing DNS cache aggressively (like WebBlocker does)..."
echo "Running DNS cache clearing commands..."

# These are the same commands WebBlocker runs
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
sleep 2
sudo dscacheutil -flushcache

echo ""
echo "6️⃣ Testing DNS resolution AFTER cache clearing..."
echo "After aggressive DNS cache clearing:"
nslookup $TEST_DOMAIN | grep "Address:" | tail -1

echo ""
echo "✅ If you see '127.0.0.1' in step 6, DNS cache clearing worked!"
echo "🎯 This proves WebBlocker will block even previously visited sites!"

echo ""
echo "🧹 Don't forget to remove the test entry from /etc/hosts:"
echo "sudo sed -i '' '/127.0.0.1 $TEST_DOMAIN # WebBlocker/d' /etc/hosts"