import React, { useState, useRef, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function seq(a: number, b: number, step = 1): number[] {
  const r: number[] = [];
  if (step > 0) for (let i = a; i <= b; i += step) r.push(i);
  else for (let i = a; i >= b; i += step) r.push(i);
  return r;
}

/* ─────────────────────────────────────────────
   PLOT DATA
───────────────────────────────────────────── */

export type PlotStatus = "available" | "sold" | "builder" | "neutral";
export type Facing = "North" | "South" | "East" | "West";

export interface PlotData {
  number: number;
  status: PlotStatus;
  areaSqM: number;
  areaSqYd: number;
  widthM: number;
  lengthM: number;
  facing: Facing;
}

function buildPlots(): PlotData[] {
  const base: PlotData[] = [];
  for (let i = 1; i <= 109; i++) {
    base.push({
      number: i,
      status: "sold",
      areaSqM: +(80 + (i % 7) * 11).toFixed(2),
      areaSqYd: +(96 + (i % 7) * 13).toFixed(2),
      widthM: +(4.5 + (i % 3) * 0.5).toFixed(2),
      lengthM: +(16 + (i % 5)).toFixed(2),
      facing: ["North", "South", "East", "West"][i % 4] as Facing,
    });
  }
  const avail = [1, 2, 3, 4, 6, 75, 76, 77, 78, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
  const builder = [5, 25, 26, 27, 28, 29, 30, 39, 40, 51, 52];
  avail.forEach(n => { const p = base.find(x => x.number === n); if (p) p.status = "available"; });
  builder.forEach(n => { const p = base.find(x => x.number === n); if (p) p.status = "builder"; });
  return base;
}
const PLOTS = buildPlots();

interface ColorTheme {
  fill: string;
  stroke: string;
  text: string;
}

const S_COLOR: Record<PlotStatus, ColorTheme> = {
  available: { fill: "#4a9fd4", stroke: "#2980b9", text: "#fff" },
  sold: { fill: "#c8b89a", stroke: "#9a8060", text: "#333" },
  builder: { fill: "#d4a017", stroke: "#b8860b", text: "#fff" },
  neutral: { fill: "#c8b89a", stroke: "#9a8060", text: "#333" },
};
const S_COLOR_ON: Record<PlotStatus, ColorTheme> = {
  available: { fill: "#4a9fd4", stroke: "#2980b9", text: "#fff" },
  sold: { fill: "#e05252", stroke: "#c0392b", text: "#fff" },
  builder: { fill: "#d4a017", stroke: "#b8860b", text: "#fff" },
  neutral: { fill: "#c8b89a", stroke: "#9a8060", text: "#333" },
};

/* ─────────────────────────────────────────────
   EXACT LAYOUT
───────────────────────────────────────────── */

const CW_A = 64;  // col A & D width
const CW_B = 53;  // col B & C sub-col width
const CH = 28;  // cell height
const RH = 18;  // road height
const G = 3;   // gap between cells

// X origins
const XA = 54;
const XB1 = 138;
const XB2 = 138 + CW_B + G;
const XC1 = 306;
const XC2 = 306 + CW_B + G;
const XD = 474;

// Y origins (top section)
const YT = 62;   // top section start
const YB = 408;  // bottom section start (after horizontal road)

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
}

function buildCells(): Record<number, Cell> {
  const cells: Record<number, Cell> = {};

  // ── COL A TOP: plots 1-10 (top to bottom)
  seq(1, 10).forEach((n, i) => {
    cells[n] = { x: XA, y: YT + i * (CH + G), w: CW_A, h: CH };
  });

  // ── COL A BOT: plots 11-20
  seq(11, 20).forEach((n, i) => {
    cells[n] = { x: XA, y: YB + i * (CH + G), w: CW_A, h: CH };
  });

  // ── COL B TOP
  const BT_L = [39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29];
  const BT_R = [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50];
  BT_L.forEach((n, i) => { cells[n] = { x: XB1, y: YT + i * (CH + G), w: CW_B, h: CH }; });
  BT_R.forEach((n, i) => { cells[n] = { x: XB2, y: YT + i * (CH + G), w: CW_B, h: CH }; });

  // ── COL B BOT
  const BB_L = [28, 27, 26, 25, 24, 23, 22, 21];
  const BB_R = [51, 52, 53, 54, 55, 56, 57, 58];
  BB_L.forEach((n, i) => { cells[n] = { x: XB1, y: YB + i * (CH + G), w: CW_B, h: CH }; });
  BB_R.forEach((n, i) => { cells[n] = { x: XB2, y: YB + i * (CH + G), w: CW_B, h: CH }; });

  // ── COL C TOP
  const CT_L = [75, 74, 73, 72, 71, 70, 69, 68, 67];
  const CT_R = [76, 77, 78, 79, 80, 81, 82, 83, 84];
  CT_L.forEach((n, i) => { cells[n] = { x: XC1, y: YT + i * (CH + G), w: CW_B, h: CH }; });
  CT_R.forEach((n, i) => { cells[n] = { x: XC2, y: YT + i * (CH + G), w: CW_B, h: CH }; });

  // ── COL C BOT
  const CB_L = [66, 65, 64, 63, 62, 61, 60, 59];
  const CB_R = [85, 86, 87, 88, 89, 90, 91, 92];
  CB_L.forEach((n, i) => { cells[n] = { x: XC1, y: YB + i * (CH + G), w: CW_B, h: CH }; });
  CB_R.forEach((n, i) => { cells[n] = { x: XC2, y: YB + i * (CH + G), w: CW_B, h: CH }; });

  // ── COL D TOP
  [109, 108, 107, 106, 105, 104, 103, 102, 101, 100].forEach((n, i) => {
    cells[n] = { x: XD, y: YT + i * (CH + G), w: CW_A, h: CH };
  });

  // ── COL D BOT
  [99, 98, 97, 96, 95, 94, 93].forEach((n, i) => {
    cells[n] = { x: XD, y: YB + i * (CH + G), w: CW_A, h: CH };
  });

  return cells;
}
const CELLS = buildCells();

/* ─────────────────────────────────────────────
   GALLERY & QR
───────────────────────────────────────────── */
const GALLERY = [
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=420&fit=crop", big: true },
  { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop" },
  { url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=200&fit=crop" },
  { url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=200&fit=crop" },
  { url: "https://images.unsplash.com/photo-1574197097716-2c7c2d1f4e76?w=400&h=200&fit=crop" },
  { url: "https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=600&h=420&fit=crop", big: true },
  { url: "https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=400&h=200&fit=crop" },
  { url: "https://images.unsplash.com/photo-1494526585095-c41746248156?w=400&h=200&fit=crop" },
];

function QRCode() {
  return (
    <svg width="190" height="190" viewBox="0 0 190 190" style={{ display: "block", margin: "0 auto" }}>
      <rect width="190" height="190" fill="#181818" rx="10" />
      {[[8, 8], [130, 8], [8, 130]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width={52} height={52} fill="none" stroke="#7bc445" strokeWidth="5" rx="6" />
          <rect x={x + 12} y={y + 12} width={28} height={28} fill="#7bc445" rx="3" />
        </g>
      ))}
      <polygon points="95,76 113,95 95,114 77,95" fill="#3a7a25" />
      <polygon points="95,82 107,95 95,108 83,95" fill="#7bc445" />
      {Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => {
        if ((r < 2 && c < 2) || (r < 2 && c > 2) || (r > 2 && c < 2)) return null;
        const px = 70 + c * 10, py = 70 + r * 10;
        if (Math.abs(px - 95) < 20 && Math.abs(py - 95) < 20) return null;
        return <rect key={`${r}${c}`} x={px} y={py} width={7} height={7} fill="#7bc445" rx={1} />;
      }))}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */
export default function NakshatraApp() {
  const [statusOn, setStatusOn] = useState(false);
  const [viewMode, setViewMode] = useState("3D");
  const [northTop, setNorthTop] = useState(false);
  const [satVisible, setSatVisible] = useState(false);
  const [satAnimate, setSatAnimate] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [searchVal, setSearchVal] = useState("");
  const [includeStatus, setIncludeStatus] = useState(true);
  const [shareMsg, setShareMsg] = useState("");

  // Per-plot animated color
  const [plotColor, setPlotColor] = useState<Record<number, PlotStatus>>(() => {
    const m: Record<number, PlotStatus> = {};
    PLOTS.forEach(p => m[p.number] = "neutral");
    return m;
  });

  const animTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearAnims = () => { animTimers.current.forEach(clearTimeout); animTimers.current = []; };

  useEffect(() => {
    clearAnims();
    if (statusOn) {
      setPlotColor(() => { const m: Record<number, PlotStatus> = {}; PLOTS.forEach(p => m[p.number] = "neutral"); return m; });
      PLOTS.forEach((plot, idx) => {
        const t = setTimeout(() => {
          setPlotColor(prev => ({ ...prev, [plot.number]: plot.status }));
        }, idx * 14);
        animTimers.current.push(t);
      });
    } else {
      PLOTS.forEach((plot, idx) => {
        const t = setTimeout(() => {
          setPlotColor(prev => ({ ...prev, [plot.number]: "neutral" }));
        }, idx * 14);
        animTimers.current.push(t);
      });
    }
    return clearAnims;
  }, [statusOn]);

  // Satellite
  const toggleSat = () => {
    if (satVisible) {
      setSatAnimate(false);
      setTimeout(() => setSatVisible(false), 420);
    } else {
      setSatVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setSatAnimate(true)));
    }
  };

  // Pan & Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragging = useRef(false);
  const dragRef = useRef<{ x: number, y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: globalThis.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(5, Math.max(0.3, z * (e.deltaY > 0 ? 0.91 : 1.1))));
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onMD = (e: React.MouseEvent) => { dragging.current = true; dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; };
  const onMM = (e: React.MouseEvent) => { if (dragging.current && dragRef.current) setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y }); };
  const onMU = () => { dragging.current = false; };
  const resetView = () => { setPan({ x: 0, y: 0 }); setZoom(1); setNorthTop(false); };

  const get3DTransform = () => {
    if (viewMode === "2D") return "none";
    if (northTop) return "perspective(900px) rotateX(42deg) rotateZ(-56deg) scale(0.82) translate(50px, -20px)";
    return "perspective(700px) rotateX(40deg) rotateZ(-18deg) scale(1)";
  };

  const selPlot = selectedPlot ? PLOTS.find(p => p.number === selectedPlot) : null;
  const LOCATE = "https://www.google.com/maps/search/23.254913,+69.634871?entry=tts&g_ep=EgoyMDI1MDYyOS4wIPu8ASoASAFQAw%3D%3D&skid=e05c1e1b-3f5c-4242-9b11-c2c3eb28c67f";

  // Single plot renderer
  function PlotCell({ num }: { num: number }) {
    const cell = CELLS[num];
    if (!cell) return null;
    const plot = PLOTS.find(p => p.number === num);
    if (!plot) return null;
    const cKey = plotColor[num] || "neutral";
    const palette = statusOn ? S_COLOR_ON : S_COLOR;
    const c = palette[cKey];
    const isSel = selectedPlot === num;
    const isMatch = searchVal && num.toString().includes(searchVal);
    const dimmed = !!searchVal && !isMatch;

    return (
      <g style={{ cursor: "pointer" }}
        onClick={e => { e.stopPropagation(); setSelectedPlot(p => p === num ? null : num); }}>
        <rect
          x={cell.x} y={cell.y} width={cell.w} height={cell.h} rx={3}
          fill={c.fill} fillOpacity={dimmed ? 0.12 : 1}
          stroke={isSel ? "#ffffff" : isMatch ? "#ffffffcc" : c.stroke}
          strokeWidth={isSel ? 2 : 0.6}
          strokeDasharray={isSel ? "4,2" : "none"}
          style={{ transition: "fill 0.3s ease" }}
        />
        {!dimmed && (
          <text
            x={cell.x + cell.w / 2} y={cell.y + cell.h / 2 + 4}
            textAnchor="middle" fontSize={9} fill={c.text} fontWeight="600"
            style={{ pointerEvents: "none", userSelect: "none" }}>
            {num}
          </text>
        )}
        {isSel && (
          <g style={{ pointerEvents: "none" }}>
            <line x1={cell.x} y1={cell.y - 5} x2={cell.x + cell.w} y2={cell.y - 5}
              stroke="#fff" strokeWidth={0.8} strokeDasharray="3,2" />
            <text x={cell.x + cell.w / 2} y={cell.y - 8} textAnchor="middle" fontSize={7} fill="#eee">
              {plot.lengthM}m
            </text>
            <line x1={cell.x - 5} y1={cell.y} x2={cell.x - 5} y2={cell.y + cell.h}
              stroke="#fff" strokeWidth={0.8} strokeDasharray="3,2" />
            <text x={cell.x - 10} y={cell.y + cell.h / 2 + 3} textAnchor="middle" fontSize={7} fill="#eee"
              transform={`rotate(-90,${cell.x - 10},${cell.y + cell.h / 2 + 3})`}>
              {plot.widthM}m
            </text>
            <text x={cell.x + cell.w / 2} y={cell.y + cell.h / 2 + 1}
              textAnchor="middle" fontSize={8} fill="#fff" fontWeight="700">{num}</text>
            <text x={cell.x + cell.w / 2} y={cell.y + cell.h / 2 + 10}
              textAnchor="middle" fontSize={6} fill="#ddd">
              {plot.areaSqM}m² · {plot.areaSqYd}yd²
            </text>
          </g>
        )}
      </g>
    );
  }

  // ─── SVG dimensions ───
  const SVG_W = 660;
  const SVG_H = 720;

  // Road y positions
  const ROAD_Y_TOP = YT + 11 * (CH + G) + 4;
  const ROAD_Y_BOT = YB + 8 * (CH + G) + 4;

  // Vertical road left edge
  const VROAD_1_X = XB1 - 14;
  const VROAD_2_X = XC1 - 14;
  const VROAD_3_X = XD - 14;

  // Main slab
  const SLAB_X = 48;
  const SLAB_Y = 42;
  const SLAB_W = 600;
  const SLAB_H = ROAD_Y_BOT + 18;



  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#111", color: "#fff",
      fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: "hidden", position: "relative"
    }}>

      <style>{`
        @keyframes slideUp {
          from{transform:translateY(100%);opacity:0}
          to{transform:translateY(0);opacity:1}
        }
        @keyframes slideDown {
          from{transform:translateY(0);opacity:1}
          to{transform:translateY(100%);opacity:0}
        }
        .sat-panel{position:absolute;inset:0;z-index:30}
        .sat-in{animation:slideUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards}
        .sat-out{animation:slideDown 0.38s ease-in forwards}
        .ctrl{background:rgba(26,26,26,0.93);border:1px solid #363636;border-radius:10px;
          color:#ccc;cursor:pointer;display:flex;align-items:center;justify-content:center;
          transition:background 0.15s,color 0.15s}
        .ctrl:hover{background:rgba(46,46,46,0.96);color:#fff}
        .ctrl.active{background:rgba(55,55,55,0.98);color:#fff;border-color:#555}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 52, zIndex: 70,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/image.png" alt="Nakshatra Logo" style={{ height: 34, objectFit: "contain" }} />
          <span style={{ color: "#e8860a", fontWeight: "800", fontSize: 22, letterSpacing: 2.5 }}>NAKSHATRA</span>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 7, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <img src="/favicon.ico" alt="Favicon" style={{ width: 36, height: 36, objectFit: "contain" }} />
        </div>
      </div>

      {/* ── COMPASS ── */}
      <button onClick={() => setNorthTop(v => !v)} title="Toggle north-up"
        style={{
          position: "absolute", top: 60, left: 16, zIndex: 70, width: 38, height: 38,
          background: "rgba(18,18,18,0.88)", border: "1.5px solid #444",
          borderRadius: "50%", cursor: "pointer", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 0, padding: 0,
          transition: "border-color 0.25s"
        }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          transform: `rotate(${northTop ? 0 : -52}deg)`, transition: "transform 0.65s cubic-bezier(0.34,1.4,0.64,1)"
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.5" style={{ marginBottom: -2 }}>
            <polyline points="18 15 12 9 6 15" />
          </svg>
          <span style={{ fontSize: 10, fontWeight: "700", color: "#ccc", lineHeight: 1 }}>N</span>
        </div>
      </button>

      {/* ── SATELLITE ── */}
      {satVisible && (
        <div className={`sat-panel ${satAnimate ? "sat-in" : "sat-out"}`}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d800!2d69.634871!3d23.254913!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
            width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" title="satellite" />
        </div>
      )}

      {/* ── MAIN MAP ── */}
      <div ref={wrapRef} style={{
        position: "absolute", inset: 0, overflow: "hidden",
        cursor: dragging.current ? "grabbing" : "grab"
      }}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onClick={() => setSelectedPlot(null)}>
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "center center"
        }}>
          <div style={{
            transform: get3DTransform(),
            transition: "transform 0.65s cubic-bezier(0.34,1.4,0.64,1)",
            transformOrigin: "center center"
          }}>

            <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ display: "block", userSelect: "none", overflow: "visible" }}>

              {/* ── Green outer boundary/lawn ── */}
              <polygon
                points={`38,30 ${SLAB_X + SLAB_W + 30},30 ${SLAB_X + SLAB_W + 50},${SLAB_Y + SLAB_H + 20} 20,${SLAB_Y + SLAB_H + 20}`}
                fill="#1e3c1e" opacity="0.9" />

              {/* ── Right-side green wedge (triangular) ── */}
              <polygon
                points={`${VROAD_3_X + CW_A + 14},${SLAB_Y} ${SLAB_X + SLAB_W + 28},${SLAB_Y} ${SLAB_X + SLAB_W + 28},${SLAB_Y + SLAB_H * 0.6} ${VROAD_3_X + CW_A + 14},${SLAB_Y + SLAB_H * 0.6}`}
                fill="#2a5a2a" />

              {/* ── Main slab (dark base) ── */}
              <rect x={SLAB_X} y={SLAB_Y} width={SLAB_W} height={SLAB_H}
                fill="#1a1a1a" rx="3" />

              {/* ── TOP AMENITY STRIP (above plots, full width, dark header) ── */}
              <rect x={SLAB_X} y={SLAB_Y} width={SLAB_W} height={YT - SLAB_Y - 2}
                fill="#202020" rx="3" />

              {/* ── Playground area (top-left of amenity) ── */}
              <rect x={SLAB_X + 2} y={SLAB_Y + 2} width={VROAD_1_X - SLAB_X - 2} height={YT - SLAB_Y - 4}
                fill="#252525" rx="3" />
              {/* circular track */}
              <circle cx={SLAB_X + 35} cy={SLAB_Y + 14} r={11} fill="none" stroke="#3a3a3a" strokeWidth="2" />
              <circle cx={SLAB_X + 35} cy={SLAB_Y + 14} r={6} fill="#2a2a2a" />
              {/* small decorative circles */}
              <circle cx={SLAB_X + 55} cy={SLAB_Y + 22} r={8} fill="#2e2e2e" stroke="#3a3a3a" strokeWidth="1" />
              <circle cx={SLAB_X + 70} cy={SLAB_Y + 10} r={7} fill="#2a2a2a" stroke="#363636" strokeWidth="1" />
              {/* "ALLOTED" box */}
              <rect x={SLAB_X + 80} y={SLAB_Y + 4} width={32} height={14} fill="#5a4010" rx="2" />
              <text x={SLAB_X + 96} y={SLAB_Y + 14} textAnchor="middle" fontSize={5.5} fill="#d4a050">ALLOTED</text>

              {/* ── CLUB box ── */}
              <rect x={XB2 + CW_B + 4} y={SLAB_Y + 4} width={42} height={YT - SLAB_Y - 8}
                fill="#3a5a1a" rx="3" stroke="#4a7a2a" strokeWidth="1" />
              <text x={XB2 + CW_B + 25} y={SLAB_Y + 20} textAnchor="middle" fontSize={8} fill="#8acc50" fontWeight="700">CLUB</text>

              {/* ── PARTY PLOT box ── */}
              <rect x={XB2 + CW_B + 50} y={SLAB_Y + 4} width={70} height={YT - SLAB_Y - 8}
                fill="#2a4a2a" rx="3" stroke="#3a6a3a" strokeWidth="1" />
              <text x={XB2 + CW_B + 85} y={SLAB_Y + 20} textAnchor="middle" fontSize={8} fill="#6aaa5a" fontWeight="700">PARTY PLOT</text>

              {/* ── BOX CRICKET / MULTI PURPOSE COURT (right strip, vertical text) ── */}
              <rect x={VROAD_3_X + CW_A + 2} y={SLAB_Y + 2} width={SLAB_X + SLAB_W - VROAD_3_X - CW_A - 4} height={ROAD_Y_TOP - SLAB_Y - 2}
                fill="#1e2e1e" rx="2" stroke="#2a4a2a" strokeWidth="1" />
              <text
                x={VROAD_3_X + CW_A + 12}
                y={SLAB_Y + (ROAD_Y_TOP - SLAB_Y) / 2}
                textAnchor="middle" fontSize={6} fill="#4a8a4a" fontWeight="bold"
                transform={`rotate(-90,${VROAD_3_X + CW_A + 12},${SLAB_Y + (ROAD_Y_TOP - SLAB_Y) / 2})`}>
                BOX CRICKET · MULTI PURPOSE COURT
              </text>

              {/* ── VERTICAL ROAD LABELS (rotated) ── */}
              {/* Left road label */}
              <text x={VROAD_1_X + 7} y={YT + 5 * (CH + G) + 10} textAnchor="middle"
                fontSize={6} fill="#555" transform={`rotate(-90,${VROAD_1_X + 7},${YT + 5 * (CH + G) + 10})`}>
                7.5 Meter Road
              </text>
              {/* Mid road label */}
              <text x={VROAD_2_X + 7} y={YT + 5 * (CH + G) + 10} textAnchor="middle"
                fontSize={6} fill="#555" transform={`rotate(-90,${VROAD_2_X + 7},${YT + 5 * (CH + G) + 10})`}>
                7.5 Meter Road
              </text>
              {/* Right road label */}
              <text x={VROAD_3_X + 7} y={YB + 3 * (CH + G) + 10} textAnchor="middle"
                fontSize={6} fill="#555" transform={`rotate(-90,${VROAD_3_X + 7},${YB + 3 * (CH + G) + 10})`}>
                7.5 Meter Road
              </text>

              {/* ── VERTICAL ROADS ── */}
              <rect x={VROAD_1_X} y={SLAB_Y} width={12} height={SLAB_H} fill="#161616" />
              <rect x={VROAD_2_X} y={SLAB_Y} width={12} height={SLAB_H} fill="#161616" />
              <rect x={VROAD_3_X} y={SLAB_Y} width={12} height={SLAB_H / 2 + 20} fill="#161616" />

              {/* ── HORIZONTAL ROAD (between top/bottom plot sections) ── */}
              <rect x={SLAB_X} y={ROAD_Y_TOP} width={SLAB_W} height={RH} fill="#161616" />

              {/* ── ROAD ARROWS ── */}
              {[
                [XA + CW_A / 2, ROAD_Y_BOT + 12],
                [XB1 + CW_B + G / 2 + CW_B / 2, ROAD_Y_BOT + 12],
                [XC1 + CW_B + G / 2 + CW_B / 2, ROAD_Y_BOT + 12],
              ].map(([rx, ry], i) => (
                <g key={i}>
                  <text x={rx} y={ry} textAnchor="middle" fontSize={11} fill="#4a4a4a">↑</text>
                  <text x={rx} y={ry + 12} textAnchor="middle" fontSize={6} fill="#3a3a3a">6 Meter Rd</text>
                </g>
              ))}
              {/* Right side arrow pointing left */}
              <text x={VROAD_3_X - 8} y={YB + 4 * (CH + G)} textAnchor="middle" fontSize={9} fill="#4a4a4a">←</text>

              {/* ── BOTTOM ROAD LABEL ── */}
              <text x={SLAB_X + SLAB_W / 2} y={ROAD_Y_BOT + 32} textAnchor="middle"
                fontSize={7} fill="#3a6a3a" letterSpacing="2">NAKSHATRA NADI RD</text>

              {/* ── Bottom green park strip ── */}
              <rect x={SLAB_X} y={ROAD_Y_BOT + 20} width={SLAB_W} height={22}
                fill="#1a3a1a" rx="2" />

              {/* ── Entry road (bottom-left diagonal) ── */}
              <polygon
                points={`-60,${SLAB_Y + SLAB_H + 18} ${SLAB_X},${SLAB_Y + SLAB_H + 4} ${SLAB_X},${SLAB_Y + SLAB_H + 22} -60,${SLAB_Y + SLAB_H + 36}`}
                fill="#1a3a1a" />
              <polygon
                points={`-200,${SLAB_Y + SLAB_H + 14} -60,${SLAB_Y + SLAB_H + 18} -60,${SLAB_Y + SLAB_H + 36} -200,${SLAB_Y + SLAB_H + 32}`}
                fill="#1a1a1a" />
              {/* Entry gate/gate post */}
              <rect x={-220} y={SLAB_Y + SLAB_H + 10} width={20} height={30} fill="#2255aa" rx="3" />

              {/* ── ALL PLOTS ── */}
              {PLOTS.map(p => <PlotCell key={p.number} num={p.number} />)}
            </svg>
          </div>
        </div>
      </div>

      {/* ── SHARE BUTTON (right side) ── */}
      <button className="ctrl"
        onClick={() => setModal("share")}
        style={{
          position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)",
          width: 44, height: 44, borderRadius: "50%", zIndex: 60,
          background: "transparent", border: "1px solid #363636"
        }} title="Share">
        <svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24" stroke="none">
          <path d="M12.9813 5.37893C13.1166 4.79374 13.9056 4.63945 14.2847 5.12458L19.3496 11.6027C19.6457 11.9815 19.6457 12.5185 19.3496 12.8973L14.2847 19.3754C13.9056 19.8606 13.1166 19.7063 12.9813 19.1211L12.5516 17.2625C12.4287 16.7314 11.9744 16.3533 11.4312 16.3315C9.43265 16.2514 6.70327 16.6343 4.41727 18.0665C3.8966 18.3927 3.2307 17.8996 3.42861 17.332C4.19237 15.1424 5.67931 12.4468 8.04938 10.7495C9.1831 9.93721 10.4357 9.3879 11.6506 9.04944C12.1643 8.90632 12.5804 8.50293 12.6974 7.99723L12.9813 5.37893Z" stroke="#ccc" strokeWidth="1.5" />
        </svg>
      </button>

      {/* ── SELECTED PLOT CARD ── */}
      {selPlot && (
        <div style={{
          position: "absolute", bottom: 236, right: 24, zIndex: 65,
          background: "rgba(18,18,18,0.97)", border: "1px solid #2e2e2e",
          borderRadius: 13, padding: "14px 18px", minWidth: 200,
          boxShadow: "0 6px 28px rgba(0,0,0,0.6)", backdropFilter: "blur(8px)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontWeight: "700", fontSize: 16 }}>Plot #{selPlot.number}</span>
            <span style={{
              fontSize: 11, padding: "3px 11px", borderRadius: 20, fontWeight: "600",
              background: S_COLOR_ON[selPlot.status].fill, color: "#fff"
            }}>
              {selPlot.status.charAt(0).toUpperCase() + selPlot.status.slice(1)}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
            {[["Area", `${selPlot.areaSqM} m²`], ["Sq Yd", `${selPlot.areaSqYd} yd²`],
            ["Dims", `${selPlot.widthM}×${selPlot.lengthM}m`], ["Facing", selPlot.facing]
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
                <div style={{ fontSize: 13, color: "#eee", fontWeight: "600" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM-RIGHT CONTROLS ── */}
      <div style={{
        position: "absolute", bottom: 24, right: 24, zIndex: 60,
        display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end", width: 340
      }}>

        {/* Top Row: Legend (if statusOn) + Status Toggle + Buttons */}
        <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "space-between", position: "relative" }}>

          {statusOn && (
            <div style={{
              position: "absolute", left: 0, bottom: 60,
              display: "flex", flexDirection: "column", gap: 10,
              paddingLeft: 4
            }}>
              {[["#4a9fd4", "Available"], ["#e05252", "Sold"], ["#d4a017", "Builder"]].map(([col, lbl]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, boxShadow: `0 0 6px ${col}77` }} />
                  <span style={{ fontSize: 14, color: "#eee", fontWeight: "500" }}>{lbl}</span>
                </div>
              ))}
            </div>
          )}

          {/* Status Toggle */}
          <div style={{
            background: "rgba(30,30,30,0.4)", borderRadius: 30, padding: "10px 18px",
            display: "flex", alignItems: "center", gap: 14, border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(5px)"
          }}>
            <span style={{ fontSize: 14, color: "#6a9cd9", fontWeight: "500" }}>Status</span>
            <div onClick={() => setStatusOn(v => !v)}
              style={{
                width: 36, height: 20, borderRadius: 10, cursor: "pointer", position: "relative",
                background: statusOn ? "#5a7e44" : "#4a4a4a", transition: "background 0.3s",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)"
              }}>
              <div style={{
                position: "absolute", top: 2, left: statusOn ? 18 : 2, width: 16, height: 16,
                borderRadius: "50%", background: "#fff",
                transition: "left 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.4)"
              }} />
            </div>
          </div>

          {/* Map / 3D / Home Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button className={`ctrl ${satVisible ? "active" : ""}`} onClick={toggleSat}
              style={{ width: 44, height: 44, borderRadius: "50%", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#eee" }} title="Satellite">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3v18" />
                <path d="M15 3v18" />
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <circle cx="12" cy="12" r="2.5" />
                <path d="M14.5 9.5L16 8" />
              </svg>
            </button>

            <button className="ctrl" onClick={() => setViewMode(v => v === "3D" ? "2D" : "3D")}
              style={{ width: 44, height: 44, borderRadius: "50%", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", fontSize: 14, fontWeight: "700", color: "#eee" }}>
              {viewMode}
            </button>

            <button className="ctrl" onClick={resetView} style={{ width: 44, height: 44, borderRadius: "50%", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#eee" }} title="Reset">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5" />
                <path d="M9 22V12h6v10" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", width: "100%" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={searchVal} onChange={e => setSearchVal(e.target.value)}
            placeholder="Search Plot"
            style={{
              width: "100%", height: 46, boxSizing: "border-box",
              background: "rgba(30,30,30,0.4)", backdropFilter: "blur(5px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24, paddingLeft: 46, paddingRight: 16,
              color: "#6a9cd9", fontSize: 14, outline: "none", transition: "border-color 0.2s"
            }} />
        </div>

        {/* Gallery | Info | Locate */}
        <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "space-between" }}>
          {[
            {
              lbl: "Gallery", fn: () => setModal("gallery"),
              ic: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            },
            {
              lbl: "Info", fn: () => setModal("info"),
              ic: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            },
            {
              lbl: "Locate", fn: () => window.open(LOCATE, "_blank"),
              ic: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            },
          ].map(({ lbl, fn, ic }) => (
            <button key={lbl} onClick={fn}
              style={{
                flex: 1, background: "rgba(30,30,30,0.4)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(5px)",
                borderRadius: 24, height: 46, padding: "0 16px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: "pointer", color: "#eee", fontSize: 14, fontWeight: "400", transition: "background 0.15s, border-color 0.15s"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(50,50,50,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(30,30,30,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)" }}>
              {ic}{lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════ MODALS ════════════════ */}
      {modal === "gallery" && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          backdropFilter: "blur(4px)"
        }}
          onClick={() => setModal(null)}>
          <div style={{
            width: "100%", maxWidth: 1100, height: "85vh",
            background: "#181818", borderRadius: 12, border: "1px solid #333",
            position: "relative", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0,0,0,0.8)", overflow: "hidden"
          }} onClick={e => e.stopPropagation()}>
            {/* Header / Close area */}
            <div style={{
              display: "flex", justifyContent: "flex-end", padding: "14px 18px 8px"
            }}>
              <button onClick={() => setModal(null)}
                style={{
                  background: "none", border: "none", color: "#666", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "color 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                onMouseLeave={e => e.currentTarget.style.color = "#666"}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* Scrollable grid area */}
            <style>{`
              .gal-wrap::-webkit-scrollbar { width: 6px; }
              .gal-wrap::-webkit-scrollbar-track { background: transparent; }
              .gal-wrap::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
              .gal-wrap::-webkit-scrollbar-thumb:hover { background: #666; }
            `}</style>
            <div className="gal-wrap" style={{
              flex: 1, overflowY: "auto", padding: "0 18px 18px 18px",
              display: "grid", gridTemplateColumns: "repeat(4,1fr)", gridAutoRows: "180px", gap: 10,
              scrollbarWidth: "thin", scrollbarColor: "#444 transparent"
            }}>
              {GALLERY.map((img, i) => (
                <div key={i} style={{ borderRadius: 8, overflow: "hidden", gridRow: img.big ? "span 2" : "auto" }}>
                  <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal === "info" && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}
          onClick={() => setModal(null)}>
          <div style={{ background: "#222", borderRadius: 16, padding: 36, maxWidth: 520, width: "90%", position: "relative" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setModal(null)}
              style={{
                position: "absolute", top: 14, right: 16, background: "none",
                border: "none", color: "#777", fontSize: 22, cursor: "pointer"
              }}>✕</button>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <svg width="50" height="50" viewBox="0 0 34 34">
                <polygon points="17,3 2,22 7,22 7,32 15,32 15,23 19,23 19,32 27,32 27,22 32,22" fill="#e8860a" />
              </svg>
              <span style={{ color: "#e8860a", fontWeight: "800", fontSize: 26, letterSpacing: 2.5 }}>NAKSHATRA</span>
            </div>
            <p style={{ color: "#b0b0b0", fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
              Nakshatra offers well-planned 109 residential plots in a peaceful setting. The Lifestyle you deserve
            </p>
            <div style={{ marginBottom: 28 }}>
              <div style={{
                width: 46, height: 46, border: "1.5px solid #555", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="#aaa" />
                </svg>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 14 }}>
              <span style={{ color: "#4a4a4a", fontSize: 13 }}>Powered by Spacer Engine | SKILLHOUSE</span>
            </div>
          </div>
        </div>
      )}

      {modal === "share" && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}
          onClick={() => setModal(null)}>
          <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 28, width: 310, position: "relative" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setModal(null)}
              style={{
                position: "absolute", top: 12, right: 14, background: "none",
                border: "none", color: "#777", fontSize: 20, cursor: "pointer"
              }}>✕</button>
            <QRCode />
            <label style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 16px", cursor: "pointer" }}>
              <input type="checkbox" checked={includeStatus} onChange={e => setIncludeStatus(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#5aab35", cursor: "pointer" }} />
              <span style={{ color: "#ccc", fontSize: 14 }}>Include Statuses</span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                {
                  lbl: shareMsg || "Share Link", fn: () => {
                    navigator.clipboard?.writeText(`https://spacer.land/IoKlH${includeStatus ? "?status=uHr9KL" : ""}`).catch(() => { });
                    setShareMsg("Copied!"); setTimeout(() => setShareMsg(""), 2000);
                  }
                },
                { lbl: "Share QR Code", fn: () => { } },
              ].map(({ lbl, fn }) => (
                <button key={lbl} onClick={fn}
                  style={{
                    background: "rgba(255,255,255,0.07)", border: "1px solid #383838",
                    borderRadius: 24, height: 46, color: "#fff", fontSize: 15, cursor: "pointer", fontWeight: "500"
                  }}>
                  {lbl}
                </button>
              ))}
              <button disabled
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid #252525",
                  borderRadius: 24, height: 46, color: "#4a4a4a", fontSize: 13, cursor: "not-allowed"
                }}>
                Download Printable QR (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
