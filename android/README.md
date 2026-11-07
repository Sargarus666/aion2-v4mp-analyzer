# AION 2 Build Lab — Android

Native Android shell for the public Build Lab site.

- Material 3 / Material You shell with Android Monet dynamic wallpaper colors on Android 12+.
- Six persistent appearance presets: Monet, Monochrome, Standard, OLED, OLED Black and OLED White.
- Embedded WebView for the live analyzer. Website content updates automatically after Cloudflare Pages deployments.
- GitHub Releases version checker. The app finds the newest APK and opens its release asset; Android always asks the user to confirm installation.

## Build
GitHub Actions builds a debug APK for testing and a release APK artifact. When Android changes are merged into main, Actions automatically creates a GitHub Release named with the app version and attaches AION2-BuildLab.apk.

## Signing and native APK updates
Android only accepts an in-place APK update when the new APK is signed with the same private signing key as the installed version. Never commit a private keystore to this public repository. For a stable native APK update channel, configure these GitHub Actions secrets: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD. Until configured, live site content still updates automatically; APK updates may require uninstalling the previous build first.
