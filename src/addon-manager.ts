import { AddonTarget } from "./config";

export interface IAddonsManager {
  importBinaryAddon(
    addonName: string,
    filePath: string,
    target: AddonTarget
  ): void;
}
