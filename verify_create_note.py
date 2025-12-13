import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_verification():
    print("Starting verification for Note Creation and Renaming...")

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
                    // Start with empty or some files
                    return window._files || [
                        { path: 'Note 1.md', is_dir: false },
                        { path: 'Folder', is_dir: true }
                    ];
                }
                if (cmd === 'write_note_command') {
                    const { relativePath, contents } = args;
                    // Update mock state
                    if (!window._files) window._files = [
                        { path: 'Note 1.md', is_dir: false },
                        { path: 'Folder', is_dir: true }
                    ];
                    window._files.push({ path: relativePath, is_dir: false });
                    return null;
                }
                if (cmd === 'rename_item') {
                   // Mock rename
                   return null;
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

        # 1. Test Create Note
        print("Triggering Create Note...")
        page.keyboard.press("Control+n")

        try:
            page.wait_for_selector("input[type='text']", state="visible", timeout=2000)
            print("Input field appeared.")
        except:
            print("Input field did NOT appear.")
            return False

        print("Typing new note name...")
        page.keyboard.type("New Note")
        page.keyboard.press("Enter")

        # Wait for refresh
        time.sleep(1)

        # Check if "New Note.md" is in the tree
        # The mock update logic above adds it to window._files, but App needs to refresh.
        # refreshFiles calls list_markdown_files.

        # We can check if the file appears in the tree
        try:
            page.wait_for_selector("text=New Note", timeout=2000)
            print("New Note created and visible in tree.")
        except:
            print("New Note NOT found in tree.")
            # This might fail if the mock state isn't persisting or App doesn't refresh automatically.
            # But App calls refreshFiles after writeNote.
            return False

        # 2. Test Rename
        print("Selecting 'Note 1.md' for rename...")
        page.click("text=Note 1.md")
        page.keyboard.press("F2")

        try:
            page.wait_for_selector("input[value='Note 1.md']", state="visible", timeout=2000)
            print("Rename input appeared.")
        except:
             # Maybe value is just 'Note 1' depending on logic?
             try:
                 page.wait_for_selector("input[value='Note 1']", state="visible", timeout=2000)
                 print("Rename input appeared (without extension).")
             except:
                 print("Rename input did NOT appear.")
                 return False

        print("Verification PASSED: Create and Rename flows initiated.")
        browser.close()
        return True

if __name__ == "__main__":
    if not run_verification():
        sys.exit(1)
