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

## Phase 3: Next Steps After Successful Cloud Build

Congratulations! Your GitHub Actions are now successfully building your app in the cloud. Here is exactly what to do next:

### 1. Test the Android App (Right Now)
- Go to your GitHub repository -> **Actions** tab.
- Click on the successful build.
- Scroll down to **Artifacts** and download `android-debug-apk`.
- Send this `.apk` file to your Android phone (via email, Google Drive, or Slack).
- Open the file on your phone to install it. *Note: You may need to allow "Install from unknown sources" in your phone settings.*

### 2. Prepare for the App Stores (The "Real" Launch)
To go from a "Debug" build to a "Production" build that people can download from the stores, you need to handle **Code Signing**.

#### **For Android (Google Play):**
1. **Generate a Keystore:** This is a digital key that proves you are the owner of the app.
2. **Update GitHub Secrets:** You will add your Keystore file and password to GitHub so it can sign the "Release" version of your app.
3. **Google Play Console:** Create an account ($25) and upload your signed `.aab` file.

#### **For iOS (Apple App Store):**
Since you don't have a Mac, you have two choices for the final step:
- **Choice A: Use a Cloud Service (Easiest)**
  - Connect your GitHub to [Codemagic](https://codemagic.io/) or [Ionic Appflow](https://ionic.io/appflow).
  - They have simple wizards that help you upload your Apple Certificates and build the final `.ipa` file for the store.
- **Choice B: Advanced GitHub Actions**
  - You can update your `main.yml` to use "Fastlane" to sign the app, but this is quite technical.

### 3. Design Your Brand
A professional app needs:
- **App Icon:** I have set up an automated system for you.
  1. Create a folder named `assets` in your project root.
  2. Save your icon image as `assets/icon-only.png` (1024x1024 PNG).
  3. Save the same image (or a splash version) as `assets/splash.png`.
  4. Run this command in your terminal:
     ```bash
     npm run resources
     ```
  *This will automatically generate all the required sizes for iOS and Android.*
- **Splash Screen:** The command above also handles the splash screen!
- **Screenshots:** For the store listings.

---

## Phase 4: Publishing to the App Store (Without a Mac)

Since your GitHub builds are succeeding and you have an **Apple Developer Subscription**, you are ready to move from "Testing" to "Publishing." Here is the exact workflow for a Windows/Linux user:

### 1. Generate your Apple Certificates (On Windows/Linux)
Apple requires a "Distribution Certificate" to sign your app. Usually, this is done in Xcode, but you can do it manually:

**If you are on Windows and don't have OpenSSL:**
- **Option A (Easiest):** If you have **Git for Windows** installed, you already have OpenSSL! 
  - Open **Git Bash** (search for it in your Start menu).
  - Run the commands below exactly as written.
- **Option B (PowerShell):** You can install OpenSSL using a package manager like `winget`:
  - Open PowerShell as Administrator and run: `winget install OpenSSL.OpenSSL`
  - Restart PowerShell and you can then run the `openssl` commands.
- **Option C (The "Cloud" way):** You can actually use your GitHub Actions to generate this for you! (Ask me how if you want to try this).

**The Commands:**
1. **Generate a CSR:**
   ```bash
   # Step A: Generate the private key
   openssl genrsa -out ios_distribution.key 2048
   
   # Step B: Generate the CSR (Interactive Mode)
   openssl req -new -key ios_distribution.key -out ios_distribution.csr
   ```
2. **Upload to Apple:** Go to [developer.apple.com](https://developer.apple.com/) -> **Certificates** -> **+** -> **Apple Distribution**. Upload your `.csr` and download the `.cer` file.

3. **Convert to .p12 (Required for Codemagic):**
   Codemagic needs your certificate and key bundled together in a `.p12` file. Run these in Git Bash:
   ```bash
   # Convert Apple's .cer to .pem
   openssl x509 -in distribution.cer -inform DER -out distribution.pem -outform PEM
   
   # Create the .p12 bundle
   # It will ask for a password. You can leave it blank or set one (e.g., 1234).
   openssl pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in distribution.pem
   ```

### 2. Create an App ID and Provisioning Profile
1. **Identifier:** In the Apple Developer portal, create an **App ID** (e.g., `com.smartplanner.kids`).
2. **Profile:** Create a **Provisioning Profile** (Distribution type), link it to your App ID and your new Certificate, and download it.

### 3. Use Codemagic for the Final Build (The "Mac in the Cloud")

I have created a `codemagic.yaml` file in your project. This file tells Codemagic exactly how to build your app. Here is how to finish the setup:

1. **Push the code:** Push the new `codemagic.yaml` file to your GitHub repository.
2. **Go to Codemagic:** Open your project in the [Codemagic Dashboard](https://codemagic.io/apps).
3. **Set up Code Signing (CRITICAL):**
   - In the Codemagic UI, go to **Workflow settings** -> **Distribution** -> **iOS code signing**.
   - **Certificate:** Upload your `.cer` file (the one you downloaded from Apple).
   - **Private Key:** Upload your `ios_distribution.key` (the secret file you created in Git Bash).
   - **Provisioning Profile:** Upload your `.mobileprovision` file (the one you just created).
4. **Start Build:**
   - Go back to the main page of your project in Codemagic.
   - Click **"Check for configuration files"** (if it doesn't see the yaml yet).
   - Click **"Start new build"**.
   - Select the **"ios-release"** workflow.

### 4. What happens next?
Codemagic will spin up a virtual Mac, install your dependencies, and use your certificates to create a signed `.ipa` file. 
- Once it's finished, you can download the `.ipa` file.
- You can then upload this file to **App Store Connect** directly from the Codemagic UI if you connect your App Store account!

---

## Phase 5: Publishing to Google Play (Android)
1. **Create a Keystore:** Run this in your terminal to create your digital signature:
   ```bash
   keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-alias
   ```
2. **Google Play Console:** Create an account ($25) at [play.google.com/console](https://play.google.com/console).
3. **Upload:** You can either upload the `.apk` from GitHub for testing, or better, generate an `.aab` (Android App Bundle) for production using the same cloud build tools.

---

## Final Checklist Before Launch
Before you submit, you will need:
1. **App Icons:** Replace the placeholder icons in `public/manifest.json` and the native folders (`ios/` and `android/` after they are generated).
2. **Privacy Policy:** Most stores require a URL to a privacy policy.
3. **Developer Accounts:**
   - **Apple:** $99/year.
   - **Google:** $25 (one-time fee).
