import { getAppConfig } from "@/lib/env";
describe("getAppConfig", () => {
  it("returns default config", () => { expect(getAppConfig().isTestnet).toBe(true); });
});
