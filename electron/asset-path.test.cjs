const { test } = require("node:test");
const assert = require("node:assert/strict");
const { assetPath, isAppURL } = require("./asset-path.cjs");
test("app entry and static assets resolve within bundle", () => {
  assert.equal(assetPath("/bundle", "daily://app/"), "/bundle/index.html");
  assert.equal(
    assetPath("/bundle", "daily://app/assets/main.js"),
    "/bundle/assets/main.js",
  );
});
test("foreign origins and credential URLs are rejected", () => {
  for (const url of [
    "https://app/",
    "file:///etc/passwd",
    "daily://other/",
    "daily://app.evil/",
    "daily://user@app/",
    "daily://app:42/",
  ]) {
    assert.equal(isAppURL(url), false);
    assert.equal(assetPath("/bundle", url), null);
  }
});
test("encoded traversal, nulls, backslashes and invalid encodings are rejected", () => {
  for (const name of ["%2e%2e%2fsecret", "%00", "%5csecret", "%E0%A4%A"]) {
    assert.equal(assetPath("/bundle", `daily://app/${name}`), null);
  }
});
