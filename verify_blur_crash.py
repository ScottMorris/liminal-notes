import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_verification():
    print("Starting verification for blur crash...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))

        # Mock Tauri internals
        page.add_init_script("""
            const invokeMock = async (cmd, args) => {
                console.log(`[Mock] invoke: ${cmd}`, JSON.stringify(args));
                if (cmd === 'list_markdown_files') {
                    return [
                        { path: 'Note 1.md', is_dir: false },
                        { path: 'Folder', is_dir: true }
                    ];
                }
                if (cmd === 'read_note_command') {
                    return "# Note Content";
                }
                if (cmd === 'get_vault_config') {
                    return {
                        root_path: '/home/user/vault',
                        name: 'My Vault'
                    };
                }
                return null;
            };

            window.__TAURI_INTERNALS__ = {
                invoke: invokeMock
            };
            window.__TAURI__ = {
                core: {
                    invoke: invokeMock
                },
                event: {
                    listen: () => Promise.resolve(() => {}),
                    emit: () => Promise.resolve()
                }
            };
        """)

        print("Loading app at http://localhost:1420...")
        try:
             page.goto("http://localhost:1420", timeout=10000)
        except Exception as e:
             print(f"Failed to load app: {e}")
             return False

        try:
            page.wait_for_selector(".file-tree", timeout=5000)
            print("App loaded.")
        except:
            print("Timeout waiting for .file-tree")
            return False

        # Trigger Create Note (Ctrl+N)
        print("Triggering Create Note...")
        page.keyboard.press("Control+n")

        # Wait for input
        try:
            page.wait_for_selector("input[type='text']", state="visible", timeout=2000)
            print("Input field appeared.")
        except:
            print("Input field did NOT appear.")
            return False

        # Click outside (Blur)
        print("Clicking outside (body) to trigger blur...")
        # Click at 10, 10 which should be the header or nearby, but safely on the page
        page.mouse.click(10, 10)

        time.sleep(1)

        # Check if input is gone
        inputs = page.query_selector_all("input[type='text']")
        if len(inputs) == 0:
            print("Input field is gone (Expected behavior).")
        else:
            print(f"Input field is still there (Unexpected count: {len(inputs)}).")

        # Check if file tree is still visible
        if page.query_selector(".file-tree"):
            print("File tree still visible.")
        else:
            print("File tree missing - Potential crash.")
            return False

        print("Verification PASSED: No crash detected on blur.")
        browser.close()
        return True

if __name__ == "__main__":
    if not run_verification():
        sys.exit(1)
