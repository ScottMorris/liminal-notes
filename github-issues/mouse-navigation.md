# Mouse Back/Forward Navigation

**Description**
The application currently lacks global navigation history support for mouse back/forward buttons (buttons 3 and 4). Users expect these buttons to navigate through their interaction history (visited notes), similar to a web browser or other IDEs.

**Requirements**
- [ ] Implement a global navigation stack that tracks visited notes.
- [ ] Bind mouse button 3 (Back) to navigate backward in the stack.
- [ ] Bind mouse button 4 (Forward) to navigate forward in the stack.
- [ ] Restore cursor position and scroll state when navigating back/forward.
- [ ] Navigation should work across tabs (global history), not just per-tab.
