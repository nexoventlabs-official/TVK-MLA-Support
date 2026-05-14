import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Rect, Line, Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, spacing, typography, radius } from '../theme';

/**
 * Lightweight SVG charts for the admin dashboard. Built on react-native-svg
 * (already a dep). Designed to look clean on mobile widths and match the
 * typography of the rest of the admin shell.
 */

/* ──────────────── DonutChart ────────────────
 * Status breakdown donut. Renders coloured arcs proportional to each
 * status count, with a centre label showing the total. `data` is
 * [{ key, label, value, color }].
 */
export function DonutChart({ data = [], size = 180, thickness = 28, centerLabel, centerValue, hideCenter = false }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;

  let acc = 0;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          {/* Track */}
          <Circle cx={cx} cy={cy} r={r} stroke={colors.border} strokeWidth={thickness} fill="none" />
          {data.map((d) => {
            const v = d.value || 0;
            if (v === 0) return null;
            const len = (v / total) * C;
            const dash = `${len} ${C - len}`;
            const offset = -((acc / total) * C);
            acc += v;
            return (
              <Circle
                key={d.key}
                cx={cx}
                cy={cy}
                r={r}
                stroke={d.color}
                strokeWidth={thickness}
                fill="none"
                strokeDasharray={dash}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>
      {!hideCenter && (
        <View style={[styles.donutCenter, { top: cy - 24, left: cx - 50, width: 100 }]} pointerEvents="none">
          <Text style={styles.donutValue}>{centerValue ?? total}</Text>
          {centerLabel ? <Text style={styles.donutLabel}>{centerLabel}</Text> : null}
        </View>
      )}
    </View>
  );
}

/* ──────────────── DonutLegend ──────────────── */
export function DonutLegend({ data = [] }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  return (
    <View style={styles.legendWrap}>
      {data.map((d) => {
        const pct = ((d.value || 0) / total) * 100;
        return (
          <View key={d.key} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={styles.legendLabel}>{d.label}</Text>
            <Text style={styles.legendValue}>{d.value || 0}</Text>
            <Text style={styles.legendPct}>{pct.toFixed(0)}%</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ──────────────── HBarChart ────────────────
 * Horizontal bar list. `data` = [{ label, value, color? }]. Bars are
 * scaled to the largest value so the longest bar fills the row.
 */
export function HBarChart({ data = [], maxRows = 8, accent = colors.brand700 }) {
  if (!data.length) return <Text style={styles.empty}>No data.</Text>;
  const max = Math.max(...data.map((d) => d.value || 0), 1);
  const rows = data.slice(0, maxRows);
  return (
    <View style={{ gap: 10 }}>
      {rows.map((d, i) => {
        const pct = ((d.value || 0) / max) * 100;
        return (
          <View key={d.label + i}>
            <View style={styles.hbarHeader}>
              <Text style={styles.hbarLabel} numberOfLines={1}>{d.label}</Text>
              <Text style={styles.hbarValue}>{d.value || 0}</Text>
            </View>
            <View style={styles.hbarTrack}>
              <View style={[styles.hbarFill, { width: `${pct}%`, backgroundColor: d.color || accent }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ──────────────── LineChart ────────────────
 * Compact line/area chart for daily timeline. `data` = [{ date, count }].
 */
export function LineChart({ data = [], width = 320, height = 120, color = colors.brand700, fill = colors.brand100 || '#fee2e2' }) {
  if (!data.length) return <Text style={styles.empty}>No data.</Text>;
  const padX = 6;
  const padY = 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const max = Math.max(...data.map((d) => d.count || 0), 1);
  const stepX = innerW / Math.max(data.length - 1, 1);

  const pts = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - ((d.count || 0) / max) * innerH;
    return { x, y };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `M ${pts[0].x},${padY + innerH} ` +
    pts.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${pts[pts.length - 1].x},${padY + innerH} Z`;

  // Pick 4 evenly-spaced X labels (first, ~33%, ~66%, last)
  const labelIdx = [0, Math.floor(data.length / 3), Math.floor((data.length * 2) / 3), data.length - 1];
  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lcg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.25" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {/* Y baseline */}
        <Line x1={padX} y1={padY + innerH} x2={width - padX} y2={padY + innerH} stroke={colors.border} strokeWidth="1" />
        <Path d={areaPath} fill="url(#lcg)" />
        <Polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => labelIdx.includes(i) ? (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#fff" stroke={color} strokeWidth="1.5" />
        ) : null)}
      </Svg>
      <View style={styles.lineLabels}>
        {labelIdx.map((idx) => {
          const d = data[idx];
          if (!d) return null;
          return <Text key={idx} style={styles.lineLabelText}>{shortDate(d.date)}</Text>;
        })}
      </View>
    </View>
  );
}

/* ──────────────── Heatmap (weekday × hour) ────────────────
 * Renders a 7×24 grid. `cells` = [{ dow: 0..6 (Mon-first), hour: 0..23, count }].
 * Empty cells default to 0. Colour intensity is normalised to the max count.
 */
export function Heatmap({ cells = [], width = 320 }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Build sparse matrix
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 0;
  cells.forEach((c) => {
    if (c.dow >= 0 && c.dow < 7 && c.hour >= 0 && c.hour < 24) {
      matrix[c.dow][c.hour] += c.count || 0;
      if (matrix[c.dow][c.hour] > max) max = matrix[c.dow][c.hour];
    }
  });
  if (max === 0) max = 1;

  const labelW = 32;
  const gridW = width - labelW;
  const cellW = gridW / 24;
  const cellH = 18;
  const gap = 2;
  const totalH = cellH * 7 + gap * 6;

  return (
    <View>
      <Svg width={width} height={totalH + 18}>
        {/* Cells — day/hour labels are rendered as RN Views below for nicer typography */}
        {matrix.map((row, di) =>
          row.map((v, hi) => {
            const intensity = v / max;
            const fillColor = v === 0 ? '#f3f4f6' : tintColor('#dc2626', intensity);
            const x = labelW + hi * cellW;
            const y = di * (cellH + gap);
            return (
              <Rect
                key={`${di}-${hi}`}
                x={x + 1}
                y={y}
                width={cellW - 2}
                height={cellH}
                rx={2}
                ry={2}
                fill={fillColor}
              />
            );
          })
        )}
      </Svg>

      {/* Day labels overlay (pure RN — easier to style than nested SVG text) */}
      <View style={[styles.heatmapLabelsCol, { top: 0, height: totalH }]}>
        {days.map((d, i) => (
          <Text key={d} style={[styles.heatmapDayLabel, { top: i * (cellH + gap) + 2, height: cellH }]}>{d}</Text>
        ))}
      </View>

      {/* Hour ticks below */}
      <View style={[styles.heatmapHourRow, { paddingLeft: labelW }]}>
        {[0, 6, 12, 18, 23].map((h) => (
          <Text key={h} style={[styles.heatmapHourTick, { left: labelW + (h * cellW) - 8 }]}>{h}h</Text>
        ))}
      </View>
    </View>
  );
}

function tintColor(hex, t) {
  // Mix `hex` (#rrggbb) with white based on (1 - t). t in [0..1].
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const minOpacity = 0.18;
  const op = minOpacity + t * (1 - minOpacity);
  const blend = (c) => Math.round(255 - (255 - c) * op);
  const R = blend(r), G = blend(g), B = blend(b);
  return `rgb(${R}, ${G}, ${B})`;
}

function shortDate(s) {
  if (!s) return '';
  // s is YYYY-MM-DD
  const [, m, d] = s.split('-');
  if (!m || !d) return s;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1] || ''}`;
}

const styles = StyleSheet.create({
  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },

  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  donutValue: { ...typography.h1, color: colors.text, fontSize: 28, lineHeight: 32 },
  donutLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },

  legendWrap: { gap: 8, marginTop: spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...typography.body, color: colors.text, flex: 1, fontSize: 13 },
  legendValue: { ...typography.bodyBold, color: colors.text, fontSize: 13, ...(typography.tabular || {}) },
  legendPct: { ...typography.caption, color: colors.textMuted, width: 36, textAlign: 'right', ...(typography.tabular || {}) },

  hbarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  hbarLabel: { ...typography.caption, color: colors.text, flex: 1, marginRight: spacing.sm, fontWeight: '600' },
  hbarValue: { ...typography.captionBold, color: colors.brand700, ...(typography.tabular || {}) },
  hbarTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  hbarFill: { height: '100%', borderRadius: 4 },

  lineLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 4 },
  lineLabelText: { ...typography.caption, color: colors.textMuted, fontSize: 10 },

  heatmapLabelsCol: { position: 'absolute', left: 0, width: 32 },
  heatmapDayLabel: { position: 'absolute', left: 0, ...typography.caption, color: colors.textMuted, fontSize: 10, textAlignVertical: 'center' },
  heatmapHourRow: { height: 14, marginTop: 2, position: 'relative' },
  heatmapHourTick: { position: 'absolute', top: 0, ...typography.caption, color: colors.textMuted, fontSize: 9 },
});
