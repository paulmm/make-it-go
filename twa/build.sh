#!/bin/bash
# Non-interactive TWA build for Make It Go. Run after JDK 17 + Android cmdline-tools are installed.
set -e
cd "$(dirname "$0")"

export JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || echo /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home)"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"
java -version 2>&1 | head -1

echo "=== accepting licenses + installing SDK packages ==="
yes | sdkmanager --licenses >/dev/null 2>&1 || true
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" >/dev/null 2>&1

# Bubblewrap expects the legacy SDK layout (a `bin/` or `tools/` dir at the SDK root); the brew
# cask uses cmdline-tools/latest/bin. A root-level `bin` symlink satisfies both its path check
# and its sdkmanager lookup, and is invisible to Gradle.
[ -e "$ANDROID_HOME/bin" ] || ln -s "$ANDROID_HOME/cmdline-tools/latest/bin" "$ANDROID_HOME/bin"

echo "=== bubblewrap config (point at our JDK + SDK) ==="
# Bubblewrap appends `/Contents/Home` to jdkPath itself on macOS, so give it the .jdk bundle dir,
# NOT the full JAVA_HOME (which already ends in /Contents/Home) — otherwise the path doubles.
JDK_BASE="${JAVA_HOME%/Contents/Home}"
mkdir -p "$HOME/.bubblewrap"
cat > "$HOME/.bubblewrap/config.json" <<JSON
{ "jdkPath": "$JDK_BASE", "androidSdkPath": "$ANDROID_HOME" }
JSON

echo "=== keystore ==="
if [ ! -f android.keystore ]; then
  keytool -genkeypair -v -keystore android.keystore -alias android \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass makeitgo -keypass makeitgo \
    -dname "CN=Make It Go, OU=Make It Go, O=Make It Go, L=Internet, S=NA, C=US"
fi

echo "=== bubblewrap build ==="
export BUBBLEWRAP_KEYSTORE_PASSWORD=makeitgo
export BUBBLEWRAP_KEY_PASSWORD=makeitgo
# Regenerate the Android project from twa-manifest.json (non-interactive; reads versionName from
# the manifest and refreshes the checksum) so the subsequent build needs no prompts.
bubblewrap update --skipVersionUpgrade
echo "=== bubblewrap build ==="
bubblewrap build --skipPwaValidation

echo "=== fingerprint (for assetlinks.json) ==="
keytool -list -v -keystore android.keystore -alias android -storepass makeitgo 2>/dev/null | grep -i "SHA256:" | head -1
echo "BUILD_SCRIPT_DONE"
