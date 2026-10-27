// Connectivity tiers, sensed from the network instead of trusting navigator.onLine.
// navigator.onLine only says whether the device has a network interface. It cannot tell a
// working connection from a dead hotspot or a 2G link that times out, so we measure.
//
// A browser can see three things, so the app senses three tiers itself:
//   4  good signal : the server answers quickly
//   1  weak signal : the server answers slowly or only some of the time
//   0  offline     : no answer
// Tiers 2 and 3 (SMS and USSD) are fallback channels. A browser cannot see them, so they are
// set by the SMS/USSD gateway when a report arrives that way.

export const TIERS = {
  4: { label: "Good signal", sync: "Everything, photos included" },
  3: { label: "USSD", sync: "Short menu session, text only" },
  2: { label: "SMS", sync: "One short message, text only" },
  1: { label: "Weak signal", sync: "Records only, photos wait" },
  0: { label: "Offline", sync: "Queue on the device" },
};

const GOOD_RTT_MS = 1200; // round trip at or under this counts as good
const TIMEOUT_MS = 4000; // no answer by now counts as no answer
const WINDOW = 3; // judge the last three probes, so one blip does not flip the tier

// One small request to the server. Any HTTP answer, even a 404, proves the server is reachable,
// so we only measure how long it took.
export async function probe(url, timeoutMs = TIMEOUT_MS) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const start = performance.now();
  try {
        await fetch(url, {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
          signal: ctl.signal,
        });
    return { ok: true, rtt: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, rtt: null };
  } finally {
    clearTimeout(timer);
  }
}

// Pure function: recent probe results in, tier out. Kept separate so it is easy to test.
export function classify(samples) {
  const answered = samples.filter((s) => s.ok).map((s) => s.rtt);
  if (answered.length === 0) return 0;
  const sorted = [...answered].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (answered.length < samples.length || median > GOOD_RTT_MS) return 1;
  return 4;
}

// Probes now and every intervalMs. Calls onChange({ tier, rtt, checkedAt }) after each probe.
// Returns { stop, check } : stop ends the sensing, check probes again right away.
export function startSensing(url, onChange, { intervalMs = 15000 } = {}) {
  let samples = [];
  let stopped = false;

  async function check() {
    if (stopped) return;
    const sample =
      navigator.onLine === false ? { ok: false, rtt: null } : await probe(url);
    if (stopped) return;
    samples = [...samples, sample].slice(-WINDOW);
    onChange({
      tier: classify(samples),
      rtt: sample.rtt,
      checkedAt: Date.now(),
    });
  }

  const goOffline = () => {
    samples = Array(WINDOW).fill({ ok: false, rtt: null });
    onChange({ tier: 0, rtt: null, checkedAt: Date.now() });
  };

  window.addEventListener("offline", goOffline);
  window.addEventListener("online", check);
  const timer = setInterval(check, intervalMs);
  check();

  return {
    check,
    stop() {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", check);
    },
  };
}
