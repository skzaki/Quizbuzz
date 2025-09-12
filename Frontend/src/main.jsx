// main.jsx
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const sendLogToServer = (level, args) => {
  try {
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        message: args.map(a =>
          typeof a === "object" ? JSON.stringify(a) : String(a)
        ).join(" "),
      }),
    });
  } catch (e) {
    // Avoid breaking app if logging fails
  }
};

// Override console methods
["log", "warn", "error"].forEach((level) => {
  const original = console[level];
  console[level] = (...args) => {
    original(...args); // keep normal browser log
    sendLogToServer(level, args);
  };
});

createRoot(document.getElementById('root')).render(
    <App />
)
