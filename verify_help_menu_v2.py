import os
from playwright.sync_api import sync_playwright

def verify_help_menu(page):
    # Mock Tauri Internals
    page.add_init_script("""
        window.__TAURI_INTERNALS__ = {
            invoke: async (cmd, args) => {
                console.log('Invoke:', cmd, args);
                if (cmd === 'get_vault_config') {
                    return { name: 'Test Vault', path: '/tmp/test-vault', theme: 'system' };
                }
                if (cmd === 'list_markdown_files') {
                    return [];
                }
                if (cmd === 'read_note_command') {
                     return '# Untitled';
                }
                return null;
            }
        };
    """)

    # Navigate
    page.goto("http://localhost:1420")

    # Wait for app to load (sidebar should be visible)
    page.wait_for_selector(".sidebar", timeout=10000)

    # Click Help button (?)
    # The help button has title="Help"
    page.click('button[title="Help"]')

    # Wait for Modal
    page.wait_for_selector(".modal-content")

    # Wait a bit for render
    page.wait_for_timeout(500)

    # Scope to modal
    modal = page.locator(".modal-content")

    # Verify Context Headers
    if not modal.get_by_text("Global Commands").is_visible():
        raise Exception("Global Commands context header not found")

    if not modal.get_by_text("Editor Commands").is_visible():
        raise Exception("Editor Commands context header not found")

    # Verify Global Shortcuts
    # "Search / Quick Open" in "Navigation" group
    if not modal.get_by_text("Search / Quick Open").is_visible():
        raise Exception("Search command not visible")

    # "New Note" in "File" group
    if not modal.get_by_text("New Note").is_visible():
        raise Exception("New Note command not visible")

    # "Rename File" in "File" group
    if not modal.get_by_text("Rename File").is_visible():
        raise Exception("Rename command not visible")

    # "Save" (should be in Global context, File group)
    if not modal.get_by_text("Save").is_visible():
        raise Exception("Save command not visible")

    # Take Screenshot
    os.makedirs("/home/jules/verification", exist_ok=True)
    page.screenshot(path="/home/jules/verification/help_menu_v3.png")
    print("Verification screenshot saved to /home/jules/verification/help_menu_v3.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_help_menu(page)
        except Exception as e:
            print(f"Error: {e}")
            os.makedirs("/home/jules/verification", exist_ok=True)
            page.screenshot(path="/home/jules/verification/help_menu_fail_v3.png")
            exit(1)
        finally:
            browser.close()
