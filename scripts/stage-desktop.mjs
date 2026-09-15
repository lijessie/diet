import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const stage = path.join(root, "work/desktop-app");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
await rm(stage, { recursive: true, force: true });
await mkdir(path.join(stage, "electron"), { recursive: true });
await cp(path.join(root, "dist-desktop"), path.join(stage, "dist-desktop"), {
  recursive: true,
});
for (const name of ["main.cjs", "asset-path.cjs"])
  await cp(
    path.join(root, "electron", name),
    path.join(stage, "electron", name),
  );
await writeFile(
  path.join(stage, "package.json"),
  JSON.stringify(
    {
      name: "daily-macro",
      productName: "Daily",
      version: pkg.version,
      description: "Offline personal macro and recipe tracker",
      main: "electron/main.cjs",
      author: "Daily",
      license: "UNLICENSED",
    },
    null,
    2,
  ),
);
console.log(
  "Staged only the desktop runtime and compiled assets. No personal data or workbook files.",
);
