// ─────────────────────────────────────────────
// Health Tracker Types
// ─────────────────────────────────────────────

export type TrackerType = 'qualitative' | 'quantitative' | 'body_measurements';
export type DisplayMode = 'year_in_pixels' | 'contribution_graph';
export type ChartType = 'area' | 'bar' | 'line';

export interface QualitativeValue {
  id: string;
  label: string;
  emoji?: string;
  color: string;
}

export interface Tracker {
  id: string;
  userId?: string;
  name: string;
  emoji: string;
  type: TrackerType;
  displayMode?: DisplayMode;
  values?: QualitativeValue[];
  unit?: string;
  chartType?: ChartType;
  goalValue?: number;
  referenceMin?: number;
  referenceMax?: number;
  color?: string;
  createdAt: string;
  sortOrder: number;
}

export interface HealthEntry {
  id: string;
  trackerId: string;
  userId?: string;
  date: string; // 'YYYY-MM-DD'
  dateEnd?: string;
  qualitativeValueId?: string;
  numericValue?: number;
  note?: string;
  createdAt: string;
}

export const PRESET_QUALITATIVE_TRACKERS: Omit<Tracker, 'id' | 'userId' | 'createdAt' | 'sortOrder'>[] = [
  {
    name: 'Mood',
    emoji: '🌈',
    type: 'qualitative',
    displayMode: 'year_in_pixels',
    values: [
      { id: 'v1', label: 'Ecstatic', emoji: '🤩', color: '#B6E9F0' },
      { id: 'v2', label: 'Happy', emoji: '😊', color: '#BDF0D8' },
      { id: 'v3', label: 'Calm', emoji: '😌', color: '#D8F2C9' },
      { id: 'v4', label: 'Neutral', emoji: '😐', color: '#EDF7CB' },
      { id: 'v5', label: 'Tired', emoji: '😴', color: '#FBF6E2' },
      { id: 'v6', label: 'Sad', emoji: '😢', color: '#FCEBC7' },
      { id: 'v7', label: 'Anxious', emoji: '😨', color: '#FFE2C2' },
      { id: 'v8', label: 'Angry', emoji: '😠', color: '#FFD2CF' },
      { id: 'v9', label: 'Sick', emoji: '🤢', color: '#D4B4E8' },
      { id: 'v10', label: 'Depressed', emoji: '🌑', color: '#C2CEFF' },
    ],
  },
  {
    name: 'Energy',
    emoji: '⚡',
    type: 'qualitative',
    displayMode: 'year_in_pixels',
    values: [
      { id: 'v1', label: 'Supercharged', emoji: '🔥', color: '#B6E9F0' },
      { id: 'v2', label: 'High', emoji: '⚡', color: '#D8F2C9' },
      { id: 'v3', label: 'Good', emoji: '✅', color: '#FBF6E2' },
      { id: 'v4', label: 'Average', emoji: '🔄', color: '#FFE2C2' },
      { id: 'v5', label: 'Low', emoji: '🔋', color: '#D4B4E8' },
      { id: 'v6', label: 'Drained', emoji: '💤', color: '#C2CEFF' },
    ],
  },
  {
    name: 'Sleep Quality',
    emoji: '🌙',
    type: 'qualitative',
    displayMode: 'year_in_pixels',
    values: [
      { id: 'v1', label: 'Excellent', emoji: '⭐', color: '#B6E9F0' },
      { id: 'v2', label: 'Good', emoji: '😊', color: '#D8F2C9' },
      { id: 'v3', label: 'OK', emoji: '😐', color: '#FCEBC7' },
      { id: 'v4', label: 'Poor', emoji: '😵', color: '#FFD2CF' },
      { id: 'v5', label: 'Terrible', emoji: '💀', color: '#C2CEFF' },
    ],
  },
  {
    name: 'Stress',
    emoji: '🧠',
    type: 'qualitative',
    displayMode: 'year_in_pixels',
    values: [
      { id: 'v1', label: 'Zen', emoji: '🧘', color: '#B6E9F0' },
      { id: 'v2', label: 'Calm', emoji: '😌', color: '#D8F2C9' },
      { id: 'v3', label: 'Mild', emoji: '😶', color: '#FCEBC7' },
      { id: 'v4', label: 'Stressed', emoji: '😬', color: '#FFD2CF' },
      { id: 'v5', label: 'Overwhelmed', emoji: '🤯', color: '#C2CEFF' },
    ],
  },
  {
    name: '1-10 Rating',
    emoji: '🔟',
    type: 'qualitative',
    displayMode: 'year_in_pixels',
    values: [
      { id: 'v1', label: '1', emoji: '1️⃣', color: '#B6E9F0' },
      { id: 'v2', label: '2', emoji: '2️⃣', color: '#BDF0D8' },
      { id: 'v3', label: '3', emoji: '3️⃣', color: '#D8F2C9' },
      { id: 'v4', label: '4', emoji: '4️⃣', color: '#EDF7CB' },
      { id: 'v5', label: '5', emoji: '5️⃣', color: '#FBF6E2' },
      { id: 'v6', label: '6', emoji: '6️⃣', color: '#FCEBC7' },
      { id: 'v7', label: '7', emoji: '7️⃣', color: '#FFE2C2' },
      { id: 'v8', label: '8', emoji: '8️⃣', color: '#FFD2CF' },
      { id: 'v9', label: '9', emoji: '9️⃣', color: '#D4B4E8' },
      { id: 'v10', label: '10', emoji: '🔟', color: '#C2CEFF' },
    ],
  },
];

export const PRESET_QUANTITATIVE_TRACKERS: Omit<Tracker, 'id' | 'userId' | 'createdAt' | 'sortOrder'>[] = [
  { name: 'Weight', emoji: '⚖️', type: 'quantitative', unit: 'kg', chartType: 'area', color: '#D4B4E8' },
  { name: 'Calories', emoji: '🔥', type: 'quantitative', unit: 'kcal', chartType: 'bar', goalValue: 2000, color: '#f97316' },
  { name: 'Heart Rate', emoji: '❤️', type: 'quantitative', unit: 'bpm', chartType: 'line', referenceMin: 60, referenceMax: 100, color: '#ef4444' },
  { name: 'Steps', emoji: '👟', type: 'quantitative', unit: 'steps', chartType: 'bar', goalValue: 10000, color: '#22c55e' },
  { name: 'Sleep Hours', emoji: '😴', type: 'quantitative', unit: 'hrs', chartType: 'bar', goalValue: 8, referenceMin: 7, referenceMax: 9, color: '#8b5cf6' },
  { name: 'Water', emoji: '💧', type: 'quantitative', unit: 'ml', chartType: 'bar', goalValue: 2500, color: '#06b6d4' },
  { name: 'Blood Glucose', emoji: '🩸', type: 'quantitative', unit: 'mg/dL', chartType: 'line', referenceMin: 70, referenceMax: 140, color: '#f43f5e' },
];
