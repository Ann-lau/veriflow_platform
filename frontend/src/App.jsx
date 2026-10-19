import { useState, useEffect } from "react";
import "./index.css";
import Home from "./screens/Home.jsx";
import Log from "./screens/Log.jsx";
import Evidence from "./screens/Evidence.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import OnlineBanner from "./OnlineBanner.jsx";
import {syncOutbox} from "./api.js";

const NAV = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "log", label: "Log Breakdown", icon: "⚠️" },
  { id: "evidence", label: "Evidence", icon: "📷" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "reports", label: "Reports", icon: "📄" },
];

export default function App() {
  const [screen, setScreen] = useState("home");
useEffect(() => {
  async function trySync() {
    if (!navigator.onLine) return; // never burn data or spam errors while offline
    try {
      await syncOutbox();
    } catch {
      // Server unreachable even though the browser says online:
      // stay quiet, the interval will retry.
    }
  }

  trySync(); // flush anything queued from a previous session
  window.addEventListener("online", trySync); // instant flush when connection returns
  const timer = setInterval(trySync, 30000); // safety net: retry every 30s
  return () => {
    window.removeEventListener("online", trySync);
    clearInterval(timer);
  };
}, []);

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">VeriFlow</div>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={screen === item.id ? "active" : ""}
            onClick={() => setScreen(item.id)}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      <main className="main">
        <OnlineBanner />
        {screen === "home" && <Home onNavigate={setScreen} />}
        {screen === "log" && <Log onNavigate={setScreen} />}
        {screen === "evidence" && <Evidence />}
        {screen === "dashboard" && <Dashboard />}
        {screen === "reports" && <p>Funder reports go here.</p>}
      </main>

      <nav className="tabbar">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={screen === item.id ? "active" : ""}
            onClick={() => setScreen(item.id)}
          >
            {item.icon}
            <br />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
