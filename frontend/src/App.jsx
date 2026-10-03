import { useState } from "react";
import "./index.css";
import Home from "./screens/Home.jsx";

const NAV = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "log", label: "Log Breakdown", icon: "⚠️" },
  { id: "evidence", label: "Evidence", icon: "📷" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "reports", label: "Reports", icon: "📄" },
];

export default function App() {
  const [screen, setScreen] = useState("home");

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
        <h1>{NAV.find((n) => n.id === screen).label}</h1>
        {screen === "home" && <Home onNavigate={setScreen} />}
        {screen === "log" && <p>Log breakdown form goes here.</p>}
        {screen === "evidence" && <p>Evidence capture goes here.</p>}
        {screen === "dashboard" && <p>District dashboard goes here.</p>}
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
