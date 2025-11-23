# Mobile App Deployment Guide

## Converting Your Web App to Mobile Apps

Your Mina story app can be published to Google Play and App Store using **Capacitor**.

## Option 1: Capacitor (Recommended) ⭐

### Why Capacitor?

- ✅ Wraps your existing React app (no rewrite needed)
- ✅ Access to native device features (camera, notifications, etc.)
- ✅ Great performance
- ✅ Easy to maintain (one codebase for web + mobile)
- ✅ Official support from Ionic team

### Installation

1. **Install Capacitor:**

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

When prompted:

- App name: `Mina - Interactive Stories`
- App ID: `com.yourdomain.mina` (use your domain)
- Web directory: `dist`

2. **Add iOS and Android platforms:**

```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

3. **Install required plugins:**

```bash
npm install @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar @capacitor/share
```

4. **Update capacitor.config.ts:**

```typescript
import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yourdomain.mina",
  appName: "Mina",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3B82F6",
      showSpinner: false,
    },
  },
};

export default config;
```

5. **Build and sync:**

```bash
npm run build
npx cap sync
```

6. **Open in native IDEs:**

```bash
# For iOS (requires macOS)
npx cap open ios

# For Android
npx cap open android
```

### Mobile-Specific Optimizations

1. **Add mobile-friendly meta tags to index.html:**

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover"
/>
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="theme-color" content="#3B82F6" />
```

2. **Handle safe areas (notches):**

```css
/* Add to index.css */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

3. **Add native share functionality:**

```typescript
import { Share } from "@capacitor/share";

const handleShare = async (storyId: string, storyTitle: string) => {
  await Share.share({
    title: storyTitle,
    text: `Check out this interactive story: ${storyTitle}`,
    url: `https://yourapp.com?story=${storyId}`,
    dialogTitle: "Share Story",
  });
};
```

4. **Add haptic feedback:**

```typescript
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const handleChoice = async () => {
  await Haptics.impact({ style: ImpactStyle.Light });
  // ... rest of choice logic
};
```

### iOS App Store Submission

#### Requirements:

- ✅ macOS computer with Xcode
- ✅ Apple Developer Account ($99/year)
- ✅ App icons (1024x1024 and various sizes)
- ✅ Screenshots (various device sizes)
- ✅ Privacy policy URL
- ✅ App description and keywords

#### Steps:

1. **Configure app in Xcode:**

   - Open `ios/App/App.xcworkspace` in Xcode
   - Set Bundle Identifier: `com.yourdomain.mina`
   - Set Version and Build numbers
   - Add app icons to Assets.xcassets

2. **Add required permissions to Info.plist:**

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to let you take photos for your profile</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to let you choose profile pictures</string>
```

3. **Create App Store listing:**

   - Go to https://appstoreconnect.apple.com
   - Create new app
   - Fill in metadata (name, description, keywords, screenshots)
   - Set pricing (Free with in-app purchases for Pro)

4. **Archive and upload:**

   - In Xcode: Product → Archive
   - Upload to App Store Connect
   - Submit for review

5. **App Review Guidelines to follow:**
   - ✅ No crashes or bugs
   - ✅ Privacy policy must be accessible
   - ✅ In-app purchases must be through Apple (use Stripe for web only)
   - ✅ Content must be appropriate for age rating
   - ✅ Must handle network errors gracefully

### Android Google Play Submission

#### Requirements:

- ✅ Google Play Developer Account ($25 one-time)
- ✅ App icons (512x512 and various sizes)
- ✅ Screenshots (various device sizes)
- ✅ Privacy policy URL
- ✅ App description

#### Steps:

1. **Configure app in Android Studio:**
   - Open `android` folder in Android Studio
   - Update `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.yourdomain.mina"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
}
```

2. **Generate signing key:**

```bash
keytool -genkey -v -keystore mina-release-key.keystore -alias mina -keyalg RSA -keysize 2048 -validity 10000
```

3. **Configure signing in `android/app/build.gradle`:**

```gradle
android {
    signingConfigs {
        release {
            storeFile file('mina-release-key.keystore')
            storePassword 'your-password'
            keyAlias 'mina'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

4. **Build release APK/AAB:**

```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

5. **Create Google Play listing:**

   - Go to https://play.google.com/console
   - Create new app
   - Fill in store listing (title, description, screenshots)
   - Upload AAB file
   - Set content rating
   - Set pricing (Free with in-app purchases)

