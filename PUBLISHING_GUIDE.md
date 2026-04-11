# Publishing Guide for Smart Planner For Kids

This project is pre-configured to be published as both a **Progressive Web App (PWA)** and a **Native Mobile App** (iOS/Android).

## Path 1: Publish as a Web App (PWA) - FASTEST
This is the easiest way to get your app onto users' phones without going through the App Store review process.

1. **Deploy your code:** Your app is already running on a web URL.
2. **Share the link:** Tell your users to open the link on their mobile browser.
3. **Install:**
   - **iPhone (Safari):** Tap the **Share** button -> **Add to Home Screen**.
   - **Android (Chrome):** Tap the **three dots** -> **Install App**.
4. **Result:** The app will have its own icon on the home screen and run in full-screen mode, just like a native app.

---

## Path 2: Publish to Apple App Store & Google Play
This requires exporting the code and using a local development environment.

### 1. Export the Project
- In the AI Studio editor, go to **Settings** -> **Export to ZIP**.
- Unzip the project on your computer.

### 2. Setup Environment
- Install [Node.js](https://nodejs.org/).
- Install [Android Studio](https://developer.android.com/studio) (for Android).
- Install [Xcode](https://developer.apple.com/xcode/) (for iOS - **Mac only**).

### 3. Build the App
Open your terminal in the project folder and run:
```bash
npm install
npm run build
```

### 4. iOS (Apple App Store)
- **If you have a Mac:**
  - Run: `npx cap add ios` (only the first time)
  - Run: `npm run mobile:ios`
  - This will open **Xcode**. From there, you can sign the app and upload it to **App Store Connect**.
- **If you DO NOT have a Mac (Cloud Build):**
  - You cannot run Xcode on Windows/Linux, but you can use **Cloud Build Services**:
    1. **Ionic Appflow (Recommended):** This is the official cloud service for Capacitor. You connect your GitHub repo, and they build the `.ipa` file for you on their Macs.
    2. **GitHub Actions:** You can set up a "Workflow" that uses a `macos-latest` runner to build your app for free (for public projects).
    3. **Codemagic:** Another great service that builds iOS apps in the cloud from your code.
  - *Note: You still need an Apple Developer Account ($99/year) to generate the certificates required for these cloud services.*

### 5. Android (Google Play Store)
- Run: `npx cap add android` (only the first time)
- Run: `npm run mobile:android`
- This will open **Android Studio**. From there, you can generate a "Signed Bundle" and upload it to the **Google Play Console**.

---

## Assets Needed for Stores
Before you submit, you will need:
1. **App Icons:** Replace the placeholder icons in `public/manifest.json` and the native folders (`ios/` and `android/` after they are generated).
2. **Privacy Policy:** Most stores require a URL to a privacy policy.
3. **Developer Accounts:**
   - **Apple:** $99/year.
   - **Google:** $25 (one-time fee).
