export type AddonPlatform = "linux" | "win32" | "darwin";

export type AddonArch = "x64" | "arm64" | "x86";

export type AddonTarget = {
  arch: AddonArch;
  platform: AddonPlatform;
};

export type ElectronAddon = {
  type: "electron";
  name: string;
  electronVersion: string;
  dependencies: Record<string, string>;
  patch?: string;
};

export type NodeAddon = {
  type: "node";
  name: string;
  dependencies: Record<string, string>;
  // major version
  nodeVersion: number;
  patch?: string;
};

export type BinaryAddon = {
  type: "binary";
  name: string;
  targets: AddonTarget[];
};

export type Addon = ElectronAddon | NodeAddon | BinaryAddon;

export type AddonType = Addon["type"];

type FilterByType<A, T extends AddonType> = A extends { type: T } ? A : never;

export type AddonWithType<T extends AddonType> = FilterByType<Addon, T>;

export type HamsterAddonManagerConfig = {
  addons?: Addon[];
  base: string;
  npm?: { registry?: string };
};
