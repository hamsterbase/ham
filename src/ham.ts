import cp from "child_process";
import crypto from "crypto";
import ofs from "fs";
import fs from "fs/promises";
import os from "os";
import path, { basename, dirname, join, resolve } from "path";
import {
  AddonArch,
  AddonPlatform,
  AddonTarget,
  AddonType,
  AddonWithType,
  BinaryAddon,
  ElectronAddon,
  HamsterAddonManagerConfig,
  NodeAddon,
} from "./config.js";
import { extractTgz, packAndCopy } from "./utils/compressing.js";
import { createTempDir } from "./utils/create-temp-dir.js";
import { guessAddonTarget } from "./utils/guess-target.js";

import { createRequire } from "node:module";

function getRequireResolve() {
  if (globalThis.require?.resolve) {
    return globalThis.require.resolve;
  }
  const require = createRequire(import.meta.url);
  return require.resolve;
}

function resolveElectronRebuild() {
  return getRequireResolve()("@electron/rebuild/lib/cli.js");
}

export interface IHamInstance {
  currentTarget: AddonTarget;

  getConfig(): Promise<HamsterAddonManagerConfig>;

  importBinaryAddon(
    addonName: string,
    addonDir: string,
    target?: AddonTarget
  ): void;

  ensureAddon(
    type: AddonType,
    addonName: string,
    target: AddonTarget,
    dir: string
  ): Promise<void>;

  installAddon(
    type: AddonType,
    addonName: string,
    force?: boolean
  ): Promise<void>;
}

export class Ham implements IHamInstance {
  get currentTarget(): AddonTarget {
    return {
      arch: os.arch() as AddonArch,
      platform: os.platform() as AddonPlatform,
    };
  }

  static create(hamConfigPath: string): IHamInstance {
    return new Ham(hamConfigPath);
  }

  async ensureAddon(
    type: AddonType,
    addonName: string,
    target: AddonTarget,
    dir: string
  ): Promise<void> {
    const addonTarget = await this.getAddonPath(type, addonName, target);
    // if addon not exist, install it
    if (!ofs.existsSync(addonTarget)) {
      switch (type) {
        case "binary": {
          throw new Error("binary addon not found");
        }
        case "node":
        case "electron": {
          await this.installAddon(type, addonName);
          break;
        }
      }
    }
    const addon = await this.getAddon(type, addonName);
    return extractTgz(addonTarget, dir, addon?.extractFilter);
  }

  private constructor(private configPath: string) {}

  async getConfig(): Promise<HamsterAddonManagerConfig> {
    return JSON.parse(await fs.readFile(this.configPath, "utf-8"));
  }

