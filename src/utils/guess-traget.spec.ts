import { guessAddonTarget } from "./guess-target.js";
import { expect, it } from "vitest";

import Table from "cli-table";

it("test guessAddonTarget", () => {
  const result: Array<string[]> = [
    "Logseq-darwin-arm64-0.9.4.dmg",
    "Logseq-win-x64-0.9.4.exe",
    "libsimple-osx-x64.zip",
    "libsimple-windows-x86.zip",
  ].map((o) => {
    const target = guessAddonTarget(o);
    return [o, target?.arch ?? "", target?.platform ?? ""];
  });

  const table = new Table({
    head: ["Name", "Arch", "Platform"],
    colWidths: [60, 20, 20],
  });

  table.push(...result);

  expect(`\n${table.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌────────────────────────────────────────────────────────────┬────────────────────┬────────────────────┐
    │ Name                                                       │ Arch               │ Platform           │
    ├────────────────────────────────────────────────────────────┼────────────────────┼────────────────────┤
    │ Logseq-darwin-arm64-0.9.4.dmg                              │ arm64              │ darwin             │
    ├────────────────────────────────────────────────────────────┼────────────────────┼────────────────────┤
    │ Logseq-win-x64-0.9.4.exe                                   │ x64                │ win32              │
    ├────────────────────────────────────────────────────────────┼────────────────────┼────────────────────┤
    │ libsimple-osx-x64.zip                                      │ x64                │ darwin             │
    ├────────────────────────────────────────────────────────────┼────────────────────┼────────────────────┤
    │ libsimple-windows-x86.zip                                  │ x86                │ win32              │
    └────────────────────────────────────────────────────────────┴────────────────────┴────────────────────┘
    "
  `);
});
