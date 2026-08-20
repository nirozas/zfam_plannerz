export type CardType = 'folder' | 'list';

export interface Card {
    id: string;
    parentId: string | null;
    type: CardType;
    title: string;
    description?: string;
    coverImage?: string;
    createdAt: string;
    lastViewedAt: string;
    sharedWith: string[]; // user ids
    content?: string; // For 'list' type, HTML or JSON from rich text editor
    // Logic fields
    itemCount?: number; // for folders
    lineCount?: number; // for lists
    width?: number; // deprecated: use colSpan
    height?: number; // deprecated: use rowSpan
    colSpan?: number; // New grid spanning (e.g. 1, 2)
    rowSpan?: number; // New grid spanning (e.g. 1, 2)
    url?: string;
    hasBody?: boolean;
    rating?: number; // 1-5
    backgroundUrl?: string;
    backgroundType?: 'color' | 'image';
    backgroundOpacity?: number; // 0-100
    category?: string;
    notes?: { id: string; text: string; createdAt: string; sentiment?: 'positive' | 'negative' | 'neutral' }[];
    canvasData?: any[]; // For 'list' type shapes/annotations
    groups?: { id: string; name: string; items: any[] }[]; // For structured list grouping
    x?: number;
    y?: number;
    sortOrder?: number;
}

export interface BreadcrumbItem {
    id: string | null;
    title: string;
}
