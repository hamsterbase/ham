import fs from "fs/promises";
import path from "path";
import { expect, it } from "vitest";
import { createTempDir } from "./create-temp-dir.js";

it("test createTempDir", async () => {
  const { tempDir, clean } = await createTempDir();
  expect((await fs.stat(tempDir)).isDirectory()).toBeTruthy();

  expect(path.basename(tempDir).startsWith("ham-cli-")).toBeTruthy();
  await clean();
  const res = (await fs.access(tempDir).catch((re) => re)) as Error;
  expect(res.message).toMatch("no such file or directory");

  // test custom baseDir
  const newTempDir = await createTempDir(tempDir);
  expect((await fs.stat(newTempDir.tempDir)).isDirectory()).toBeTruthy();
  expect(
    path.basename(path.dirname(newTempDir.tempDir)).startsWith("ham-cli-")
  ).toBeTruthy();
  await newTempDir.clean();
});
