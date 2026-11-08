# ZorixOS Android UI Simulator
A standalone Android WebView application using the ZorixOS brand from the linked https://github.com/h1collab/Zorix-os project. This is NOT an Alpine Linux distribution build, Android firmware, or ROM.
Home, lock screen, dock, Dynamic Island, Control Center and demo Apps remain iOS-inspired; the Settings App is HyperOS 4-inspired and rebranded ZorixOS.
All code is bundled locally. Real App Store icon artwork may need internet access, but embedded SVG fallbacks work offline.
Build: JDK 17, Android SDK 35, Gradle 8.10.2; run `cd android && gradle :app:assembleDebug`.
APK: `android/app/build/outputs/apk/debug/app-debug.apk`. The GitHub Actions build workflow uploads the APK as an artifact.
The settings switches and applications are self-contained simulations, not privileged Android operations.
