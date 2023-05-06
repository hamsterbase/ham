import fs from "fs/promises";
import tar from "tar";
import path from "path";

export async function packAndCopy(sourceDir: string, target: string) {
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
    },
    files.map((p) => `./${p}`)
  );
}

/**
 *
 * @param source source tgz gile
 * @param targetDir target dir (will be created if not exists, will be cleaned if exists)
 */
export async function extractTgz(source: string, targetDir: string) {
  if (targetDir === "/") {
    throw new Error("targetDir can not be /");
  }
  await fs.rm(targetDir, { recursive: true });
  await fs.mkdir(targetDir, { recursive: true });
  await tar.x({
    cwd: targetDir,
    file: source,
  });
}
