import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";

/* global document, Office, module, require, localStorage, window */

const title = "Contoso Task Pane Add-in";

const rootElement = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

const AppWrapper = () => {
  React.useEffect(() => {
    const localStorageKeys = ["documentSummary", "selectedText", "selectedTextForProcessing"];
    localStorageKeys.forEach((item) => {
      localStorage.removeItem(item);
    });
  }, []);
  return (
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  );
};

/* Render application after Office initializes */
Office.onReady(() => {
  root?.render(<AppWrapper />);
});

if (module.hot) {
  module.hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(<AppWrapper />);
  });
}
