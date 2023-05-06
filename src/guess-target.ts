import { AddonPlatform, AddonArch, AddonTarget } from "./config";

const platformRegex: Record<AddonPlatform, RegExp[]> = {
  darwin: [/darwin/, /^osx$/],
  linux: [/linux/],
  win32: [/win32/, /^win$/, /windows/],
};

const archRegex: Record<AddonArch, RegExp[]> = {
  x64: [/x64/],
  arm64: [/arm64/],
  x86: [/x86/],
};

/**
 *
 *  Guess the addon target by the name of the addon.
 *
 * @param addonName addon filename
 */
export function guessAddonTarget(addonName: string): AddonTarget | null {
  const words = addonName.split(/-|_/).map((o) => o.toLocaleLowerCase());
  const result: Partial<AddonTarget> = {};

  for (const platform of Object.keys(platformRegex) as AddonPlatform[]) {
    if (words.some((o) => platformRegex[platform].some((r) => r.test(o)))) {
      result.platform = platform;
    }
  }

  for (const arch of Object.keys(archRegex) as AddonArch[]) {
    if (words.some((o) => archRegex[arch].some((r) => r.test(o)))) {
      result.arch = arch;
    }
  }
  if (!result.arch || !result.platform) {
    return null;
  }

  return result as AddonTarget;
}
