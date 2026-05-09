import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Activity,
  Calendar as CalendarIcon,
  PieChart as PieIcon,
  BarChart3,
  Grid3x3,
} from 'lucide-react';
import api from '../api';

// ─── Stat-card metadata ──────────────────────────────────────────
// Every card uses the same monochrome treatment — the icon receives
// a neutral square chip; the label + huge tabular number do the
// heavy lifting. No coloured backgrounds, no gradients.
const cards = [
  { key: 'members', label: 'Members', icon: Users, to: '/members', help: 'Registered & active' },
  { key: 'totalRequests', label: 'Total Requests', icon: ClipboardList, to: '/service-requests', help: 'All grievances raised' },
  { key: 'newRequests', label: 'New Requests', icon: AlertCircle, to: '/service-requests?status=new', help: 'Awaiting triage' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, to: '/service-requests?status=resolved', help: 'Closed successfully' },
];

// Day labels for the heatmap (Mon-first, matching the backend's
// remapped dow 0-6).
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Refined status colours for the donut + legend. Each `bg` is the
// stroke colour of the ring segment; the text class drives the
// legend label. Black + neutral ramp + a single accent emerald for
// the "completed" terminal state — keeps the chart calm even when
// every status is non-zero.
const STATUS_VIZ = {
  pending:    { label: 'Pending',    color: '#f59e0b', dot: 'bg-amber-400' },
  accepted:   { label: 'Accepted',   color: '#0ea5e9', dot: 'bg-sky-500' },
  processing: { label: 'Processing', color: '#3b82f6', dot: 'bg-blue-500' },
  completed:  { label: 'Completed',  color: '#10b981', dot: 'bg-emerald-500' },
  rejected:   { label: 'Rejected',   color: '#a1a1aa', dot: 'bg-brand-400' },
};

