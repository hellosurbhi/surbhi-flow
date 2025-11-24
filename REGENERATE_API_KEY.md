# How to Regenerate Your Gemini API Key

Your API key was reported as leaked. Here's how to create a new one:

## Step 1: Go to Google AI Studio
1. Visit: https://aistudio.google.com/apikey
2. Sign in with your Google account

## Step 2: Create a New API Key
1. Click **"Create API Key"** button
2. Select your Google Cloud project (or create a new one)
3. Copy the new API key (it will look like: `AIzaSy...`)

## Step 3: Update Your .env.local File
1. Open `.env.local` in your project
2. Replace the old `GEMINI_API_KEY` value with your new key:
   ```
   GEMINI_API_KEY=YOUR_NEW_API_KEY_HERE
   ```
3. Save the file

## Step 4: Restart Your Dev Server
**IMPORTANT**: You MUST restart your Next.js dev server for the new key to be loaded!

1. Stop your current dev server (press `Ctrl+C` in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

## Step 5: Test
Try adding a task again. It should work now!

## Security Note
- Never commit your `.env.local` file to git (it's already in `.gitignore`)
- Never share your API key publicly
- If a key gets leaked, regenerate it immediately

