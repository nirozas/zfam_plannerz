import { create } from 'zustand';
import type { Planner, PlannerPage, PlannerElement, InkPath } from '../types/planner';
import { PAGE_PRESETS } from '../types/planner';
import { supabase } from '../lib/supabase';
import { performOCR } from '../utils/ocr'; // Fixed Import

// ... (keep helper functions same)



export const generateUUID = () => {
    if (typeof window !== 'undefined' && window.crypto && (window.crypto as any).randomUUID) {
        return (window.crypto as any).randomUUID();
    }
    // Fallback implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Professional slugification for names
export const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]+/g, '')  // Remove all non-word chars
        .replace(/--+/g, '-')     // Replace multiple - with single -
        .replace(/^-+/, '')       // Trim - from start of text
        .replace(/-+$/, '');      // Trim - from end of text
};

// Normalize legacy element structures (flattening props)
export const normalizeElement = (el: any): any => {
    if (!el) return el;
    if (el.props) {
        const { props, ...rest } = el;
        // Merge props into flat object, prioritizing flat values if they somehow exist
        return { ...props, ...rest };
    }
    return el;
};

// Helper to fetch template from either templates or assets table
const fetchTemplateOrAsset = async (id: string) => {
    // 1. Try templates table (Complex Templates)
    const { data: template } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (template) return template;

    // 2. Try assets table (Simple Templates)
    const { data: asset } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (asset) {
        return {
            ...asset,
            preview_url: asset.url,
            template_data: {
                backgroundImage: asset.url,
                elements: []
            }
        };
    }

    return null;
};

export type ViewType = 'home' | 'workspace' | 'settings' | 'admin';

interface PlannerState {
    view: ViewType;
    user: any | null; // Supabase user
    activePlanner: Planner | null;
    activePlannerId: string | null; // For URL routing
    availablePlanners: Planner[]; // Local cache of available planners
    searchResults: { type: 'planner' | 'page'; id: string; plannerId: string; name: string; pageIndex: number; snippet: string; rank: number }[];
    isSearching: boolean;
    currentPageIndex: number;
    exportTriggered: number; // Timestamp for export event
    isVoiceListening: boolean;
    isReadOnly: boolean;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    isFetchingPlanners: boolean;
    userProfile: { id: string; role: string; full_name?: string; username?: string; avatar_url?: string } | null;
    userStats: { totalPlanners: number; totalPages: number; totalAssets: number } | null;
    highlightedElementId: string | null;
    setHighlightedElementId: (id: string | null) => void;
    // ...

    // Search Action
    globalSearch: (query: string) => Promise<void>;

    // Brush Settings
    brushColor: string;
    brushSize: number;
    brushType: 'pen' | 'pencil' | 'brush' | 'spray';
    isEraser: boolean;
    isHighlighter: boolean;

    // Smart Features
    inkToText: boolean;
    detectShapes: boolean;

    // Shape Settings
    currentShapeType: 'rect' | 'circle' | 'triangle' | 'star' | 'arrow' | 'line';
    shapeStyle: { stroke: string; fill: string; strokeWidth: number };

    // Interaction Modes
    editMode: 'read' | 'write';
    activeTool: 'select' | 'pen' | 'lasso' | 'eraser' | 'shape' | 'text' | 'sticker' | 'link';
    paperTheme: 'white' | 'cream' | 'black' | 'cute-black' | 'all-in-one';
    showThumbnailView: boolean;
    isZoomMode: boolean;
    zoomScale: number;
    panPosition: { x: number; y: number };
    canvasRotation: number;
    selection: string[]; // Selected element/ink IDs
    showGrid: boolean;

    // History
    past: PlannerPage[][];
    future: PlannerPage[][];

    // Asset Hub state
    libraryAssets: any[];
    libraryCategories: string[];
    isLoadingAssets: boolean;

    // State Variables
    currentYear: number | null;
    currentMonth: string | null;
    currentSection: string | null;
    currentCategory: string | null;
    customStickers: { id: string; url: string }[];
    customTemplates: { id: string; name: string; url: string; category: string }[];

    // Actions - Assets
    fetchLibraryAssets: (type: 'sticker' | 'template' | 'cover' | 'image' | 'voice' | 'planner', category?: string, hashtag?: string) => Promise<void>;
    fetchMultipleLibraryAssets: (types: string[]) => Promise<void>;
    fetchLibraryCategories: (type: 'sticker' | 'template' | 'cover' | 'image' | 'voice' | 'planner') => Promise<void>;
    uploadAsset: (file: File, type: 'sticker' | 'template' | 'cover' | 'image' | 'voice' | 'planner', category?: string, hashtags?: string[], thumbnailUrl?: string) => Promise<string>;
    addAssetByUrl: (url: string, title: string, type: 'sticker' | 'template' | 'cover' | 'image' | 'voice' | 'planner', category?: string, hashtags?: string[]) => Promise<string>;
    updateAssetMetadata: (id: string, data: { title?: string, category?: string, hashtags?: string[] }) => Promise<void>;
    saveEditedAsset: (id: string, blob: Blob) => Promise<void>;
    deleteAsset: (id: string) => Promise<void>;

    // Actions - User
    fetchUserProfile: () => Promise<void>;
    updateProfile: (data: any) => Promise<void>;
    uploadAvatar: (file: File) => Promise<string>;
    fetchUserStats: () => Promise<void>;

    // Actions - PDF
    createPlannerFromPDF: (name: string, pdfPages: { url: string, width: number, height: number, links?: any[] }[], options?: { presetName?: string; section?: string }) => Promise<void>;
    updatePlannerCover: (id: string, blob: Blob) => Promise<void>;

    // Actions - State Setters
    setIsVoiceListening: (listening: boolean) => void;
    setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
    setIsReadOnly: (isReadOnly: boolean) => void;
    setEditMode: (mode: 'read' | 'write') => void;
    setActiveTool: (tool: 'select' | 'pen' | 'lasso' | 'eraser' | 'shape' | 'text' | 'sticker' | 'link') => void;
    setPaperTheme: (theme: 'white' | 'cream' | 'black' | 'cute-black' | 'all-in-one') => void;
    setThumbnailView: (show: boolean) => void;
    setZoomMode: (active: boolean) => void;
    setZoomScale: (scale: number) => void;
    setPanPosition: (pos: { x: number; y: number }) => void;
    setCanvasRotation: (rotation: number) => void;
    resetView: () => void;
    setSelection: (ids: string[]) => void;
    goToSection: (section: string) => void;
    moveSelection: (deltaX: number, deltaY: number) => void;
    cloneSelection: () => void;
    deleteSelection: () => void;
    setYearFilter: (year: number | null) => void;
    setMonthFilter: (month: string | null) => void;
    setSectionFilter: (section: string | null) => void;
    setCategoryFilter: (cat: string | null) => void;
    setView: (view: ViewType) => void;

    // Actions - Smart Features
    toggleInkToText: () => void;
    toggleDetectShapes: () => void;
    setShapeType: (type: 'rect' | 'circle' | 'triangle' | 'star' | 'arrow' | 'line') => void;
    setShapeStyle: (style: { stroke?: string; fill?: string; strokeWidth?: number }) => void;
    setBrushColor: (color: string) => void;
    setBrushSize: (size: number) => void;
    setBrushType: (type: 'pen' | 'pencil' | 'brush' | 'spray') => void;
    setEraser: (active: boolean) => void;
    setHighlighter: (active: boolean) => void;
    toggleGrid: () => void;

    // Actions - Planner Ops
    openPlanner: (idOrName: string) => Promise<void>;
    closePlanner: () => void;
    savePlanner: () => Promise<void>;
    fetchPlanners: () => Promise<void>;
    archivePlanner: (id: string) => Promise<void>;
    unarchivePlanner: (id: string) => Promise<void>;
    deletePlanner: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    createNewPlanner: (name: string, category: string, color: string, options?: {
        dimensions?: { width: number; height: number; layout: string };
        coverAssetId?: string;
        initialTemplates?: { assetId: string, count: number, section: string, frequency: 'once' | 'monthly' | 'weekly' | 'daily' }[];
    }) => Promise<any>;
    duplicatePlanner: (id: string, customName?: string) => Promise<void>;
    renamePlanner: (id: string, name: string) => Promise<void>;
    renamePage: (pageId: string, name: string) => Promise<void>;
    updatePageMetadata: (pageId: string, data: { year?: number | null, month?: string | null, section?: string | null, category?: string | null }) => Promise<void>;
    applyBulkTemplate: (plannerId: string, templateId: string, options: any) => Promise<void>;
    applyBackgroundToAll: (plannerId: string, color: string) => Promise<void>;

    // Actions - Page Ops
    nextPage: () => void;
    prevPage: () => void;
    goToPage: (index: number) => void;
    addPage: (atIndex: number) => void;
    deletePage: (index: number) => void;
    duplicatePage: (index: number) => void;
    clearPage: () => void;
    updatePages: (pages: PlannerPage[]) => void; // Used in CanvasWorkspace
    setPageTemplate: (pageId: string, templateId: string) => void;
    togglePageLock: (index: number) => void;
    setBinderStyle: (style: { color: string; texture: string }) => void;
    reorderPage: (oldIndex: number, newIndex: number) => void;
    setPageName: (pageId: string, name: string) => void;
    setPageLayout: (pageId: string, layout: string, dimensions?: { width: number; height: number }) => void;
    addPagesFromPdf: (pdfPages: { dataUrl: string, width: number, height: number, links?: any[] }[]) => void;
    addTemplateAsNewPage: (templateId: string) => Promise<void>;
    copyPage: (index: number) => void;

    // Actions - Element/Ink Ops
    addInkPath: (path: InkPath) => void;
    deleteInkPath: (id: string) => void;
    addElement: (element: PlannerElement) => void;
    updateElement: (id: string, newProps: Partial<PlannerElement>) => void;
    deleteElement: (id: string) => void;
    addTextElement: (text: string, x: number, y: number) => void;
    convertInkToText: (inkIds: string[], text: string, x: number, y: number) => void;
    reorderElement: (id: string, dir: 'up' | 'down' | 'top' | 'bottom') => void;

    // Actions - Links
    addLink: (link: any) => void;
    updateLink: (id: string, link: any) => void;
    deleteLink: (id: string) => void;

    // Actions - Misc
    setPlanners: (planners: Planner[]) => void;
    setUser: (user: any | null) => void;
    triggerExport: () => void;
    addCustomSticker: (url: string) => void;
    addCustomTemplate: (template: { name: string; url: string; category: string }) => void;
    renameTab: (index: number, newName: string) => void;
    renameLeftTab: (index: number, newName: string) => void;
    renameTopTab: (index: number, newName: string) => void;

