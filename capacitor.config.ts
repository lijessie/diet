import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.daily.macrotracker",
  appName: "Daily",
  webDir: "dist-android",
  android: {
    backgroundColor: "#f6f7f2",
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