6. **Submit for review**

### Important Considerations

#### 1. **In-App Purchases**

- **iOS**: Must use Apple's In-App Purchase system (30% commission)
- **Android**: Must use Google Play Billing (15-30% commission)
- **Web**: Can use Stripe directly

**Solution**: Implement platform-specific payment handling:

```typescript
import { Capacitor } from "@capacitor/core";

const handleUpgrade = async () => {
  const platform = Capacitor.getPlatform();

  if (platform === "ios") {
    // Use Apple In-App Purchase
    await handleAppleIAP();
  } else if (platform === "android") {
    // Use Google Play Billing
    await handleGooglePlayBilling();
  } else {
    // Use Stripe for web
    await handleStripeCheckout();
  }
};
```

#### 2. **Content Moderation**

Since your app generates AI content:

- ✅ Implement content filtering
- ✅ Add reporting mechanism
- ✅ Review flagged content
- ✅ Age-appropriate content only
- ✅ Comply with COPPA (Children's Online Privacy Protection Act)

#### 3. **Privacy Policy** (Required!)

Must include:

- What data you collect
- How you use it
- Third-party services (OpenAI, Supabase, Stripe)
- User rights (data deletion, access)
- Contact information

#### 4. **Age Rating**

- iOS: 4+ or 9+ (depending on content)
- Android: Everyone or Everyone 10+

#### 5. **Performance**

- Test on low-end devices
- Optimize images (use WebP)
- Implement offline mode
- Handle slow networks gracefully

### Testing Before Submission

1. **Test on real devices:**

```bash
# iOS
npx cap run ios --target="iPhone 14"

# Android
npx cap run android --target="Pixel_6_API_33"
```

2. **Test scenarios:**
   - ✅ Airplane mode (offline handling)
   - ✅ Slow network (loading states)
   - ✅ Low battery (performance)
   - ✅ Different screen sizes
   - ✅ Rotation (portrait/landscape)
   - ✅ Background/foreground transitions
   - ✅ Push notifications (if implemented)

### Continuous Deployment

Use Capacitor with your CI/CD:

```yaml
# .github/workflows/mobile-deploy.yml
name: Deploy Mobile Apps

on:
  push:
    tags:
      - "v*"

jobs:
  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and deploy iOS
        run: |
          npm install
          npm run build
          npx cap sync ios
          # Add Fastlane for automated deployment

  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and deploy Android
        run: |
          npm install
          npm run build
          npx cap sync android
          cd android && ./gradlew bundleRelease
```

### Alternative: Use Fastlane

Automate app store submissions:

```bash
# Install Fastlane
sudo gem install fastlane

# Initialize
cd ios && fastlane init
cd ../android && fastlane init
```

## Option 2: React Native (Complete Rewrite)

If you want a fully native experience, you'd need to rewrite in React Native. This gives better performance but requires more work.

**Pros:**

- Better performance
- More native feel
- Better access to device features

**Cons:**

- Complete rewrite needed
- More maintenance
- Separate codebase from web

## Option 3: Progressive Web App (PWA)

Convert to PWA for "installable" web app:

**Pros:**

- No app store approval needed
- One codebase
- Instant updates

**Cons:**

- Limited device access
- Not in app stores
- Less discoverable

## Recommended Approach

1. **Start with Capacitor** (easiest, fastest)
2. **Test thoroughly** on both platforms
3. **Implement platform-specific payments**
4. **Submit to both stores**
5. **Iterate based on user feedback**

## Estimated Timeline

- Capacitor setup: 1-2 days
- Mobile optimizations: 2-3 days
- Testing: 3-5 days
- App store assets (icons, screenshots): 1-2 days
- iOS submission + review: 1-2 weeks
- Android submission + review: 3-7 days

**Total: 3-4 weeks** from start to published apps

## Cost Breakdown

- Apple Developer: $99/year
- Google Play: $25 one-time
- App icons/assets: $0-200 (if you hire designer)
- Testing devices: $0 (use simulators) or $500+ (buy devices)

**Total: ~$124-$824** to get started

## Next Steps

1. Install Capacitor
2. Test on simulators
3. Create developer accounts
4. Prepare app store assets
5. Submit for review

Good luck with your mobile app launch! 🚀
