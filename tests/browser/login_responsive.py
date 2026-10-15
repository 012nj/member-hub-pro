"""Regression check for the /login freeze (cPanel static build).

Run: npm run build:cpanel && npx vite preview --config vite.cpanel.config.ts --port 4174
then: python3 tests/browser/login_responsive.py [base_url]
Never submits credentials.
"""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4174"

async def responsive(page):
    await asyncio.wait_for(page.evaluate("1"), 3)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        await page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_selector('input[type=tel]', timeout=10000)
        assert not await page.evaluate("document.querySelector('.app-experience').hasAttribute('inert')"), "login is locked by an overlay"
        await page.locator('input[type=tel]').click(timeout=4000)
        await page.keyboard.type("0700000001")
        await responsive(page)
        await page.locator('input[type=password]').click(timeout=4000)
        await page.keyboard.type("not-a-real-password")
        await responsive(page)
        assert await page.locator('input[type=tel]').input_value() == "0700000001"
        print("PASS: /login stays responsive while typing")
        await browser.close()

asyncio.run(main())
