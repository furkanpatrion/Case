/**
 * sensorOverrides.js — Sensör başına manuel override yönetimi
 *
 * Sözdizimi özeti (Send Command → action alanı):
 *
 *   {}                         → Tüm override'ları sil, faker kontrolüne bırak
 *   {"status":"offline"}       → Tüm payload'ı kilitle (faker hiçbir alana dokunamaz)
 *   status:offline             → Sadece o alanı kilitle (faker diğerlerini günceler)
 *   status                     → O alanın kilidini aç, faker kontrolüne bırak
 *
 * Tip otomatik tespiti (key:value):
 *   true / false → boolean  |  42 / 3.14 → number  |  diğerleri → string
 */

const overrides = new Map(); // Map<externalId, { field: value } | { __full__: payload }>
const FULL_KEY = '__full__';

/** Verilen sensörün tüm override'larını sil */
const clearOverride = (externalId) => {
    const had = overrides.has(externalId);
    overrides.delete(externalId);
    return had;
};

/** Tek bir alanı kilitle */
const setFieldOverride = (externalId, field, value) => {
    if (field === FULL_KEY) return;

    const curr = overrides.get(externalId);

    if (curr && curr[FULL_KEY]) {
        // Full override varsa içine ekle
        overrides.set(externalId, {
            [FULL_KEY]: { ...curr[FULL_KEY], [field]: value }
        });
    } else {
        overrides.set(externalId, { ...(curr || {}), [field]: value });
    }
};

/** Tek bir alanın kilidini aç (faker'a bırak) */
const clearFieldOverride = (externalId, field) => {
    const curr = overrides.get(externalId);
    if (!curr) return;

    if (curr[FULL_KEY]) {
        const payload = { ...curr[FULL_KEY] };
        delete payload[field];
        overrides.set(externalId, { [FULL_KEY]: payload });
    } else {
        const updated = { ...curr };
        delete updated[field];
        if (Object.keys(updated).length === 0) {
            overrides.delete(externalId);
        } else {
            overrides.set(externalId, updated);
        }
    }
};

/** Tüm payload'ı kilitle — faker hiçbir alana dokunamaz */
const setFullOverride = (externalId, payload) => {
    overrides.set(externalId, { [FULL_KEY]: payload });
};

/** Mevcut override'ı döndür (debug için) */
const getOverride = (externalId) => overrides.get(externalId) || null;

const deepMerge = (target, source) => {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
};

/**
 * Faker payload'ına override uygula.
 * - Full override → faker payload tamamen yok sayılır,
 *   sadece sensor_id ve timestamp korunur
 * - Alan bazlı override → sadece kilitli alanlar değişmez
 */
const applyOverride = (externalId, basePayload) => {
    const ov = overrides.get(externalId);
    if (!ov) return basePayload;

    if (ov[FULL_KEY]) {
        // Template olarak kullan ama timestamp ve sensor_id'yi faker'dan (taze olanı) al
        const mergedPayload = deepMerge({ ...basePayload }, ov[FULL_KEY]);
        mergedPayload.sensor_id = externalId; // Ensure correct sensor_id
        mergedPayload.timestamp = basePayload.timestamp; // Ensure fresh timestamp
        return mergedPayload;
    }

    // Alan bazlı: override alanlarını kazanır
    return { ...basePayload, ...ov };
};

/**
 * Raw komut string'ini parse et.
 *
 * Returns:
 *   { type: 'clear_all' }
 *   { type: 'full_json', value: {...} }
 *   { type: 'field_set', key, value }
 *   { type: 'field_clear', key }
 *   { type: 'unknown', raw }
 */
const parseCommandAction = (raw = '') => {
    const trimmed = raw.trim();

    // {} veya boş → tüm override'ları temizle
    if (trimmed === '{}' || trimmed === '') {
        return { type: 'clear_all' };
    }

    // {..} → tam JSON payload override
    if (trimmed.startsWith('{')) {
        try {
            const json = JSON.parse(trimmed);
            if (typeof json === 'object' && !Array.isArray(json)) {
                return { type: 'full_json', value: json };
            }
        } catch {
            // parse hatası → unknown
        }
        return { type: 'unknown', raw: trimmed };
    }

    // key:value → tek alan override
    if (trimmed.includes(':')) {
        const colonIdx = trimmed.indexOf(':');
        const key = trimmed.slice(0, colonIdx).trim();
        const rawVal = trimmed.slice(colonIdx + 1).trim();
        const value = parseTypedValue(rawVal);
        if (key) return { type: 'field_set', key, value };
    }

    // Sadece key → o alanın override'ını kaldır
    if (/^[a-zA-Z_]\w*$/.test(trimmed)) {
        return { type: 'field_clear', key: trimmed };
    }

    return { type: 'unknown', raw: trimmed };
};

/**
 * String değeri en uygun JS tipine çevirir.
 * "true" → boolean, "42" → number, "offline" → string
 */
const parseTypedValue = (raw) => {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;

    const num = Number(raw);
    if (!isNaN(num) && raw.trim() !== '') return num;

    // Tırnaklı string
    if ((raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))) {
        return raw.slice(1, -1);
    }

    return raw; // plain string
};

module.exports = {
    clearOverride,
    setFieldOverride,
    clearFieldOverride,
    setFullOverride,
    getOverride,
    applyOverride,
    parseCommandAction,
};
