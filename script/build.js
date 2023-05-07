import cp from "child_process";
import fs from "fs/promises";
import path, { join } from "path";
import { fileURLToPath } from "url";
import esbuild from "esbuild";

const projectRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const output = path.join(projectRoot, "dist");

(async () => {
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });

  cp.spawnSync("npx", ["tsc"], {
    cwd: projectRoot,
  });

  esbuild.build({
    entryPoints: [join(projectRoot, "src/exports/bin.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node16",
    external: ["tar"],
    outfile: join(projectRoot, "dist/exports/bin.mjs"),
  });
})();
