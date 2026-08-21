import { create } from 'zustand';
import { supabase } from '../supabase/client';
import { Tracker, HealthEntry, PRESET_QUALITATIVE_TRACKERS, PRESET_QUANTITATIVE_TRACKERS } from '../types/health';

// ─── Demo Data Generator ──────────────────────
function generateDemoEntries(trackers: Tracker[]): HealthEntry[] {
  const entries: HealthEntry[] = [];
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  for (const tracker of trackers) {
    const current = new Date(ninetyDaysAgo);
    let idx = 0;
    while (current <= now) {
      const dateStr = current.toISOString().split('T')[0];
      // Skip ~15% of days so it looks natural
      if (Math.random() > 0.15) {
        const entryId = `demo_${tracker.id}_${idx++}`;
        if (tracker.type === 'qualitative' && tracker.values && tracker.values.length > 0) {
          // Weighted random — prefer middle-ish values
          const weights = tracker.values.map((_, i) => {
            const mid = (tracker.values!.length - 1) / 2;
            return Math.exp(-0.5 * Math.pow((i - mid) / 1.5, 2));
          });
          const total = weights.reduce((a, b) => a + b, 0);
          let r = Math.random() * total;
          let chosen = tracker.values[0];
          for (let i = 0; i < tracker.values.length; i++) {
            r -= weights[i];
            if (r <= 0) { chosen = tracker.values[i]; break; }
          }
          entries.push({
            id: entryId,
            trackerId: tracker.id,
            date: dateStr,
            qualitativeValueId: chosen.id,
            createdAt: new Date(current).toISOString(),
          });
        } else if (tracker.type === 'quantitative') {
          let value = 0;
          // Realistic ranges per metric
          switch (tracker.unit) {
            case 'kg':    value = 72 + (Math.random() - 0.5) * 4 - (idx * 0.01); break;
            case 'kcal':  value = Math.round(1600 + Math.random() * 800); break;
            case 'bpm':   value = Math.round(58 + Math.random() * 30); break;
            case 'steps': value = Math.round(4000 + Math.random() * 9000); break;
            case 'hrs':   value = Math.round((5 + Math.random() * 4) * 10) / 10; break;
            case 'ml':    value = Math.round(1200 + Math.random() * 1600); break;
            case 'mg/dL': value = Math.round(75 + Math.random() * 50); break;
            default:      value = Math.round(Math.random() * 100);
          }
          entries.push({
            id: entryId,
            trackerId: tracker.id,
            date: dateStr,
            numericValue: Math.round(value * 10) / 10,
            createdAt: new Date(current).toISOString(),
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }
  }
  return entries;
}

// ─── Store Interface ───────────────────────────
interface HealthStore {
  trackers: Tracker[];
  entries: HealthEntry[];
  isFetching: boolean;
  isDemoMode: boolean;

  fetchAll: () => Promise<void>;
  addTracker: (tracker: Omit<Tracker, 'id' | 'createdAt'>) => Promise<void>;
  updateTracker: (id: string, updates: Partial<Tracker>) => Promise<void>;
  deleteTracker: (id: string) => Promise<void>;
  addEntry: (entry: Omit<HealthEntry, 'id' | 'createdAt'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<HealthEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  initWithPresets: () => Promise<void>;
  getEntriesForTracker: (trackerId: string) => HealthEntry[];
}

const LOCAL_TRACKERS_KEY = 'health_trackers_v1';
const LOCAL_ENTRIES_KEY = 'health_entries_v1';
const LOCAL_DEMO_KEY = 'health_demo_initialized_v1';

function loadLocal<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

function saveLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const useHealthStore = create<HealthStore>((set, get) => ({
  trackers: [],
  entries: [],
  isFetching: false,
  isDemoMode: true,

  fetchAll: async () => {
    set({ isFetching: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Load from localStorage for guest users
        const trackers = loadLocal<Tracker>(LOCAL_TRACKERS_KEY);
        const entries = loadLocal<HealthEntry>(LOCAL_ENTRIES_KEY);
        set({ trackers, entries, isFetching: false, isDemoMode: false });

        // Auto-init with presets + demo data if first time
        if (trackers.length === 0 && !localStorage.getItem(LOCAL_DEMO_KEY)) {
          get().initWithPresets();
        }
        return;
      }

      // Supabase fetch for authenticated users
      const [trackersRes, entriesRes] = await Promise.all([
        supabase.from('health_trackers').select('*').eq('user_id', user.id).order('sort_order'),
        supabase.from('health_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      ]);

      if (trackersRes.error) throw trackersRes.error;
      if (entriesRes.error) throw entriesRes.error;

      const trackers = (trackersRes.data || []).map(rowToTracker).map(patchTrackerColors);
      const entries = (entriesRes.data || []).map(rowToEntry);

      set({ trackers, entries, isFetching: false, isDemoMode: false });

      if (trackers.length === 0) {
        get().initWithPresets();
      }
    } catch (err) {
      console.error('health fetchAll error:', err);
      // Fallback to localStorage
      const trackers = loadLocal<Tracker>(LOCAL_TRACKERS_KEY).map(patchTrackerColors);
      const entries = loadLocal<HealthEntry>(LOCAL_ENTRIES_KEY);
      set({ trackers, entries, isFetching: false });
    }
  },

  initWithPresets: async () => {
    const now = new Date().toISOString();
    const allPresets = [...PRESET_QUALITATIVE_TRACKERS, ...PRESET_QUANTITATIVE_TRACKERS];
    const trackers: Tracker[] = allPresets.map((p, i) => ({
      ...p,
      id: `tracker_${Date.now()}_${i}`,
      createdAt: now,
      sortOrder: i,
    }));

    const demoEntries = generateDemoEntries(trackers);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to insert into Supabase
        await supabase.from('health_trackers').insert(trackers.map(trackerToRow));
        if (demoEntries.length > 0) {
          await supabase.from('health_entries').insert(demoEntries.map(entryToRow));
        }
      }
    } catch {/* silently fall through to localStorage */}

    saveLocal(LOCAL_TRACKERS_KEY, trackers);
    saveLocal(LOCAL_ENTRIES_KEY, demoEntries);
    localStorage.setItem(LOCAL_DEMO_KEY, 'true');
    set({ trackers, entries: demoEntries });
  },

  addTracker: async (trackerData) => {
    const tracker: Tracker = {
      ...trackerData,
      id: `tracker_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('health_trackers').insert(trackerToRow({ ...tracker, userId: user.id }));
      }
    } catch {/**/}

    const trackers = [...get().trackers, tracker];
    saveLocal(LOCAL_TRACKERS_KEY, trackers);
    set({ trackers });
  },

  updateTracker: async (id, updates) => {
    const trackers = get().trackers.map(t => t.id === id ? { ...t, ...updates } : t);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('health_trackers').update(updates).eq('id', id);
    } catch {/**/}
    saveLocal(LOCAL_TRACKERS_KEY, trackers);
    set({ trackers });
  },

  deleteTracker: async (id) => {
    const trackers = get().trackers.filter(t => t.id !== id);
    const entries = get().entries.filter(e => e.trackerId !== id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('health_entries').delete().eq('tracker_id', id);
        await supabase.from('health_trackers').delete().eq('id', id);
      }
    } catch {/**/}
    saveLocal(LOCAL_TRACKERS_KEY, trackers);
    saveLocal(LOCAL_ENTRIES_KEY, entries);
    set({ trackers, entries });
  },

  addEntry: async (entryData) => {
    // For qualitative trackers (calendar), replace if there's already an entry for this date
    // For quantitative trackers (stats), allow multiple entries per day
    const tracker = get().trackers.find(t => t.id === entryData.trackerId);
    if (tracker?.type === 'qualitative') {
      const existing = get().entries.find(e => e.trackerId === entryData.trackerId && e.date === entryData.date);
      if (existing) {
        get().updateEntry(existing.id, {
          qualitativeValueId: entryData.qualitativeValueId,
          numericValue: entryData.numericValue,
          note: entryData.note,
        });
        return;
      }
    }
    const entry: HealthEntry = {
      ...entryData,
      id: `entry_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('health_entries').insert(entryToRow({ ...entry, userId: user.id }));
    } catch {/**/}
    const entries = [...get().entries, entry];
    saveLocal(LOCAL_ENTRIES_KEY, entries);
    set({ entries });
  },

  updateEntry: async (id, updates) => {
    const entries = get().entries.map(e => e.id === id ? { ...e, ...updates } : e);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('health_entries').update(updates).eq('id', id);
    } catch {/**/}
    saveLocal(LOCAL_ENTRIES_KEY, entries);
    set({ entries });
  },

  deleteEntry: async (id) => {
    const entries = get().entries.filter(e => e.id !== id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('health_entries').delete().eq('id', id);
    } catch {/**/}
    saveLocal(LOCAL_ENTRIES_KEY, entries);
    set({ entries });
  },

  getEntriesForTracker: (trackerId) => {
    return get().entries.filter(e => e.trackerId === trackerId);
  },
}));

// ─── Data Migrations / Patching ───────────────
function patchTrackerColors(t: Tracker): Tracker {
  let modified = { ...t };
  
  if (modified.color === '#6366f1') {
    modified.color = '#D4B4E8';
  }

  if (modified.type === 'qualitative' && modified.name) {
    const preset = PRESET_QUALITATIVE_TRACKERS.find(p => p.name === modified.name);
    if (preset && preset.values && modified.values) {
      const colorMap = new Map(preset.values.map(v => [v.label, v.color]));
      modified.values = modified.values.map(v => ({
        ...v,
        color: colorMap.get(v.label) || v.color
      }));
    }
  }
  return modified;
}

// ─── Row Mappers ──────────────────────────────
function rowToTracker(row: any): Tracker {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    subtitle: row.subtitle,
    emoji: row.emoji,
    type: row.type,
    displayMode: row.display_mode,
    values: row.values ? JSON.parse(row.values) : undefined,
    unit: row.unit,
    chartType: row.chart_type,
    goalValue: row.goal_value,
    referenceMin: row.reference_min,
    referenceMax: row.reference_max,
    color: row.color,
    createdAt: row.created_at,
    sortOrder: row.sort_order ?? 0,
  };
}

function trackerToRow(t: Tracker) {
  return {
    id: t.id,
    user_id: t.userId,
    name: t.name,
    subtitle: t.subtitle,
    emoji: t.emoji,
    type: t.type,
    display_mode: t.displayMode,
    values: t.values ? JSON.stringify(t.values) : null,
    unit: t.unit,
    chart_type: t.chartType,
    goal_value: t.goalValue,
    reference_min: t.referenceMin,
    reference_max: t.referenceMax,
    color: t.color,
    sort_order: t.sortOrder,
    created_at: t.createdAt,
  };
}

function rowToEntry(row: any): HealthEntry {
  return {
    id: row.id,
    trackerId: row.tracker_id,
    userId: row.user_id,
    date: row.date,
    dateEnd: row.date_end,
    qualitativeValueId: row.qualitative_value_id,
    numericValue: row.numeric_value,
    note: row.note,
    createdAt: row.created_at,
  };
}

function entryToRow(e: HealthEntry) {
  return {
    id: e.id,
    tracker_id: e.trackerId,
    user_id: e.userId,
    date: e.date,
    date_end: e.dateEnd,
    qualitative_value_id: e.qualitativeValueId,
    numeric_value: e.numericValue,
    note: e.note,
    created_at: e.createdAt,
  };
}
