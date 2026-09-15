import { initialState, stateSchema, type State } from "./domain";
export const STORAGE_KEY = "daily.macro.v1";
export function readState(): State {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? stateSchema.parse(JSON.parse(raw)) : initialState();
}
export function saveState(state: State) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stateSchema.parse(state)));
}
export function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
