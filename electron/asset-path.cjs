const path = require("node:path");

// A stable origin keeps browser storage independent of where Daily.app is installed.
function isAppURL(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "daily:" &&
      url.host === "app" &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function assetPath(root, value) {
  if (!isAppURL(value)) return null;
  try {
    const url = new URL(value);
    const name = decodeURIComponent(url.pathname);
    if (name.includes("\0") || name.includes("\\")) return null;
    const file = path.resolve(
      root,
      "." + (name === "/" ? "/index.html" : name),
    );
    const relative = path.relative(root, file);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
      return null;
    return file;
  } catch {
    return null;
  }
}
module.exports = { assetPath, isAppURL };
