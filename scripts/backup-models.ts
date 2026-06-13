import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { GENERATED_MODELS_FILE, LOCAL_DATA_DIR, getPackageVersion } from "./utils";

// Snapshots src/generated/models.json to .local/data/models_<version>.json.
// Run this AFTER bumping the version in package.json, so the backup is stamped
// with the version that ships this dataset and serves as the diff baseline for
// the next `bun run update-models`.

const force = process.argv.includes("--force");

if (!existsSync(GENERATED_MODELS_FILE)) {
  console.error("src/generated/models.json not found. Run `bun run update-models` first.");
  process.exit(1);
}

const version = getPackageVersion();
const target = join(LOCAL_DATA_DIR, `models_${version}.json`);

if (existsSync(target) && !force) {
  console.error(`Backup for v${version} already exists: ${target}`);
  console.error("Bump the version in package.json before backing up (or rerun with --force to overwrite).");
  process.exit(1);
}

mkdirSync(LOCAL_DATA_DIR, { recursive: true });
copyFileSync(GENERATED_MODELS_FILE, target);
console.log(`Saved backup for v${version}: ${target}`);
