import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const root = document.getElementById("root");

function showStartupError(title, error) {
  if (!root) return;
  const details = error?.stack || error?.message || String(error || "Unknown error");
  root.replaceChildren();
  const panel = document.createElement("pre");
  panel.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;margin:20px;padding:20px;border-radius:16px;background:#2b1d20;color:#ffe9e9;font:14px/1.5 monospace;max-width:900px";
  panel.textContent = title + "\n\n" + details;
  root.appendChild(panel);
}

window.addEventListener("error", (event) => {
  showStartupError("AION 2 Build Lab — ошибка JavaScript", event.error || event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  showStartupError("AION 2 Build Lab — необработанная ошибка Promise", event.reason);
});

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("AION 2 app render failed:", error, info);
  }
  render() {
    if (this.state.error) {
      return React.createElement("pre", {
        style: {
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          margin: 20,
          padding: 20,
          borderRadius: 16,
          background: "#2b1d20",
          color: "#ffe9e9",
          font: "14px/1.5 monospace"
        }
      }, "AION 2 Build Lab — ошибка при отображении приложения\n\n" +
          (this.state.error.stack || this.state.error.message || String(this.state.error)));
    }
    return this.props.children;
  }
}

if (!root) {
  showStartupError("AION 2 Build Lab — не найден элемент #root", "Проверь index.html");
} else {
  root.textContent = "Загрузка AION 2 Build Lab…";
  import("./App.jsx")
    .then(({ default: App }) => {
      createRoot(root).render(
        React.createElement(React.StrictMode, null,
          React.createElement(AppErrorBoundary, null,
            React.createElement(App)
          )
        )
      );
    })
    .catch((error) => showStartupError("AION 2 Build Lab — не удалось загрузить приложение", error));
}
