import { join } from "path";
import fs from "fs/promises";
import os from "os";

export interface TempDirResult {
  tempDir: string;
  clean: () => Promise<void>;
}

export async function createTempDir(baseDir?: string) {
  const realBaseDir = baseDir ?? os.tmpdir();
  await fs.mkdir(realBaseDir, { recursive: true });
  const tempDir = await fs.mkdtemp(join(realBaseDir, "ham-cli-"));

  return {
    tempDir,
    clean: (): Promise<void> => {
      return fs.rm(tempDir, { recursive: true });
    },
  };
}
