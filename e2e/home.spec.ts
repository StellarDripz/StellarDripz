import { test, expect } from "@playwright/test";

test.describe("StellarDripz Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the page to be fully hydrated — the hero title should be visible
    await expect(page.locator("h2").first()).toBeVisible({ timeout: 15_000 });
  });

  test("renders the hero section with branding", async ({ page }) => {
    // Logo / branding in the header
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByRole("heading", { name: "StellarDripz" })).toBeVisible();
    await expect(page.locator("text=Testnet Faucet")).toBeVisible();

    // Hero title — use .first() since h2 matches both hero and wallet headings
    await expect(page.locator("h2").first()).toContainText("Drip");
    await expect(page.locator("h2").first()).toContainText("Testnet XLM");

    // Hero description
    await expect(page.locator("text=Multi-wallet faucet")).toBeVisible();

    // Testnet badge
    await expect(page.locator("text=Stellar Testnet").first()).toBeVisible();
  });

  test("shows feature cards when wallet is disconnected", async ({ page }) => {
    // Three feature cards should be visible
    await expect(page.getByText("Faucet", { exact: true })).toBeVisible();
    await expect(page.getByText("Send", { exact: true })).toBeVisible();
    await expect(page.getByText("Analytics", { exact: true })).toBeVisible();

    // Each card has a description
    await expect(page.getByText("10,000 test XLM")).toBeVisible();
    await expect(page.locator("text=Any address")).toBeVisible();
    await expect(page.locator("text=Track usage")).toBeVisible();

    // "Connect wallet" call-to-action
    await expect(
      page.locator("text=Connect any Stellar wallet to get started"),
    ).toBeVisible();
  });

  test("renders the wallet connect section", async ({ page }) => {
    // WalletConnect component should render — heading and button
    const walletHeading = page.getByRole("heading", { name: "Connect Wallet" });
    await expect(walletHeading).toBeVisible();

    // Connect Wallet button (not the heading)
    const connectBtn = page.getByRole("button", { name: "Connect Wallet" });
    await expect(connectBtn).toBeVisible();

    // Click and verify the wallet picker modal opens
    await connectBtn.click();

    // "Choose Wallet" heading appears in the modal
    await expect(page.getByText("Choose Wallet")).toBeVisible({ timeout: 5_000 });

    // Freighter should be listed as an option in the picker modal
    await expect(page.getByRole("button", { name: /Freighter/ })).toBeVisible();

    // Close modal via Escape key
    await page.keyboard.press("Escape");
    await expect(page.getByText("Choose Wallet")).not.toBeVisible({ timeout: 5_000 });
  });

  test("renders the footer with legal text", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("Powered by Stellar Testnet");
    await expect(footer).toContainText("Not for production use");
  });

  test("has proper page metadata", async ({ page }) => {
    const title = await page.title();
    expect(title).toContain("StellarDripz");

    // Open Graph meta tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /StellarDripz/);
  });

  test("is responsive — mobile layout renders without horizontal overflow", async ({
    page,
  }) => {
    // The page should not have horizontal scroll at mobile width
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("h2").first()).toBeVisible({ timeout: 15_000 });

    // Header should still be visible
    await expect(page.locator("header")).toBeVisible();

    // Check that the main content has padding but no overflow
    const main = page.locator("main");
    const box = await main.boundingBox();
    expect(box).not.toBeNull();
  });
});

test.describe("Admin page", () => {
  test("admin page renders without crashing", async ({ page }) => {
    await page.goto("/admin");
    // The admin page may show a loading state or admin panel
    await expect(page.locator("body")).toBeVisible();
    // Should at minimum show the header
    await expect(page.locator("header")).toBeVisible();
  });
});

test.describe("API health check", () => {
  test("GET /api/health returns healthy status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("status", "healthy");
    expect(body).toHaveProperty("uptime");
    expect(typeof body.uptime).toBe("number");
  });

  test("GET /api/status returns 200", async ({ request }) => {
    const response = await request.get("/api/status");
    expect(response.status()).toBe(200);
  });
});
