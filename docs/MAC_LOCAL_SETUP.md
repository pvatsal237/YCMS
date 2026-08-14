# Run YCMS on your Mac

This cloud chat cannot type into your Mac. Do these steps **on your Mac**.

## 1. Open Terminal on your Mac

Finder → Applications → Utilities → **Terminal**

## 2. Paste this entire block and press Return

```bash
cd ~
git clone -b cursor/ycms-application-aa1a https://github.com/pvatsal237/YCMS.git
cd YCMS
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

That clones the project, installs dependencies, starts PostgreSQL, loads demo data, and starts the app.

## 3. Open Safari

Go to: http://localhost:3000

- Email: `admin@ycms.local`
- Password: `YcmsDemo123!`

## Prerequisites

You need:

- Node.js 22 from https://nodejs.org
- Either Docker Desktop (recommended) **or** Homebrew

If the script says Docker is missing, install Docker Desktop, open it once, wait until it says it is running, then run:

```bash
cd ~/YCMS
./scripts/setup-local.sh
```

## Open the folder in Cursor (local, not cloud)

1. Open the **Cursor app**
2. File → Open Folder → `YCMS` in your home folder
3. Under the chat box, choose **Local**, not **Cloud**
