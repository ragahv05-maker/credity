import { test, expect } from "@playwright/test";

test.describe("Credential Issuance Flow", () => {
  test("should allow issuer to login and issue credential", async ({
    page,
  }) => {
    // 1. Go to Login
    await page.goto("http://localhost:5001/auth");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin");
    await page.click('button[type="submit"]');

    // 2. Dashboard loaded
    await expect(page).toHaveURL("http://localhost:5001/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");

    // 3. Go to Issuance
    await page.click("text=Issue Credential");
    await expect(page).toHaveURL("http://localhost:5001/issuance");

    // 4. Fill form
    await page.fill('input[name="name"]', "John Doe");
    await page.fill('input[name="email"]', "john@example.com");
    await page.selectOption('select[name="templateId"]', { index: 0 });

    // 5. Submit
    await page.click('button:has-text("Issue Credential")');

    // 6. Verify Result
    await expect(page.locator(".toast")).toContainText("Credential Issued");
    await expect(page.locator("code")).toBeVisible(); // Offer URL
  });
});
