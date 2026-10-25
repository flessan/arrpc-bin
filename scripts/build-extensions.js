import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootPath = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(await readFile(join(rootPath, "package.json"), "utf8"));
const sourceDir = join(rootPath, "extension");
const distDir = join(rootPath, "dist");
const commonFiles = ["background.js", "content-script.js", "discord-main.js", "popup.html", "popup.css", "popup.js"];

await rm(distDir, { recursive: true, force: true });
for (const browser of ["chromium", "firefox"]) {
  const manifest = JSON.parse(await readFile(join(sourceDir, "manifest." + browser + ".json"), "utf8"));
  if (manifest.version !== packageJson.version) {
    throw new Error("Extension manifest version does not match package.json for " + browser);
  }
  const outputDir = join(distDir, browser);
  await mkdir(outputDir, { recursive: true });
  for (const file of commonFiles) {
    await copyFile(join(sourceDir, file), join(outputDir, file));
  }
  await writeFile(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("Built " + browser + " extension at dist/" + browser);
}
