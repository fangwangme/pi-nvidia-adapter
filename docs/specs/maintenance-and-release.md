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

## 4. Automated Change Log Extraction

We avoid writing release notes manually. To keep development efficient, we use automated Change Log extraction strategies during发版:

### Method A: GitHub CLI Automation (Recommended)
You can create a GitHub Release and automatically extract the Change Log using the GitHub CLI's `--generate-notes` flag. This parses all squash-merged PRs and commit messages since the previous tag:
```bash
# Finalizes the release and auto-generates changelogs directly into GitHub Release
gh release create vX.Y.Z --title "Release vX.Y.Z" --generate-notes
```

### Method B: GitHub Actions Automation (CI/CD Pipeline)
You can automate the release pipeline entirely via a GitHub Actions workflow (e.g., `.github/workflows/release.yml`). When a tag prefixing `v` is pushed, the workflow runs the build and uploads a release with auto-extracted release notes:
```yaml
name: Draft Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: Release ${{ github.ref_name }}
          generate_release_notes: true  # <--- Automatically extracts and generates Change Log
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Method C: Local Conventional Commits Changelog (Optional)
If a local `CHANGELOG.md` document is desired, developers can integrate tools like `conventional-changelog-cli` or `standard-version` to extract git messages based on [Conventional Commits](https://www.conventionalcommits.org/):
```bash
# Dry run to preview changelog diff
bunx standard-version --dry-run
# Executes standard-version (bumps, updates CHANGELOG.md, and creates tag locally)
bunx standard-version
```
