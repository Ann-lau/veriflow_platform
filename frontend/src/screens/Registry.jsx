import { useEffect, useMemo, useState } from "react";
import { fetchRegistry } from "../api.js";
import { KAJIADO_OUTLINE } from "../data/kajiado_boundary.js";
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
  {
    key: "working",
    label: "Working",
    short: "Working",
    color: "#2a6f97",
    shape: "circle",
  },
  {
    key: "attention",
    label: "Needs attention",
    short: "Attention",
    color: "#d98e04",
    shape: "square",
  },
  {
    key: "not_working",
    label: "Not working",
    short: "Not working",
    color: "#c1432b",
    shape: "triangle",
  },
];
const CLASS_BY_KEY = Object.fromEntries(CLASSES.map((c) => [c.key, c]));
const PAGE = 40;

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

// Small shape + words, used in the table and the selected-record line.
function StatusTag({ cls }) {
  const c = CLASS_BY_KEY[cls];
  return (
    <span className="st">
      <svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true">
        <Shape shape={c.shape} color={c.color} size={4.5} />
      </svg>
      {c.label}
    </span>
  );
}

// Offline map: the county outline and the points are drawn from coordinates, no map tiles needed.
function PointMap({ points, visible, selectedId, onSelect }) {
  const view = useMemo(() => {
    const lons = KAJIADO_OUTLINE.map((c) => c[0]);
    const lats = KAJIADO_OUTLINE.map((c) => c[1]);
    const minLon = Math.min(...lons),
      maxLon = Math.max(...lons);
    const minLat = Math.min(...lats),
      maxLat = Math.max(...lats);
    const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180); // shrink longitude at this latitude
    const w = (maxLon - minLon) * kx,
      h = maxLat - minLat;
    const S = 600; // square canvas
    const padTop = 36,
      padSide = 20,
      padBottom = 52; // room for the title and the legend
    const scale = Math.min((S - 2 * padSide) / w, (S - padTop - padBottom) / h);
    const ox = (S - w * scale) / 2,
      oy = padTop + (S - padTop - padBottom - h * scale) / 2;
    const xy = (lon, lat) => ({
      x: ox + (lon - minLon) * kx * scale,
      y: oy + (maxLat - lat) * scale,
    });
    const project = (p) => xy(p.lon, p.lat);
    const outline =
      KAJIADO_OUTLINE.map(([lon, lat], i) => {
        const { x, y } = xy(lon, lat);
        return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join("") + "Z";
    const barPx = (50 / 111.32) * scale; // 1 degree of latitude is about 111.32 km
    return { S, project, outline, barPx };
  }, []);

  const shown = points.filter((p) => visible[p.cls]);
  const ly = view.S - 44; // legend top
  return (
    <svg
      viewBox={`0 0 ${view.S} ${view.S}`}
      role="img"
      aria-label="Map of Kajiado County water points by status at survey"
    >
      <path
        d={view.outline}
        fill="#f6f2e8"
        stroke="#7b8794"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* soft halos make clusters read as density */}
      {shown.map((p) => {
        const { x, y } = view.project(p);
        return (
          <circle
            key={`h${p.id}`}
            cx={x}
            cy={y}
            r="8"
            fill="#e0a526"
            opacity="0.15"
          />
        );
      })}
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
                <Shape shape={c.shape} color={c.color} x={x} y={y} size={3.8} />
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
      {!selectedId && (
        <text x="22" y="30" fontSize="16" fontWeight="700" fill="#26323f">
          Kajiado County
        </text>
      )}

      {/* legend on the map, as in the mockup */}
      <rect
        x="12"
        y={ly}
        width={view.S - 24}
        height="32"
        rx="16"
        fill="#fff"
        opacity="0.95"
      />
      {CLASSES.map((c, i) => {
        const x0 = 30 + i * 108;
        return (
          <g key={c.key}>
            <Shape
              shape={c.shape}
              color={c.color}
              x={x0}
              y={ly + 16}
              size={4.5}
            />
            <text x={x0 + 11} y={ly + 21} fontSize="13" fill="#26323f">
              {c.short}
            </text>
          </g>
        );
      })}
      <line
        x1="362"
        x2={362 + view.barPx}
        y1={ly + 16}
        y2={ly + 16}
        stroke="#26323f"
        strokeWidth="2"
      />
      <text x={370 + view.barPx} y={ly + 21} fontSize="13" fill="#26323f">
        50 km
      </text>
    </svg>
  );
}

function BarRows({ rows }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div className="rows">
      {rows.map((r) => (
        <div className="row" key={r.label}>
          <span className="lbl">{r.label}</span>
          <div className="bar">
            <i style={{ width: `${(r.total / max) * 100}%` }} />
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
        The registry of {s.total} Kajiado water points, with status as of each
        point&apos;s survey date ({s.top_survey_year_count} of {s.total}{" "}
        surveyed in {s.top_survey_year}). Source: Water Point Data Exchange, CC
        BY 4.0.
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
            <div className="mapnote" aria-live="polite">
              {sel && (
                <>
                  <b className="mono">{sel.wpdx_id}</b> · {sel.tech} · Kajiado{" "}
                  {sel.sub_county} · <StatusTag cls={sel.cls} /> (
                  {sel.year ?? "year n/a"})
                </>
              )}
            </div>
          </div>
          <div className="mfoot">
            {CLASSES.map((c) => (
              <div key={c.key}>
                <b>{counts[c.key]}</b>
                <small>{c.short}</small>
              </div>
            ))}
            <div>
              <b>{s.total}</b>
              <small>Total</small>
            </div>
          </div>
        </section>

        <section className="listcol">
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
                {c.short}
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
          <div className="tablebox">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Technology</th>
                  <th>Sub-county</th>
                  <th>Status at survey</th>
                  <th>Surveyed</th>
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
                      <StatusTag cls={p.cls} />
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
          </div>
        </section>
      </div>

      <div className="two">
        <section>
          <h2>Technology</h2>
          <BarRows rows={data.by_technology} />
        </section>
        <section>
          <h2>Survey year</h2>
          <BarRows rows={data.by_survey_year} />
        </section>
      </div>

      <p className="muted foot">
        Contributors:{" "}
        {Object.entries(s.sources)
          .map(([k, v]) => `${k} (${v})`)
          .join(", ")}
        .
      </p>
    </div>
  );
}
