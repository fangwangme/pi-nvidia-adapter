import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const LOCAL_DATA_DIR = join(__dirname, "../.local/data");
export const PACKAGE_JSON_FILE = join(__dirname, "../package.json");
export const GENERATED_MODELS_FILE = join(__dirname, "../src/generated/models.json");

export function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_FILE, "utf-8"));
    if (pkg && typeof pkg.version === "string") {
      return pkg.version;
    }
  } catch (e) {
    console.warn("Could not read version from package.json, defaulting to 0.0.1");
  }
  return "0.0.1";
}

// Numeric-only comparison; pre-release suffixes (e.g. -rc1) are not supported
export function semverCompare(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

export interface BackupFile {
  file: string;
  version: string;
}

// Version-stamped model backups under .local/data, sorted ascending by version
export function listBackups(): BackupFile[] {
  if (!existsSync(LOCAL_DATA_DIR)) return [];
  return readdirSync(LOCAL_DATA_DIR)
    .map((f) => {
      const match = f.match(/^models_(.+)\.json$/);
      return match ? { file: f, version: match[1] } : null;
    })
    .filter((item): item is BackupFile => !!item)
    .sort((a, b) => semverCompare(a.version, b.version));
}
