import { useState, useEffect } from "react";
import "./index.css";
import Home from "./screens/Home.jsx";
import Log from "./screens/Log.jsx";
import Evidence from "./screens/Evidence.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import OnlineBanner from "./OnlineBanner.jsx";
import { syncOutbox } from "./api.js";

// What each role sees. "tab" marks the items shown in the phone's bottom bar.
const ROLES = {
  technician: {
    label: "Technician",
    who: "Technician",
    nav: [
      { id: "home", label: "Home", tab: true },
      { id: "log", label: "Log", full: "Log Breakdown", tab: true },
      { id: "evidence", label: "Evidence", tab: true },
      { id: "dashboard", label: "Dashboard", tab: true },
      { id: "reports", label: "Reports", tab: true },
    ],
  },
  district: {
    label: "District administrator",
    who: "District administrator",
    nav: [
      { id: "dashboard", label: "Overview", tab: true },
      { id: "workorders", label: "Work orders", tab: true },
      { id: "registry", label: "Water points", tab: true },
      { id: "review", label: "Evidence review", tab: true },
      { id: "reports", label: "Reports", tab: true },
      { id: "network", label: "Network and sync", full: "Network and sync" },
      { id: "research", label: "Research console", badge: "Admin" },
    ],
  },
  funder: {
    label: "Funder or auditor",
    who: "Funder or auditor",
    nav: [
      { id: "reports", label: "Reports", tab: true },
      { id: "dashboard", label: "Overview", tab: true },
      { id: "registry", label: "Water points", tab: true },
    ],
  },
};

// Screens that are already built. Everything else shows a placeholder until its step.
const BUILT = ["home", "log", "evidence", "dashboard"];

function ComingSoon({ title }) {
  return (
    <>
      <div className="band">{title}</div>
      <div className="band-body">
        <p className="muted">
          This screen is being rebuilt to match the design.
        </p>
      </div>
    </>
  );
}

function readRole() {
  try {
    const r = localStorage.getItem("veriflow.role");
    return ROLES[r] ? r : "technician";
  } catch {
    return "technician";
  }
}

export default function App() {
  const [role, setRole] = useState(readRole);
  const [screen, setScreen] = useState(ROLES[readRole()].nav[0].id);
  const nav = ROLES[role].nav;

  // Auto-sync: flush the queue on start, when the connection returns, and every 30 s.
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

  function chooseRole(r) {
    setRole(r);
    setScreen(ROLES[r].nav[0].id);
    try {
      localStorage.setItem("veriflow.role", r);
    } catch {
      /* storage unavailable: the role just isn't remembered */
    }
  }

  const current = nav.find((n) => n.id === screen) ?? nav[0];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">VeriFlow</div>
        <div className="who">{ROLES[role].who}</div>
        {nav.map((n) => (
          <button
            key={n.id}
            className={screen === n.id ? "active" : ""}
            onClick={() => setScreen(n.id)}
          >
            {n.full ?? n.label}
            {n.badge && <span className="pill">{n.badge}</span>}
          </button>
        ))}
      </aside>

      <main className="main">
        <div className="roles" role="tablist" aria-label="Role">
          {Object.entries(ROLES).map(([id, r]) => (
            <button
              key={id}
              role="tab"
              aria-selected={role === id}
              className={role === id ? "on" : ""}
              onClick={() => chooseRole(id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <OnlineBanner />
        {screen === "home" && <Home onNavigate={setScreen} />}
        {screen === "log" && <Log onNavigate={setScreen} />}
        {screen === "evidence" && <Evidence />}
        {screen === "dashboard" && <Dashboard />}
        {!BUILT.includes(screen) && (
          <ComingSoon title={current.full ?? current.label} />
        )}
      </main>

      <nav className="tabbar" aria-label="Main">
        {nav
          .filter((n) => n.tab)
          .map((n) => (
            <button
              key={n.id}
              className={screen === n.id ? "active" : ""}
              onClick={() => setScreen(n.id)}
            >
              {n.label}
            </button>
          ))}
      </nav>
    </div>
  );
}
