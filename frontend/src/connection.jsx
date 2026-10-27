// Shares the sensed connection tier with the whole app, and draws the strip in the top bar.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { API_BASE } from "./api.js";
import { startSensing, TIERS } from "./connectivity.js";

const SYNC_KEY = "veriflow.lastSync";

function readLastSync() {
  try {
    const v = Number(localStorage.getItem(SYNC_KEY));
    return v || null;
  } catch {
    return null;
  }
}

const Ctx = createContext({
  tier: null,
  rtt: null,
  lastSync: null,
  markSynced() {},
  check() {},
});

export function ConnectionProvider({ children }) {
  // tier is null until the first probe answers, which takes well under a second.
  const [state, setState] = useState({ tier: null, rtt: null });
  const [lastSync, setLastSync] = useState(readLastSync);
  const sensing = useRef(null);

  useEffect(() => {
    sensing.current = startSensing(`${API_BASE}/`, ({ tier, rtt }) =>
      setState({ tier, rtt }),
    );
    return () => sensing.current.stop();
  }, []);

  const markSynced = useCallback(() => {
    const now = Date.now();
    setLastSync(now);
    try {
      localStorage.setItem(SYNC_KEY, String(now));
    } catch {
      /* storage unavailable: the time just is not remembered */
    }
  }, []);

  const check = useCallback(() => sensing.current?.check(), []);

  return (
    <Ctx.Provider value={{ ...state, lastSync, markSynced, check }}>
      {children}
    </Ctx.Provider>
  );
}

export function useConnection() {
  return useContext(Ctx);
}

function ago(ts, now) {
  if (!ts) return "Not synced yet";
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return "Synced just now";
  if (m < 60) return `Synced ${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `Synced ${h} h ago`;
  return `Synced ${Math.round(h / 24)} d ago`;
}

// The strip at the right of the top bar: signal bars, the tier in words, and the last sync.
export function ConnectionStrip() {
  const { tier, rtt, lastSync } = useConnection();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const filled = tier ?? 0;
  const text =
    tier === null
      ? "Checking connection"
      : `${TIERS[tier].label} (tier ${tier})`;
  return (
    <div
      className="net"
      role="status"
      aria-live="polite"
      title={rtt != null ? `Last check: ${rtt} ms` : undefined}
    >
      <span className="bars" aria-hidden="true">
        {[5, 8, 11, 14].map((h, i) => (
          <i key={h} style={{ height: h }} className={i < filled ? "f" : ""} />
        ))}
      </span>
      <span>
        {text} · {ago(lastSync, now)}
      </span>
    </div>
  );
}
