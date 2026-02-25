# Fix for Images and Google Drive Connection

I have investigated your website and identified the primary causes for the images not showing and the Google Drive connection failing.

## 🛠️ Actions Taken

### 1. Added Google Drive Scopes to Auth
I updated `src/components/auth/AuthPage.tsx` to include the required Google Drive scopes in the `signInWithOAuth` call. This ensures that when you log in with Google, you are prompted to grant permission for the app to access your files.

**Before:** Only basic profile info was requested.
**After:** Access to `drive.file` and `drive.readonly` is now requested.

---

## 📋 Steps You Need to Take

### 1. Update Environment Variables in Vercel
I noticed that your `VITE_GOOGLE_API_KEY` in `.env` is currently empty. This key is **mandatory** for the Google Drive integration to work properly on the built website.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Navigate to **APIs & Services > Credentials**.
3.  Ensure you have an **API Key** created.
4.  **Edit the API Key** to restrict it to:
    *   Google Drive API
    *   Google Picker API (if enabled)
5.  Add your Vercel domains (`zoabinexusvault.vercel.app` and `zoabinexusvault-*.vercel.app`) to the **Web Origins** restriction.
6.  Copy the API Key and paste it into your **Vercel Project Settings > Environment Variables** as `VITE_GOOGLE_API_KEY`.
7.  **Redeploy** your project on Vercel.

### 2. Verify Google OAuth Origins
Ensure that your Vercel URL is added to the "Authorized JavaScript origins" in your Google Cloud Console's OAuth 2.0 Client ID:
*   `https://zoabinexusvault.vercel.app`
*   `https://ufwtohehgttrlxdjmufj.supabase.co`

### 3. Check Supabase Provider Scopes (Optional but Recommended)
In your **Supabase Dashboard**:
1.  Go to **Authentication > Providers > Google**.
2.  In the "Scopes" field (if available), you can also add:
    `https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly`

---

## 🔍 Why aren't images showing?
The images in your app are primarily stored on **Google Drive** (not Supabase Storage). Since the connection to Google Drive was failing due to missing scopes and the empty API Key, the app couldn't fetch the images. 

Once you update the API Key in Vercel and log in again (now that I've added the scopes to the login), the images should start appearing correctly. 

### Static Images Verify
I verified that static assets like your logo (`/nexus_logo.png`) are loading correctly on the live site, so the build process itself is healthy!
