# 🔴 URGENT: Fix Firebase Permission Error

You're seeing: **"Missing or insufficient permissions"**

## Quick Fix (2 minutes):

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `surbhi-flow`
3. **Click "Firestore Database"** in the left sidebar
4. **Click the "Rules" tab** at the top
5. **Copy and paste this EXACT code** (replace everything):

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

6. **Click "Publish"** button (top right, blue button)
7. **Wait 10-15 seconds** for rules to update
8. **Refresh your app** in the browser
9. **Try adding a task again**

## Still Not Working?

- Make sure you clicked **"Publish"** (not just saved)
- Wait a full 15 seconds after publishing
- Hard refresh your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Check that you're in the correct Firebase project (`surbhi-flow`)

## What This Does:

- Allows your app to read and write to the `tasks` collection
- **WARNING**: This is for development only. For production, you'll need proper authentication rules.

