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

### Release Checklist
To issue a new release of `pi-nvidia-adapter`:

1. **Verify Local Status**: Ensure you are in `.worktrees/dev` and type check passes:
   ```bash
   bun run check
   ```
2. **Pull and Regenerate Models**: Run the update script to guarantee that the bundled configuration JSON contains the latest models:
   ```bash
   bun run update-models
   ```
3. **Commit Generated Data**:
   Ensure both code updates and the generated JSON are staged and committed together:
   ```bash
   git add index.ts src/generated/models.json
   git commit -m "chore: sync active models from models.dev"
   ```
4. **Bump Version**:
   Increment the version string in `package.json` following Semantic Versioning (SemVer).
5. **Publish / Push**:
   Push the `dev` branch changes to GitHub, create a Pull Request into `main`, and after merge, create a GitHub release tag (e.g. `v1.2.0`). Users installing via the CLI will automatically pull the updated version.
