# History Manager Future Use Cases

**Description**
A robust History Manager / Navigation Context is being implemented to support mouse back/forward navigation. This infrastructure can be leveraged for additional features in the future.

**Potential Features**
1.  **Command Palette Navigation**: Add "Go Back" and "Go Forward" commands to the command palette (`Ctrl+Shift+P`) for keyboard-centric navigation.
2.  **UI Buttons**: Add visual Back (`<`) and Forward (`>`) arrows to the top title bar or sidebar header, providing a visible affordance for navigation.
3.  **Breadcrumbs**: specific "path" of where the user has been (e.g., `Note A > Note B > Note C`) displayed in the UI to visualize context.
4.  **Session Restoration**: Persist the full navigation history stack to disk so that the "Back" button continues to work even after restarting the application.
5.  **Tab-specific History**: Refactor the global history into per-tab history stacks if the UX paradigm shifts towards a traditional browser model.
