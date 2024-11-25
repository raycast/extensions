import { isLoggedOut } from "../auth";
import { LocalStorage } from "@raycast/api";

jest.mock("@raycast/api");

describe("Auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when logged out flag is set", async () => {
    (LocalStorage.getItem as jest.Mock).mockResolvedValue("true");
    const result = await isLoggedOut();
    expect(result).toBe(true);
  });

  it("should return false when logged out flag is not set", async () => {
    (LocalStorage.getItem as jest.Mock).mockResolvedValue(null);
    const result = await isLoggedOut();
    expect(result).toBe(false);
  });
});
