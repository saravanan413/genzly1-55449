

# Fix Upload Service: Add Reels, Unique Filenames, Clean Up Chat

## Changes

### 1. `src/services/imageUpload.ts` -- Main rewrite

**A. Add `"reels"` to the folder type union**
- Change `"profilePictures" | "posts" | "stories"` to `"profilePictures" | "posts" | "stories" | "reels"`

**B. Replace `jpgFile.name` with unique timestamp filename**
- Current: `${folder}/${user.uid}/${jpgFile.name}` (risk of overwrite)
- New: `${folder}/${user.uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
- This guarantees uniqueness per upload

**C. Remove `uploadChatImage` function**
- Your storage rules have NO write permission for the `chats/` path (only read for participants)
- The chat upload function would always fail, so it should be removed to avoid confusion
- Any file that imports `uploadChatImage` will be updated to remove the dead reference

**D. Add `onProgress` callback to `uploadImage`**
- Currently the `state_changed` listener passes `null` for the progress handler, so progress always stays at 0%
- Add an optional `onProgress?: (percent: number) => void` parameter
- Wire it into the `uploadBytesResumable` state_changed listener to report real upload percentage

**Updated function signature:**
```typescript
export async function uploadImage({
  file,
  folder,
  onProgress
}: {
  file: File;
  folder: "profilePictures" | "posts" | "stories" | "reels";
  onProgress?: (percent: number) => void;
}): Promise<string>
```

**Upload path format:**
```
{folder}/{auth.uid}/{timestamp}_{random}.jpg
```
Examples:
- `posts/abc123uid/1708700000000_x7k2m9.jpg`
- `reels/abc123uid/1708700000000_p3q8n1.jpg`
- `profilePictures/abc123uid/1708700000000_a2b4c6.jpg`

### 2. `storage.rules` -- Add write permissions

Your current rules are read-only. They need `allow write` for authenticated users matching their UID (as you specified earlier). Update all four folders:

```
match /posts/{userId}/{fileName} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.uid == userId
               && request.resource.size < 100 * 1024 * 1024;
}
```
Same pattern for `reels`, `stories`, `profilePictures`. Remove the `chats` rule entirely since there is no write path for it.

### 3. `src/pages/CreatePost.tsx` -- Use progress callback

- Pass `onProgress` to `uploadImage` to track real upload percentage
- Add a progress state variable and display a progress bar during upload

### 4. `src/services/cloudFunctionUpload.ts` -- Delete

This file is unused (nothing imports from it in the active codebase). Removing it prevents confusion with the direct upload approach.

---

## Summary table

| File | Action |
|------|--------|
| `src/services/imageUpload.ts` | Add `"reels"`, unique filenames, progress callback, remove `uploadChatImage` |
| `storage.rules` | Add write rules for all 4 folders, remove chat rule |
| `src/pages/CreatePost.tsx` | Wire up `onProgress` for real progress tracking |
| `src/services/cloudFunctionUpload.ts` | Delete (unused) |

