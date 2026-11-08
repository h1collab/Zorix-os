# ZorixOS 3.0 Motion Edition

ZorixOS is an Android interface simulator built on the h1collab/Zorix-os brand. Home, lock screen, Dynamic Island, Control Center and demo apps are iOS-inspired; Settings are HyperOS-inspired. It does not replace Android firmware or control real system settings.

New in 3.0: spatial app-launch and close transitions, spring buttons and switches, page navigation motion, wallpaper crossfade, dynamic island animations, action-sheet swipe-to-dismiss, camera shutter flash, and Motion & Haptics settings. English is the default interface; a Chinese-language setup option remains available. Reduced motion and haptics can be controlled in Settings.

Animations favor GPU compositor transforms and opacity; app artwork is fetched lazily and cached. HTML, CSS, and JS are embedded in app/src/main/assets/index.html. The separate motion/ files are provided as editable references; the HTML remains self-contained.

Build with Android SDK 35, JDK 17, Gradle 8.10.2: `gradle :app:assembleDebug`.

Debug APK is signed with an ephemeral debug certificate. It may require uninstalling an older APK signed with another certificate. The user must be able to reach the Android notification shade, permission prompts and system navigation; the app cannot override those controls.
