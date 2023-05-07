import { cac } from "cac";
import { join } from "path";
import { Ham } from "../ham.js";
import fs from "fs/promises";

const ham = cac("ham");

const defaultConfigPath = join(process.cwd(), ".hamrc.🐹");

ham
  .command("import-binary <addonName> <addonPath>", "Import a binary addon")
  .option("--target <target>", "Addon Target")
  .option("--config <configPath>", "ham config path")
  .action(async (addonName, addonDir, options) => {
    const configPath = options.config || defaultConfigPath;
    try {
      await fs.access(configPath);
      const ham = Ham.create(configPath);
      ham.importBinaryAddon(addonName, addonDir, options.target);
    } catch (error) {
      console.log((error as Error).message);
      process.exit(1);
    }
  });

(async () => {
  try {
    ham.help();
    ham.parse(process.argv, { run: false });
    await ham.runMatchedCommand();
  } catch (error) {
    console.log((error as Error).message);
    process.exit(1);
  }
})();