export default function Dashboard() {
  const [data, setData] = useState({
    stats: {},
    byService: [],
    timeline: [],
    memberGrowth: [],
    heatmap: [],
    serviceHeatmap: [],
    statusBreakdown: {},
    meta: { timelineDays: 30, heatmapDays: 60 },
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    try {
      const r = await api.get('/dashboard/stats');
      setData(r.data);
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post('/campaigns/sync');
      await load();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh every 30s so template statuses stay live
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-8">
      {/* ─── Page header ─── */}
      <div className="page-header">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-brand-400 mb-2">
            Overview
          </div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Snapshot of grievance activity, members and broadcast campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={sync} disabled={syncing} className="btn-secondary">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing…' : 'Sync templates'}</span>
          </button>
        </div>
      </div>

      {/* ─── Stat cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map(({ key, label, icon: Icon, to, help }) => (
          <Link
            key={key}
            to={to}
            className="card-hover group p-5 flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center transition-colors group-hover:bg-brand-900 group-hover:text-white">
                <Icon size={16} strokeWidth={2} />
              </div>
              <ArrowUpRight
                size={14}
                className="text-brand-300 group-hover:text-brand-900 transition-colors"
              />
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-wide uppercase text-brand-500">
                {label}
              </div>
              <div className="font-display text-[34px] sm:text-[40px] font-semibold tracking-tightest text-brand-900 leading-none mt-1.5 tabular">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-brand-100 rounded animate-pulse" />
                ) : (
                  data.stats[key] ?? 0
                )}
              </div>
              <div className="text-[11px] text-brand-400 mt-1.5">{help}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ─── Activity Timeline (full width) ─── */}
      <ActivityTimeline
        timeline={data.timeline}
        memberGrowth={data.memberGrowth}
        days={data.meta?.timelineDays || 30}
      />

      {/* ─── Heatmap + Status donut ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className="lg:col-span-2">
          <ActivityHeatmap heatmap={data.heatmap} days={data.meta?.heatmapDays || 60} />
        </div>
        <StatusDonut breakdown={data.statusBreakdown} />
      </div>

      {/* ─── Service × Weekday Heatmap ─── */}
      <ServiceHeatmap
        serviceHeatmap={data.serviceHeatmap}
        byService={data.byService}
        days={data.meta?.heatmapDays || 60}
      />

      {/* ─── Service Distribution bar chart ─── */}
      <ServiceDistribution byService={data.byService} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Visualisation components
   ----------------------------------------------------------------
   All charts are hand-rolled SVG / CSS-grid. The point is to keep
   the dashboard one cohesive monochrome surface — no charting-lib
   default colour palette, no Recharts <Tooltip> styling fights,
   no dependency footprint. Every component is self-contained and
   renders something tasteful even when its source array is empty.
   ────────────────────────────────────────────────────────────── */

// Format a yyyy-mm-dd key as "9 May" — short, no year, locale-aware.
function shortDate(key) {
  if (!key) return '';
  const d = new Date(`${key}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** ── Activity Timeline ───────────────────────────────────────────
 *  Two stacked area sparkline-ish charts in a single SVG: requests
 *  per day (filled black area) and new members per day (dashed line).
 *  Renders X-axis tick labels for ~6 evenly spaced dates, Y-axis is
 *  implicit (peak shown as a small chip).
 */
function ActivityTimeline({ timeline = [], memberGrowth = [], days }) {
  const W = 1000; // viewBox width  — scales responsively via CSS
  const H = 240;  // viewBox height
  const PAD_X = 28;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 32;

  const series = useMemo(() => {
    if (!timeline.length) return null;
    const reqMax = Math.max(...timeline.map((p) => p.count || 0), 1);
    const memMax = Math.max(...memberGrowth.map((p) => p.count || 0), 1);
    const totalReq = timeline.reduce((s, p) => s + (p.count || 0), 0);
    const totalMem = memberGrowth.reduce((s, p) => s + (p.count || 0), 0);
    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_TOP - PAD_BOTTOM;
    const xAt = (i) =>
      timeline.length === 1 ? PAD_X + innerW / 2 : PAD_X + (i / (timeline.length - 1)) * innerW;
    const reqYAt = (v) => PAD_TOP + innerH - (v / reqMax) * innerH;
    const memYAt = (v) => PAD_TOP + innerH - (v / memMax) * innerH;

    const reqLine = timeline.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)} ${reqYAt(p.count || 0).toFixed(2)}`).join(' ');
    const reqArea = `${reqLine} L ${xAt(timeline.length - 1).toFixed(2)} ${(PAD_TOP + innerH).toFixed(2)} L ${xAt(0).toFixed(2)} ${(PAD_TOP + innerH).toFixed(2)} Z`;
    const memLine = memberGrowth
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)} ${memYAt(p.count || 0).toFixed(2)}`)
      .join(' ');

    // Pick ~6 evenly spaced indices for X-axis labels.
    const tickCount = Math.min(6, timeline.length);
    const ticks = Array.from({ length: tickCount }, (_, k) => {
      const idx = Math.round((k / (tickCount - 1 || 1)) * (timeline.length - 1));
      return { idx, x: xAt(idx), label: shortDate(timeline[idx].date) };
    });

    return {
      reqLine, reqArea, memLine, ticks, reqMax, memMax, totalReq, totalMem,
      innerH, points: timeline.map((p, i) => ({ x: xAt(i), y: reqYAt(p.count || 0), v: p.count || 0, date: p.date })),
    };
  }, [timeline, memberGrowth]);

  return (
    <div className="card overflow-hidden">
      <div className="section-bar">
        <div>
          <div className="font-display font-semibold text-brand-900 tracking-tightest flex items-center gap-2">
            <Activity size={14} className="text-brand-500" /> Activity Timeline
          </div>
          <div className="text-[11px] text-brand-400 mt-0.5">
            Daily requests &amp; new members · last {days} days
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] tabular">
          <Legend swatch="bar" label="Requests" value={series?.totalReq ?? 0} />
          <Legend swatch="dash" label="Members" value={series?.totalMem ?? 0} />
        </div>
      </div>

      <div className="px-2 sm:px-4 pt-3 pb-1">
        {!series ? (
          <div className="h-[240px] flex items-center justify-center text-sm text-brand-400">
            No activity in the last {days} days.
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[240px]" preserveAspectRatio="none">
            {/* Y grid — three faint horizontal lines for visual rhythm */}
            {[0.25, 0.5, 0.75].map((t) => (
              <line
                key={t}
                x1={PAD_X}
                x2={W - PAD_X}
                y1={PAD_TOP + series.innerH * t}
                y2={PAD_TOP + series.innerH * t}
                stroke="#f4f4f5"
                strokeWidth="1"
              />
            ))}

            {/* Requests area (black with low opacity) */}
            <path d={series.reqArea} fill="#0a0a0a" opacity="0.06" />
            {/* Requests line */}
            <path d={series.reqLine} fill="none" stroke="#0a0a0a" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />

            {/* Member growth line (dashed neutral) */}
            <path
              d={series.memLine}
              fill="none"
              stroke="#71717a"
              strokeWidth="1.4"
              strokeDasharray="3 3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Last point dot for the requests series — marks "today" */}
            {series.points.length > 0 && (() => {
              const last = series.points[series.points.length - 1];
              return <circle cx={last.x} cy={last.y} r="3.5" fill="#0a0a0a" />;
            })()}

            {/* X-axis ticks */}
            {series.ticks.map((t, i) => (
              <text
                key={i}
                x={t.x}
                y={H - 10}
                fill="#a1a1aa"
                fontSize="10"
                fontFamily="Inter, sans-serif"
                textAnchor="middle"
                style={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}
              >
                {t.label}
              </text>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

function Legend({ swatch, label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-brand-500">
      {swatch === 'bar' ? (
        <span className="inline-block w-3 h-1.5 rounded-sm bg-brand-900" />
      ) : (
        <span
          className="inline-block w-3 h-[2px]"
          style={{ backgroundImage: 'repeating-linear-gradient(to right,#71717a 0 3px,transparent 3px 6px)' }}
        />
      )}
      <span className="font-semibold tracking-wide uppercase text-[10px] text-brand-500">{label}</span>
      <span className="font-mono text-[12px] font-semibold text-brand-900 ml-1">{value}</span>
    </div>
  );
}

/** ── Activity Heatmap ────────────────────────────────────────────
 *  GitHub-style 7×24 grid (weekday × hour). Cell darkness is based
 *  on the count relative to the dataset's max. Empty cells are a
 *  pale brand-100 placeholder. Native title attribute for tooltips
 *  — no JS hover state needed.
 */
function ActivityHeatmap({ heatmap = [], days }) {
  const grid = useMemo(() => {
    // Build a 7×24 dense matrix from the sparse {dow,hour,count} list.
    const m = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    let max = 0;
    heatmap.forEach((p) => {
      if (p.dow >= 0 && p.dow < 7 && p.hour >= 0 && p.hour < 24) {
        m[p.dow][p.hour] = p.count;
        if (p.count > max) max = p.count;
      }
    });
    return { m, max };
  }, [heatmap]);

  const cellOpacity = (v) => {
    if (!v) return 0;
    if (!grid.max) return 0;
    // log-ish ramp so a single hot hour doesn't wash out the rest.
    const t = Math.min(1, Math.log(v + 1) / Math.log(grid.max + 1));
    // Map [0..1] → [0.18..1] so even a 1-count cell is visible.
    return 0.18 + t * 0.82;
  };

  const totalRequests = useMemo(
    () => heatmap.reduce((s, p) => s + (p.count || 0), 0),
    [heatmap]
  );

  return (
    <div className="card overflow-hidden h-full flex flex-col">
      <div className="section-bar">
        <div>
          <div className="font-display font-semibold text-brand-900 tracking-tightest flex items-center gap-2">
            <CalendarIcon size={14} className="text-brand-500" /> Activity Heatmap
          </div>
          <div className="text-[11px] text-brand-400 mt-0.5">
            When grievances arrive · weekday × hour · last {days} days
          </div>
        </div>
        <div className="text-[11px] tabular text-brand-500">
          <span className="font-mono font-semibold text-brand-900">{totalRequests}</span> requests
        </div>
      </div>

      <div className="p-4 flex-1">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Hour ruler (every 3 hrs) */}
            <div
              className="grid mb-1.5"
              style={{ gridTemplateColumns: `36px repeat(24, minmax(0, 1fr))` }}
            >
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="text-[9px] tabular text-brand-400 text-center"
                  style={{ visibility: h % 3 === 0 ? 'visible' : 'hidden' }}
                >
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </div>

            {grid.m.map((row, dow) => (
              <div
                key={dow}
                className="grid items-center gap-[3px] mb-[3px]"
                style={{ gridTemplateColumns: `36px repeat(24, minmax(0, 1fr))` }}
              >
                <div className="text-[10px] font-semibold tracking-wide uppercase text-brand-400">
                  {DOW_LABELS[dow]}
                </div>
                {row.map((v, h) => (
                  <div
                    key={h}
                    title={`${DOW_LABELS[dow]} · ${String(h).padStart(2, '0')}:00 — ${v} request${v === 1 ? '' : 's'}`}
                    className="aspect-square rounded-[3px] bg-brand-100"
                    style={
                      v > 0
                        ? { background: `rgba(10,10,10,${cellOpacity(v)})` }
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}

            {/* Intensity legend */}
            <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-brand-400">
              <span className="tracking-wide uppercase font-semibold">Less</span>
              {[0.18, 0.4, 0.6, 0.8, 1].map((o) => (
                <span
                  key={o}
                  className="inline-block w-3 h-3 rounded-[3px]"
                  style={{ background: `rgba(10,10,10,${o})` }}
                />
              ))}
              <span className="tracking-wide uppercase font-semibold">More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ── Service Heatmap ─────────────────────────────────────────────
 *  Service category (rows) × weekday (columns) heatmap. Answers the
 *  question "which kind of grievance comes in on which day?". Uses
 *  the same Mon-first weekday ordering as <ActivityHeatmap>, and
 *  the same log-ish opacity ramp so a single dominant cell doesn't
 *  flatten the rest of the grid.
 *
 *  Right-edge mini-bar shows each service's row total so the whole
 *  panel doubles as a category leaderboard.
 */
function ServiceHeatmap({ serviceHeatmap = [], byService = [], days }) {
  const { matrix, max, rowTotals, grandMax } = useMemo(() => {
    // Build a {svcId -> rowIndex} lookup from the catalog-ordered
    // byService list so rows render in the bot's order.
    const order = byService.map((s) => s.id);
    const idx = Object.fromEntries(order.map((id, i) => [id, i]));
    const m = order.map(() => Array.from({ length: 7 }, () => 0));
    let mx = 0;
    serviceHeatmap.forEach((p) => {
      const r = idx[p.svc];
      if (r === undefined) return;
      if (p.dow < 0 || p.dow > 6) return;
      m[r][p.dow] = p.count;
      if (p.count > mx) mx = p.count;
    });
    const totals = m.map((row) => row.reduce((s, v) => s + v, 0));
    const gMax = Math.max(...totals, 1);
    return { matrix: m, max: mx, rowTotals: totals, grandMax: gMax };
  }, [serviceHeatmap, byService]);

  const cellOpacity = (v) => {
    if (!v) return 0;
    if (!max) return 0;
    const t = Math.min(1, Math.log(v + 1) / Math.log(max + 1));
    return 0.18 + t * 0.82;
  };

  const totalRequests = rowTotals.reduce((s, v) => s + v, 0);

  return (
    <div className="card overflow-hidden">
      <div className="section-bar">
        <div>
          <div className="font-display font-semibold text-brand-900 tracking-tightest flex items-center gap-2">
            <Grid3x3 size={14} className="text-brand-500" /> Service × Weekday Heatmap
          </div>
          <div className="text-[11px] text-brand-400 mt-0.5">
            Which grievance categories arrive on which day · last {days} days
          </div>
        </div>
        <div className="text-[11px] tabular text-brand-500">
          <span className="font-mono font-semibold text-brand-900">{totalRequests}</span> requests
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {byService.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-brand-400">
            No services configured.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Column header row: weekday labels */}
              <div
                className="grid items-end gap-[4px] mb-2"
                style={{
                  gridTemplateColumns: `160px repeat(7, minmax(0, 1fr)) 90px`,
                }}
              >
                <div />
                {DOW_LABELS.map((d) => (
                  <div
                    key={d}
                    className="text-[10px] font-semibold tracking-wide uppercase text-brand-400 text-center"
                  >
                    {d}
                  </div>
                ))}
                <div className="text-[10px] font-semibold tracking-wide uppercase text-brand-400 text-right pr-1">
                  Total
                </div>
              </div>

              {/* One row per service category */}
              {byService.map((s, ri) => {
                const rt = rowTotals[ri] || 0;
                const barPct = (rt / grandMax) * 100;
                return (
                  <div
                    key={s.id}
                    className="grid items-center gap-[4px] mb-[4px]"
                    style={{
                      gridTemplateColumns: `160px repeat(7, minmax(0, 1fr)) 90px`,
                    }}
                  >
                    <div
                      className="text-[12px] font-medium text-brand-800 truncate pr-2"
                      title={s.title}
                    >
                      {s.title}
                    </div>
                    {matrix[ri].map((v, dow) => (
                      <div
                        key={dow}
                        title={`${s.title} · ${DOW_LABELS[dow]} — ${v} request${v === 1 ? '' : 's'}`}
                        className="aspect-square rounded-[4px] bg-brand-100"
                        style={
                          v > 0
                            ? { background: `rgba(10,10,10,${cellOpacity(v)})` }
                            : undefined
                        }
                      />
                    ))}
                    {/* Row total chip + tiny proportional bar */}
                    <div className="flex items-center gap-2 pl-2">
                      <div className="flex-1 h-1.5 rounded-full bg-brand-100 overflow-hidden">
                        <span
                          className="block h-full bg-brand-900 rounded-full"
                          style={{ width: `${Math.max(2, barPct)}%` }}
                        />
                      </div>
                      <span className="font-mono tabular text-[12px] font-semibold text-brand-900 w-7 text-right">
                        {rt}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Intensity legend */}
              <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-brand-400">
                <span className="tracking-wide uppercase font-semibold">Less</span>
                {[0.18, 0.4, 0.6, 0.8, 1].map((o) => (
                  <span
                    key={o}
                    className="inline-block w-3 h-3 rounded-[3px]"
                    style={{ background: `rgba(10,10,10,${o})` }}
                  />
                ))}
                <span className="tracking-wide uppercase font-semibold">More</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** ── Status Donut ────────────────────────────────────────────────
 *  Compact donut + side legend. Renders as concentric arcs using
 *  the SVG `circle stroke-dasharray` trick (no math beyond degrees
 *  → arc length).
 */
function StatusDonut({ breakdown = {} }) {
  const entries = Object.entries(STATUS_VIZ).map(([k, viz]) => ({
    key: k,
    ...viz,
    value: breakdown[k] || 0,
  }));
  const total = entries.reduce((s, e) => s + e.value, 0);
  const R = 56;
  const C = 2 * Math.PI * R; // circumference

  let offset = 0;
  return (
    <div className="card overflow-hidden h-full flex flex-col">
      <div className="section-bar">
        <div>
          <div className="font-display font-semibold text-brand-900 tracking-tightest flex items-center gap-2">
            <PieIcon size={14} className="text-brand-500" /> Request Status
          </div>
          <div className="text-[11px] text-brand-400 mt-0.5">
            Lifecycle distribution
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col items-center gap-5">
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
            {/* Track */}
            <circle cx="80" cy="80" r={R} fill="none" stroke="#f4f4f5" strokeWidth="14" />
            {total > 0 &&
              entries.map((e) => {
                if (!e.value) return null;
                const len = (e.value / total) * C;
                const seg = (
                  <circle
                    key={e.key}
                    cx="80"
                    cy="80"
                    r={R}
                    fill="none"
                    stroke={e.color}
                    strokeWidth="14"
                    strokeDasharray={`${len} ${C - len}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                );
                offset += len;
                return seg;
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-brand-400">
              Total
            </div>
            <div className="font-display text-[28px] font-semibold tracking-tightest text-brand-900 tabular leading-none mt-1">
              {total}
            </div>
          </div>
        </div>

        <ul className="w-full space-y-1.5">
          {entries.map((e) => {
            const pct = total ? Math.round((e.value / total) * 100) : 0;
            return (
              <li
                key={e.key}
                className="flex items-center justify-between text-[12.5px]"
              >
                <span className="flex items-center gap-2 text-brand-700">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ background: e.color }}
                  />
                  {e.label}
                </span>
                <span className="font-mono tabular text-brand-900 font-semibold">
                  {e.value}
                  <span className="text-brand-400 font-normal ml-2">{pct}%</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** ── Service Distribution ────────────────────────────────────────
 *  Vertical bar chart of grievances per service category. Gives
 *  the same information as the old "Requests by Service" panel but
 *  in a real graph, with bar heights proportional to count.
 */
function ServiceDistribution({ byService = [] }) {
  const { max, total } = useMemo(() => {
    const m = Math.max(...byService.map((s) => s.count || 0), 1);
    const t = byService.reduce((sum, s) => sum + (s.count || 0), 0);
    return { max: m, total: t };
  }, [byService]);

  return (
    <div className="card overflow-hidden">
      <div className="section-bar">
        <div>
          <div className="font-display font-semibold text-brand-900 tracking-tightest flex items-center gap-2">
            <BarChart3 size={14} className="text-brand-500" /> Service Distribution
          </div>
          <div className="text-[11px] text-brand-400 mt-0.5">
            Grievances grouped by service category
          </div>
        </div>
        <div className="text-[11px] tabular text-brand-500">
          <span className="font-mono font-semibold text-brand-900">{total}</span> total
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {byService.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-brand-400">
            No data yet.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${byService.length}, minmax(0, 1fr))` }}>
            {byService.map((s) => {
              const pct = (s.count / max) * 100;
              return (
                <div key={s.id} className="flex flex-col items-stretch gap-2 min-w-0">
                  {/* Bar column. The bar grows from the bottom. */}
                  <div className="relative h-44 rounded-md bg-brand-50 border border-brand-200/70 overflow-hidden flex items-end">
                    <div
                      className="w-full bg-brand-900 rounded-b-md transition-all"
                      style={{ height: `${Math.max(2, pct)}%` }}
                      title={`${s.title} — ${s.count}`}
                    />
                    {/* Count chip — floats above the bar tip */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 -translate-y-2 px-1.5 py-0.5 rounded bg-white border border-brand-200/70 text-[10px] font-mono font-semibold tabular text-brand-900 shadow-sheet"
                      style={{ bottom: `${Math.max(2, pct)}%` }}
                    >
                      {s.count}
                    </div>
                  </div>
                  <div
                    className="text-[10.5px] font-semibold tracking-wide text-brand-700 text-center truncate"
                    title={s.title}
                  >
                    {s.title}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
