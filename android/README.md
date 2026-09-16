# Daily for Android

Daily bundles its React UI in an Android app with Capacitor. It works offline, starts with an empty library, and stores nutrition records on the phone. Android 7.0 (API 24) or newer with an up-to-date Android System WebView is required.

## Install

Download the APK from the GitHub release on your phone and open it. Android may ask you to allow installation from the browser or Files app. This is a direct APK distribution, not a Google Play listing.

Do not uninstall to update: install a newer APK with the same signing key over the existing app. Uninstalling or clearing app storage removes its local data. Export backups regularly.

## Data and backups

Use Goals → My data → Export backup to choose where Android saves a JSON backup. Import JSON backup opens Android's document picker. Import replaces current data after confirmation, so export first. Daily backups transfer between the web, Mac, and Android versions. Excel files require the workbook conversion script before import.

The Android build does not request internet or broad storage permissions. It uses Android's Storage Access Framework for user-selected backup files. Android automatic app backup is disabled; keep your own exports. The signed APK contains no personal data.

## Build

Install Node 22+, pnpm 11.19.0, JDK 21, and Android SDK 36. Then:

```sh
pnpm install
pnpm android:build
cd android
./gradlew assembleDebug
```

For signed release builds, set DAILY_KEYSTORE_PATH to an absolute PKCS12 keystore path and DAILY_KEYSTORE_PASSWORD to its password. The key alias is `daily`. Run `./gradlew assembleRelease` after syncing web assets. Keep the keystore and password private and backed up; future updates require the same key.

The manual Android APK workflow runs web/domain checks, an emulator smoke test, Android lint, and signing verification. It reads DAILY_ANDROID_KEYSTORE (base64 PKCS12) and DAILY_ANDROID_KEYSTORE_PASSWORD from GitHub repository secrets. It produces a downloadable Actions artifact; publishing a GitHub release is a separate action.
