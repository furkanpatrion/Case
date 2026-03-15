import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import AreaTimelineChart from './charts/AreaTimelineChart';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIME_PRESETS = [
    { label: '1 dak', key: '1m', ms: 60_000, limit: 60 },
    { label: '5 dak', key: '5m', ms: 5 * 60_000, limit: 2000 },
    { label: '30 dak', key: '30m', ms: 30 * 60_000, limit: 2000 },
    { label: '1 saat', key: '1h', ms: 60 * 60_000, limit: 2000 },
    { label: '6 saat', key: '6h', ms: 6 * 60 * 60_000, limit: 2000 },
    { label: '1 gün', key: '1d', ms: 24 * 60 * 60_000, limit: 2000 },
    { label: '7 gün', key: '7d', ms: 7 * 24 * 60 * 60_000, limit: 2000 },
];

const CHART_TABS = [
    { key: 'area', label: 'Zaman Çizelgesi', icon: '◭', desc: 'Zaman içindeki alan' },
];

const METRIC_META = {
    temperature: { label: 'Sıcaklık', unit: '°C', color: '#f97316', icon: '🌡️' },
    humidity: { label: 'Nem', unit: '%', color: '#3b82f6', icon: '💧' },
    battery: { label: 'Pil', unit: '%', color: '#22c55e', icon: '🔋' },
    pressure: { label: 'Basınç', unit: ' hPa', color: '#a855f7', icon: '🌬️' },
    co2: { label: 'CO₂', unit: ' ppm', color: '#06b6d4', icon: '☁️' },
    pm25: { label: 'PM2.5', unit: ' µg', color: '#f43f5e', icon: '🌫️' },
    pm10: { label: 'PM10', unit: ' µg', color: '#e11d48', icon: '🌫️' },
    voc_index: { label: 'VOC İndeksi', unit: '', color: '#8b5cf6', icon: '🧪' },
    lat: { label: 'Enlem', unit: '°', color: '#10b981', icon: '📍' },
    lon: { label: 'Boylam', unit: '°', color: '#10b981', icon: '📍' },
    power_w: { label: 'Güç', unit: ' W', color: '#eab308', icon: '⚡' },
    relay_state: { label: 'Röle', unit: '', color: '#f59e0b', icon: '⚡' },
};

