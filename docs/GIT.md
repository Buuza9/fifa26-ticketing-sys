# Git commands — quick reference

The commands we use to work on this project day to day. Remote is
`origin` → `https://github.com/Buuza9/fifa26-ticketing-sys.git`, default
branch `main`.

## One-time setup (already done)
```bash
git init                       # initialise the repo
git remote add origin https://github.com/Buuza9/fifa26-ticketing-sys.git
git branch -M main             # name the default branch main
```

## Everyday flow
```bash
git status                     # what's changed
git add -A                     # stage everything (respects .gitignore)
git add app/page.tsx           # …or stage specific files
git commit -m "message"        # commit staged changes
git push                       # push to origin/main
git push -u origin main        # first push (sets upstream)
```

## Pulling in changes
```bash
git pull                       # fetch + merge origin/main
git fetch origin               # fetch without merging
git log --oneline -10          # recent history
```

## Branches (for larger changes / review)
```bash
git switch -c feature-name     # create + switch to a branch
git switch main                # back to main
git push -u origin feature-name
git merge feature-name         # merge a branch into the current one
git branch -d feature-name     # delete a merged branch
```

## Undo / fix
```bash
git restore app/page.tsx       # discard unstaged changes to a file
git restore --staged file.ts   # unstage (keep changes)
git commit --amend             # edit the last commit (before pushing)
git revert <commit>            # safely undo a pushed commit
git reset --hard origin/main   # DANGER: discard all local changes to match remote
```

## Inspecting
```bash
git diff                       # unstaged changes
git diff --staged              # staged changes
git show <commit>              # a specific commit's changes
git blame app/page.tsx         # who last touched each line
```

## Notes for this repo
- `.env.local` is git-ignored — **never commit Supabase keys**. Share via the
  host's environment variables, not the repo. `.env.local.example` is the
  template that *is* committed.
- `node_modules/`, `.next/`, and `out/` are ignored; only source is tracked.
- The database lives in Supabase, not git — `schema.sql` is the source of
  truth for it and is committed.
