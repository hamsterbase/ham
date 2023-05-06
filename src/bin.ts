import { cac } from "cac";
import { join } from "path";

const ham = cac("ham");

const defaultConfigPath = join(process.cwd(), ".hamrc.🐹");

ham
  .command("import-binary <addonName> <addonPath>", "Import a binary addon")
  .option("--target <target>", "Addon Target")
  .option("--config <configPath>", "ham config path");