const metaMeta = (k) => {
    if (METRIC_META[k]) return METRIC_META[k];
    // Dinamik renk üretimi (Hash temelli)
    let hash = 0;
    for (let i = 0; i < k.length; i++) hash = k.charCodeAt(i) + ((hash << 5) - hash);
    const color = `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
    const icons = ['📊', '📉', '🏹', '🛰️', '📟', '💠', '📡', '⚡', '💧', '🌡️'];
    const icon = icons[Math.abs(hash) % icons.length];

    return {
        label: k.split('.').pop().replace(/_/g, ' ').toUpperCase(),
        unit: '',
        color,
        icon
    };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--';
const fmtFull = ts => ts ? new Date(ts).toLocaleString('tr-TR') : '--';

/**
 * Objeyi düzleştirir: { a: { b: 1 } } -> { "a.b": 1 }
 * Boolean'ları sayıya çevirir.
 */
const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        const val = obj[k];

        if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
            Object.assign(acc, flattenObject(val, pre + k));
        } else if (typeof val === 'boolean') {
            acc[pre + k] = val ? 1 : 0;
        } else if (typeof val === 'number' || (!isNaN(parseFloat(val)) && isFinite(val))) {
            acc[pre + k] = parseFloat(val);
        } else {
            acc[pre + k] = val;
        }
        return acc;
    }, {});
};

const toChartData = (readings, liveData) => {
    const base = readings.map(r => {
        const flat = flattenObject(r.data || {});
        return {
            time: fmtTime(r.timestamp),
            _ts: new Date(r.timestamp).getTime(),
            ...flat
        };
    });

    if (liveData) {
        const flatLive = flattenObject(liveData);
        const liveTs = new Date((liveData.timestamp || Date.now() / 1000) * 1000).getTime();
        if (!base.some(p => Math.abs(p._ts - liveTs) < 2000)) {
            base.push({
                time: fmtTime(liveTs),
                _ts: liveTs,
                ...flatLive
            });
        }
    }
    return base.sort((a, b) => a._ts - b._ts);
};

const downloadCSV = async (readings, sensor) => {
    if (!readings.length) return;

    // Log the download to activity logs
    try {
        await axios.post(`/api/sensors/${sensor.id}/log-csv`);
    } catch (e) {
        console.error('Failed to log CSV download', e);
    }

    const keys = [...new Set(readings.flatMap(r => Object.keys(r.data || {})))];
    const header = ['timestamp', 'datetime', ...keys];
    const rows = readings.map(r => [
        new Date(r.timestamp).getTime(),
        new Date(r.timestamp).toISOString(),
        ...keys.map(k => (r.data?.[k] ?? ''))
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `${sensor?.sensorExternalId || 'sensor'}_${Date.now()}.csv` });
    a.click();
    URL.revokeObjectURL(url);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ metricKey, value, trend }) => {
    const meta = metaMeta(metricKey);
    const display = typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value;
    return (
        <div className="sdp-stat-card" style={{ borderColor: meta.color + '30', background: meta.color + '06' }}>
            <div className="sdp-stat-icon" style={{ color: meta.color, background: meta.color + '18' }}>{meta.icon}</div>
            <div>
                <div className="sdp-stat-label">{meta.label}</div>
                <div className="sdp-stat-value" style={{ color: meta.color }}>
                    {display ?? '—'}<span className="sdp-stat-unit">{meta.unit}</span>
                </div>
                {trend !== undefined && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: trend >= 0 ? '#22c55e' : '#ef4444', marginTop: 2 }}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(2)}{meta.unit}
                    </div>
                )}
            </div>
        </div>
    );
};

const SectionCard = ({ title, icon, badge, children }) => (
    <div className="sdp-section">
        <div className="sdp-section-header">
            <div className="sdp-section-title"><span>{icon}</span>{title}</div>
            {badge && <span className="sdp-badge">{badge}</span>}
        </div>
        {children}
    </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const SensorDetailPage = ({ sensor: initialSensor, onBack, socket, theme }) => {
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [liveData, setLiveData] = useState(null);
    const [isLive, setIsLive] = useState(false);
    const [activeChart, setActiveChart] = useState('area');
    const [activePreset, setActivePreset] = useState('1h');
    const [activeMetrics, setActiveMetrics] = useState(null); // null = all
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ totalPages: 1, page: 1 });

    const sensor = initialSensor;

    // ── Fetch readings ──────────────────────────────────────────────────────────
    const fetchReadings = useCallback(async (targetPage = 1) => {
        setLoading(true);
        try {
            const preset = TIME_PRESETS.find(p => p.key === activePreset) || TIME_PRESETS[3];
            const from = new Date(Date.now() - preset.ms).toISOString();
            const res = await axios.get(
                `/api/sensors/${sensor.id}/readings?limit=20&from=${from}&page=${targetPage}`
            );
            setReadings(res.data.data || []);
            setMeta(res.data.pagination || { totalPages: 1, page: 1 });
            setPage(targetPage);
        } catch (e) {
            console.error('readings fetch error', e);
        } finally {
            setLoading(false);
        }
    }, [sensor.id, activePreset]);

    useEffect(() => { fetchReadings(); }, [fetchReadings]);

    // ── Live socket ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const handler = (data) => {
            if (data.externalId !== sensor.sensorExternalId) return;
            setLiveData(data.payload);
            setIsLive(true);
        };
        socket.on('sensor_data', handler);
        return () => socket.off('sensor_data', handler);
    }, [socket, sensor.sensorExternalId]);

    // ── Derived data ────────────────────────────────────────────────────────────
    const chartData = useMemo(() => toChartData(readings, liveData), [readings, liveData]);

    const metricKeys = useMemo(() => {
        const keys = new Set();
        readings.forEach(r => {
            const flat = flattenObject(r.data || {});
            Object.entries(flat).forEach(([k, v]) => {
                if (k === 'sensor_id' || k === 'timestamp' || k === 'datetime' || k === 'id') return;
                if (typeof v === 'number') keys.add(k);
            });
        });
        return [...keys];
    }, [readings]);

    const displayMetrics = activeMetrics ? metricKeys.filter(k => activeMetrics.includes(k)) : metricKeys;

    const latestValues = useMemo(() => {
        if (liveData) return liveData;
        return readings[readings.length - 1]?.data || {};
    }, [liveData, readings]);

    const getTrend = (key) => {
        if (chartData.length < 2) return undefined;
        const a = chartData[chartData.length - 2]?.[key];
        const b = chartData[chartData.length - 1]?.[key];
        if (a == null || b == null) return undefined;
        return b - a;
    };

    const currentPreset = TIME_PRESETS.find(p => p.key === activePreset);

    // ── Metric toggle helper ────────────────────────────────────────────────────
    const toggleMetric = (k) => {
        setActiveMetrics(prev => {
            if (prev === null) return [k];
            if (prev.includes(k)) {
                const next = prev.filter(x => x !== k);
                return next.length === 0 ? null : next;
            }
            return [...prev, k];
        });
    };

    // ── Render chart ────────────────────────────────────────────────────────────
    const renderChart = () => {
        if (loading) return (
            <div className="sdp-chart-loading">
                <div className="sdp-spinner" />
                <span>Telemetri yükleniyor...</span>
            </div>
        );
        if (!chartData.length) return (
            <div className="sdp-chart-empty">
                <div style={{ fontSize: 48, opacity: .3 }}>📡</div>
                <div>Bu zaman aralığı için veri yok</div>
                <div style={{ fontSize: 11, opacity: .6, marginTop: 4 }}>Sensörün son {currentPreset?.label} içinde okuması yok</div>
            </div>
        );
        const props = { data: chartData, metrics: displayMetrics, theme, latestValues };
        switch (activeChart) {
            case 'area': return <AreaTimelineChart    {...props} />;
            default: return <AreaTimelineChart    {...props} />;
        }
    };

    // ── Return ──────────────────────────────────────────────────────────────────
    return (
        <div className="sdp-root">

            {/* ─── Top bar ──────────────────────────────────── */}
            <div className="sdp-topbar">
                <button className="sdp-back-btn" onClick={onBack}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                    Geri
                </button>

                <div className="sdp-live-pill" style={{ opacity: isLive ? 1 : 0.45 }}>
                    <span className={`sdp-live-dot ${isLive ? 'sdp-live-dot--on' : ''}`} />
                    {isLive ? 'Aktif' : 'STATİK'}
                </div>

                <button className="sdp-csv-btn" onClick={() => downloadCSV(readings, sensor)} disabled={!readings.length}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    CSV Olarak Dışa Aktar
                </button>
            </div>

            {/* ─── Hero ─────────────────────────────────────── */}
            <div className="sdp-hero">
                <div className="sdp-hero-accent" />
                <div>
                    <div className="sdp-node-id">NODE · {sensor.sensorExternalId}</div>
                    <h1 className="sdp-hero-name">{sensor.name || sensor.sensorExternalId}</h1>
                    <div className="sdp-chip-row">
                        {sensor.type && <span className="sdp-chip">{sensor.type}</span>}
                        {sensor.group && <span className="sdp-chip sdp-chip--blue">📂 {sensor.group}</span>}
                        {sensor.company?.name && <span className="sdp-chip">🏢 {sensor.company.name}</span>}
                        {latestValues?.status && (
                            <span className="sdp-chip" style={{
                                color: latestValues.status === 'online' ? '#16a34a' : '#dc2626',
                                background: latestValues.status === 'online' ? '#f0fdf4' : '#fef2f2',
                                borderColor: latestValues.status === 'online' ? '#86efac' : '#fca5a5',
                            }}>
                                {latestValues.status === 'online' ? '🟢 çevrimiçi' : '🔴 çevrimdışı'}
                            </span>
                        )}
                    </div>
                </div>
                <div className="sdp-hero-stats">
                    <div className="sdp-hero-stat">
                        <div className="sdp-hero-stat-num">{readings.length}</div>
                        <div className="sdp-hero-stat-lbl">Okuma</div>
                    </div>
                    <div className="sdp-hero-stat">
                        <div className="sdp-hero-stat-num">{metricKeys.length}</div>
                        <div className="sdp-hero-stat-lbl">Metrik</div>
                    </div>
                </div>
            </div>

            {/* ─── Telemetry History ────────────────────────── */}
            <SectionCard title="Telemetri Geçmişi" icon="📈" badge={`${chartData.length} nokta`}>

                {/* Time presets */}
                <div className="sdp-preset-row">
                    {TIME_PRESETS.map(p => (
                        <button
                            key={p.key}
                            className={`sdp-preset-btn ${activePreset === p.key ? 'sdp-preset-btn--active' : ''}`}
                            onClick={() => setActivePreset(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button className="sdp-preset-btn sdp-preset-refresh" onClick={fetchReadings} disabled={loading}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" className={loading ? 'sdp-spin' : ''}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {/* Chart tabs */}
                <div className="sdp-chart-tabs">
                    {CHART_TABS.map(t => (
                        <button
                            key={t.key}
                            className={`sdp-chart-tab ${activeChart === t.key ? 'sdp-chart-tab--active' : ''}`}
                            onClick={() => setActiveChart(t.key)}
                            title={t.desc}
                        >
                            <span>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>

                {/* Metric filter chips */}
                {metricKeys.length > 1 && activeChart !== 'gauge' && (
                    <div className="sdp-metric-filter">
                        <span className="sdp-metric-filter-label">Metrikler:</span>
                        <button
                            className={`sdp-mchip ${activeMetrics === null ? 'sdp-mchip--active' : ''}`}
                            onClick={() => setActiveMetrics(null)}
                        >Tümü</button>
                        {metricKeys.map(k => {
                            const m = metaMeta(k);
                            const active = activeMetrics?.includes(k);
                            return (
                                <button
                                    key={k}
                                    className={`sdp-mchip ${active ? 'sdp-mchip--active' : ''}`}
                                    style={active ? { borderColor: m.color, color: m.color, background: m.color + '12' } : {}}
                                    onClick={() => toggleMetric(k)}
                                >
                                    {m.icon} {k}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Chart */}
                <div className="sdp-chart-body">
                    {renderChart()}
                </div>
            </SectionCard>

            {/* ─── Raw Readings Table ───────────────────────── */}
            <SectionCard title="Ham Okumalar" icon="🗄️" badge={`${readings.length} kayıt`}>
                <div className="sdp-table-wrap">
                    <table className="sdp-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Zaman Damgası</th>
                                {metricKeys.map(k => <th key={k}>{k}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {readings.length === 0 ? (
                                <tr><td colSpan={metricKeys.length + 2} style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 12 }}>Bu zaman aralığında okuma yok</td></tr>
                            ) : (
                                readings.map((r, i) => (
                                    <tr key={r.id}>
                                        <td className="sdp-td-idx">{(meta.page - 1) * 20 + i + 1}</td>
                                        <td className="sdp-td-time">{fmtFull(r.timestamp)}</td>
                                        {metricKeys.map(k => {
                                            const v = r.data?.[k];
                                            const m = metaMeta(k);
                                            return (
                                                <td key={k} style={{ color: m.color, fontFamily: 'monospace', fontWeight: 900, fontSize: 12, padding: '10px 16px' }}>
                                                    {v !== undefined && v !== null ? String(v) : <span style={{ opacity: .3 }}>—</span>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {meta.totalPages > 1 && (
                    <div className="sdp-pagination">
                        <button disabled={meta.page <= 1} onClick={() => fetchReadings(meta.page - 1)}>Geri</button>
                        <span>Sayfa {meta.page} / {meta.totalPages}</span>
                        <button disabled={meta.page >= meta.totalPages} onClick={() => fetchReadings(meta.page + 1)}>İleri</button>
                    </div>
                )}
            </SectionCard>

            {/* ─── Sensor Info ─────────────────────────────── */}
            <SectionCard title="Sensör Bilgileri" icon="ℹ️">
                <div className="sdp-info-grid">
                    {[
                        ['Sensör Kimliği (DB)', sensor.id],
                        ['Harici Kimlik', sensor.sensorExternalId],
                        ['Ad', sensor.name || '—'],
                        ['Tip', sensor.type || '—'],
                        ['Grup', sensor.group || '—'],
                        ['Şirket', sensor.company?.name || '—'],
                        ['Oluşturulma', fmtFull(sensor.createdAt)],
                        ['Son Güncelleme', fmtFull(sensor.updatedAt)],
                    ].map(([label, value]) => (
                        <div key={label} className="sdp-info-item">
                            <div className="sdp-info-label">{label}</div>
                            <div className="sdp-info-value">{value}</div>
                        </div>
                    ))}
                </div>
            </SectionCard>

        </div>
    );
};

export default SensorDetailPage;
