from playwright.sync_api import sync_playwright

def verify_tab_reorder(page):
    # Capture console logs
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

    print("Navigating to app...")
    try:
        page.goto("http://localhost:1420", timeout=10000)
    except Exception as e:
        print(f"Navigation failed: {e}")
        return

    print("Waiting for app layout...")
    # Wait for app to load
    page.wait_for_selector(".app-layout", timeout=5000)

    # ---------------------------------------------------------
    # Setup: Create 3 Tabs
    # ---------------------------------------------------------
    print("\n--- Setup: Opening 3 Tabs ---")

    # Mock file listing provides "Note 1.md", "Note 2.md", "Note 3.md"

    # Open Note 1
    # We click it in sidebar. Note 1 is in mocked list.
    print("Opening Note 1...")
    page.locator(".node-label", has_text="Note 1.md").click()
    page.wait_for_selector(".tab >> text=Note 1")

    # Open Note 2
    print("Opening Note 2...")
    page.locator(".node-label", has_text="Note 2.md").click()
    page.wait_for_selector(".tab >> text=Note 2")

    # Open Note 3
    print("Opening Note 3...")
    page.locator(".node-label", has_text="Note 3.md").click()
    page.wait_for_selector(".tab >> text=Note 3")

    # Verify order: Note 1, Note 2, Note 3
    tabs = page.locator(".tab")
    titles = tabs.all_inner_texts()
    print(f"Initial tab order: {titles}")

    # Titles might include dirty indicator or close button text (if visible text)
    # Filter to just titles roughly
    clean_titles = [t.split('\n')[0] for t in titles]

    # Note: Double clicking them to make them "kept" so they don't replace each other (if preview mode is on)
    # My implementation of openTab has preview mode.
    # If I single click, it replaces.
    # So I need to keep them.
    # Or just double click in sidebar?
    # Or double click the tab.

    print("Ensuring tabs are kept (double click sidebar items)...")
    # Actually, clicking a new item replaces the current preview tab.
    # So:
    # 1. Click Note 1. Tab 1 (Preview).
    # 2. Click Note 2. Tab 1 becomes Note 2 (Preview).
    # We need to Keep Note 1 first.

    # Reset tabs by closing all?
    # The context starts empty.

    # Let's restart logic:
    # 1. Double click Note 1 in sidebar (if that opens & keeps?)
    #    My sidebar implementation: single click opens. Double click isn't handled in file tree specifically to "keep",
    #    but FileTree just calls openNote.
    #    Double click on TAB keeps it.

    # So:
    # 1. Click Note 1.
    # 2. Double Click Tab 1.
    # 3. Click Note 2.
    # 4. Double Click Tab 2.
    # 5. Click Note 3.

    print("Re-establishing tabs...")
    # Close existing tabs manually if needed, or just rely on reload?
    # Since I'm in same session, I might have tabs.
    # But this script starts fresh browser session.

    # 1. Open Note 1
    page.locator(".node-label", has_text="Note 1.md").click()
    page.locator(".tab", has_text="Note 1").dblclick()

    # 2. Open Note 2
    page.locator(".node-label", has_text="Note 2.md").click()
    page.locator(".tab", has_text="Note 2").dblclick()

    # 3. Open Note 3
    page.locator(".node-label", has_text="Note 3.md").click()
    # Note 3 is fine as preview or kept.

    tabs = page.locator(".tab")
    assert tabs.count() == 3
    titles = [t.split('\n')[0] for t in tabs.all_inner_texts()]
    # Depending on tab styling, innerText might have close button or dirty dot.
    # Let's verify content.
    print(f"Tabs: {titles}")

    # ---------------------------------------------------------
    # Test: Drag Reordering (Live)
    # ---------------------------------------------------------
    print("\n--- Test: Live Reordering ---")

    # Move Tab 1 (Index 0) to after Tab 3 (Index 2)
    # "Note 1" -> "Note 3"

    tab1 = tabs.nth(0)
    tab2 = tabs.nth(1)
    tab3 = tabs.nth(2)

    # Get bounding boxes
    box1 = tab1.bounding_box()
    box3 = tab3.bounding_box()

    print(f"Dragging Tab 1 ({box1}) to Tab 3 ({box3})...")

    # Perform Drag
    # Mouse move to Tab 1 center
    page.mouse.move(box1['x'] + box1['width'] / 2, box1['y'] + box1['height'] / 2)
    page.mouse.down()

    # Move to Tab 3 center
    # For live reordering, as we pass Tab 2, it should swap. Then Tab 3.
    # Let's move slowly?
    steps = 10
    target_x = box3['x'] + box3['width'] / 2
    target_y = box3['y'] + box3['height'] / 2

    page.mouse.move(target_x, target_y, steps=steps)

    # Wait for React to update
    page.wait_for_timeout(500)

    # Release
    page.mouse.up()

    # Verify Order
    # Should be: Note 2, Note 3, Note 1
    new_titles = [t.split('\n')[0] for t in page.locator(".tab").all_inner_texts()]
    print(f"New Tab Order: {new_titles}")

    # Note 1 should be last
    assert "Note 1" in new_titles[-1]
    assert "Note 2" in new_titles[0]

    print("Reorder successful!")

    # Screenshot
    page.screenshot(path="/home/jules/verification/tabs_reorder.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock Tauri IPC
        page.add_init_script("""
            window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {};
            window.__TAURI_INTERNALS__.invoke = async (cmd, args, options) => {
                if (cmd === 'get_vault_config') return { path: '/tmp/vault', name: 'Test Vault' };
                if (cmd === 'list_markdown_files') {
                    return [
                        { path: 'Note 1.md', is_dir: false },
                        { path: 'Note 2.md', is_dir: false },
                        { path: 'Note 3.md', is_dir: false }
                    ];
                }
                if (cmd === 'read_note_command') return '# Content';
                if (cmd === 'plugin:opener|open_url') return null;
                return null;
            };
            window.__TAURI_IPC__ = () => {};
        """)

        try:
            verify_tab_reorder(page)
        except Exception as e:
            print(f"Verification script failed: {e}")
        finally:
            browser.close()
