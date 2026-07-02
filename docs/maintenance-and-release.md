# Maintenance & Release Guide

This document defines the project layout, procedures for synchronizing model definitions, troubleshooting issues, and releasing updates for the **pi-nvidia-adapter** plugin.

---

## 1. Project Layout & Workflows

All active development is conducted under Git worktrees to preserve template structure integrity:
- **`main` Branch**: Contains template infrastructure, configurations, and core spec readmes. Avoid editing source code directly on `main`.
- **`dev` Worktree (`.worktrees/dev`)**: The designated workspace for implementing code updates, testing, and documentation revisions.

---

## 2. Dynamic Model Maintenance

NVIDIA NIM models are continuously changing. The data layer is decoupled from runtime business logic via `src/generated/models.json` and can be regenerated at any time.

### Synchronization & Auto-Update Command
To pull new models, generate output, and print a diff against the latest version backup:
```bash
bun run update-models
```

### Version Backup Command
After updating `CHANGELOG.md` and bumping the version in `package.json`, snapshot the freshly generated dataset:
```bash
bun run backup-models
```
This copies `src/generated/models.json` to `.local/data/models_<version>.json`, stamped with the (new) version from `package.json`. The script refuses to overwrite an existing backup — this catches the mistake of running it before bumping the version (use `--force` to override deliberately).

### Heuristics & Filtering Mechanism
The synchronization script (`scripts/update-models.ts`) runs offline (zero API keys needed) and automates the following pipeline:
1. **models.dev Sync**: Fetches the latest global community specs database from `models.dev/api.json`.
2. **Nvidia Provider Extraction**: Grabs all model specifications defined under the `nvidia` provider block.
3. **Filtering Non-Chat Models**: Automatically skips embedding, safety guard, translation, and non-chat models based on ID pattern matching (e.g. `/embed/`, `/guard/`, `/safety/`).
4. **Heuristic Parsing**: Parses unknown/new model IDs to build metadata fallbacks:
   - **Reasoning**: Marked `true` if ID contains terms like `r1`, `reasoning`, `thinking`, `qwq`, `glm5`.
   - **Vision Support**: Input modalities mapped to `["text", "image"]` if ID contains `vision`, `-vl`, or `multimodal`.
   - **Context Window**: Defaults to `128000` tokens, overridden based on suffixes (e.g. `1m` -> `1048576`).
5. **Provider Grouping & Sorting**:
   - Puts flagship groups first: `moonshotai` -> `z-ai` -> `deepseek-ai`.
   - Sorts other providers alphabetically.
   - Sorts models within each company group chronologically using `release_date` (newest first).
6. **Diff Comparison**: Prints a formatted summary of Added, Updated, and Removed models against the highest-version backup in `.local/data` (falling back to the current `src/generated/models.json` when no backup exists).
7. **Overwrite Write**: Writes the output definitions as a flat JSON array directly to `src/generated/models.json`. Backups are NOT written here — that is the separate post-version-bump `backup-models` step.

---

## 3. Configuration Output Structure

The generated model metadata is saved in [src/generated/models.json](../src/generated/models.json):
```json
[
  {
    "id": "deepseek-ai/deepseek-v4-flash",
    "name": "DeepSeek V4 Flash",
    "company": "deepseek-ai",
    "reasoning": true,
    "input": [
      "text"
    ],
    "contextWindow": 1048576,
    "maxTokens": 393216,
    "cost": {
      "input": 0,
      "output": 0,
      "cacheRead": 0,
      "cacheWrite": 0
    },
    "compat": {
      "supportsReasoningEffort": false,
      "supportsDeveloperRole": false,
      "maxTokensField": "max_tokens"
    },
    "releaseDate": "2026-02-16",
    "lastUpdated": "2026-02-16",
    "thinkingConfig": {
      "enableKwargs": {
        "thinking": true
      },
      "disableKwargs": {
        "thinking": false
      },
      "includeReasoningEffortInKwargs": true
    }
  }
]
```
The plugin imports this file at runtime to register active provider models without hardcoded updates in the main code.

---

## 4. Releases & Versioning

To ensure stability, the repository follows a strict **Branch-PR-Merge-Tag-Release** pipeline.

### Step 1: Preparation (in `.worktrees/dev`)
1. **Verify Type-Safety**: Ensure all TypeScript checks pass cleanly.
   ```bash
   bun run check
   ```
2. **Synchronize Latest Models**: Run the keyless script to regenerate the JSON bundle. It prints a diff against the latest version backup.
   ```bash
   bun run update-models
   ```
3. **Update Changelog & Bump Version**: Hand the printed diff to an agent (or do it manually) to:
   - Document the changes under `CHANGELOG.md`.
   - Bump the version in `package.json` following Semantic Versioning (SemVer) guidelines.
4. **Backup the New Version's Dataset**: With the new version now in `package.json`, snapshot the generated JSON so it becomes the diff baseline for the next sync.
   ```bash
   bun run backup-models
   ```
5. **Commit & Push**:
   ```bash
   git add -A
   git commit -m "feat: sync models and bump version to vX.Y.Z"
   git push origin dev
   ```

### Step 2: Code Review & Merging (PR Workflow)
1. **Create Pull Request**: Create a PR from `dev` merging into `main`:
   ```bash
   gh pr create --title "feat: sync models and update logic to vX.Y.Z" --body "Detailed description of changes..." --base main --head dev
   ```
2. **PR Review & Merge**: Squash and merge the PR into `main` after review.

### Step 3: Tagging & Release (on `main`)
After merging the PR into the `main` branch:
1. **Update Local main Branch**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Create lightweight Tag**: Tag the commit with the new version (matching `package.json`):
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
3. **Draft Release**: Draft a new release on GitHub, select tag `vX.Y.Z`, and copy notes from `CHANGELOG.md` into the release description.

---

## 5. Manual Change Log & Versioning Policy

To keep the development pipeline simple and predictable, this project uses a manual versioning and change log process. We do not use complex CI/CD automation.

### PR Requirements
Before any Pull Request (PR) is created or merged, the developer must:
1. **Bump Version**: Manually increment the version field in `package.json` according to SemVer.
2. **Update Changelog**: Manually document all new changes, additions, or deprecations under the root directory's `CHANGELOG.md` file.

---
