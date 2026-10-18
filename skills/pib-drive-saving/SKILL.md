---
name: pib-drive-saving
description: Where and how to save, name and share files on Google Drive for Partners in Biz. Folder layout, Higgsfield output, no root saves, no public links, human-readable names, rclone upload by folder ID. Use before saving, uploading or sharing anything on Drive.
version: 1.0.0
author: Partners in Biz
license: MIT
metadata:
  tags: [partnersinbiz, google-drive, file-organization, sharing]
---

# Drive saving rules (Partners in Biz) — agreed with Peet, 10 Oct 2026

Read this before you save, upload or share anything on Google Drive.

## Resolve the folder

First, resolve the folder ID via the registry:

- Call `drive_folder_resolve` (the registry tool) to fetch the latest folder IDs from FILEMAP.md (Drive: PIB Shared Drive › 02 Partners in Biz › FILEMAP.md; fallback: `/workspace/drive/FILEMAP.md`).
- If it returns nothing for your target, search Google Drive by name (e.g. "PIB Shared Drive").
- Never hard-code a folder ID in a skill, script, or comment. The PIB Shared Drive ID and all paths live in the registry, not inline.

## What goes to Drive

Only approved creative, finished work, deliverables, and client-shared files:

- Approved winners from pib-ad-variants
- Higgsfield output (images, video) for clients or products
- Finished client work and assets
- Files shared with the client

**Working drafts and experiments** stay in the cockpit asset store. Never save drafts to Drive root or loose folders.

## Folder layout

```
PIB Shared Drive (resolved via drive_folder_resolve)
  02 Partners in Biz/
    Admin & Finance/
    Clients/<Company> (<Contact>)/
      Assets/Images | Assets/Video | Assets/Brand | Assets/Social
      Deliverables/
      Contracts & Quotes/
      Meetings & Notes/
      Shared with client/
    Products/<Product>/
      Brand | Design | Marketing assets/Images | Marketing assets/Video | App store | Shared externally
    Marketing & Sales/
    Internal/
    Archive/
  03 Press (KDP)/Morgan Hale/<Book>/
  04 Channels/<Channel>/<YYYY-MM-DD>/

My Drive
  01 Personal/               (Peet only; agents never write, move or open)
```

## Rules

1. **Never save to root** (My Drive root or Shared Drive root). Always use the correct subfolder.
2. **Higgsfield output** goes to client/product `Assets/Images` or `Assets/Video` (products: `Marketing assets/Images/Video`).
3. **Human-readable names**: `YYYY-MM-DD <Client/Product> <description> v01.ext`. No IDs as the only label (IDs belong in FILEMAP.md, not filenames).
4. **No public links**. Never set "Anyone with the link". To share with a client, put the file in `Shared with client` and ask Peet to share by email. Never change existing sharing — some files have special permissions that must stay (e.g. accountants keep edit access on tax and bank documents).
5. **Client folders**: create only when needed with standard subfolders above. Name: `<Company> (<Contact>)`. Don't invent a contact name; use the company name alone if you don't know it.
6. **Large files with rclone**: for Shared Drive folders, use
   ```
   rclone copy /path/file.mp4 gdrive: --drive-root-folder-id <FOLDER_ID> --drive-team-drive <SHARED_DRIVE_ID>
   ```
   Resolve all folder IDs via `drive_folder_resolve` first (never hard-code). For My Drive, omit `--drive-team-drive`. Never write `gdrive:<ID>` or `gdrive:{<ID>}` (that creates a folder named after the ID at root).
7. **Don't touch** Peet's `01 Personal`, `Motor`, or folders owned by Stean. Don't delete anything; if something looks like junk, list it for Peet.
8. If unsure, ask Peet. Don't guess and don't park files at the root.
