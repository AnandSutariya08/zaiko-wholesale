export const getDraft = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to read draft for key "${key}"`, error);
    return null;
  }
};

export const setDraft = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save draft for key "${key}"`, error);
  }
};

export const removeDraft = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove draft for key "${key}"`, error);
  }
};
