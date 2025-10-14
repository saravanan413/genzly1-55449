# 🚨 CORS Fix Instructions - Firebase Storage Upload Issue

## Problem
Your uploads are stuck at 0% because Firebase Storage bucket **does not have CORS configured**. The browser blocks the resumable upload preflight (OPTIONS request), preventing any bytes from transferring.

## Exact Cause
Firebase's `uploadBytesResumable()` requires specific `x-goog-upload-*` headers to be allowed in CORS. Without them, the browser's preflight check fails silently and no upload begins.

---

## ✅ Solution: Apply CORS Configuration

### Step 1: Install Google Cloud SDK (if not already installed)

**Mac:**
```bash
brew install google-cloud-sdk
```

**Windows:**
Download from: https://cloud.google.com/sdk/docs/install

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Step 2: Authenticate with Google Cloud

```bash
gcloud auth login
```

This opens your browser to sign in with your Firebase Google account.

### Step 3: Set Your Firebase Project

```bash
gcloud config set project genzly
```

### Step 4: Apply CORS Configuration

The `cors.json` file is already in your project root. Run:

```bash
gsutil cors set cors.json gs://genzly.appspot.com
```

### Step 5: Verify CORS Configuration

```bash
gsutil cors get gs://genzly.appspot.com
```

You should see the CORS rules including all the `x-goog-upload-*` headers.

---

## 🔍 Test the Fix

1. **Open your app** in the browser
2. **Open DevTools** (F12) → **Network tab**
3. **Try uploading** a photo/video
4. **Look for**:
   - ✅ `OPTIONS` request to `firebasestorage.googleapis.com` → Status `200`
   - ✅ Response headers include: `Access-Control-Allow-Origin` and `Access-Control-Allow-Headers`
   - ✅ `POST` request with `uploadType=resumable` → Status `200` (session created)
   - ✅ `PUT` request with increasing `bytesTransferred` in console logs

5. **Console logs should show**:
   ```
   📤 Starting Instagram-style upload: { path: "posts/...", size: "X.XX MB" }
   📊 Upload progress: 5.2% { transferred: "0.26 MB", total: "5.00 MB" }
   📊 Upload progress: 15.8% ...
   ✅ Upload complete! URL: https://firebasestorage.googleapis.com/...
   ```

---

## 🎯 What This Fixes

- ✅ Allows browser preflight (OPTIONS) to succeed
- ✅ Permits resumable upload session creation (POST)
- ✅ Enables chunk uploads (PUT) with progress tracking
- ✅ Supports all necessary upload headers (`x-goog-upload-protocol`, `x-goog-upload-command`, etc.)
- ✅ Works from localhost and all your Lovable preview domains

---

## 🚨 If Still Not Working After CORS Fix

### Check Console Logs
The enhanced diagnostic logging will now show:
```
❌ Upload error (DETAILED - Check for CORS issues): {
  code: "storage/unauthorized",
  diagnosticHint: "🚨 MOST LIKELY CORS ISSUE: Bucket needs CORS config..."
}
```

### Check Network Tab
- If OPTIONS request fails → CORS not applied correctly
- If OPTIONS succeeds but POST fails → Auth issue (verify user is logged in)
- If POST succeeds but PUT fails → Storage rules issue (but your rules are correct)

### Verify Authentication
```bash
# In browser console
firebase.auth().currentUser
// Should show user object, not null
```

### Double-Check Bucket Name
Your bucket is: `genzly.appspot.com`
Console should log: `[Firebase] Using storage bucket: genzly.appspot.com`

---

## 📝 Summary

**The issue is NOT your code** - it's the missing CORS configuration on the Firebase Storage bucket itself.

**After applying CORS**, your Instagram-style upload system will work perfectly:
- Direct device-to-Firebase upload
- Real-time progress tracking
- Full-quality media
- Instant feed updates

Run the `gsutil cors set` command above and you're done! 🎉