    // History Actions
    saveHistory: () => void;
    undo: () => void;
    redo: () => void;
    updatePageTranscription: (pageId: string, text: string) => Promise<void>;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
    view: 'home',
    user: null,
    activePlanner: null,
    activePlannerId: null,
    availablePlanners: [],
    searchResults: [],
    isSearching: false,
    currentPageIndex: 0,
    exportTriggered: 0,
    isVoiceListening: false,
    isReadOnly: false,
    saveStatus: 'idle',
    isFetchingPlanners: false,
    userProfile: null,
    userStats: null,


    brushColor: '#000000',
    brushSize: 3,
    brushType: 'pen',
    isEraser: false,
    isHighlighter: false,

    inkToText: false,
    detectShapes: true,
    currentShapeType: 'rect',
    shapeStyle: { stroke: '#000000', fill: 'transparent', strokeWidth: 2 },

    editMode: 'write',
    activeTool: 'select',
    paperTheme: 'white',
    showThumbnailView: false,
    isZoomMode: false,
    zoomScale: 1,
    panPosition: { x: 0, y: 0 },
    canvasRotation: 0,
    selection: [],

    customStickers: [],
    customTemplates: [],

    // Asset Hub Initial State
    libraryAssets: [],
    libraryCategories: [],
    isLoadingAssets: false,

    showGrid: true,

    // History
    past: [],
    future: [],

    highlightedElementId: null,
    setHighlightedElementId: (id) => {
        set({ highlightedElementId: id });
        if (id) {
            setTimeout(() => set({ highlightedElementId: null }), 3000); // Clear after 3s
        }
    },

    setIsVoiceListening: (listening) => set({ isVoiceListening: listening }),
    setSaveStatus: (status) => set({ saveStatus: status }),
    setIsReadOnly: (isReadOnly) => set({ isReadOnly }),
    setEditMode: (mode) => set({ editMode: mode }),
    setActiveTool: (tool) => set({
        activeTool: tool,
        isEraser: tool === 'eraser',
        isHighlighter: false // Reset highlighter when changing primary tool if needed
    }),
    setPaperTheme: (theme) => set({ paperTheme: theme }),
    setThumbnailView: (show) => set({ showThumbnailView: show }),
    setZoomMode: (active) => set({ isZoomMode: active }),
    setZoomScale: (scale) => set({ zoomScale: scale }),
    setPanPosition: (pos) => set({ panPosition: pos }),
    setCanvasRotation: (rotation) => set({ canvasRotation: rotation }),
    resetView: () => set({ zoomScale: 1, panPosition: { x: 0, y: 0 } }),
    setSelection: (ids) => set({ selection: ids }),

    setView: (view) => set({ view }),

    currentYear: null as number | null,
    currentMonth: null as string | null,
    currentSection: null as string | null,
    currentCategory: null as string | null,

    setYearFilter: (year: number | null) => set({ currentYear: year }),
    setMonthFilter: (month: string | null) => set({ currentMonth: month }),
    setSectionFilter: (section: string | null) => set({ currentSection: section }),
    setCategoryFilter: (cat: string | null) => set({ currentCategory: cat }),

    goToSection: (section) => {
        const { activePlanner } = get();
        if (!activePlanner) return;

        // Try to find if this section is a month or a category
        const isMonth = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].includes(section);
        if (isMonth) {
            set({ currentMonth: section });
        } else {
            set({ currentCategory: section });
        }

