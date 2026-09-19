// =========================================================================
// SAFE STORAGE HELPER (iOS Safari / WebKit Private Browsing Safe)
// Previne 100% dos erros de 'SecurityError' e tela branca em navegadores Mobile
// =========================================================================

const inMemoryStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[safeStorage] LocalStorage read blocked on Mobile WebKit: ${key}`);
    }
    return inMemoryStorage[`local_${key}`] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`[safeStorage] LocalStorage write blocked on Mobile WebKit: ${key}`);
    }
    inMemoryStorage[`local_${key}`] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`[safeStorage] LocalStorage remove blocked on Mobile WebKit: ${key}`);
    }
    delete inMemoryStorage[`local_${key}`];
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
        return window.sessionStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[safeStorage] SessionStorage read blocked on Mobile WebKit: ${key}`);
    }
    return inMemoryStorage[`session_${key}`] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`[safeStorage] SessionStorage write blocked on Mobile WebKit: ${key}`);
    }
    inMemoryStorage[`session_${key}`] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
        window.sessionStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`[safeStorage] SessionStorage remove blocked on Mobile WebKit: ${key}`);
    }
    delete inMemoryStorage[`session_${key}`];
  }
};
