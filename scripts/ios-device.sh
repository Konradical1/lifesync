#!/bin/zsh
# Build a standalone Release app and install it on a connected iPhone,
# signed with a free Apple "Personal Team" (no paid developer account).
# Free provisioning expires after 7 days: just re-run this to refresh.
#
#   scripts/ios-device.sh            # first connected iPhone
#   UDID=<device id> scripts/ios-device.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TEAM=${TEAM:-U7S5RJB5A5}   # Konrad Fischer (Personal Team)
UDID=${UDID:-$(xcrun devicectl list devices --json-output /dev/stdout 2>/dev/null \
  | python3 -c "import sys,json; d=[x for x in json.load(sys.stdin)['result']['devices'] if x['hardwareProperties'].get('deviceType')=='iPhone' and x['connectionProperties'].get('tunnelState')!='unavailable']; print(d[0]['hardwareProperties']['udid'] if d else '')")}
[[ -n "$UDID" ]] || { echo "No iPhone found. Plug it in, unlock it, trust this Mac."; exit 1; }

npx expo prebuild -p ios --clean

# Personal teams can't sign push or Sign in with Apple (Expo adds both).
ENT=ios/LifeSync/LifeSync.entitlements
/usr/libexec/PlistBuddy -c "Delete :aps-environment" "$ENT" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Delete :com.apple.developer.applesignin" "$ENT" 2>/dev/null || true

# IPHONEOS_DEPLOYMENT_TARGET: Xcode 27 rejects pods that still target iOS < 15.
xcodebuild -workspace ios/LifeSync.xcworkspace -scheme LifeSync \
  -configuration Release -destination "id=$UDID" -derivedDataPath ios/build \
  -allowProvisioningUpdates DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic \
  IPHONEOS_DEPLOYMENT_TARGET=15.1 \
  build | tail -20

xcrun devicectl device install app --device "$UDID" \
  ios/build/Build/Products/Release-iphoneos/LifeSync.app
echo "Installed. First launch: Settings > General > VPN & Device Management > trust the developer."
