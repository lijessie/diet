import { initialState, stateSchema, type State } from "./domain";
import { Capacitor, registerPlugin } from "@capacitor/core";
const Backup = registerPlugin<{
  save(options: {
    name: string;
    data: string;
  }): Promise<{ cancelled: boolean }>;
}>("DailyBackup");
export const STORAGE_KEY = "daily.macro.v1";
export function readState(): State {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? stateSchema.parse(JSON.parse(raw)) : initialState();
}
export function saveState(state: State) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stateSchema.parse(state)));
}
export async function download(name: string, data: unknown): Promise<boolean> {
  if (Capacitor.getPlatform() === "android") {
    const result = await Backup.save({
      name,
      data: JSON.stringify(data, null, 2),
    });
    return !result.cancelled;
  }
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
