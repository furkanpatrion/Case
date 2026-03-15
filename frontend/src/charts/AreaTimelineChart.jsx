import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const METRIC_COLORS = {
    temperature: '#f97316',
    humidity: '#3b82f6',
    battery: '#22c55e',
    pressure: '#a855f7',
    co2: '#06b6d4',
    default: '#64748b',
};
const getColor = (key) => METRIC_COLORS[key] || METRIC_COLORS.default;

const CustomTooltip = ({ active, payload, label, theme }) => {
    if (!active || !payload?.length) return null;
    const isDark = theme === 'dark';
    return (
        <div style={{
            background: isDark ? '#0f172a' : '#fff',
            border: `1.5px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
            borderRadius: 14, padding: '12px 16px',
            boxShadow: '0 8px 32px #0000001a', minWidth: 140,
        }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                {label}
            </div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'block', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', flex: 1 }}>{p.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
                </div>
            ))}
        </div>
    );
};

const AreaTimelineChart = ({ data, metrics, theme }) => {
    const gridColor = theme === 'dark' ? '#1e293b' : '#f1f5f9';
    const tickColor = theme === 'dark' ? '#94a3b8' : '#64748b';
    const axisColor = theme === 'dark' ? '#334155' : '#e2e8f0';

    if (!data?.length || !metrics?.length) {
        return (
            <div className="chart-empty-state">
                <div className="chart-empty-icon">📉</div>
                <div>Görüntülenecek veri yok</div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <defs>
                    {metrics.map(key => (
                        <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={getColor(key)} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={getColor(key)} stopOpacity={0.02} />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                    dataKey="time"
                    tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: axisColor }}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                />
                <Tooltip content={<CustomTooltip theme={theme} />} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 10, color: theme === 'dark' ? '#cbd5e1' : '#475569' }} />
                {metrics.map(key => (
                    <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={getColor(key)}
                        fill={`url(#grad-${key})`}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: getColor(key), stroke: '#fff', strokeWidth: 2 }}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default AreaTimelineChart;
