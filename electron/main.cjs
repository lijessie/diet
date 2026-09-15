const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  protocol,
  session,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { assetPath, isAppURL } = require("./asset-path.cjs");

app.setName("Daily");
app.setPath("userData", path.join(app.getPath("appData"), "Daily"));
protocol.registerSchemesAsPrivileged([
  {
    scheme: "daily",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
].join("; ");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
let window;

function createWindow() {
  window = new BrowserWindow({
    title: "Daily",
    width: 880,
    height: 900,
    minWidth: 390,
    minHeight: 620,
    backgroundColor: "#f6f7f2",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.once("ready-to-show", () => window.show());
  window.on("closed", () => {
    window = null;
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!isAppURL(url)) event.preventDefault();
  });
  window.webContents.on("will-attach-webview", (event) =>
    event.preventDefault(),
  );
  window.webContents.on("did-fail-load", (_event, code, description) => {
    if (code !== -3) dialog.showErrorBox("Daily could not open", description);
  });
  void window.loadURL("daily://app/");
}

function createMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [{ role: process.platform === "darwin" ? "close" : "quit" }],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        {
          label: "Using Daily",
          click: () =>
            dialog.showMessageBox({
              type: "info",
              title: "Using Daily",
              message: "Your nutrition, saved on this Mac.",
              detail:
                "Use Today to log meals, Foods to edit your library, Recipes to build dishes, and Goals to set targets.\n\nTo move data from the web app, export a JSON backup there, then open Goals → My data → Import JSON backup here. Excel files must first be converted using the workbook migration script.\n\nExport regular backups before changing devices. This app has no cloud sync. Sharing Daily.app does not share your food or health records.",
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });
  app
    .whenReady()
    .then(() => {
      const root = path.join(app.getAppPath(), "dist-desktop");
      protocol.handle("daily", async (request) => {
        if (request.method !== "GET")
          return new Response("Method not allowed", { status: 405 });
        const file = assetPath(root, request.url);
        if (!file) return new Response("Not found", { status: 404 });
        try {
          return new Response(await fs.readFile(file), {
            headers: {
              "Content-Type":
                mime[path.extname(file)] || "application/octet-stream",
              "Content-Security-Policy": contentSecurityPolicy,
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      });
      session.defaultSession.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      app.setAboutPanelOptions({
        applicationName: "Daily",
        applicationVersion: app.getVersion(),
        copyright: "Personal macro tracking · Local data, no cloud account",
      });
      createMenu();
      createWindow();
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
    })
    .catch((error) => {
      dialog.showErrorBox("Daily could not start", error.message);
      app.quit();
    });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
