#!/bin/bash
# FTD Token Refresh - Double-click to run
# This updates your production FTD token

cd "$(dirname "$0")/back"

echo "🌸 Starting FTD Token Refresh..."
echo ""

npm run refresh-ftd-token

echo ""
echo "Press any key to close..."
read -n 1
