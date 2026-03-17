

# Add Debug Logging to Upload Function

No logic changes. Only adding `console.log` / `console.error` statements to capture the exact failure point.

## Changes

### 1. `src/services/imageUpload.ts`

- **Before upload starts** (after line 93, inside `uploadImage`): Log auth state via `getAuth()`, storage bucket, original file details (name, size, type), folder, and uid.
- **After file conversion** (after line 108): Log converted file details.
- **On upload error** (line 126, the `reject` callback): Replace bare `reject` with a wrapper that logs `error.code`, `error.message`, `error.serverResponse`, then rejects.
- **On getDownloadURL failure** (line 128): Wrap in try/catch, log error before rejecting.

### 2. `src/pages/CreatePost.tsx`

- **In the catch block** (~line 146): Log the full error object with `error.code` and `error.message` instead of just `console.error('Upload error:', error)`.

### What stays the same
All existing logic, file conversion, path building, upload flow -- untouched. Only `console.log` and `console.error` calls added.

