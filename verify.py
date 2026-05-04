import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    os.makedirs("/home/jules/verification/videos", exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            record_video_dir="/home/jules/verification/videos/",
            record_video_size={"width": 1280, "height": 720}
        )

        page = await context.new_page()

        await page.route("**/api/wallet/init", lambda route: route.fulfill(
            status=200,
            json={"success": True, "wallet": {"did": "did:ethr:goerli:0x1234567890abcdef1234567890abcdef12345678"}, "stats": {"totalCredentials": 5, "totalVerifications": 10}}
        ))

        await page.route("**/api/wallet/credentials*", lambda route: route.fulfill(
            status=200,
            json={"credentials": []}
        ))

        await page.goto("http://localhost:5001/profile")
        await page.wait_for_selector('button[aria-label="Copy DID"]')

        copy_button = page.locator('button[aria-label="Copy DID"]')
        await copy_button.hover()
        await page.wait_for_timeout(1000) # Wait for tooltip animation

        await page.screenshot(path="/home/jules/verification/screenshots/tooltip.png")

        await context.close()
        await browser.close()

asyncio.run(main())
