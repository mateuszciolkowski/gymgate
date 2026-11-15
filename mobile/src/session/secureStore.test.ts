import * as SecureStore from "expo-secure-store";
import { SESSION_KEYS, secureStore } from "./secureStore";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe("secureStore", () => {
  beforeEach(() => jest.clearAllMocks());

  it("delegates get, set and remove to expo-secure-store", async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue("abc");
    await expect(secureStore.get(SESSION_KEYS.accessToken)).resolves.toBe("abc");
    await secureStore.set(SESSION_KEYS.refreshToken, "r1");
    await secureStore.remove(SESSION_KEYS.refreshToken);
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("gymgate.accessToken");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("gymgate.refreshToken", "r1");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("gymgate.refreshToken");
  });

  it("uses only keys that SecureStore accepts", () => {
    for (const key of Object.values(SESSION_KEYS)) expect(key).toMatch(/^[A-Za-z0-9._-]+$/);
  });
});
