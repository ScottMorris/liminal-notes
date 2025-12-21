import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from 'buffer';
import App from "./App";

// Polyfill Buffer for gray-matter in browser environment
if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
}
import { SettingsProvider } from "./contexts/SettingsContext";
import { ThemeProvider } from "./theme";
import { LinkIndexProvider } from "./components/LinkIndexContext";
import { SearchIndexProvider } from "./components/SearchIndexContext";
import { TagsProvider } from "./contexts/TagsContext";
import { PluginHostProvider } from "./plugins/PluginHostProvider";
import { NotificationProvider } from "./components/NotificationContext";
import { registerAllCommands } from "./commands/registerDefaults";

// Initialize commands before rendering
registerAllCommands();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <ThemeProvider>
        <NotificationProvider>
          <LinkIndexProvider>
            <SearchIndexProvider>
              <TagsProvider>
                <PluginHostProvider>
                  <App />
                </PluginHostProvider>
              </TagsProvider>
            </SearchIndexProvider>
          </LinkIndexProvider>
        </NotificationProvider>
      </ThemeProvider>
    </SettingsProvider>
  </React.StrictMode>,
);
