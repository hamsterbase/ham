export type AddonPlatform =
  | "linux"
  | "win32"
  | "darwin"
  | "interplatform"
  | "ios"
  | "android"
  | "iphonesimulator";

export type AddonArch = "x64" | "arm64" | "x86" | "interarchitecture";

export type AddonTarget = {
  arch: AddonArch;
  platform: AddonPlatform;
};

export type FilterConfig = {
  exclude?: string[];
  include?: string[];
};

export type ElectronAddon = {
  type: "electron";
  name: string;
  electronVersion: string;
  dependencies: Record<string, string>;
  patch?: string;
  filter?: FilterConfig;
  extractFilter?: FilterConfig;
};

export type NodeAddon = {
  type: "node";
  name: string;
  dependencies: Record<string, string>;
  // major version
  nodeVersion: number;
  patch?: string;
  filter?: FilterConfig;
  extractFilter?: FilterConfig;
};

export type BinaryAddon = {
  type: "binary";
  name: string;
  targets: AddonTarget[];
  extractFilter?: FilterConfig;
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
