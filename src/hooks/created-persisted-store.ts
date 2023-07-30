import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";

export function getPersistedValue(storage: Storage, key: string) {
  const persistedValue = storage.getItem(key);
  try {
    const value = persistedValue ? JSON.parse(persistedValue) : undefined;
    return value;
  } catch {
    return;
  }
}

export const createPersistentStore = <T extends object>(
  object: T,
  options: { key: string; type: "session" | "local"; name?: string }
) => {
  const storage = options.type === "session" ? sessionStorage : localStorage;
  const initialValue = getPersistedValue(storage, options.key) || object;

  const store = createStore<T>(initialValue, { name: options.name });

  createEffect(() => {
    try {
      const stringifiedValue = JSON.stringify(store[0]);
      sessionStorage.setItem(options.key, stringifiedValue);
    } catch (error) {
      console.error("error while trying to persist value", error);
    }
  });

  return store;
};
