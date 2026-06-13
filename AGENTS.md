## Project Structure
- Work in a non-`main` git worktree for normal development
- Only modify `main` directly when the user explicitly authorizes template or repository-structure maintenance
- Manual worktrees live under `.worktrees/`
- Worktree-local state lives under `.local/`
- Shared specs live under `docs/specs/`; the maintenance and release guide is `docs/maintenance-and-release.md`
- Agent notes, plans, archives, and project status live under `.agents/`

## Model Sync & Release Workflow
1. Run `bun run update-models` to regenerate `src/generated/models.json`; it prints a diff against the latest version backup in `.local/data/`
2. Use the printed diff to update `CHANGELOG.md` and bump the version in `package.json`
3. After bumping the version, you MUST run `bun run backup-models` to snapshot the generated JSON to `.local/data/models_<version>.json` — this becomes the diff baseline for the next sync
4. The backup script refuses to overwrite an existing backup; if it does, the version was not bumped yet
