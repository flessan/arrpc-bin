import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isAllowedBridgeOrigin } from "../src/bridge-origin.js";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
for (const browser of ["chromium", "firefox"]) {
  test(browser + " extension manifest matches package and bridge", async () => {
    const manifest = JSON.parse(await readFile(new URL("../extension/manifest." + browser + ".json", import.meta.url), "utf8"));
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.version, packageJson.version);
    assert.ok(manifest.content_scripts.some(script => script.world === "MAIN" && script.js.includes("discord-main.js")));
    assert.ok(manifest.content_scripts.some(script => script.world === "ISOLATED" && script.js.includes("content-script.js")));
    assert.ok(manifest.host_permissions.includes("http://127.0.0.1/*"));
    assert.ok(manifest.content_scripts[0].matches.includes("https://discord.com/*"));
  });
}

test("Firefox manifest declares a stable add-on ID and background script", async () => {
  const manifest = JSON.parse(await readFile(new URL("../extension/manifest.firefox.json", import.meta.url), "utf8"));
  assert.equal(manifest.browser_specific_settings.gecko.id, "arrpc-browser@flessan.github.io");
  assert.deepEqual(manifest.background.scripts, ["background.js"]);
});

test("local bridge filters browser origins", () => {
  assert.equal(isAllowedBridgeOrigin(""), true);
  assert.equal(isAllowedBridgeOrigin("chrome-extension://" + "a".repeat(32)), true);
  assert.equal(isAllowedBridgeOrigin("moz-extension://12345678-1234-1234-1234-123456789abc"), true);
  assert.equal(isAllowedBridgeOrigin("https://discord.com"), false);
  assert.equal(isAllowedBridgeOrigin("https://example.com"), false);
  assert.equal(isAllowedBridgeOrigin("chrome-extension://not-an-id"), false);
});
