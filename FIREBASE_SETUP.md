# Firebase Firestore Setup Instructions

## Step 1: Go to Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project: **surbhi-flow**

## Step 2: Create Firestore Database
1. In the left sidebar, click on **"Firestore Database"** (or "Build" → "Firestore Database")
2. Click **"Create database"** button
3. Choose **"Start in test mode"** (for development - allows read/write access)
4. Select a **location** for your database (choose the closest region to you)
5. Click **"Enable"**

## Step 3: Set Up Security Rules (CRITICAL - Fixes Permission Errors!)
1. After the database is created, click on the **"Rules"** tab at the top of the Firestore page
2. You'll see default rules that look like this (DO NOT USE THESE - they expire after 30 days):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2024, 12, 31);
       }
     }
   }
   ```
3. **DELETE** all the existing rules and replace with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{document=**} {
      allow read, write: if true;
    }
  }
}
```

4. Click the **"Publish"** button (top right) to save the rules
5. Wait a few seconds for the rules to propagate
6. **IMPORTANT**: If you still see permission errors, make sure you clicked "Publish" and wait 10-15 seconds

## Step 4: Verify Setup
1. Go to the **"Data"** tab in Firestore
2. You should see an empty database
3. When you add a task in the app, you should see a **"tasks"** collection appear with your tasks

## Step 5: Test the App
1. Restart your Next.js dev server (if running)
2. Add a task in the app
3. Check Firebase Console → Firestore Database → Data tab
4. You should see your task appear in the "tasks" collection

## Troubleshooting
- If tasks don't appear: Check browser console for Firebase errors
- If you see permission errors: Make sure security rules are published
- If database doesn't exist: Make sure you completed Step 2 and selected the correct project

