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
    width?: number;
    height?: number;
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
}

export interface BreadcrumbItem {
    id: string | null;
    title: string;
}
