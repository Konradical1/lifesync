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
# Call CoreDevice's devicectl directly: Xcode's wrapper insists on a sudo
# `xcodebuild -runFirstLaunch` whenever CoreDevice is a version behind.
DEVICECTL=/Library/Developer/PrivateFrameworks/CoreDevice.framework/Versions/A/Resources/bin/devicectl

npx expo prebuild -p ios --clean

# Personal teams can't sign push or Sign in with Apple (Expo adds both).
ENT=ios/LifeSync/LifeSync.entitlements
/usr/libexec/PlistBuddy -c "Delete :aps-environment" "$ENT" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Delete :com.apple.developer.applesignin" "$ENT" 2>/dev/null || true

# IPHONEOS_DEPLOYMENT_TARGET: Xcode 27 rejects pods that still target iOS < 15.
xcodebuild -workspace ios/LifeSync.xcworkspace -scheme LifeSync \
  -configuration Release -destination generic/platform=iOS -derivedDataPath ios/build \
  -allowProvisioningUpdates DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic \
  IPHONEOS_DEPLOYMENT_TARGET=15.1 \
  build | tail -20

until UDID=${UDID:-$("$DEVICECTL" list devices --json-output /dev/stdout 2>/dev/null \
  | python3 -c "import sys,json; d=[x for x in json.load(sys.stdin)['result']['devices'] if x['hardwareProperties'].get('deviceType')=='iPhone' and x['connectionProperties'].get('tunnelState') not in (None,'unavailable')]; print(d[0]['hardwareProperties']['udid'] if d else '')")}; [[ -n "$UDID" ]]; do
  echo "Waiting for iPhone: plug it in (or same Wi-Fi), unlock it, trust this Mac..."; sleep 5
done
"$DEVICECTL" device install app --device "$UDID" \
  ios/build/Build/Products/Release-iphoneos/LifeSync.app
echo "Installed. First launch: Settings > General > VPN & Device Management > trust the developer."
