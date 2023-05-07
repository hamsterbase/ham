import fs from "fs/promises";
import path from "path";
import tar from "tar";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractTgz, packAndCopy } from "./compressing.js";
import { TempDirResult, createTempDir } from "./create-temp-dir.js";

const getEntryFilenames = async (tarName: string): Promise<string[]> => {
  const filenames: string[] = [];
  await tar.t({
    file: tarName,
    onentry: (entry) => filenames.push(entry.path),
  });
  return filenames;
};

describe("test compressing", () => {
  let sourceTmpDir: TempDirResult;
  let distTmpDir: TempDirResult;

  beforeEach(async () => {
    sourceTmpDir = await createTempDir();

    distTmpDir = await createTempDir();
  });

  afterEach(async () => {
    await sourceTmpDir.clean();
    // await distTmpDir.clean();
  });

  it("test packAndCopy", async () => {
    for (const fileName of ["1", "2", "3"]) {
      await fs.writeFile(path.join(sourceTmpDir.tempDir, fileName), "");
    }

    const result = path.join(distTmpDir.tempDir, "a.tgz");
    await packAndCopy(sourceTmpDir.tempDir, result);

    expect(await getEntryFilenames(result)).toEqual(["./1", "./2", "./3"]);
  });

  it("test extractTgz", async () => {
    for (const fileName of ["1", "2", "3"]) {
      await fs.writeFile(path.join(sourceTmpDir.tempDir, fileName), "");
    }

    const result = path.join(distTmpDir.tempDir, "a.tgz");
    await packAndCopy(sourceTmpDir.tempDir, result);

    const extractDir = await createTempDir();
    await extractTgz(result, extractDir.tempDir);
    expect(await fs.readdir(extractDir.tempDir)).toEqual(["1", "2", "3"]);
    await extractDir.clean();
  });
});
