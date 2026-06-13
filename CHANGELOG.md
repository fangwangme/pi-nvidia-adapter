# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2026-06-13

### Added
- Added `bun run backup-models` command: snapshots the generated models to `.local/data/models_<version>.json`, to be run after bumping the version in `package.json`. Refuses to overwrite an existing backup unless `--force` is passed.

### Changed
- Flattened the model JSON structure in `src/generated/models.json` by merging `thinkingConfig` directly into model definitions.
- Retained model release date and last updated fields in the output JSON, enabling stable sorting order by company and descending release date.
- Refactored `index.ts` to consume the flat JSON array and resolve configs in O(1) time via a module-scoped map.
- Updated `update-models.ts` to print a model diff against the latest version backup (falling back to the current generated file when no backup exists).
- Extracted shared script helpers (version reading, semver comparison, backup listing) into `scripts/utils.ts`.
- Consolidated documentation into a single unified guide at `docs/maintenance-and-release.md` and updated changelog links.

## [0.0.1] - 2026-06-06

### Added
- Created dynamic model metadata discovery logic based on `models.dev` API (zero API key required offline).
- Refactored `index.ts` to be completely dynamic, loading `src/generated/models.json` configuration and stripping all static hardcoded lists.
- Built keyless synchronization script under `scripts/update-models.ts` with auto company grouping and release date sorting.
- Implemented robust heuristics fallback matching in `index.ts` to support newly released models at runtime startup.
- Added a comprehensive maintenance and release guide (`docs/maintenance-and-release.md`).
