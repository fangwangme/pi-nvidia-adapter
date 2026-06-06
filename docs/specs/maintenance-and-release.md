# Maintenance & Release Guide

This document defines the procedures for maintaining model definitions, troubleshooting issues, and releasing updates for the **pi-nvidia-adapter** plugin.

---

## 1. Project Layout & Workflows

All active development is conducted under Git worktrees to preserve template structure integrity:
- **`main` Branch**: Contains template infrastructure, configurations, and core spec readmes. Avoid editing source code directly on `main`.
- **`dev` Worktree (`.worktrees/dev`)**: The designated workspace for implementing code updates, testing, and documentation revisions.

---

## 2. Dynamic Model Maintenance

NVIDIA NIM models are continuously changing. The data layer is decoupled from runtime business logic via `src/generated/models.json` and can be regenerated at any time.

### Update Pipeline Command
To pull new models and refresh metadata, run:
```bash
# In .worktrees/dev
bun run update-models
```

### Script Internals (`scripts/update-models.ts`)
The script runs entirely offline (meaning it needs zero API keys or authorization credentials) and automates the following workflow:
1. **models.dev Sync**: Fetches the latest global community specs database from `models.dev/api.json`.
2. **Nvidia Provider Extraction**: Grabs all model specifications defined under the `nvidia` provider block.
3. **Data Filter**: Filters out embedding, safety guard, and non-chat models.
4. **Heuristic Parsing**: Parses unknown/new model IDs for terms (e.g. `vision` -> multi-modal, `r1`/`thinking` -> reasoning, `1m` -> 1M context length) to dynamically build metadata.
5. **Provider Sorting**:
   - Puts flagship groups first: `moonshotai` ➔ `z-ai` ➔ `deepseek-ai`.
   - Sorts other providers alphabetically.
   - Sorts models within each company group chronologically using `release_date` (newest first).
6. **Overwrite Write**: Writes and overwrites the output definitions directly into `src/generated/models.json`.

---

## 3. Releases & Versioning

To ensure stability, the repository follows a strict **Branch-PR-Merge-Tag-Release** pipeline.

### Step 1: Preparation (in `.worktrees/dev`)
1. **Verify Type-Safety**: Ensure all TypeScript checks pass cleanly.
   ```bash
   bun run check
   ```
2. **Synchronize Latest Models**: Run the keyless script to ensure the JSON bundle contains the newest metadata.
   ```bash
   bun run update-models
   ```
3. **Commit & Bump Version**:
   - Bump the version in `package.json` following Semantic Versioning (SemVer) guidelines.
   - Stage and commit the codebase changes along with the updated JSON configuration.
     ```bash
     git add -A
     git commit -m "feat: sync models and bump version to vX.Y.Z"
     ```
4. **Push to Remote**: Push the local branch to the GitHub repository:
   ```bash
   git push origin dev
   ```

---

### Step 2: Code Review & Merging (PR Workflow)
1. **Create Pull Request**: Create a PR from `dev` merging into `main` using the GitHub CLI or the web UI:
   ```bash
   gh pr create --title "feat: sync models and update logic to vX.Y.Z" --body "Detailed description of changes..." --base main --head dev
   ```
2. **PR Review**: Collaborators/Agents review the logic and tests.
3. **Merge**: Once approved, merge the PR into `main` (preferably using Squash and Merge to keep the main branch history clean).

---

### Step 3: Tagging & Release (on `main`)
After merging the PR into the `main` branch, the release process is finalized by tagging and creating a GitHub Release:

1. **Update Local main Branch**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Create Lightweight Tag**: Tag the commit with the new version (matching `package.json`):
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

---

## 4. Manual Change Log & Versioning Policy

To keep the development pipeline simple and predictable, this project uses a manual versioning and change log process. We do not use complex CI/CD automation.

### PR Requirements
Before any Pull Request (PR) is created or merged, the developer must:
1. **Bump Version**: Manually increment the version field in `package.json` according to SemVer (Semantic Versioning).
2. **Update Changelog**: Manually document all new changes, additions, or deprecations under the root directory's `CHANGELOG.md` file.

### Manual Release Workflow
Once the PR is merged into `main`, the project maintainer handles release notes manually on GitHub:
1. Pull the latest `main` branch locally, apply the git tag matching the package version, and push the tag.
2. Go to the GitHub repository UI ➔ Releases ➔ Draft a new release.
3. Select the created tag (e.g. `vX.Y.Z`), title the release (e.g. `Release vX.Y.Z`), and copy/paste the corresponding change notes directly from `CHANGELOG.md` into the release description.

