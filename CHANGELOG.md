# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-06-06

### Added
- Created dynamic model metadata discovery logic based on `models.dev` API (zero API key required offline).
- Refactored `index.ts` to be completely dynamic, loading `src/generated/models.json` configuration and stripping all static hardcoded lists.
- Built keyless synchronization script under `scripts/update-models.ts` with auto company grouping and release date sorting.
- Implemented robust heuristics fallback matching in `index.ts` to support newly released models at runtime startup.
- Added product spec docs (`docs/specs/models-auto-update.md`) and maintenance instructions (`docs/specs/maintenance-and-release.md`).