  private async writeConfig(config: HamsterAddonManagerConfig) {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  async installAddon(
    type: AddonType,
    addonName: string,
    force?: boolean
  ): Promise<void> {
    const addon = await this.getAddon(type, addonName);
    if (!addon) {
      throw new Error(`${type} addon ${addonName} not found`);
    }
    const addonTarget: AddonTarget = {
      arch: os.arch() as AddonArch,
      platform: os.platform() as AddonPlatform,
    };
    const addonPath = await this.getAddonPath(type, addonName, addonTarget);
    if (ofs.existsSync(addonPath) && !force) {
      return;
    }
    switch (type) {
      case "node": {
        await this.addonInstallPrepare(addon as NodeAddon, addonTarget);
        break;
      }
      case "electron": {
        await this.addonInstallPrepare(addon as ElectronAddon, addonTarget);
        break;
      }
    }
  }

  private async addonInstallPrepare(
    addon: NodeAddon | ElectronAddon,
    addonTarget: AddonTarget
  ) {
    if (
      addonTarget.arch !== os.arch() ||
      addonTarget.platform !== os.platform()
    ) {
      throw new Error("arch or platform mismatch");
    }
    const tmpdir = await createTempDir();
    await fs.writeFile(
      resolve(tmpdir.tempDir, "package.json"),
      JSON.stringify({
        name: addon.name,
        version: "1.0.0",
        license: "MIT",
        dependencies: addon.dependencies,
      })
    );
    // step 1 : install
    const config = await this.getConfig();
    let command = `npm i --global-style`;
    if (config.npm?.registry) {
      command = `${command} --registry=${config.npm.registry}`;
    }
    if (addon.type === "electron") {
      command = `${command} --ignore-scripts`;
    }
    cp.execSync(command, {
      cwd: tmpdir.tempDir,
      stdio: "inherit",
    });

    // step 2 : patch
    await this.runPatchScript(addon, tmpdir.tempDir);

    if (addon.type === "electron") {
      const electronAddon = addon as ElectronAddon;
      const args = [
        resolveElectronRebuild(),
        "-f",
        "-m",
        tmpdir.tempDir,
        "-v",
        electronAddon.electronVersion,
        "--arch",
        addonTarget.arch,
      ];
      console.log("run script", "node ", args.join(" "));
      cp.execFileSync("node", args, {
        stdio: "inherit",
      });
    }

    // step 3 : pack
    const addonRoot = resolve(tmpdir.tempDir, "node_modules");
    await packAndCopy(
      addonRoot,
      await this.getAddonPath(addon.type, addon.name, addonTarget),
      addon.filter
    );
  }

  private async runPatchScript(
    addon: NodeAddon | ElectronAddon,
    dir: string
  ): Promise<void> {
    if (!addon.patch) {
      return;
    }
    const patchScriptPath = path.resolve(
      path.dirname(this.configPath),
      addon.patch
    );
    const process = cp.fork(patchScriptPath, {
      cwd: dir,
      env: {
        HAM_PATCH_ADDON_TYPE: addon.type,
        HAM_PATCH_ADDON_NAME: addon.name,
        HAM_PATCH_ADDON_DIR: dir,
      },
      stdio: "inherit",
    });
    return new Promise((r) => {
      process.on("exit", () => {
        r();
      });
    });
  }

  private async getLock() {
    // get md5 of config path
    const md5 = crypto.createHash("md5").update(this.configPath).digest("hex");
    const lockPath = join(os.tmpdir(), `ham.lock.${md5}`);

    try {
      await fs.mkdir(lockPath, { recursive: true });
    } catch (error) {
      throw new Error(`can not create lock dir ${lockPath}`);
    }
    return {
      lockPath,
      unlock: async () => {
        await fs.rm(lockPath, { recursive: true });
      },
    };
  }

  async importBinaryAddon(
    addonName: string,
    addonDir: string,
    target?: AddonTarget
  ) {
    const addonTarget = target ?? guessAddonTarget(basename(addonDir));
    if (!addonTarget) {
      throw new Error(`can not guess addon target from ${addonDir}`);
    }
    const lock = await this.getLock();

    let addon: BinaryAddon = (await this.getAddon("binary", addonName)) ?? {
      type: "binary",
      name: addonName,
      targets: [addonTarget],
    };
    const targetNotExist = addon.targets.every(
      (o) => o.arch !== addonTarget.arch || o.platform !== addonTarget.platform
    );
    if (!targetNotExist) {
      addon.targets.push(addonTarget);
    }

    const addonPath = await this.getAddonPath("binary", addonName, addonTarget);
    await packAndCopy(addonDir, addonPath);
    const hamConfig = await this.getConfig();

    const addons = hamConfig.addons ?? [];
    const addonIndex = addons.findIndex(
      (i) => i.name === addonName && i.type === "binary"
    );
    if (addonIndex !== -1) {
      addons[addonIndex] = addon;
    } else {
      addons.push(addon);
    }
    await this.writeConfig(hamConfig);
    await lock.unlock();
  }

  private async getAddon<T extends AddonType>(
    type: T,
    addonName: string
  ): Promise<AddonWithType<T> | null> {
    const config = await this.getConfig();
    const addons = config.addons ?? [];

    const addon = addons.find((o) => o.name === addonName && o.type === type);

    if (addon) {
      return addon as AddonWithType<T>;
    }
    return null;
  }

  private async getAddonPath(
    type: AddonType,
    addonName: string,
    target: AddonTarget
  ) {
    const dir = await this.getAddonDir(type, addonName);
    return join(dir, `${target.platform}-${target.arch}.tgz`);
  }

  private async getAddonDir<T extends AddonType>(
    type: T,
    addonName: string
  ): Promise<string> {
    const config = await this.getConfig();
    const addon = (await this.getAddon<T>(type, addonName)) as AddonWithType<T>;

    const baseDir = resolve(dirname(this.configPath), config.base, addonName);

    switch (type) {
      case "binary": {
        return resolve(baseDir, type);
      }
      case "node":
      case "electron": {
        if (!addon) {
          throw new Error(`${type} addon ${addonName} not exist`);
        }
        let version: string = "";
        let hash: string = "";
        switch (type) {
          case "electron": {
            version = (addon as ElectronAddon).electronVersion;
            hash = this.calculateHash((addon as ElectronAddon).dependencies);
            break;
          }
          case "node": {
            version = String((addon as NodeAddon).nodeVersion);
            hash = this.calculateHash((addon as NodeAddon).dependencies);
            break;
          }
        }
        return join(baseDir, `${type}-${version}-${hash}`);
      }
      default: {
        throw new Error(`unknown addon type ${type}`);
      }
    }
  }

  private calculateHash(deps: Record<string, string>) {
    const depsString = Object.keys(deps)
      .sort()
      .map((key) => `${key}@${deps[key]}`)
      .join(",");

    return crypto
      .createHash("md5")
      .update(depsString)
      .digest("hex")
      .slice(0, 10);
  }
}
