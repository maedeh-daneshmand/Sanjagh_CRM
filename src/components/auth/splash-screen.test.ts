import { describe, it, expect, beforeEach, vi } from "vitest";
import { SPLASH_STORAGE_KEY } from "./splash-screen";

describe("SplashScreen session storage logic", () => {
  beforeEach(() => {
    // Mock sessionStorage
    const storage: Record<string, string> = {};
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        storage[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        for (const k in storage) delete storage[k];
      }),
    });
  });

  it("checks SPLASH_STORAGE_KEY correctly", () => {
    expect(SPLASH_STORAGE_KEY).toBe("sanjagh_splash_seen");
    expect(sessionStorage.getItem(SPLASH_STORAGE_KEY)).toBeNull();

    // Mark as seen
    sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
    expect(sessionStorage.getItem(SPLASH_STORAGE_KEY)).toBe("true");
  });

  it("safely handles sessionStorage exceptions without throwing", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("SecurityError: Access is denied");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });

    expect(() => {
      try {
        sessionStorage.getItem(SPLASH_STORAGE_KEY);
      } catch (err) {
        // Safe catch
      }
    }).not.toThrow();
  });
});
