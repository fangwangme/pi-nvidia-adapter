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
To pull new models, generate output, and compare against the previous version:
```bash
bun run update-models
```

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
   - Puts flagship groups first: `moonshotai` ➔ `z-ai` ➔ `deepseek-ai`.
   - Sorts other providers alphabetically.
   - Sorts models within each company group chronologically using `release_date` (newest first).
6. **Overwrite Write & Version Backup**:
   - Writes the output definitions as a flat JSON array directly to `src/generated/models.json`.
   - Saves a version-specific copy to `.local/data/models_<version>.json` (matching the version in `package.json`) for future version diffing.
7. **Diff Comparison**: Prints a formatted summary of Added, Updated, and Removed models against the previous version's saved JSON file.

---

## 3. Configuration Output Structure

The generated model metadata is saved in [src/generated/models.json](file:///Users/fangwang/project/coding/pi-nvidia-adapter/src/generated/models.json):
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
