import { useEffect, useMemo, useState } from "react";
import { fetchRegistry } from "../api.js";
import "./Registry.css";

const CACHE_KEY = "veriflow.registry.v1";

// localStorage can throw (private window, blocked storage), so every access is wrapped.
function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}
function writeCache(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable: the screen still works, just without a saved copy */
  }
}

// Shape + colour + words: status never relies on colour alone.
const CLASSES = [
  { key: "working", label: "Working", color: "#2a6f97", shape: "circle" },
  {
    key: "attention",
    label: "Needs attention",
    color: "#d98e04",
    shape: "square",
  },
  {
    key: "not_working",
    label: "Not working",
    color: "#c1432b",
    shape: "triangle",
  },
];
const CLASS_BY_KEY = Object.fromEntries(CLASSES.map((c) => [c.key, c]));
const PAGE = 12;

function Shape({ shape, color, x = 0, y = 0, size = 4 }) {
  if (shape === "square")
    return (
      <rect
        x={x - size}
        y={y - size}
        width={size * 2}
        height={size * 2}
        fill={color}
      />
    );
  if (shape === "triangle") {
    const h = size * 1.3;
    return (
      <polygon
        points={`${x},${y - h} ${x + h},${y + size} ${x - h},${y + size}`}
        fill={color}
      />
    );
  }
  return <circle cx={x} cy={y} r={size} fill={color} />;
}

// Offline map: points drawn straight from their coordinates, no map tiles needed.
function PointMap({ points, visible, selectedId, onSelect }) {
  const view = useMemo(() => {
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    const minLat = Math.min(...lats),
      maxLat = Math.max(...lats);
    const minLon = Math.min(...lons),
      maxLon = Math.max(...lons);
    const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180); // shrink longitude at this latitude
    const w = (maxLon - minLon) * kx,
      h = maxLat - minLat;
    const S = 600; // square canvas
    const pad = 30;
    const scale = Math.min((S - 2 * pad) / w, (S - 2 * pad) / h);
    const ox = (S - w * scale) / 2,
      oy = (S - h * scale) / 2;
    const project = (p) => ({
      x: ox + (p.lon - minLon) * kx * scale,
      y: oy + (maxLat - p.lat) * scale,
    });
    const barPx = (50 / 111.32) * scale; // 1 degree of latitude is about 111.32 km
    return { S, project, barPx };
  }, [points]);

  const shown = points.filter((p) => visible[p.cls]);
  return (
    <svg
      viewBox={`0 0 ${view.S} ${view.S}`}
      role="img"
      aria-label="Map of Kajiado water points by status at survey"
    >
      <g>
        {points.map((p) => {
          const { x, y } = view.project(p);
          return (
            <circle
              key={`h${p.id}`}
              cx={x}
              cy={y}
              r="11"
              fill="#efeadf"
              opacity=".9"
            />
          );
        })}
      </g>
      {CLASSES.map((c) =>
        shown
          .filter((p) => p.cls === c.key)
          .map((p) => {
            const { x, y } = view.project(p);
            return (
              <g
                key={p.id}
                tabIndex={0}
                role="button"
                aria-label={`${p.wpdx_id}, ${c.label}`}
                onClick={() => onSelect(p)}
                onFocus={() => onSelect(p)}
                style={{ cursor: "pointer" }}
              >
                <Shape shape={c.shape} color={c.color} x={x} y={y} size={3.6} />
                <circle cx={x} cy={y} r="9" fill="transparent" />
              </g>
            );
          }),
      )}
      {selectedId &&
        (() => {
          const p = points.find((q) => q.id === selectedId);
          if (!p) return null;
          const { x, y } = view.project(p);
          return (
            <circle
              cx={x}
              cy={y}
              r="11"
              fill="none"
              stroke="#26323f"
              strokeWidth="2.5"
            />
          );
        })()}
      <line
        x1="20"
        x2={20 + view.barPx}
        y1={view.S - 18}
        y2={view.S - 18}
        stroke="#26323f"
        strokeWidth="2"
      />
      <text x={28 + view.barPx} y={view.S - 14} fontSize="13" fill="#26323f">
        50 km
      </text>
    </svg>
  );
}

function StackRows({ rows, plain }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div className="rows">
      {rows.map((r) => (
        <div className="row" key={r.label}>
          <span className="lbl">{r.label}</span>
          <div className="stack" style={{ width: `${(r.total / max) * 100}%` }}>
            {plain ? (
              <i className="seg-plain" style={{ width: "100%" }} />
            ) : (
              CLASSES.map((c) => (
                <i
                  key={c.key}
                  className={`seg-${c.key}`}
                  style={{ width: `${(r[c.key] / r.total) * 100}%` }}
                />
              ))
            )}
          </div>
          <span className="num">{r.total}</span>
        </div>
      ))}
    </div>
  );
}

