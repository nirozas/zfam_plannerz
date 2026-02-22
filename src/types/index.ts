export type PlannerType = 'Calendar' | 'Notes' | 'Custom';

export interface Planner {
    id: string;
    name: string;
    type: PlannerType;
    cover_url?: string; // URL to custom cover image
    structure: 'Annual' | 'Monthly' | 'Weekly' | 'Freeform';
    coverColor?: string; // Legacy/Fallback color
    created_at: string;
    updated_at: string;
    user_id: string;
    isFavorite?: boolean;
    category?: string;
    isArchived?: boolean;
}

export type ElementType = 'text' | 'image' | 'sticker' | 'path';

export interface CanvasElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    zIndex: number;
    opacity: number;
    data: any; // Specific to element type (e.g., text content, image URL, svg path)
}

export interface Page {
    id: string;
    planner_id: string;
    template_id: string;
    page_number: number;
    elements: CanvasElement[];
}

export interface Template {
    id: string;
    name: string;
    category: 'Daily' | 'Weekly' | 'Monthly' | 'Finance' | 'Notes';
    thumbnail_url: string;
    content_url: string; // URL to the template base (SVG or image)
}

export type AIFeature = 'ink-to-text' | 'summarize' | 'sound-to-text' | 'ink-to-artwork' | 'smart-tasks' | 'creative-summary' | 'improve-handwriting';

export type BrushType = 'pen' | 'pencil' | 'marker' | 'fountain' | 'calligraphy' | 'art';

export type EraserType = 'pixel' | 'stroke' | 'object';

export type ShapeType = 'line' | 'arrow' | 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'star' | 'hexagon' | 'pentagon' | 'octagon';

export interface PageData {
    lines: any[];
    texts: any[];
    shapes: any[];
}
