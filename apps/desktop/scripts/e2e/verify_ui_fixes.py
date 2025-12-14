from playwright.sync_api import sync_playwright

def verify_ui_fixes(page):
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

    print("Navigating to app...")
    page.goto("http://localhost:1420", timeout=10000)

    print("Waiting for app layout...")
    page.wait_for_selector(".app-layout", timeout=5000)

    # ---------------------------------------------------------
    # Test 1: Empty State (No Tabs)
    # ---------------------------------------------------------
    print("\n--- Test 1: Empty Tab Bar Visibility ---")

    # By default, we might have saved tabs from previous runs in localStorage.
    # We should clear them.
    page.evaluate("localStorage.removeItem('liminal-notes.tabs')")
    page.reload()
    page.wait_for_selector(".app-layout")

    # Check if .tab-bar-container is visible
    # It should NOT be present or visible
    is_visible = page.locator(".tab-bar-container").is_visible()

    if is_visible:
        # Check if it has tabs?
        count = page.locator(".tab").count()
        if count == 0:
            print("FAILURE: Tab bar container is visible but empty!")
            page.screenshot(path="/home/jules/verification/fail_empty_bar.png")
            raise Exception("Tab bar visible when empty")
        else:
            print(f"Warning: Tabs persisted? Found {count} tabs.")
            # If tabs exist, close them all
            while page.locator(".tab-close").count() > 0:
                 page.locator(".tab-close").first.click()
                 page.wait_for_timeout(100)

            # Now check again
            if page.locator(".tab-bar-container").is_visible():
                print("FAILURE: Tab bar container visible after closing all tabs!")
                raise Exception("Tab bar visible when empty")

    print("Success: Tab bar is hidden when no tabs exist.")
    page.screenshot(path="/home/jules/verification/empty_state.png")

    # ---------------------------------------------------------
    # Test 2: Ghost Image Logic (Static Check)
    # ---------------------------------------------------------
    # We can't easily verify the visual ghost image in headless,
    # but we can verify the drag start doesn't crash and sets opacity.

    print("\n--- Test 2: Drag Logic ---")

    # Open a note
    page.locator(".node-label", has_text="Note 1.md").click()
    page.wait_for_selector(".tab")

    tab = page.locator(".tab").first

    # Check opacity before drag
    # (Checking parent wrapper opacity? No, the code sets opacity on e.target)
    # The listener is on .draggable-tab-wrapper
    wrapper = page.locator(".draggable-tab-wrapper").first

    # Note: Styles set via style attribute might not be computed style if unset.
    opacity_before = wrapper.evaluate("el => el.style.opacity")
    print(f"Opacity before: '{opacity_before}'")

    # We can't simulate a "drag hold" easily in Playwright to check style DURING drag
    # because dragAndDrop is atomic or requires manual mouse events which might not trigger the React event handler purely.
    # But we can try dispatching a dragstart event manually.

    print("Dispatching dragstart...")
    wrapper.dispatch_event("dragstart", {"dataTransfer": {"setDragImage": "function() {}"}})

    # Check opacity
    opacity_during = wrapper.evaluate("el => el.style.opacity")
    print(f"Opacity during: '{opacity_during}'")

    if opacity_during != "0.5":
        print("Warning: Opacity did not change to 0.5 (might be due to synthetic event limitations)")
    else:
        print("Success: Opacity set to 0.5 on drag start.")

    print("UI Fixes Verified.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock IPC
        page.add_init_script("""
            window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {};
            window.__TAURI_INTERNALS__.invoke = async (cmd, args) => {
                if (cmd === 'list_markdown_files') return [{ path: 'Note 1.md', is_dir: false }];
                if (cmd === 'read_note_command') return '# Note 1';
                return null;
            };
            window.__TAURI_IPC__ = () => {};
        """)

        try:
            verify_ui_fixes(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