        const index = activePlanner.pages.findIndex(p => p.section === section);
        if (index !== -1) {
            set({ currentPageIndex: index });
        }
    },



    toggleInkToText: () => set((state) => ({ inkToText: !state.inkToText })),
    toggleDetectShapes: () => set((state) => ({ detectShapes: !state.detectShapes })),
    setShapeType: (type) => set({ currentShapeType: type }),
    setShapeStyle: (style) => set((state) => ({ shapeStyle: { ...state.shapeStyle, ...style } })),
    setBrushColor: (color: string) => set({ brushColor: color, isEraser: false }),
    setBrushSize: (size: number) => set({ brushSize: size }),
    setBrushType: (type) => set({ brushType: type, isEraser: false }),
    setEraser: (active) => set({ isEraser: active, isHighlighter: active ? false : get().isHighlighter }),
    setHighlighter: (active) => set({ isHighlighter: active, isEraser: active ? false : get().isEraser }),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

    openPlanner: async (idOrName) => {
        const { activePlannerId, activePlanner, isFetchingPlanners, fetchPlanners, availablePlanners } = get();

        console.log(`[openPlanner] Attempting to open: ${idOrName}`);

        // 1. Resolve target ID from cache if possible to assist "matchingCurrent" check
        let targetId = availablePlanners.find(p => p.id === idOrName || slugify(p.name) === slugify(idOrName))?.id;

        // If not in cache, and it looks like a heart-beat from the URL slug while we are already loading a UUID
        if (!targetId && isFetchingPlanners && activePlannerId && idOrName.length < 36) {
            console.log(`[openPlanner] Already loading ${activePlannerId}, ignoring redundant slug-based call: ${idOrName}`);
            return;
        }

        // 2. Already fully open check
        const isCurrentlyActive = activePlannerId === idOrName || (targetId && activePlannerId === targetId);
        if (isCurrentlyActive && activePlanner && activePlanner.pages?.length > 0) {
            console.log(`[openPlanner] Already fully loaded: ${idOrName}`);
            set({ view: 'workspace', isFetchingPlanners: false });
            return;
        }

        // 3. Prevent redundant fetches
        if (isFetchingPlanners && isCurrentlyActive) {
            console.log(`[openPlanner] Re-entry blocked: Already fetching ${idOrName}`);
            return;
        }

        set({ isFetchingPlanners: true });

        // 4. Reset filters if switching planners
        if (!isCurrentlyActive) {
            set({
                currentYear: null,
                currentMonth: null,
                currentSection: null,
                currentCategory: null,
                currentPageIndex: 0,
                activePlanner: null,
                activePlannerId: targetId || (idOrName.length > 30 ? idOrName : null)
            });
        }

        try {
            let planners = get().availablePlanners;
            let planner = planners.find(p => slugify(p.name) === slugify(idOrName) || p.id === idOrName);

            if (!planner) {
                console.log(`[openPlanner] Not in cache, querying Supabase for: ${idOrName}`);
                const { data: dbPlanner, error: dbError } = await supabase
                    .from('planners')
                    .select('*')
                    .or(`id.eq.${idOrName},name.eq.${idOrName}`)
                    .maybeSingle();

                if (dbError) {
                    console.error("[openPlanner] Supabase Planner Query Error:", dbError);
                    throw dbError;
                }

                if (dbPlanner) {
                    planner = {
                        id: dbPlanner.id,
                        name: dbPlanner.name,
                        category: dbPlanner.category,
                        coverColor: dbPlanner.cover_color,
                        isArchived: !!dbPlanner.is_archived,
                        archivedAt: dbPlanner.archived_at,
                        createdAt: dbPlanner.created_at,
                        isFavorite: !!dbPlanner.is_favorite,
                        cover_url: dbPlanner.cover_url,
                        pages: [],
                        currentPageIndex: 0
                    };
                } else if (idOrName.length < 50) {
                    console.log(`[openPlanner] Fallback: fetchPlanners()`);
                    await fetchPlanners();
                    planner = get().availablePlanners.find(p => p.id === idOrName || slugify(p.name) === slugify(idOrName));
                }
            }

            if (!planner) {
                console.error("[openPlanner] CRITICAL: Planner not found anywhere:", idOrName);
                console.log("[openPlanner] Available slugs:", get().availablePlanners.map(p => slugify(p.name)));
                set({ activePlanner: null, activePlannerId: null, isFetchingPlanners: false });
                return;
            }

            const id = planner.id;
            const cachedBase = { ...planner };
            set({ activePlannerId: id });

            console.log(`[openPlanner] Fetching pages for ID: ${id}`);
            const { data: pagesData, error: pagesError } = await supabase
                .from('pages')
                .select('*')
                .eq('planner_id', id)
                .order('page_number', { ascending: true });

            if (pagesError) {
                console.error("[openPlanner] Pages Fetch Error:", pagesError);
                // If it's a "column does not exist" error, it's a schema mismatch
                if (pagesError.code === '42703') {
                    alert("Database Schema Mismatch: Missing columns in 'pages' table. Please run the provided SQL fix script.");
                }
                throw pagesError;
            }

            pagesData?.sort((a, b) => (a.page_number ?? 0) - (b.page_number ?? 0));

            const pageIds = pagesData?.map((p: any) => p.id) || [];
            let layersData: any[] = [];

            if (pageIds.length > 0) {
                const { data, error: layersError } = await supabase
                    .from('layers')
                    .select('*')
                    .in('page_id', pageIds);

                if (layersError) {
                    console.warn("[openPlanner] Layers Fetch Warning (ignoring if table missing):", layersError);
                    // If the layers table is missing (dropped in migration), we ignore and move on
                } else {
                    layersData = data || [];
                }
            }

            let finalPages: PlannerPage[] = [];

            if (!pagesData || pagesData.length === 0) {
                console.log(`[openPlanner] No pages found in DB, generating defaults...`);
                const defaultPages = [
                    { id: generateUUID(), templateId: 'daily', inkPaths: [], elements: [] },
                    { id: generateUUID(), templateId: 'weekly', inkPaths: [], elements: [] },
                    { id: generateUUID(), templateId: 'notes', inkPaths: [], elements: [] },
                ];

                await Promise.all(defaultPages.map(async (page, i) => {
                    await supabase.from('pages').insert({
                        id: page.id,
                        planner_id: id,
                        page_number: i,
                        template_id: page.templateId,
                        updated_at: new Date().toISOString()
                    });
                    // Insert to layers only if it doesn't fail (table might be missing)
                    try {
                        await supabase.from('layers').insert({
                            page_id: page.id,
                            elements: [],
                            ink_paths: [],
                            updated_at: new Date().toISOString()
                        });
                    } catch (e) { /* ignore */ }
                }));
                finalPages = defaultPages;
            } else {
                finalPages = pagesData.map((p: any) => {
                    const layer = layersData?.find((l: any) => l.page_id === p.id);

                    // Priority 1: Use elements already on the page row (New Schema)
                    // Priority 2: Use elements from the layers table (Old Schema)
                    let elements = Array.isArray(p.elements) ? p.elements.map(normalizeElement) : [];
                    let inkPaths = Array.isArray(p.ink_paths) ? p.ink_paths : [];

                    if (elements.length === 0 && Array.isArray(layer?.elements)) {
                        elements = layer.elements.map(normalizeElement);
                    }
                    if (inkPaths.length === 0 && Array.isArray(layer?.ink_paths)) {
                        inkPaths = layer.ink_paths;
                    }

                    const mergedElements = [...elements];
                    inkPaths.forEach((path: any) => {
                        if (!mergedElements.some(el => el.id === path.id)) {
                            mergedElements.push({ ...path, type: 'path' });
                        }
                    });

                    return {
                        id: p.id,
                        templateId: p.template_id,
                        dimensions: p.dimensions || { width: 800, height: 1000 },
                        layout: p.layout || 'portrait',
                        section: p.section,
                        category: p.category,
                        year: p.year,
                        month: p.month,
                        isLocked: !!p.is_locked,
                        links: Array.isArray(p.links) ? p.links : [],
                        thumbnail: p.thumbnail,
                        name: p.name,
                        inkPaths: [],
                        elements: mergedElements
                    } as PlannerPage;
                });
            }

            set({
                activePlanner: { ...cachedBase, pages: finalPages, currentPageIndex: 0 },
                activePlannerId: id,
                view: 'workspace',
                currentPageIndex: 0,
                isFetchingPlanners: false
            });
        } catch (e) {
            console.error("[openPlanner] FATAL ERROR:", e);
            set({ isFetchingPlanners: false });
        }
    },

    closePlanner: () => set({ view: 'home', activePlanner: null, activePlannerId: null, currentPageIndex: 0 }),

    nextPage: () => {
        const { activePlanner, currentPageIndex, currentYear, currentMonth, currentSection, currentCategory } = get()
        if (!activePlanner || !activePlanner.pages) return

        const filteredIndices = activePlanner.pages.map((p, i) => ({ p, i })).filter(({ p }) => {
            if (currentYear && p.year != currentYear) return false
            if (currentMonth && p.month !== currentMonth) return false
            if (currentSection && p.section !== currentSection) return false
            if (currentCategory && p.category !== currentCategory) return false
            return true
        }).map(({ i }) => i)

        if (filteredIndices.length === 0) return
        const currentPos = filteredIndices.indexOf(currentPageIndex)

        if (currentPos !== -1 && currentPos < filteredIndices.length - 1) {
            set({ currentPageIndex: filteredIndices[currentPos + 1] })
        }
    },

    prevPage: () => {
        const { activePlanner, currentPageIndex, currentYear, currentMonth, currentSection, currentCategory } = get()
        if (!activePlanner || !activePlanner.pages) return

        const filteredIndices = activePlanner.pages.map((p, i) => ({ p, i })).filter(({ p }) => {
            if (currentYear && p.year != currentYear) return false
            if (currentMonth && p.month !== currentMonth) return false
            if (currentSection && p.section !== currentSection) return false
            if (currentCategory && p.category !== currentCategory) return false
            return true
        }).map(({ i }) => i)

        if (filteredIndices.length === 0) return
        const currentPos = filteredIndices.indexOf(currentPageIndex)

        if (currentPos > 0) {
            set({ currentPageIndex: filteredIndices[currentPos - 1] })
        }
    },

    goToPage: (index) => {
        const { activePlanner } = get();
        if (activePlanner && index >= 0 && index < activePlanner.pages.length) {
            set({ currentPageIndex: index });
        }
    },

    addInkPath: (path) => {
        const { activePlanner, currentPageIndex } = get();
        if (!activePlanner) return;


        const newPages = [...activePlanner.pages];
        newPages[currentPageIndex].inkPaths = [...newPages[currentPageIndex].inkPaths, path];

        set({
            activePlanner: {
                ...activePlanner,
                pages: newPages
            }
        });
    },

    deleteInkPath: (id) => {
        const { activePlanner, currentPageIndex } = get();
        if (!activePlanner) return;


        const newPages = [...activePlanner.pages];
        newPages[currentPageIndex].inkPaths = newPages[currentPageIndex].inkPaths.filter(p => p.id !== id);

        set({
            activePlanner: {
                ...activePlanner,
                pages: newPages
            }
        });
    },

    addElement: (element) => {
        const { activePlanner, currentPageIndex, saveHistory } = get();
        if (!activePlanner) return;

        // Save history before adding
        saveHistory();

        const newPages = [...activePlanner.pages];
        const page = newPages[currentPageIndex];

        // Smart Collision Avoidance: Check quadrants
        let finalX = element.x;
        let finalY = element.y;

        const checkOverlap = (x: number, y: number) => {
            return page.elements.some(el => {
                const dx = Math.abs(el.x - x);
                const dy = Math.abs(el.y - y);
                return dx < 30 && dy < 30; // 30px collision radius
            });
        };

        if (checkOverlap(finalX, finalY)) {
            // Find nearest empty quadrant
            const offsets = [
                { dx: 60, dy: 0 }, { dx: -60, dy: 0 },
                { dx: 0, dy: 60 }, { dx: 0, dy: -60 },
                { dx: 60, dy: 60 }, { dx: -60, dy: -60 },
                { dx: 60, dy: -60 }, { dx: -60, dy: 60 }
            ];

            for (const offset of offsets) {
                if (!checkOverlap(finalX + offset.dx, finalY + offset.dy)) {
                    finalX += offset.dx;
                    finalY += offset.dy;
                    break;
                }
            }
        }

        const newElement = { ...element, x: finalX, y: finalY };
        page.elements = [...page.elements, newElement];

        set({
            activePlanner: {
                ...activePlanner,
                pages: newPages
            }
        });
    },

    updateElement: (id, newProps) => {
        const { activePlanner, currentPageIndex } = get();
        if (!activePlanner) return;


        const newPages = [...activePlanner.pages];
        newPages[currentPageIndex].elements = newPages[currentPageIndex].elements.map(el =>
            el.id === id ? { ...el, ...newProps } : el
        );

        set({
            activePlanner: {
                ...activePlanner,
                pages: newPages
            }
        });
    },

    deleteElement: (id) => {
        const { activePlanner, currentPageIndex, saveHistory } = get();
        if (!activePlanner) return;

        const page = activePlanner.pages[currentPageIndex];
        const elToDelete = page.elements.find(el => el.id === id);
        if (elToDelete?.isLocked) return; // Protect locked elements

        // Save history before deleting
        saveHistory();

        const newPages = [...activePlanner.pages];
        newPages[currentPageIndex].elements = newPages[currentPageIndex].elements.filter(el => el.id !== id);

        set({
            activePlanner: {
                ...activePlanner,
                pages: newPages
            }
        });
    },

    addTextElement: (text, x, y) => {
        const { addElement } = get();
        addElement({
            id: Math.random().toString(36).substr(2, 9),
            type: 'text',
            x,
            y,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            props: { text, fill: '#000000' }
        });
    },

    addLink: (link) => {
        const { activePlanner, currentPageIndex, saveHistory } = get();
        if (!activePlanner) return;

        saveHistory();
        const newPages = [...activePlanner.pages];
        const page = newPages[currentPageIndex];
        page.links = [...(page.links || []), link];

        set({ activePlanner: { ...activePlanner, pages: newPages } });
    },

    updateLink: (id, linkProps) => {
        const { activePlanner, currentPageIndex } = get();
        if (!activePlanner) return;

        const newPages = [...activePlanner.pages];
        const page = newPages[currentPageIndex];
        if (page.links) {
            page.links = page.links.map(l => l.id === id ? { ...l, ...linkProps } : l);
            set({ activePlanner: { ...activePlanner, pages: newPages } });
        }
    },

    deleteLink: (id) => {
        const { activePlanner, currentPageIndex, saveHistory } = get();
        if (!activePlanner) return;

        saveHistory();
        const newPages = [...activePlanner.pages];
        const page = newPages[currentPageIndex];
        if (page.links) {
            page.links = page.links.filter(l => l.id !== id);
            set({ activePlanner: { ...activePlanner, pages: newPages } });
        }
    },

    setPageTemplate: (pageId, templateId) => {
        const { activePlanner } = get();
        if (!activePlanner) return;


        const newPages = activePlanner.pages.map(page =>
            page.id === pageId ? { ...page, templateId } : page
        );

        set({
            activePlanner: {
                ...activePlanner,
                pages: newPages
            }
        });
    },

    setPageName: (pageId, name) => {
        const { activePlanner } = get();
        if (!activePlanner) return;


        const newPages = activePlanner.pages.map(page =>
            page.id === pageId ? { ...page, name } : page
        );

        set({ activePlanner: { ...activePlanner, pages: newPages } });
    },

    setPageLayout: (pageId, layout, dimensions) => {
        const { activePlanner } = get();
        if (!activePlanner) return;


        const newPages = activePlanner.pages.map(page =>
            page.id === pageId ? { ...page, layout: layout as any, dimensions } : page
        );

        set({ activePlanner: { ...activePlanner, pages: newPages } });
    },

    createNewPlanner: async (name, category, color, options): Promise<any> => {
        const { user, fetchPlanners } = get();
        if (!user) {
            console.error('User not logged in - cannot create planner');
            return;
        }

        const id = generateUUID();
        const initialPages: any[] = [];

        // 1. Determine Dimensions
        const dims = options?.dimensions || { width: 794, height: 1123 };
        const layout = options?.dimensions?.layout || 'portrait';

        // 2. Add Cover
        const coverTemplate = await fetchTemplateOrAsset(options?.coverAssetId || 'cover');
        const coverElements = coverTemplate?.template_data?.elements || [];
        const coverBg = coverTemplate?.template_data?.backgroundImage || coverTemplate?.preview_url;

        const coverInitialElements = [...coverElements];
        if (coverBg && !coverInitialElements.some((el: any) => el.type === 'background')) {
            coverInitialElements.unshift({
                id: generateUUID(),
                type: 'background',
                x: 0, y: 0,
                fill: coverBg,
                zIndex: -1
            });
        }

        initialPages.push({
            id: generateUUID(),
            templateId: coverTemplate?.id || 'cover',
            section: 'COVER',
            dimensions: dims,
            layout: layout,
            elements: coverInitialElements
        });

        // 3. Generate Content Pages
        if (options?.initialTemplates && options.initialTemplates.length > 0) {
            // Pre-fetch all templates for efficiency
            const templateMap: Record<string, any> = {};
            for (const t of options.initialTemplates) {
                if (!templateMap[t.assetId]) {
                    templateMap[t.assetId] = await fetchTemplateOrAsset(t.assetId);
                }
            }

            options.initialTemplates.forEach(t => {
                const count = t.count || 1;
                const freq = t.frequency || 'once';
                const template = templateMap[t.assetId];

                const templateElements = template?.template_data?.elements || [];
                const templateBg = template?.template_data?.backgroundImage || template?.preview_url;
                const initialElements = [...templateElements.map(normalizeElement)];

                if (templateBg && !initialElements.some((el: any) => el.type === 'background')) {
                    initialElements.unshift({
                        id: generateUUID(),
                        type: 'background',
                        x: 0, y: 0,
                        fill: templateBg,
                        zIndex: -1
                    });
                }

                if (freq === 'monthly') {
                    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                    months.forEach(m => {
                        for (let i = 0; i < count; i++) {
                            initialPages.push({
                                id: generateUUID(),
                                templateId: t.assetId,
                                section: t.section || 'MONTHLY',
                                month: m,
                                category: category,
                                dimensions: dims,
                                layout: layout,
                                elements: [...initialElements.map(el => ({ ...el, id: generateUUID() }))]
                            });
                        }
                    });
                } else if (freq === 'weekly') {
                    const iterations = count > 1 ? count : 52;
                    for (let i = 1; i <= iterations; i++) {
                        initialPages.push({
                            id: generateUUID(),
                            templateId: t.assetId,
                            section: t.section || 'WEEKLY',
                            name: `Week ${i}`,
                            category: category,
                            dimensions: dims,
                            layout: layout,
                            elements: [...initialElements.map(el => ({ ...el, id: generateUUID() }))]
                        });
                    }
                } else if (freq === 'daily') {
                    const iterations = count > 1 ? count : 31;
                    for (let i = 1; i <= iterations; i++) {
                        initialPages.push({
                            id: generateUUID(),
                            templateId: t.assetId,
                            section: t.section || 'DAILY',
                            name: `Day ${i}`,
                            category: category,
                            dimensions: dims,
                            layout: layout,
                            elements: [...initialElements.map(el => ({ ...el, id: generateUUID() }))]
                        });
                    }
                } else {
                    for (let i = 0; i < count; i++) {
                        initialPages.push({
                            id: generateUUID(),
                            templateId: t.assetId,
                            section: t.section || 'NOTES',
                            category: category,
                            dimensions: dims,
                            layout: layout,
                            elements: [...initialElements.map(el => ({ ...el, id: generateUUID() }))]
                        });
                    }
                }
            });
        } else {
            // Default legacy initialization
            const dailyT = await fetchTemplateOrAsset('daily');
            const weeklyT = await fetchTemplateOrAsset('weekly');
            const notesT = await fetchTemplateOrAsset('notes');

            const getElements = (t: any) => {
                const els = [...(t?.template_data?.elements || []).map(normalizeElement)];
                const bg = t?.template_data?.backgroundImage || t?.preview_url;
                if (bg && !els.some((el: any) => el.type === 'background')) {
                    els.unshift({ id: generateUUID(), type: 'background', x: 0, y: 0, fill: bg, zIndex: -1 });
                }
                return els;
            };

            initialPages.push(
                { id: generateUUID(), templateId: 'daily', section: 'JAN', dimensions: dims, layout: layout, elements: getElements(dailyT) },
                { id: generateUUID(), templateId: 'weekly', section: 'JAN', dimensions: dims, layout: layout, elements: getElements(weeklyT) },
                { id: generateUUID(), templateId: 'notes', section: 'NOTES', dimensions: dims, layout: layout, elements: getElements(notesT) }
            );
        }

        // 1. Create Planner in Supabase
        const { error: plannerError } = await supabase
            .from('planners')
            .insert({
                id,
                user_id: user.id,
                name,
                category,
                cover_color: color || '#6366f1'
            });

        if (plannerError) {
            console.error('Error creating planner:', plannerError);
            alert('Failed to create planner in database.');
            return;
        }

        // 2. Create Initial Pages
        for (let i = 0; i < initialPages.length; i++) {
            const page = initialPages[i];
            await supabase.from('pages').insert({
                id: page.id,
                planner_id: id,
                page_number: i,
                template_id: page.templateId,
                dimensions: page.dimensions,
                layout: page.layout,
                section: page.section,
                category: page.category,
                month: page.month,
                name: page.name
            });

            // Create empty layer for the page
            await supabase.from('layers').insert({
                page_id: page.id,
                elements: page.elements || [],
                ink_paths: []
            });
        }

        // 3. Refresh Store
        await fetchPlanners();

        const newPlanner: Planner = {
            id,
            name,
            category,
            coverColor: color || '#6366f1',
            currentPageIndex: 0,
            pages: initialPages.map(p => ({
                ...p,
                inkPaths: [],
                elements: p.elements || []
            })),
            customTabs: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
            leftTabs: ['PHOTOS', 'WEB', 'REMINDER', 'CALENDAR', 'NETFLIX', 'YOUTUBE', 'NOTES', 'READING', 'TRAVEL', 'TASKS', 'CAT', 'OTHER'],
            topTabs: ['PROJECTS', 'GOALS', '2025', 'INDEX', 'STUFF'],
            binderStyle: { color: color || '#6366f1', texture: 'leather' },
            useSpreadView: true,
            isFavorite: false
        };

        set({
            view: 'workspace',
            activePlanner: newPlanner,
            activePlannerId: id,
            currentPageIndex: 0
        });

        return newPlanner;
    },

    addPagesFromPdf: (pdfPages) => {
        const { activePlanner } = get();
        if (!activePlanner) return;


        const newPages = [...activePlanner.pages];

        pdfPages.forEach(p => {
            const pageId = generateUUID();
            const isLandscape = p.width > p.height;
            const newPage: PlannerPage = {
                id: pageId,
                templateId: 'blank',
                inkPaths: [],
                elements: [
                    {
                        id: generateUUID(),
                        type: 'background',
                        x: 0,
                        y: 0,
                        fill: p.dataUrl,
                        zIndex: -1,
                        isLocked: true
                    }
                ],
                dimensions: { width: p.width, height: p.height },
                layout: isLandscape ? 'landscape' : 'portrait',
                links: p.links || []
            };
            newPages.push(newPage);
        });

        set({ activePlanner: { ...activePlanner, pages: newPages } });
    },

    convertInkToText: (inkIds, text, x, y) => {
        const { activePlanner, currentPageIndex } = get();
        if (!activePlanner) return;


        const newPages = [...activePlanner.pages];

        // Remove ink paths
        newPages[currentPageIndex].inkPaths = newPages[currentPageIndex].inkPaths.filter(
            p => !inkIds.includes(p.id)
        );

        // Add text element
        newPages[currentPageIndex].elements = [
            ...newPages[currentPageIndex].elements,
            {
                id: generateUUID(),
                type: 'text',
                x,
                y,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                props: { text, fill: '#000000' }
            }
        ];

        set({
            activePlanner: {
                ...activePlanner,
                pages: newPages
            }
        });
    },

    setPlanners: (planners) => set({ availablePlanners: planners }),
    setUser: (user) => set({ user }),
    triggerExport: () => set({ exportTriggered: Date.now() }),

    savePlanner: async () => {
        const { activePlanner, user, setSaveStatus } = get();
        if (!activePlanner || !user) return;

        setSaveStatus('saving');
        try {
            // 1. Save Planner Basic Info
            const { error: plannerError } = await supabase
                .from('planners')
                .upsert({
                    id: activePlanner.id,
                    user_id: user.id,
                    name: activePlanner.name,
                    category: activePlanner.category,
                    cover_color: activePlanner.coverColor,
                    is_favorite: activePlanner.isFavorite,
                    updated_at: new Date().toISOString()
                });

            if (plannerError) throw plannerError;

            // 2 & 3. Prepare Pages, Layers and Search Data
            const processedPages = await Promise.all(activePlanner.pages.map(async (page, i) => {
                let elementsToSave = [...(page.elements || [])];
                let inkTranscription = '';

                // Run OCR if needed
                if (page.inkPaths && page.inkPaths.length > 0) {
                    try {
                        const timeout = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('OCR Timeout')), 2000)
                        );
                        const ocrText: any = await Promise.race([
                            performOCR(page.inkPaths),
                            timeout
                        ]);

                        if (ocrText && ocrText.length > 0) {
                            inkTranscription = ocrText;
                            elementsToSave = elementsToSave.filter((el: any) => el.type !== 'ocr_metadata');
                            elementsToSave.push({
                                id: `ocr-${page.id}`,
                                type: 'ocr_metadata',
                                x: 0, y: 0, width: 0, height: 0,
                                text: ocrText,
                                zIndex: -1
                            });
                        }
                    } catch (ocrErr) {
                        // console.warn("[OCR] Skipped:", ocrErr);
                    }
                }

                // Concatenate all text box content for searchable_text
                const searchableText = elementsToSave
                    .filter(el => el.type === 'text')
                    .map(el => el.text || '')
                    .join(' ');

                return {
                    pageUpsert: {
                        id: page.id,
                        planner_id: activePlanner.id,
                        page_number: i,
                        template_id: page.templateId,
                        dimensions: page.dimensions,
                        layout: page.layout,
                        section: page.section,
                        category: page.category,
                        year: page.year,
                        month: page.month,
                        is_locked: page.isLocked,
                        links: page.links,
                        thumbnail: page.thumbnail,
                        name: page.name,
                        searchable_text: searchableText,
                        ink_transcription: inkTranscription,
                        updated_at: new Date().toISOString()
                    },
                    layerUpsert: {
                        page_id: page.id,
                        elements: elementsToSave,
                        ink_paths: page.inkPaths,
                        updated_at: new Date().toISOString()
                    }
                };
            }));

            const pagesToUpsert = processedPages.map(p => p.pageUpsert);
            const layersToUpsert = processedPages.map(p => p.layerUpsert);

            // 4. Bulk Upsert Pages
            const { error: bulkPagesError } = await supabase
                .from('pages')
                .upsert(pagesToUpsert);

            if (bulkPagesError) throw bulkPagesError;

            // 5. Bulk Upsert Layers
            const { error: bulkLayersError } = await supabase
                .from('layers')
                .upsert(layersToUpsert, { onConflict: 'page_id' });

            if (bulkLayersError) throw bulkLayersError;

            setSaveStatus('saved');
            setTimeout(() => {
                if (get().saveStatus === 'saved') setSaveStatus('idle');
            }, 3000);

        } catch (error) {
            console.error('Error saving planner:', error);
            setSaveStatus('error');
        }
    },

    clearPage: () => {
        const { activePlanner, currentPageIndex, saveHistory } = get();
        if (!activePlanner) return;

        // Save history before clearing
        saveHistory();

        const newPages = [...activePlanner.pages];
        // Only clear non-locked elements
        newPages[currentPageIndex].elements = newPages[currentPageIndex].elements.filter(el => el.isLocked);
        newPages[currentPageIndex].inkPaths = [];

        set({
            activePlanner: {
                ...activePlanner,
                pages: newPages
            }
        });
    },

    addTemplateAsNewPage: async (templateId) => {
        const { activePlanner, currentPageIndex } = get();
        if (!activePlanner) return;

        try {
            const template = await fetchTemplateOrAsset(templateId);

            if (!template) {
                console.error('Template not found:', templateId);
                return;
            }



            const newPageId = generateUUID();
            const templateData = (template.template_data as any) || {};
            let templateElements = (templateData.elements || []).map(normalizeElement);

            // Handle background image
            const bgImage = templateData.backgroundImage || template.preview_url;
            if (bgImage && !templateElements.some((el: any) => el.type === 'background')) {
                templateElements.unshift({
                    id: generateUUID(),
                    type: 'background',
                    x: 0,
                    y: 0,
                    fill: bgImage, // Store URL in fill
                    zIndex: -1
                });
            }

            const newPage: PlannerPage = {
                id: newPageId,
                templateId: template.id,
                inkPaths: [],
                // Clone elements to ensure unique IDs across pages and lock them as background
                elements: templateElements.map((el: any) => ({ ...el, id: generateUUID(), isLocked: true })),
                dimensions: templateData.dimensions || (template.page_size === 'A4' ? { width: 794, height: 1123 } : { width: 800, height: 1000 }),
                layout: template.orientation || 'portrait'
            };

            const newPages = [...activePlanner.pages];
            newPages.splice(currentPageIndex + 1, 0, newPage);

            set({
                activePlanner: {
                    ...activePlanner,
                    pages: newPages
                },
                currentPageIndex: currentPageIndex + 1
            });

            // Persist to DB
            const { error: pageError } = await supabase.from('pages').insert({
                id: newPageId,
                planner_id: activePlanner.id,
                index: currentPageIndex + 1,
                template_id: template.id
            });

            if (pageError) throw pageError;

            await supabase.from('layers').insert({
                page_id: newPageId,
                elements: newPage.elements,
                ink_paths: []
            });

        } catch (err) {
            console.error('Failed to add template as new page:', err);
        }
    },

    addPage: (atIndex) => {
        const { activePlanner } = get();
        if (!activePlanner) return;


        const currentPage = activePlanner.pages[atIndex] || activePlanner.pages[activePlanner.pages.length - 1];
        const newPage: PlannerPage = {
            id: generateUUID(),
            templateId: 'notes',
            inkPaths: [],
            elements: [],
            section: currentPage?.section || 'NOTES'
        };

        const newPages = [...activePlanner.pages];
        newPages.splice(atIndex + 1, 0, newPage);

        set({
            activePlanner: {
                ...activePlanner,
                pages: newPages
            },
            currentPageIndex: atIndex + 1
        });
    },

    togglePageLock: (index) => {
        const { activePlanner } = get();
        if (!activePlanner) return;


        const newPages = [...activePlanner.pages];
        newPages[index] = {
            ...newPages[index],
            isLocked: !newPages[index].isLocked
        };

        set({
            activePlanner: {
                ...activePlanner,
                pages: newPages
            }
        });
    },

    setBinderStyle: (style) => {
        const { activePlanner } = get();
        if (!activePlanner) return;

        set({
            activePlanner: {
                ...activePlanner,
                binderStyle: style
            }
        });
    },

    deleteSelection: () => {
        const { selection, activePlanner, currentPageIndex } = get();
        if (selection.length === 0 || !activePlanner) return;


        const newPages = [...activePlanner.pages];
        const page = { ...newPages[currentPageIndex] };

        // Protect locked elements from deletion
        page.elements = page.elements.filter(el => !(selection.includes(el.id) && !el.isLocked));
        page.inkPaths = page.inkPaths.filter(path => !selection.includes(path.id));

        newPages[currentPageIndex] = page;
        set({
            activePlanner: { ...activePlanner, pages: newPages },
            selection: []
        });
    },

    moveSelection: (dx, dy) => {
        const { selection, activePlanner, currentPageIndex } = get();
        if (selection.length === 0 || !activePlanner) return;

        const newPages = [...activePlanner.pages];
        const page = { ...newPages[currentPageIndex] };

        page.elements = page.elements.map(el => selection.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el);
        page.inkPaths = page.inkPaths.map(path => {
            if (selection.includes(path.id)) {
                return {
                    ...path,
                    points: path.points.map((p, i) => i % 2 === 0 ? p + dx : p + dy)
                };
            }
            return path;
        });

        newPages[currentPageIndex] = page;
        set({ activePlanner: { ...activePlanner, pages: newPages } });
    },

    cloneSelection: () => {
        const { selection, activePlanner, currentPageIndex } = get();
        if (selection.length === 0 || !activePlanner) return;


        const newPages = [...activePlanner.pages];
        const page = { ...newPages[currentPageIndex] };
        const newIds: string[] = [];

        // Clone Elements
        page.elements.forEach(el => {
            if (selection.includes(el.id)) {
                const newEl = {
                    ...el,
                    id: generateUUID(),
                    x: el.x + 20,
                    y: el.y + 20
                };
                page.elements = [...page.elements, newEl];
                newIds.push(newEl.id);
            }
        });

        // Clone Ink
        page.inkPaths.forEach(path => {
            if (selection.includes(path.id)) {
                const newPath = {
                    ...path,
                    id: generateUUID(),
                    points: path.points.map((p, i) => i % 2 === 0 ? p + 20 : p + 20)
                };
                page.inkPaths = [...page.inkPaths, newPath];
                newIds.push(newPath.id);
            }
        });

        newPages[currentPageIndex] = page;
        set({
            activePlanner: { ...activePlanner, pages: newPages },
            selection: newIds
        });
    },

    renameTab: (index: number, newName: string) => {
        const { activePlanner } = get();
        if (!activePlanner) return;
        const customTabs = [...(activePlanner.customTabs || ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'])];
        customTabs[index] = newName;
        set({ activePlanner: { ...activePlanner, customTabs } });
    },

    renameLeftTab: (index: number, newName: string) => {
        const { activePlanner } = get();
        if (!activePlanner) return;
        const leftTabs = [...(activePlanner.leftTabs || ['PHOTOS', 'WEB', 'REMIND', 'CAL', 'NETFLIX', 'YT', 'NOTES', 'BOOKS', 'TRAVEL', 'TASKS', 'CAT', 'INDEX'])];
        leftTabs[index] = newName;
        set({ activePlanner: { ...activePlanner, leftTabs } });
    },

    renameTopTab: (index: number, newName: string) => {
        const { activePlanner } = get();
        if (!activePlanner) return;
        const topTabs = [...(activePlanner.topTabs || ['P1', 'P2', 'P3', 'P4', 'P5'])];
        topTabs[index] = newName;
        set({ activePlanner: { ...activePlanner, topTabs } });
    },

    deletePage: async (index) => {
        const { activePlanner, currentPageIndex } = get();
        if (!activePlanner || activePlanner.pages.length <= 1) return;

        // Optimistic update

        const newPages = [...activePlanner.pages];
        const pageToDelete = newPages[index];
        newPages.splice(index, 1);

        let newCurrentIndex = currentPageIndex;
        if (index <= currentPageIndex && currentPageIndex > 0) {
            newCurrentIndex--;
        }

        set({
            activePlanner: { ...activePlanner, pages: newPages },
            currentPageIndex: Math.min(newCurrentIndex, newPages.length - 1)
        });

        // Backend delete - Critical for persistence
        if (pageToDelete && pageToDelete.id) {
            // Delete associated layers first (cascade usually handles this, but safer to be explicit or rely on DB)
            // Assuming DB cascade delete on pages -> layers
            const { error } = await supabase.from('pages').delete().eq('id', pageToDelete.id);
            if (error) {
                console.error("Failed to delete page from DB:", error);
                // Revert? For now just alert
                alert("Failed to delete page from server. Please refresh.");
            } else {
                // Update indexes for remaining pages to ensure gapless sequence
                // Update indexes for remaining pages to ensure gapless sequence
                newPages.forEach((p, i) => { p.page_number = i; });
                // We should save the new order immediately
                // Since savePlanner saves ALL pages, we can just call that, OR do a lighter update
                // Let's call savePlanner to be safe and sync everything
                get().savePlanner();
            }
        }
    },

    updatePages: (pages) => {
        const { activePlanner } = get();
        if (!activePlanner) return;


        // Update indices to match new order
        const updatedPages = pages.map((p, i) => ({ ...p, index: i }));

        set({
            activePlanner: { ...activePlanner, pages: updatedPages }
        });
    },

    reorderElement: (id, dir) => {
        const { activePlanner, currentPageIndex } = get();
        if (!activePlanner) return;


        const newPages = [...activePlanner.pages];
        const page = { ...newPages[currentPageIndex] };
        const index = page.elements.findIndex(el => el.id === id);
        if (index === -1) return;

        const el = page.elements[index];
        const elements = [...page.elements];
        elements.splice(index, 1);

        if (dir === 'top') elements.push(el);
        else if (dir === 'bottom') elements.unshift(el);
        else if (dir === 'up') elements.splice(Math.min(elements.length, index + 1), 0, el);
        else if (dir === 'down') elements.splice(Math.max(0, index - 1), 0, el);

        set({ activePlanner: { ...activePlanner, pages: newPages } });
    },

    reorderPage: (oldIndex: number, newIndex: number) => {
        const { activePlanner, currentPageIndex } = get();
        if (!activePlanner) return;
        if (newIndex < 0 || newIndex >= activePlanner.pages.length) return;

        const newPages = [...activePlanner.pages];
        const [movedPage] = newPages.splice(oldIndex, 1);
        newPages.splice(newIndex, 0, movedPage);

        let newCurrentIndex = currentPageIndex;
        if (currentPageIndex === oldIndex) {
            newCurrentIndex = newIndex;
        } else if (currentPageIndex > oldIndex && currentPageIndex <= newIndex) {
            newCurrentIndex--;
        } else if (currentPageIndex < oldIndex && currentPageIndex >= newIndex) {
            newCurrentIndex++;
        }

        set({
            activePlanner: { ...activePlanner, pages: newPages },
            currentPageIndex: newCurrentIndex
        });
    },


    addCustomSticker: (url) => set((state) => ({ customStickers: [{ id: generateUUID(), url }, ...state.customStickers] })),

    addCustomTemplate: (template) => set((state) => ({
        customTemplates: [{ id: `custom-${generateUUID()}`, ...template }, ...state.customTemplates]
    })),

    applyBulkTemplate: async (plannerId, templateId, options) => {
        const { activePlanner, savePlanner } = get();
        if (!activePlanner || activePlanner.id !== plannerId) return;

        // Fetch template data first (handles both templates and assets tables)
        const template = await fetchTemplateOrAsset(templateId);

        if (!template) {
            console.error('Template not found for bulk apply:', templateId);
            return;
        }

        const templateData = (template.template_data as any) || {};
        let templateElements = (templateData.elements || []).map(normalizeElement);

        // Handle background image
        const bgImage = templateData.backgroundImage || template.preview_url;
        if (bgImage && !templateElements.some((el: any) => el.type === 'background')) {
            templateElements.unshift({
                id: generateUUID(),
                type: 'background',
                x: 0,
                y: 0,
                fill: bgImage,
                zIndex: -1
            });
        }

        const { count, frequency, startDate } = options;
        const newPages: PlannerPage[] = [];
        const baseDate = startDate ? new Date(startDate) : new Date();

        for (let i = 0; i < count; i++) {
            const date = new Date(baseDate);
            if (frequency === 'daily') date.setDate(date.getDate() + i);
            else if (frequency === 'weekly') date.setDate(date.getDate() + (i * 7));
            else if (frequency === 'monthly') date.setMonth(date.getMonth() + i);
            else if (frequency === 'yearly') date.setFullYear(date.getFullYear() + i);

            const dateStr = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const newPage: PlannerPage = {
                id: generateUUID(),
                templateId: templateId,
                inkPaths: [],
                // Clone elements for each page with new IDs and normalize them
                elements: templateElements.map((el: any) => ({ ...el, id: generateUUID(), isLocked: true })),
                dimensions: templateData.dimensions || (template.page_size === 'A4' ? { width: 794, height: 1123 } : { width: 800, height: 1000 }),
                layout: template.orientation || 'portrait',
                name: dateStr,
                section: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
                year: date.getFullYear(),
                month: date.toLocaleString('default', { month: 'short' }).toUpperCase()
            };
            newPages.push(newPage);
        }

        const updatedPages = [...activePlanner.pages, ...newPages];
        set({
            activePlanner: { ...activePlanner, pages: updatedPages },
            currentPageIndex: activePlanner.pages.length // Go to the last added page (index starts at length before update)
        });

        await savePlanner();
    },

    duplicatePage: async (pageIndex: number) => {
        const { activePlanner, savePlanner } = get();
        if (!activePlanner) return;

        const originalPage = activePlanner.pages[pageIndex];
        if (!originalPage) return;

        const newPageId = generateUUID();
        const newPage: PlannerPage = {
            ...originalPage,
            id: newPageId,
            name: originalPage.name ? `${originalPage.name} (Copy)` : undefined,
            inkPaths: (originalPage.inkPaths || []).map(path => ({
                ...path,
                id: generateUUID(),
                points: [...path.points]
            })),
            elements: (originalPage.elements || []).map(el => ({
                ...el,
                id: generateUUID()
            }))
        };

        const newPages = [...activePlanner.pages];
        newPages.splice(pageIndex + 1, 0, newPage);

        const updatedPages = newPages.map((p, i) => ({ ...p, page_number: i }));

        set({
            activePlanner: { ...activePlanner, pages: updatedPages },
            currentPageIndex: pageIndex + 1
        });

        await savePlanner();
    },

    copyPage: (index: number) => {
        get().duplicatePage(index);
    },

    applyBackgroundToAll: async (plannerId, color) => {
        const { activePlanner, savePlanner } = get();
        if (!activePlanner || activePlanner.id !== plannerId) return;

        const updatedPages = activePlanner.pages.map(page => {
            const elements = [...(page.elements || [])];
            const bgIndex = elements.findIndex(el => el.type === 'background');

            if (bgIndex !== -1) {
                elements[bgIndex] = { ...elements[bgIndex], fill: color };
            } else {
                elements.unshift({
                    id: `bg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'background',
                    fill: color,
                    zIndex: -1,
                    x: 0,
                    y: 0
                });
            }

            return { ...page, elements };
        });

        const finalPages = updatedPages.map((p, i) => ({ ...p, page_number: i }));

        set({
            activePlanner: { ...activePlanner, pages: finalPages }
        });

        await savePlanner();
    },

    fetchPlanners: async () => {
        const { user } = get();
        if (!user) return;

        console.log('--- DEBUG START: fetchPlanners ---');
        console.log('Current Auth User ID:', user.id);
        set({ isFetchingPlanners: true });

        try {
            // FORCE FETCH ALL AVAILABLE TO THIS USER (RLS handled)
            const { data, error, status, statusText } = await supabase
                .from('planners')
                .select('*')
                .order('created_at', { ascending: false });

            console.log('Supabase Status:', status, statusText);

            if (error) {
                console.error('CRITICAL DATABASE ERROR:', error);
                throw error;
            }

            console.log('RAW DATA RECEIVED:', data);
            console.log('DATA LENGTH:', data?.length || 0);

            if (data && data.length > 0) {
                console.log('FIRST ITEM PRE-MAP:', data[0]);
            }

            const mapPlanners = (data: any[]) => data.map((p: any) => ({
                id: p.id,
                name: p.name,
                category: p.category,
                coverColor: p.cover_color,
                isArchived: !!p.is_archived,
                archivedAt: p.archived_at,
                createdAt: p.created_at,
                isFavorite: !!p.is_favorite,
                cover_url: p.cover_url,
                pages: [],
                currentPageIndex: 0
            }));

            set({ availablePlanners: mapPlanners(data || []), isFetchingPlanners: false });

            // We only set up ONE subscription for the planner table for this user
            // In a real app, you might want to manage this more carefully to avoid duplicates
            // For now, we'll check if a channel already exists or just use a unique name
            const channelId = `user-planners-${user.id}`;
            const existingChannels = supabase.getChannels();
            const alreadySubscribed = existingChannels.some(c => c.topic === `realtime:public:planners`);

            if (!alreadySubscribed) {
                supabase
                    .channel(channelId)
                    .on('postgres_changes',
                        { event: '*', schema: 'public', table: 'planners', filter: `user_id=eq.${user.id}` },
                        () => {
                            // Re-fetch without setting loading to avoid flicker if preferred,
                            // but here we just call fetchPlanners again.
                            // To avoid recursion, we use a separate silent fetch if needed
                            // For simplicity, we'll just log and trigger a fetch
                            console.log('Realtime update detected, re-fetching...');
                            get().fetchPlanners();
                        }
                    )
                    .subscribe();
            }

        } catch (error) {
            console.error('Error fetching planners:', error);
            set({ isFetchingPlanners: false });
        }
    },

    updatePlannerCover: async (id: string, blob: Blob) => {
        try {
            const user = get().user;
            if (!user) throw new Error("User not authenticated");

            const fileName = `${user.id}/${id}-${Date.now()}.png`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('covers')
                .upload(fileName, blob, {
                    contentType: 'image/png',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('covers')
                .getPublicUrl(fileName);

            // 3. Update Planner Record
            const { error: updateError } = await supabase
                .from('planners')
                .update({ cover_url: publicUrl, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (updateError) throw updateError;

            // 4. Update Local State
            set(state => ({
                availablePlanners: state.availablePlanners.map(p =>
                    p.id === id ? { ...p, cover_url: publicUrl } : p
                ),
                activePlanner: state.activePlanner?.id === id
                    ? { ...state.activePlanner, cover_url: publicUrl }
                    : state.activePlanner
            }));

        } catch (error) {
            console.error('Error updating cover:', error);
            throw error;
        }
    },

    archivePlanner: async (id) => {
        const { error } = await supabase
            .from('planners')
            .update({ is_archived: true, archived_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            // ... fallback logic if needed
            console.error(error);
        }

        set(state => ({
            availablePlanners: state.availablePlanners.map(p =>
                p.id === id ? { ...p, isArchived: true, archivedAt: new Date().toISOString() } : p
            )
        }));
    },

    unarchivePlanner: async (id: string) => {
        const { error } = await supabase
            .from('planners')
            .update({ is_archived: false, archived_at: null })
            .eq('id', id);

        if (error) throw error;

        set(state => ({
            availablePlanners: state.availablePlanners.map(p =>
                p.id === id ? { ...p, isArchived: false, archivedAt: undefined } : p
            )
        }));
    },

    deletePlanner: async (id) => {
        const { error } = await supabase
            .from('planners')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) throw error;

        set(state => ({
            availablePlanners: state.availablePlanners.filter(p => p.id !== id),
            activePlanner: state.activePlannerId === id ? null : state.activePlanner,
            activePlannerId: state.activePlannerId === id ? null : state.activePlannerId
        }));
    },

    toggleFavorite: async (id) => {
        const { availablePlanners } = get();
        const planner = availablePlanners.find(p => p.id === id);
        if (!planner) return;

        const newFavoriteStatus = !planner.isFavorite;

        // Optimistic update
        set(state => ({
            availablePlanners: state.availablePlanners.map(p =>
                p.id === id ? { ...p, isFavorite: newFavoriteStatus } : p
            )
        }));

        const { error } = await supabase
            .from('planners')
            .update({ is_favorite: newFavoriteStatus })
            .eq('id', id);

        if (error) {
            console.error('Error toggling favorite:', error);
            // Revert on error
            set(state => ({
                availablePlanners: state.availablePlanners.map(p =>
                    p.id === id ? { ...p, isFavorite: !newFavoriteStatus } : p
                )
            }));
        }
    },

    fetchLibraryAssets: async (type, category, hashtag) => {
        set({ isLoadingAssets: true });
        let query = supabase
            .from('assets')
            .select('*')
            .eq('type', type);

        if (category) query = query.eq('category', category);
        if (hashtag) query = query.contains('hashtags', [hashtag]);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error(`Error fetching ${type}s:`, error);
            set({ libraryAssets: [], isLoadingAssets: false });
            return;
        }

        console.log(`Fetched ${data?.length || 0} ${type}s`);
        set({ libraryAssets: data || [], isLoadingAssets: false });
    },

    fetchMultipleLibraryAssets: async (types) => {
        set({ isLoadingAssets: true });
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .in('type', types)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(`Error fetching multiple assets:`, error);
            set({ isLoadingAssets: false });
            return;
        }

        set({ libraryAssets: data || [], isLoadingAssets: false });
    },

    fetchLibraryCategories: async (type) => {
        const { data, error } = await supabase
            .from('assets')
            .select('category')
            .eq('type', type);

        if (error) {
            console.error('Error fetching categories:', error);
            return;
        }

        const uniqueCategories = Array.from(new Set((data || []).map(item => item.category).filter(Boolean)));
        set({ libraryCategories: uniqueCategories });
    },

    uploadAsset: async (file, type, category = 'Personal', hashtags = [], thumbnailUrl?: string) => {
        const { user } = get();
        if (!user) {
            throw new Error('User must be logged in to upload assets');
        }

        set({ isLoadingAssets: true });

        try {
            // 1. Upload to Supabase Storage
            let bucketName = 'stickers';
            if (type === 'template') bucketName = 'templates';
            else if (type === 'cover') bucketName = 'covers';
            else if (type === 'image') bucketName = 'planner-uploads'; // Unified bucket for user uploads
            else if (type === 'voice') bucketName = 'voice-notes';
            else if (type === 'planner') bucketName = 'planner-uploads';

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${generateUUID()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                console.error(`STORAGE UPLOAD ERROR in bucket [${bucketName}]:`, uploadError);
                throw uploadError;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            // 3. Save to Assets table
            const { error: dbError } = await supabase
                .from('assets')
                .insert({
                    user_id: user.id, // Associate with user
                    title: file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name,
                    type: type,
                    url: publicUrl,
                    category: category,
                    hashtags: hashtags,
                    thumbnail_url: thumbnailUrl || null
                });

            if (dbError) {
                console.error('Database insertion error:', dbError);
                throw dbError;
            }

            console.log('Asset successfully saved to database:', publicUrl);

            // 4. Refresh assets
            await get().fetchLibraryAssets(type);
            await get().fetchLibraryCategories(type);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading asset:', error);
            throw error;
        } finally {
            set({ isLoadingAssets: false });
        }
    },

    addAssetByUrl: async (url, title, type, category = 'Personal', hashtags = []) => {
        const { user } = get();
        if (!user) {
            throw new Error('User must be logged in to add assets');
        }

        set({ isLoadingAssets: true });

        try {
            const { error } = await supabase
                .from('assets')
                .insert({
                    user_id: user.id,
                    title: title,
                    type: type,
                    url: url,
                    category: category,
                    hashtags: hashtags
                });

            if (error) throw error;

            // Refresh assets
            await get().fetchLibraryAssets(type);
            await get().fetchLibraryCategories(type);

            return url;
        } catch (error) {
            console.error('Error adding asset by URL:', error);
            throw error;
        } finally {
            set({ isLoadingAssets: false });
        }
    },

    updateAssetMetadata: async (id, data) => {
        const { error } = await supabase
            .from('assets')
            .update(data)
            .eq('id', id);

        if (error) {
            console.error('Error updating asset metadata:', error);
            throw error;
        }

        // Refresh currently loaded assets to reflect changes immediately
        set(state => ({
            libraryAssets: state.libraryAssets.map(a => a.id === id ? { ...a, ...data } : a)
        }));
    },

    saveEditedAsset: async (id, blob) => {
        const { libraryAssets, user } = get();
        if (!user) return;
        const asset = libraryAssets.find(a => a.id === id);
        if (!asset) return;

        set({ isLoadingAssets: true });
        try {
            // 1. Identify bucket and path from URL
            const urlParts = asset.url.split('/');
            const bucket = urlParts[urlParts.indexOf('public') + 1];
            const path = urlParts.slice(urlParts.indexOf(bucket) + 1).join('/');

            // 2. Re-upload (overwrite)
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(path, blob, { upsert: true });

            if (uploadError) throw uploadError;

            // 3. Clear cache by appending version or using fresh URL
            // Supabase public URLs are predictable. To force browser refresh:
            const freshUrl = asset.url.split('?')[0] + '?v=' + Date.now();

            // 4. Update local state
            set(state => ({
                libraryAssets: state.libraryAssets.map(a => a.id === id ? { ...a, url: freshUrl } : a)
            }));

            // 5. Update DB (even if URL didn't change, we might want to store the version or just trigger update)
            await supabase.from('assets').update({ url: freshUrl }).eq('id', id);

        } catch (error) {
            console.error('Error saving edited asset:', error);
            throw error;
        } finally {
            set({ isLoadingAssets: false });
        }
    },

    deleteAsset: async (id) => {
        const { libraryAssets } = get();
        const asset = libraryAssets.find(a => a.id === id);
        if (!asset) return;

        try {
            // 1. Delete from Storage if it's a Supabase URL
            if (asset.url.includes('supabase.co/storage/v1/object/public/')) {
                const parts = asset.url.split('/');
                const bucket = parts[parts.indexOf('public') + 1];
                const path = parts.slice(parts.indexOf(bucket) + 1).join('/');

                await supabase.storage.from(bucket).remove([path]);
            }

            // 2. Delete from Database
            const { error } = await supabase
                .from('assets')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // 3. Update local state
            set(state => ({
                libraryAssets: state.libraryAssets.filter(a => a.id !== id)
            }));

        } catch (error) {
            console.error('Error deleting asset:', error);
            throw error;
        }
    },

    fetchUserProfile: async () => {
        const { user } = get();
        if (!user) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return;
        }

        set({ userProfile: data });
    },

    updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() });

        if (error) {
            console.error('Error updating profile:', error);
            throw error;
        }

        // Update local state
        const currentProfile = get().userProfile;
        set({ userProfile: { ...currentProfile, ...updates } as any });
    },

    uploadAvatar: async (file) => {
        const { user } = get();
        if (!user) throw new Error('Not logged in');

        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

        // 1. Upload
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // 2. Get URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 3. Update profile record
        await get().updateProfile({ avatar_url: publicUrl });

        return publicUrl;
    },

    fetchUserStats: async () => {
        const { user } = get();
        if (!user) return;

        try {
            // 1. Planners count
            const { count: plannersCount } = await supabase
                .from('planners')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            // 2. Pages count
            const { data: planners } = await supabase
                .from('planners')
                .select('id')
                .eq('user_id', user.id);

            let totalPages = 0;
            if (planners && planners.length > 0) {
                const { count: pagesCount } = await supabase
                    .from('pages')
                    .select('*', { count: 'exact', head: true })
                    .in('planner_id', planners.map(p => p.id));
                totalPages = pagesCount || 0;
            }

            // 3. Assets count
            const { count: assetsCount } = await supabase
                .from('assets')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            set({
                userStats: {
                    totalPlanners: plannersCount || 0,
                    totalPages: totalPages,
                    totalAssets: assetsCount || 0
                }
            });

        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    },

    createPlannerFromPDF: async (name, pdfPages, options) => {
        const { user } = get();
        if (!user) throw new Error("User must be logged in");

        const selectedPresetName = options?.presetName;
        const defaultSection = options?.section;
        const selectedPreset = PAGE_PRESETS.find(p => p.name === selectedPresetName);
        if (!user) throw new Error("User must be logged in");

        try {
            // 1. Create Planner
            const plannerId = generateUUID();
            const { error: plannerError } = await supabase.from('planners').insert({
                id: plannerId,
                name: name,
                user_id: user.id,
                created_at: new Date().toISOString(),
                is_archived: false,
                cover_color: '#FFFFFF' // Default white
            });

            if (plannerError) throw plannerError;

            // 2. Upload First Page as Cover (if available)
            if (pdfPages.length > 0) {
                try {
                    const firstPageUrl = pdfPages[0].url;
                    // Attempt to fetch and upload as cover (works for blobs, data URIs, and public URLs)
                    if (firstPageUrl) {
                        const res = await fetch(firstPageUrl);
                        const blob = await res.blob();
                        const fileName = `${user.id}/${plannerId}-${Date.now()}-cover.png`;

                        const { error: uploadError } = await supabase.storage
                            .from('covers')
                            .upload(fileName, blob, {
                                contentType: 'image/png',
                                upsert: true
                            });

                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('covers')
                                .getPublicUrl(fileName);

                            // Update planner with cover_url
                            await supabase
                                .from('planners')
                                .update({ cover_url: publicUrl })
                                .eq('id', plannerId);
                        }
                    }
                } catch (coverError) {
                    console.error("Failed to auto-set cover from PDF", coverError);
                    // Non-critical error, continue
                }
            }

            // 2. Create Pages from PDF Images
            const pages = pdfPages.map((pdfPage, index) => {
                const pageId = generateUUID();
                const width = selectedPreset && selectedPreset.name !== 'Custom' ? selectedPreset.width : pdfPage.width;
                const height = selectedPreset && selectedPreset.name !== 'Custom' ? selectedPreset.height : pdfPage.height;
                const layout = selectedPreset && selectedPreset.name !== 'Custom' ? selectedPreset.layout : (pdfPage.width > pdfPage.height ? 'landscape' : 'portrait');

                return {
                    id: pageId,
                    planner_id: plannerId,
                    page_number: index,
                    template_id: 'blank', // Required by DB
                    section: defaultSection || 'General',
                    links: pdfPage.links || [],
                    dimensions: { width, height },
                    layout: layout
                };
            });

            // Insert Pages Metadata
            console.log('[PDF Import] About to insert', pages.length, 'pages');
            console.log('[PDF Import] Sample page data:', pages[0]);
            const { error: pagesError } = await supabase.from('pages').insert(pages);
            if (pagesError) {
                console.error('[PDF Import] ❌ Pages insert failed!');
                console.error('[PDF Import] Error object:', pagesError);
                console.error('[PDF Import] Error message:', pagesError.message);
                console.error('[PDF Import] Error code:', pagesError.code);
                console.error('[PDF Import] Error hint:', pagesError.hint);
                console.error('[PDF Import] Error details:', pagesError.details);
                alert(`Database Error: ${pagesError.message}\n\nHint: ${pagesError.hint || 'None'}\n\nThis likely means the database schema needs updating. Check the console for details.`);
                throw pagesError;
            }
            console.log('[PDF Import] ✅ Pages inserted successfully');

            // 3. Create Layers & Background Elements for each page
            for (let i = 0; i < pdfPages.length; i++) {
                const pageId = pages[i].id;
                const pdfPage = pdfPages[i];

                const backgroundElement: PlannerElement = {
                    id: generateUUID(),
                    type: 'background',
                    x: 0,
                    y: 0,
                    width: pages[i].dimensions?.width || pdfPage.width,
                    height: pages[i].dimensions?.height || pdfPage.height,
                    fill: pdfPage.url,
                    zIndex: 0,
                    isLocked: true // Locked so it acts like a stationary paper background
                };

                await supabase.from('layers').insert({
                    page_id: pageId,
                    elements: [backgroundElement],
                    ink_paths: []
                });
            }

            // 4. Update UI
            const { fetchPlanners, openPlanner } = get();
            await fetchPlanners();
            await openPlanner(plannerId);

        } catch (error) {
            console.error("Failed to create planner from PDF:", error);
            throw error;
        }
    },



    duplicatePlanner: async (id: string, customName?: string) => {
        const { user } = get();
        if (!user) return;

        console.log(`[Duplicate] Starting duplication for Planner ${id}`);
        set({ isFetchingPlanners: true });

        try {
            // 1. Fetch Full Planner Data with Deep Select
            const { data: original, error: fetchError } = await supabase
                .from('planners')
                .select(`
                    *,
                    pages (
                        *,
                        layers (
                            *
                        )
                    )
                `)
                .eq('id', id)
                .single();

            if (fetchError || !original) {
                console.error("[Duplicate] Failed to fetch original planner", fetchError);
                throw fetchError;
            }

            console.log(`[Duplicate] Fetched planner with ${original.pages?.length || 0} pages`);

            // 2. Generate new IDs
            const newPlannerId = generateUUID();
            const newName = customName || `${original.name} (Copy)`;

            // 3. Deep Clone Planner Metadata
            const newPlannerEntry = {
                id: newPlannerId,
                name: newName,
                user_id: user.id,
                created_at: new Date().toISOString(),
                is_archived: false,
                is_favorite: false,
                cover_color: original.cover_color,
                cover_url: original.cover_url,
                category: original.category,
                // binder_style: original.binder_style ?
                //     (typeof structuredClone === 'function' ?
                //         structuredClone(original.binder_style) :
                //         JSON.parse(JSON.stringify(original.binder_style))) :
                //     null,
                // custom_tabs: original.custom_tabs ?
                //     (typeof structuredClone === 'function' ?
                //         structuredClone(original.custom_tabs) :
                //         JSON.parse(JSON.stringify(original.custom_tabs))) :
                //     null,
                // left_tabs: original.left_tabs ?
                //     (typeof structuredClone === 'function' ?
                //         structuredClone(original.left_tabs) :
                //         JSON.parse(JSON.stringify(original.left_tabs))) :
                //     null,
                // top_tabs: original.top_tabs ?
                //     (typeof structuredClone === 'function' ?
                //         structuredClone(original.top_tabs) :
                //         JSON.parse(JSON.stringify(original.top_tabs))) :
                //     null,
                use_spread_view: original.use_spread_view
            };

            // 4. Deep Clone Pages & Layers
            const newPages: any[] = [];
            const newLayers: any[] = [];

            // Sort pages to preserve order
            const sortedPages = (original.pages || []).sort((a: any, b: any) =>
                (a.index ?? a.page_number ?? 0) - (b.index ?? b.page_number ?? 0)
            );

            console.log(`[Duplicate] Processing ${sortedPages.length} pages...`);

            for (let i = 0; i < sortedPages.length; i++) {
                const page = sortedPages[i];
                const newPageId = generateUUID();

                // Clone Page Metadata
                newPages.push({
                    id: newPageId,
                    planner_id: newPlannerId,
                    page_number: page.index ?? page.page_number ?? i,
                    template_id: page.template_id,
                    name: page.name || null,
                    // Remove section/layout if they don't exist in DB schema
                    // dimensions: page.dimensions ?
                    //     (typeof structuredClone === 'function' ?
                    //         structuredClone(page.dimensions) :
                    //         JSON.parse(JSON.stringify(page.dimensions))) :
                    //     null,
                    // is_locked: page.is_locked || false
                });

                // Deep Clone Layers (Content)
                // Normalize layers to an array even if it's a single object
                const layers = Array.isArray(page.layers)
                    ? page.layers
                    : (page.layers ? [page.layers] : []);

                if (layers.length > 0) {
                    const layer = layers[0]; // One layer per page in current schema

                    // Deep clone elements array
                    let elementsClone = layer.elements || [];
                    if (elementsClone.length > 0) {
                        elementsClone = typeof structuredClone === 'function'
                            ? structuredClone(elementsClone)
                            : JSON.parse(JSON.stringify(elementsClone));

                        // Regenerate all element IDs to prevent conflicts
                        elementsClone = elementsClone.map((el: any) => ({
                            ...el,
                            id: generateUUID()
                        }));
                    }

                    // Deep clone ink paths array
                    let inkClone = layer.ink_paths || [];
                    if (inkClone.length > 0) {
                        inkClone = typeof structuredClone === 'function'
                            ? structuredClone(inkClone)
                            : JSON.parse(JSON.stringify(inkClone));

                        // Regenerate all ink path IDs
                        inkClone = inkClone.map((ink: any) => ({
                            ...ink,
                            id: generateUUID()
                        }));
                    }

                    console.log(`[Duplicate] Page ${i}: ${elementsClone.length} elements, ${inkClone.length} ink paths`);

                    newLayers.push({
                        page_id: newPageId,
                        elements: elementsClone,
                        ink_paths: inkClone,
                        updated_at: new Date().toISOString()
                    });
                } else {
                    // Create empty layer if none exists
                    console.log(`[Duplicate] Page ${i}: Creating empty layer`);
                    newLayers.push({
                        page_id: newPageId,
                        elements: [],
                        ink_paths: [],
                        updated_at: new Date().toISOString()
                    });
                }
            }

            // 5. Transactional Insert
            console.log(`[Duplicate] Inserting planner...`);
            const { error: insertPlannerError } = await supabase
                .from('planners')
                .insert(newPlannerEntry);

            if (insertPlannerError) {
                console.error("[Duplicate] Planner Insert Error:", JSON.stringify(insertPlannerError, null, 2));
                throw insertPlannerError;
            }

            console.log(`[Duplicate] Inserting ${newPages.length} pages...`);
            if (newPages.length > 0) {
                const { error: insertPagesError } = await supabase
                    .from('pages')
                    .insert(newPages);

                if (insertPagesError) {
                    console.error("[Duplicate] Pages Insert Error:", JSON.stringify(insertPagesError, null, 2));
                    throw insertPagesError;
                }
            }

            console.log(`[Duplicate] Inserting ${newLayers.length} layers...`);
            if (newLayers.length > 0) {
                const { error: insertLayersError } = await supabase
                    .from('layers')
                    .insert(newLayers);

                if (insertLayersError) {
                    console.error("[Duplicate] Layers Insert Error:", JSON.stringify(insertLayersError, null, 2));
                    throw insertLayersError;
                }
            }

            console.log(`[Duplicate] ✅ Success! Created planner ${newPlannerId} with ${newPages.length} pages, ${newLayers.reduce((sum, l) => sum + (l.elements?.length || 0), 0)} total elements, and ${newLayers.reduce((sum, l) => sum + (l.ink_paths?.length || 0), 0)} total ink paths`);

            // 6. Refresh planner list
            await get().fetchPlanners();

            // 7. Return new planner ID for navigation
            return newPlannerId;

        } catch (error) {
            console.error("[Duplicate] Critical Error:", JSON.stringify(error, null, 2));
            alert("Failed to duplicate planner. Check console for details.");
            throw error;
        } finally {
            set({ isFetchingPlanners: false });
        }
    },

    globalSearch: async (query: string) => {
        if (!query || query.length < 2) {
            set({ searchResults: [], isSearching: false });
            return;
        }

        set({ isSearching: true });

        try {
            // Call the robust Postgre FTS RPC
            const { data, error } = await supabase.rpc('global_search', { query_text: query });

            if (error) throw error;

            const mappedResults = (data || []).map((r: any) => ({
                type: r.type, // 'planner' | 'page'
                id: r.id,
                plannerId: r.planner_id,
                name: r.name,
                pageIndex: r.page_index,
                snippet: r.snippet,
                rank: r.rank
            }));

            set({ searchResults: mappedResults, isSearching: false });

        } catch (err) {
            console.error("Global search RPC failed:", err);
            // Fallback to empty if RPC is not yet implemented in DB
            set({ searchResults: [], isSearching: false });
        }
    },

    renamePlanner: async (id: string, name: string) => {
        const { availablePlanners, activePlanner } = get();

        // Optimistic Update
        const updatedPlanners = availablePlanners.map(p =>
            p.id === id ? { ...p, name } : p
        );

        let updatedActive = activePlanner;
        if (activePlanner && activePlanner.id === id) {
            updatedActive = { ...activePlanner, name };
        }

        set({
            availablePlanners: updatedPlanners,
            activePlanner: updatedActive
        });

        try {
            const { error } = await supabase
                .from('planners')
                .update({ name, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error("Failed to rename planner:", err);
            // Revert changes if needed (optionally implement revert logic)
        }
    },

    renamePage: async (pageId: string, name: string) => {
        const { activePlanner } = get();
        if (!activePlanner) return;

        // Optimistic Update
        const updatedPages = activePlanner.pages.map(p =>
            p.id === pageId ? { ...p, name } : p
        );

        set({
            activePlanner: { ...activePlanner, pages: updatedPages }
        });

        try {
            const { error } = await supabase
                .from('pages')
                .update({ name, updated_at: new Date().toISOString() })
                .eq('id', pageId);

            if (error) throw error;
        } catch (err) {
            console.error("Failed to rename page:", err);
        }
    },

    updatePageMetadata: async (pageId: string, data: { year?: number | null, month?: string | null, section?: string | null, category?: string | null }) => {
        const { activePlanner } = get();
        if (!activePlanner) return;

        // Optimistic Update
        const updatedPages = activePlanner.pages.map(p =>
            p.id === pageId ? { ...p, ...data } : p
        );

        set({
            activePlanner: { ...activePlanner, pages: updatedPages }
        });

        try {
            const { error } = await supabase
                .from('pages')
                .update({
                    ...data,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pageId);

            if (error) throw error;
        } catch (err) {
            console.error("Failed to update page metadata:", err);
        }
    },

    // ========== HISTORY MANAGEMENT ==========
    saveHistory: () => {
        const { activePlanner, past } = get();
        if (!activePlanner) return;

        // Deep clone current pages state
        const snapshot = structuredClone(activePlanner.pages);

        // Add to past, limit to 50 steps
        const newPast = [...past, snapshot];
        if (newPast.length > 50) {
            newPast.shift(); // Remove oldest
        }

        set({
            past: newPast,
            future: [] // Clear future when new action is performed
        });
    },

    undo: () => {
        const { activePlanner, past, future } = get();
        if (!activePlanner || past.length === 0) return;

        // Pop last state from past
        const newPast = [...past];
        const previousState = newPast.pop()!;

        // Push current state to future
        const currentSnapshot = structuredClone(activePlanner.pages);
        const newFuture = [...future, currentSnapshot];

        // Restore previous state
        set({
            activePlanner: {
                ...activePlanner,
                pages: previousState
            },
            past: newPast,
            future: newFuture
        });
    },

    redo: () => {
        const { activePlanner, past, future } = get();
        if (!activePlanner || future.length === 0) return;

        // Pop last state from future
        const newFuture = [...future];
        const nextState = newFuture.pop()!;

        // Push current state to past
        const currentSnapshot = structuredClone(activePlanner.pages);
        const newPast = [...past, currentSnapshot];

        // Restore next state
        set({
            activePlanner: {
                ...activePlanner,
                pages: nextState
            },
            past: newPast,
            future: newFuture
        });
    },

    updatePageTranscription: async (pageId: string, text: string) => {
        const { activePlanner } = get();
        if (!activePlanner) return;

        console.log(`[OCR] Syncing transcription for Page ${pageId}: ${text}`);

        // Optimistic Update
        const updatedPages = activePlanner.pages.map(p =>
            p.id === pageId ? { ...p, ink_transcription: text } : p
        );

        set({
            activePlanner: { ...activePlanner, pages: updatedPages },
            saveStatus: 'saving'
        });

        try {
            const { error } = await supabase
                .from('pages')
                .update({
                    ink_transcription: text,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pageId);

            if (error) throw error;
            console.log(`[OCR] Transcription synced successfully.`);
            set({ saveStatus: 'saved' });
            setTimeout(() => set({ saveStatus: 'idle' }), 2000);
        } catch (err) {
            console.error("[OCR] Failed to update transcription:", err);
            set({ saveStatus: 'error' });
        }
    },

}));
