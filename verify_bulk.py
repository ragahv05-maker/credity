import time
import os
from playwright.sync_api import sync_playwright

def verify_bulk_upload():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Grant clipboard permissions
        context = browser.new_context(permissions=["clipboard-read", "clipboard-write"])
        page = context.new_page()

        try:
            # Navigate to Bulk Verification page
            # Note: The app runs on port 5000 in dev mode as per package.json
            print("Navigating to Bulk Verification page...")
            page.goto("http://localhost:5000/bulk")

            # Wait for the page to load
            page.wait_for_selector("h1:has-text('Bulk Verification')", timeout=10000)
            print("Page loaded.")

            # Create a dummy CSV file
            csv_content = "Name,Issuer,Degree,Type\nJohn Doe,Demo University,B.S. Computer Science,AcademicCredential"
            csv_path = "/tmp/test_credentials.csv"
            with open(csv_path, "w") as f:
                f.write(csv_content)

            # Upload the CSV
            print("Uploading CSV...")
            # The input is hidden, so we need to set it directly or use set_input_files on the locator
            # The input has accept=".csv"
            page.set_input_files("input[type='file']", csv_path)

            # Wait for results to appear
            # We look for the table or a row with "John Doe"
            print("Waiting for results...")
            page.wait_for_selector("text=John Doe", timeout=10000)

            # Verify the badges are rendered (which uses our hoisted functions)
            # We expect a decision badge (PASS/REVIEW/FAIL) and a status badge (Verified/Failed/Suspicious/Pending)
            # Since the backend is likely mocking or processing, let's see what we get.
            # In the dev environment without a real backend connection for verifications, it might error or show pending/failed.
            # However, the key is that the component RENDERS without crashing.

            # Take a screenshot
            os.makedirs("/home/jules/verification", exist_ok=True)
            screenshot_path = "/home/jules/verification/bulk_verify_result.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Verification failed: {e}")
            # Take a screenshot on failure too
            os.makedirs("/home/jules/verification", exist_ok=True)
            page.screenshot(path="/home/jules/verification/bulk_verify_failure.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_bulk_upload()
