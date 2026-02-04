export interface Vector2d {
    x: number;
    y: number;
}

export interface InkPath {
    id: string;
    points: number[];
    pressures?: number[]; // Pressure values (0.0 to 1.0)
    color: string;
    width: number;
    opacity: number;
    brushType?: 'pen' | 'pencil' | 'brush' | 'spray';
}

export interface PlannerElement {
    id: string;
    type: 'image' | 'sticker' | 'text' | 'shape' | 'sticky-note' | 'widget' | 'todo-list' | 'voice' | 'background' | 'path' | 'ocr_metadata';
    x: number;
    y: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    zIndex?: number;
    src?: string;
    url?: string;
    text?: string;
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    width?: number;
    height?: number;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    filter?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderDash?: number[];
    borderStyle?: 'solid' | 'dashed' | 'double';
    isLocked?: boolean;
    isVisible?: boolean;
    props?: any;
    shapeType?: string;
    filled?: boolean;
    points?: number[];
    tool?: string;
    duration?: number;
}

export interface PlannerPage {
    id: string;
    templateId: string;
    inkPaths: InkPath[];
    elements: PlannerElement[];
    isLocked?: boolean;
    section?: string | null; // e.g. 'JAN', 'FEB', or any custom category
    category?: string | null; // Explicit category column
    year?: number | null;    // Year of the page
    month?: string | null;   // Month of the page
    name?: string | null;    // Custom page title
    page_number?: number; // Optional page index
    layout?: 'portrait' | 'landscape' | 'square' | 'double-width' | 'widescreen' | 'custom';
    dimensions?: { width: number; height: number };
    links?: Link[];
    thumbnail?: string; // Data URL or Image URL for preview
    ink_transcription?: string; // AI generated text from handwriting
}

export interface Link {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    targetPageIndex?: number;
    url?: string;
    type: 'hotspot';
    note?: string;
}

export interface Planner {
    id: string;
    name: string;
    category?: string;
    coverColor?: string;
    cover_url?: string; // URL for cover image
    pages: PlannerPage[];
    currentPageIndex: number;
    binderStyle?: {
        color: string;
        texture: string;
    };
    customTabs?: string[]; // Right side (Months)
    leftTabs?: string[];   // Left side (Sections)
    topTabs?: string[];    // Top side (Quick Categories)
    useSpreadView?: boolean;
    isArchived?: boolean;
    archivedAt?: string;
    createdAt?: string;
    isFavorite?: boolean; // New property for favorites
}
export interface BulkOptions {
    count: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate?: string;
}

export const PAGE_PRESETS = [
    { name: 'A4 Portrait', width: 794, height: 1123, layout: 'portrait' as const },
    { name: 'A4 Landscape', width: 1123, height: 794, layout: 'landscape' as const },
    { name: 'Postcard', width: 394, height: 583, layout: 'custom' as const },
    { name: 'Index Card', width: 300, height: 500, layout: 'custom' as const },
    { name: 'Tabloid', width: 1100, height: 1700, layout: 'custom' as const },
    { name: 'Custom', width: 0, height: 0, layout: 'custom' as const }
] as const;
