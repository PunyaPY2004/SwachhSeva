# Uploading to GitHub

## 1. Install Git (if you haven't already)

Download from https://git-scm.com/download/win and install with default options.

## 2. Create the repository on GitHub

- Go to https://github.com/new
- Name it (e.g. `swachhseva`)
- Leave it **empty** — don't check "Add a README" or ".gitignore" (you
  already have your own)
- Click "Create repository" and keep the page open — it shows you the
  commands for the next step

## 3. Set up git locally

Open a terminal at your project root (`F:\SwachhSeva`, the folder
containing `backend`, `mobile`, `admin-dashboard`, `training`, `docs`):

```
git init
git add .
git commit -m "Initial commit: SwachhSeva full-stack civic issue reporting system"
```

## 4. Connect to GitHub and push

GitHub will show you the exact commands after creating the repo, but
they'll look like:
```
git remote add origin https://github.com/<your-username>/swachhseva.git
git branch -M main
git push -u origin main
```

You'll be prompted to sign in — GitHub Desktop or a browser-based login
popup is the easiest path if you don't already have a personal access
token set up.

## Before you push — confirm nothing sensitive is included

Each subfolder already has a `.gitignore` that excludes the usual
suspects, but double-check with:
```
git status
```
None of these should appear in the list of files about to be committed:
- `.env` files (any folder)
- `venv/` or `node_modules/`
- `instance/` (SQLite database file)
- `*.keras` / `*.h5` (trained model — optional to exclude; these can be
  large, consider Git LFS or just leaving it out and re-training instead)
- Anything under `uploads/` other than `.gitkeep`
- Your actual training `dataset/` images, if large (already excluded by
  `training/.gitignore`) — instead, document in your README where you
  sourced the dataset from, so anyone re-running your project knows how
  to get the same data

If any of these show up, add them to the relevant `.gitignore` and run
`git rm --cached <file>` to un-stage them before committing.

## Recommended root README

Make sure `F:\SwachhSeva\README.md` (the top-level one, not the
per-folder ones) explains the project, links to each subfolder's own
README, and credits any external datasets used — see the main project
README for a version you can copy/adjust.