export default function Registry() {
  const [data, setData] = useState(readCache);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState({
    working: true,
    attention: true,
    not_working: true,
  });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    fetchRegistry()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStale(false);
        writeCache(d);
      })
      .catch((e) => {
        if (!alive) return;
        // Offline or server down: keep showing the saved copy, and say so.
        setStale(true);
        setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.points.filter(
      (p) =>
        visible[p.cls] &&
        (!q ||
          [p.wpdx_id, p.sub_county, p.tech, p.status].some((v) =>
            (v || "").toLowerCase().includes(q),
          )),
    );
  }, [data, visible, query]);

  if (!data) {
    return (
      <div className="registry">
        <h1>Water points</h1>
        <p className="sub">
          {error
            ? "The registry is not available yet. Connect once to load it, then it works offline."
            : "Loading the registry…"}
        </p>
      </div>
    );
  }

  const s = data.summary;
  const counts = {
    working: s.working,
    attention: s.attention,
    not_working: s.not_working,
  };
  const sel = selected && data.points.find((p) => p.id === selected);

  return (
    <div className="registry">
      <h1>
        Water points <span className="tag real">Real WPDx</span>
      </h1>
      <p className="sub">
        The registry of {s.total} Kajiado water points. Status is as at each
        point&apos;s survey date, not today: {s.top_survey_year_count} of{" "}
        {s.total} were surveyed in {s.top_survey_year}.
      </p>
      {stale && (
        <div className="note">
          Showing the copy saved on this device. It will refresh when a
          connection returns.
        </div>
      )}

      <div className="layout">
        <section className="mapcol">
          <div className="mapbox">
            <PointMap
              points={data.points}
              visible={visible}
              selectedId={selected}
              onSelect={(p) => setSelected(p.id)}
            />
          </div>
          <div className="mapinfo" aria-live="polite">
            {sel ? (
              <>
                <b>{sel.wpdx_id}</b> · {sel.tech} · Kajiado {sel.sub_county} ·{" "}
                <span className={`st st-${sel.cls}`}>
                  {CLASS_BY_KEY[sel.cls].label}
                </span>{" "}
                at survey ({sel.year ?? "year not recorded"})
              </>
            ) : (
              <span className="muted">Select a point to see its record.</span>
            )}
          </div>
          <div className="mfoot">
            {CLASSES.map((c) => (
              <div key={c.key}>
                <b>{counts[c.key]}</b>
                <small>{c.label}</small>
              </div>
            ))}
            <div>
              <b>{s.total}</b>
              <small>Total</small>
            </div>
          </div>
        </section>

        <section>
          <div className="chips">
            {CLASSES.map((c) => (
              <button
                key={c.key}
                className="chip"
                aria-pressed={visible[c.key]}
                onClick={() => {
                  setVisible({ ...visible, [c.key]: !visible[c.key] });
                  setLimit(PAGE);
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="-6 -6 12 12"
                  aria-hidden="true"
                >
                  <Shape shape={c.shape} color={c.color} size={4.5} />
                </svg>
                {c.label} {counts[c.key]}
              </button>
            ))}
          </div>
          <input
            className="search"
            placeholder="Search a code, sub-county, technology or status"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            aria-label="Search water points"
          />
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Technology</th>
                <th>Sub-county</th>
                <th>Status at survey</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={p.id === selected ? "on" : ""}
                >
                  <td className="mono">{p.wpdx_id}</td>
                  <td>{p.tech}</td>
                  <td>{p.sub_county}</td>
                  <td>
                    <span className={`st st-${p.cls}`}>
                      {CLASS_BY_KEY[p.cls].label}
                    </span>
                  </td>
                  <td>{p.year ?? "n/a"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted foot">
            Showing {Math.min(limit, rows.length)} of {rows.length}.{" "}
            {rows.length > limit && (
              <button className="link" onClick={() => setLimit(limit + PAGE)}>
                Show more
              </button>
            )}
          </p>
        </section>
      </div>

      <div className="three">
        <section>
          <h2>By sub-county</h2>
          <StackRows rows={data.by_sub_county} />
          <p className="muted foot">
            Blue is working, amber needs attention, red is not working.
          </p>
        </section>
        <section>
          <h2>Technology</h2>
          <StackRows rows={data.by_technology} plain />
        </section>
        <section>
          <h2>Survey year</h2>
          <StackRows rows={data.by_survey_year.map((r) => ({ ...r }))} plain />
        </section>
      </div>

      <p className="muted foot">
        Source: Water Point Data Exchange (WPDx), Kajiado County, licence CC BY
        4.0. Contributors:{" "}
        {Object.entries(s.sources)
          .map(([k, v]) => `${k} (${v})`)
          .join(", ")}
        .
      </p>
    </div>
  );
}
