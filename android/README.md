# ZorixOS 4.0 Fluent Edition (Android UI Simulator)

An Android WebView application using the ZorixOS branding and interactive iOS-inspired home, Apple-inspired Hello and Control Center, and HyperOS-inspired Settings.

## V4 features
- User-provided Zorix logo displayed in monochrome startup then its color gradient in the first-run setup and Android launcher.
- First-run setup with 14 languages, 10 regions, privacy and appearance options; English default. English and Simplified Chinese have broad UI coverage; other languages use localized setup and core terms with English fallbacks in the demo apps.
- Apple-inspired translucent modular Control Center, brightness/volume sliders, usable media controls, and customizable shortcuts.
- Apple-inspired local Notification Center with swipe-to-clear and expandable grouped-style cards. **Not** a privileged Android notification listener.
- Real read-only connectivity through ConnectivityManager / NetworkCapabilities exposed via a minimal safe JavaScript bridge. In browsers, navigator.onLine is only a coarse estimate; no SSID or fake network names. Network changes can be made using the Android Internet Settings panel, not directly from simulated controls.
- Expanded motion, transitions and accessibility-aware reduced motion.

This application does NOT replace Android firmware, override real system notifications, or read private Wi-Fi identifiers. Android always retains control over permission prompts, calls and system interruptions.

Build: JDK 17, Android SDK 35, Gradle 8.10.2. From project root: `gradle :app:assembleDebug`.
