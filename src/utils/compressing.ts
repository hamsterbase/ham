import fs from "fs/promises";
import { minimatch } from "minimatch";
import path from "path";
import tar from "tar";
import { FilterConfig } from "../config.js";

function filterOptionToFilter(filterOption?: FilterConfig) {
  return (filePath: string) => {
    const includeConfig = filterOption?.include ?? [];
    const excludeConfig = filterOption?.exclude ?? [];
    if (includeConfig.some((x) => minimatch(filePath, x))) {
      return true;
    }
    if (excludeConfig.some((x) => minimatch(filePath, x))) {
      return false;
    }
    return true;
  };
}

export async function packAndCopy(
  sourceDir: string,
  target: string,
  filterOption?: FilterConfig
) {
  const stat = await fs.stat(sourceDir);
  if (!stat.isDirectory()) {
    throw new Error(`${sourceDir} is not a directory`);
  }

  const ext = path.extname(target);
  if (ext !== ".tgz") {
    throw new Error(`ext name of ${target} must be .tgz`);
  }

  await fs.mkdir(path.dirname(target), { recursive: true });
  const files = await fs.readdir(sourceDir);
  await tar.create(
    {
      file: target,
      portable: true,
      gzip: true,
      cwd: sourceDir,
      filter: filterOptionToFilter(filterOption),
    },
    files.map((p) => `./${p}`)
  );
}

/**
 *
 * @param source source tgz file
 * @param targetDir target dir (will be created if not exists, will be cleaned if exists)
 */
export async function extractTgz(
  source: string,
  targetDir: string,
  filterOption?: FilterConfig
) {
  if (targetDir === "/") {
    throw new Error("targetDir can not be /");
  }
  try {
    await fs.rm(targetDir, { recursive: true });
  } catch (error) {
    // ignore not found error
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  await fs.mkdir(targetDir, { recursive: true });
  await tar.x({
    cwd: targetDir,
    file: source,
    filter: filterOptionToFilter(filterOption),
  });
}
