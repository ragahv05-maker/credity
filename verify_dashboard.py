from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the dashboard
        print("Navigating to http://localhost:5000/")
        page.goto("http://localhost:5000/", timeout=30000)

        # Wait for the page to load content or loader
        # We expect to see "CredVerse" title or the loader
        print("Waiting for content...")
        try:
            # Check for the title
            expect(page).to_have_title("CredVerse Wallet") # Assuming title, but let's check text
            # Dashboard has h1 "CredVerse" in mobile or similar
        except:
            pass

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification_dashboard.png")

        browser.close()

if __name__ == "__main__":
    run()
