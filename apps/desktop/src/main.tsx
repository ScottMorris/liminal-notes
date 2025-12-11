import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme";
import { LinkIndexProvider } from "./components/LinkIndexContext";
import { SearchIndexProvider } from "./components/SearchIndexContext";
import { PluginHostProvider } from "./plugins/PluginHostProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <LinkIndexProvider>
        <SearchIndexProvider>
          <PluginHostProvider>
            <App />
          </PluginHostProvider>
        </SearchIndexProvider>
      </LinkIndexProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
