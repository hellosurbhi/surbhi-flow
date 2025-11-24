# How to Regenerate Your Firebase API Key

## Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Sign in with your Google account
3. Select your project: **surbhi-flow**

## Step 2: Get Your Firebase Configuration
1. Click the **gear icon** (⚙️) next to "Project Overview" in the left sidebar
2. Click **"Project settings"**
3. Scroll down to the **"Your apps"** section
4. If you don't see a web app, click **"Add app"** → Select **"Web"** (</> icon)
5. If you already have a web app, click on it

## Step 3: Copy Your Firebase Config
You'll see a configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "surbhi-flow.firebaseapp.com",
  projectId: "surbhi-flow",
  storageBucket: "surbhi-flow.firebasestorage.app",
  messagingSenderId: "401048840000",
  appId: "1:401048840000:web:...",
  measurementId: "G-..."
};
```

## Step 4: Update Your .env.local File
1. Open `.env.local` in your project
2. Replace all the Firebase values with the new ones from Step 3:

```
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_NEW_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=surbhi-flow.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=surbhi-flow
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=surbhi-flow.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=401048840000
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_NEW_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...
```

## Step 5: Restart Your Dev Server
**IMPORTANT**: You MUST restart your Next.js dev server!

1. Stop your current dev server (press `Ctrl+C` in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

## Alternative: Create a New Web App
If you want to create a completely new web app in Firebase:

1. In Firebase Console → Project Settings → Your apps
2. Click **"Add app"** → Select **"Web"** (</> icon)
3. Register your app (give it a nickname like "FocusFlow Web")
4. Copy the new configuration
5. Update `.env.local` with the new values
6. Restart your dev server

## Note
- The `apiKey` in Firebase is public and safe to expose in client-side code
- It's restricted by Firebase Security Rules, so it's not a security risk
- If your key was "leaked", you can create a new web app to get a new key

