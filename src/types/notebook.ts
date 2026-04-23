export type PageTemplate = 'blank' | 'lined' | 'grid' | 'dotted';
export type PageOrientation = 'portrait' | 'landscape';

export interface NotebookElement {
  id: string;
  type: 'text' | 'path' | 'image' | 'shape';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex: number;
  
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  backgroundColor?: string;
  outlineStyle?: 'none' | 'solid' | 'dashed' | 'double';
  outlineColor?: string;
  
  // Path specific
  points?: number[];
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  isHighlighter?: boolean;
  isEraser?: boolean;
  penType?: string;
  
  // Image specific
  src?: string;
  hue?: number;
  saturation?: number;
  brightness?: number;
  flipX?: boolean;
  removeBg?: boolean;
  bgThreshold?: number;
  filter?: string;
  shapeType?: 'rect' | 'circle' | 'triangle' | 'arrow' | 'star' | 'diamond' | 'hexagon' | 'line' | 'arrow-left' | 'arrow-both' | 'arrow-up' | 'arrow-down' | 'axis-xy' | 'axis-x' | 'heart' | 'bubble-speech' | 'bubble-thought' | 'bracket' | 'curly';

  // Formatting
  fontStyle?: string;
  align?: string;
  dir?: string;
}

export interface NotebookPage {
  id: string;
  title: string;
  createdAt: string;
  dueDate?: string;
  orientation: PageOrientation;
  template: PageTemplate;
  elements: NotebookElement[];
  isSubpage?: boolean;
  parentId?: string; // If it's a "next page"
}

export interface NotebookSection {
  id: string;
  name: string;
  color: string;
  pages: NotebookPage[];
}

export interface NotebookSectionGroup {
  id: string;
  name: string;
  sections: NotebookSection[];
}

export interface Notebook {
  id: string;
  name: string;
  coverImage?: string;
  sectionGroups: NotebookSectionGroup[];
  sections: NotebookSection[]; // Root level sections
  createdAt: string;
  updatedAt: string;
  lastPageId?: string;
}

export interface TrashedItem {
  id: string;
  type: 'page' | 'section' | 'group';
  item: NotebookPage | NotebookSection | NotebookSectionGroup;
  originalParentId: string | null;
  originalNotebookId: string;
  deletedAt: string;
}

export interface NotebookStore {
  notebooks: Notebook[];
  trashedItems: TrashedItem[];
  activeNotebookId: string | null;
  activeSectionId: string | null;
  activePageId: string | null;
  isDriveConnected: boolean;
  isLoading: boolean;
}
