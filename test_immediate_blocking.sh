#!/bin/bash

echo "🧪 IMMEDIATE BLOCKING TEST"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This test will verify that website blocking works IMMEDIATELY${NC}"
echo -e "${YELLOW}even for sites that were just visited (cached in DNS)${NC}"
echo ""

echo "📝 Current blocked domains in hosts file:"
sudo grep "WebBlocker" /etc/hosts | grep -v "^#" | awk '{print "   - " $2}' | head -10
echo ""

echo "🎯 Test Steps:"
echo "1. Open a blocked site (e.g., amazon.com) in your browser"
echo "2. Verify it loads normally if blocking is disabled"
echo "3. Run 'Enable Website Blocking' in Raycast"
echo "4. Try to reload or reopen the same site"
echo ""
echo -e "${GREEN}✅ Expected Result:${NC}"
echo "   The site should be blocked IMMEDIATELY!"
echo "   You should see a connection error, not the website."
echo ""

read -p "Press Enter to run a quick Arc browser test..."
echo ""

# Quick test with Arc
echo "🔍 Testing with Arc browser..."

# Check if Arc is running
if pgrep -f "Arc" > /dev/null; then
    echo -e "${GREEN}✅ Arc is running${NC}"
    
    # Count current tabs
    TAB_COUNT=$(osascript -e 'tell application "Arc"
      set tabCount to 0
      repeat with w in windows
        set tabCount to tabCount + (count of tabs of w)
      end repeat
      return tabCount
    end tell' 2>/dev/null)
    
    echo "   Current tab count: $TAB_COUNT"
    
    # Check if any blocked sites are open
    echo ""
    echo "🔍 Checking for blocked sites in open tabs..."
    
    BLOCKED_FOUND=false
    for domain in amazon.com noon.com tiktok.com amazon.sa; do
        MATCHES=$(osascript -e "tell application \"Arc\"
          set matchCount to 0
          repeat with w in windows
            repeat with t in tabs of w
              try
                if URL of t contains \"$domain\" then
                  set matchCount to matchCount + 1
                end if
              end try
            end repeat
          end repeat
          return matchCount
        end tell" 2>/dev/null)
        
        if [ "$MATCHES" -gt 0 ]; then
            echo -e "   ${YELLOW}⚠️  Found $MATCHES tab(s) for $domain${NC}"
            BLOCKED_FOUND=true
        fi
    done
    
    if [ "$BLOCKED_FOUND" = false ]; then
        echo -e "   ${GREEN}✅ No blocked sites currently open${NC}"
        echo ""
        echo "   💡 TIP: Open amazon.com or noon.com to test blocking!"
    fi
else
    echo -e "${RED}❌ Arc is not running${NC}"
    echo "   Please start Arc browser to test"
fi

echo ""
echo "=========================="
echo "📋 Quick Commands:"
echo ""
echo "1. Test immediate blocking:"
echo -e "   ${GREEN}osascript -e 'tell application \"Arc\"
     tell window 1
       set current tab to (make new tab with properties {URL:\"https://amazon.com\"})
     end tell
   end tell'${NC}"
echo ""
echo "2. Check if site is blocked:"
echo -e "   ${GREEN}curl -I https://amazon.com 2>&1 | grep -E 'Failed|refused'${NC}"
echo ""
echo "3. View blocked domains:"
echo -e "   ${GREEN}sudo grep 'WebBlocker' /etc/hosts | grep -v '^#'${NC}"
echo ""
echo "=========================="
echo -e "${GREEN}✅ Ready to test!${NC}"
echo ""
echo "Next steps:"
echo "1. Open any blocked site in your browser"
echo "2. Run 'Enable Website Blocking' in Raycast"
echo "3. Try to access the site again - it should be blocked immediately!"
echo ""