import { cac } from "cac";
import fs from "fs/promises";
import { join } from "path";
import { Ham } from "../ham.js";

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

ham
  .command("install", "Install all addon")
  .option("--config <configPath>", "ham config path")
  .option("--force", "ham config path")
  .action(async (options) => {
    const configPath = options.config || defaultConfigPath;
    try {
      await fs.access(configPath);
      const ham = Ham.create(configPath);
      const config = await ham.getConfig();
      const addons = (config.addons ?? []).filter((o) => {
        if (o.type === "binary") {
          return false;
        }
        return true;
      });
      for (const addon of addons) {
        await ham.installAddon(addon.type, addon.name, options.force ?? false);
      }
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
