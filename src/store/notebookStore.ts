import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Notebook, 
  NotebookSection, 
  NotebookSectionGroup, 
  NotebookPage, 
  NotebookElement,
  PageTemplate,
  PageOrientation
} from '../types/notebook';
import { 
  uploadFileToDrive, 
  downloadFileFromDrive, 
  checkIsSignedIn, 
  signIn, 
  getOrCreateAppFolder,
  findNotebookFiles,
  deleteFileFromDrive,
  listFilesInAppFolder
} from '../lib/googleDrive';
import { supabase } from '../supabase/client';

interface NotebookState {
  notebooks: Notebook[];
  notebookFileIds: Record<string, string>; // notebookId -> driveFileId
  activeNotebookId: string | null;
  activeSectionId: string | null;
  activePageId: string | null;
  isDriveConnected: boolean;
  isLoading: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';

  // Actions
  connectDrive: (silent?: boolean) => Promise<void>;
  loadNotebooks: () => Promise<void>;
  saveToDrive: (notebookId?: string) => Promise<void>;
  
  setNotebooks: (notebooks: Notebook[]) => void;
  setActiveNotebook: (id: string | null) => void;
  setActiveSection: (id: string | null) => void;
  setActivePage: (pageId: string) => void;

  // Hierarchy Actions
  addNotebook: (name: string) => void;
  updateNotebook: (id: string, updates: Partial<Notebook>) => void;
  renameNotebook: (id: string, name: string) => void;
  deleteNotebook: (id: string) => void;
  addSectionGroup: (notebookId: string, name: string) => void;
  addSection: (notebookId: string, groupId: string | null, name: string, color: string) => void;
  addPage: (sectionId: string, title: string, orientation: PageOrientation, template: PageTemplate, isSubpage?: boolean) => string;
  
  // Element Actions
  updatePageElements: (pageId: string, elements: NotebookElement[]) => void;
  addElement: (pageId: string, element: NotebookElement) => void;
  updateElement: (pageId: string, elementId: string, updates: Partial<NotebookElement>) => void;
  deleteElement: (pageId: string, elementId: string) => void;

  // Page Actions
  deletePage: (pageId: string) => void;
  updatePage: (pageId: string, updates: Partial<NotebookPage>) => void;
  renameSection: (sectionId: string, name: string) => void;
  renameSectionGroup: (groupId: string, name: string) => void;
  movePage: (pageId: string, newSectionId: string) => void;
  moveSection: (sectionId: string, newNotebookId: string, newGroupId: string | null) => void;
  
  // Navigation
  goToNextPage: () => void;
  goToPrevPage: () => void;

  // Helpers
  getAllPagesWithMetadata: () => (NotebookPage & { notebookTitle: string; sectionTitle: string })[];
  uploadImage: (file: File) => Promise<{ url: string } | null>;
}

export const useNotebookStore = create<NotebookState>()(
  persist(
    (set, get) => ({
      notebooks: [],
      notebookFileIds: {},
      activeNotebookId: null,
      activeSectionId: null,
      activePageId: null,
      isDriveConnected: false,
      isLoading: false,
      saveStatus: 'idle',

      connectDrive: async (silent = false) => {
        try {
          if (!silent) await signIn();
          set({ isDriveConnected: true });
          await get().loadNotebooks();
        } catch (error) {
          console.error("Drive connection failed", error);
          if (!silent) set({ isDriveConnected: false });
        }
      },

      loadNotebooks: async () => {
        const isSignedIn = checkIsSignedIn();
        set({ isLoading: true });
        
        try {
          // 1. Hybrid Load: Start with Supabase Registry for Instant Library View
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: registry, error } = await supabase
              .from('notebook_registry')
              .select('*')
              .order('updated_at', { ascending: false });

            if (!error && registry && registry.length > 0) {
              console.log("Loading library from Supabase Registry...");
              const registryNotebooks = registry.map(r => ({
                id: r.id,
                name: r.name,
                coverImage: r.cover_image,
                sectionGroups: [],
                sections: [],
                createdAt: r.created_at,
                updatedAt: r.updated_at,
              }));
              
              const registryFileIds: Record<string, string> = {};
              registry.forEach(r => { registryFileIds[r.id] = r.drive_file_id; });

              // Instant UI Update
              set({ notebooks: registryNotebooks, notebookFileIds: registryFileIds });
            }
          }

          // 2. Background Sync: Connect to Google Drive to fetch payloads
          if (isSignedIn) {
            console.log("Syncing with Google Drive payloads in background...");
            const driveFiles = await findNotebookFiles();
            const notebookMap = new Map<string, Notebook>();
            const fileIds: Record<string, string> = {};

            for (const f of driveFiles) {
              try {
                const text = await downloadFileFromDrive(f.id);
                const notebook = JSON.parse(text);
                if (notebook && notebook.id && !notebookMap.has(notebook.id)) {
                  notebookMap.set(notebook.id, notebook);
                  fileIds[notebook.id] = f.id;

                  // Auto-Register in Supabase if missing (Shadow Indexing)
                  if (user && !get().notebooks.find(nb => nb.id === notebook.id)) {
                    await supabase.from('notebook_registry').upsert({
                      id: notebook.id,
                      owner_id: user.id,
                      drive_file_id: f.id,
                      name: notebook.name,
                      cover_image: notebook.coverImage
                    });
                  }
                }
              } catch (e) { console.error(`Failed to download ${f.name}:`, e); }
            }

            const mergedNotebooks = Array.from(notebookMap.values());
            set({ notebooks: mergedNotebooks, notebookFileIds: fileIds, isDriveConnected: true });
          }
        } catch (error) {
          console.error("Load failed:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      saveToDrive: async (notebookId) => {
        if (!checkIsSignedIn()) return;
        const targetId = notebookId || get().activeNotebookId;
        if (!targetId) return;

        set({ saveStatus: 'saving' });
        try {
          const notebook = get().notebooks.find(nb => nb.id === targetId);
          if (!notebook) return;

          // 1. Save Payload to Google Drive (The Vault)
          const data = JSON.stringify(notebook);
          const blob = new Blob([data], { type: 'application/json' });
          const fileName = `nb_${targetId}.json`;
          const existingFileId = get().notebookFileIds[targetId];
          const result = await uploadFileToDrive(blob, fileName, 'application/json', false, existingFileId);
          
          // 2. Update Metadata in Supabase Registry (The Catalog)
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('notebook_registry').upsert({
              id: targetId,
              owner_id: user.id,
              drive_file_id: result.externalId,
              name: notebook.name,
              cover_image: notebook.coverImage,
              updated_at: new Date().toISOString()
            });
          }

          set(state => ({ 
            notebookFileIds: { ...state.notebookFileIds, [targetId]: result.externalId }, 
            saveStatus: 'saved' 
          }));
          setTimeout(() => set({ saveStatus: 'idle' }), 2000);
        } catch (error) { 
          console.error("Save failed:", error);
          set({ saveStatus: 'error' }); 
        }
      },

      setNotebooks: (notebooks) => set({ notebooks }),
      setActiveNotebook: (id) => {
        const notebook = get().notebooks.find(n => n.id === id);
        set({ activeNotebookId: id, activeSectionId: null, activePageId: notebook?.lastPageId || null });
      },

      setActivePage: (pageId: string) => {
        const { activeNotebookId } = get();
        set(state => ({ 
          activePageId: pageId,
          notebooks: state.notebooks.map(nb => nb.id === activeNotebookId ? { ...nb, lastPageId: pageId } : nb)
        }));
        if (activeNotebookId) get().saveToDrive(activeNotebookId);
      },

      setActiveSection: (id) => set({ activeSectionId: id, activePageId: null }),

      goToNextPage: () => {
        const { notebooks, activeNotebookId, activePageId } = get();
        const notebook = notebooks.find(nb => nb.id === activeNotebookId);
        if (!notebook) return;
        const flatPages: { pageId: string; sectionId: string }[] = [];
        const processSection = (s: NotebookSection) => s.pages.forEach(p => flatPages.push({ pageId: p.id, sectionId: s.id }));
        notebook.sections.forEach(processSection);
        notebook.sectionGroups.forEach(sg => sg.sections.forEach(processSection));
        const currentIndex = flatPages.findIndex(p => p.pageId === activePageId);
        if (currentIndex !== -1 && currentIndex < flatPages.length - 1) {
          const next = flatPages[currentIndex + 1];
          set({ activePageId: next.pageId, activeSectionId: next.sectionId });
          get().saveToDrive(activeNotebookId!);
        }
      },

      goToPrevPage: () => {
        const { notebooks, activeNotebookId, activePageId } = get();
        const notebook = notebooks.find(nb => nb.id === activeNotebookId);
        if (!notebook) return;
        const flatPages: { pageId: string; sectionId: string }[] = [];
        const processSection = (s: NotebookSection) => s.pages.forEach(p => flatPages.push({ pageId: p.id, sectionId: s.id }));
        notebook.sections.forEach(processSection);
        notebook.sectionGroups.forEach(sg => sg.sections.forEach(processSection));
        const currentIndex = flatPages.findIndex(p => p.pageId === activePageId);
        if (currentIndex > 0) {
          const prev = flatPages[currentIndex - 1];
          set({ activePageId: prev.pageId, activeSectionId: prev.sectionId });
          get().saveToDrive(activeNotebookId!);
        }
      },

      addNotebook: (name) => {
        const id = crypto.randomUUID();
        const newNotebook: Notebook = { id, name, sectionGroups: [], sections: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set(state => ({ notebooks: [...state.notebooks, newNotebook] }));
        get().saveToDrive(id);
      },

      updateNotebook: (id, updates) => {
        set(state => ({ notebooks: state.notebooks.map(nb => nb.id === id ? { ...nb, ...updates, updatedAt: new Date().toISOString() } : nb) }));
        get().saveToDrive(id);
      },

      renameNotebook: (id, name) => get().updateNotebook(id, { name }),

      deleteNotebook: async (id) => {
        const fileId = get().notebookFileIds[id];
        if (fileId) await deleteFileFromDrive(fileId).catch(() => {});
        // Also delete from Supabase Registry
        await supabase.from('notebook_registry').delete().eq('id', id);
        set(state => ({ notebooks: state.notebooks.filter(nb => nb.id !== id), activeNotebookId: state.activeNotebookId === id ? null : state.activeNotebookId }));
      },

      addSectionGroup: (notebookId, name) => {
        set(state => ({ notebooks: state.notebooks.map(nb => nb.id === notebookId ? { ...nb, sectionGroups: [...nb.sectionGroups, { id: crypto.randomUUID(), name, sections: [] }] } : nb) }));
        get().saveToDrive(notebookId);
      },

      addSection: (notebookId, groupId, name, color) => {
        const newSection: NotebookSection = { id: crypto.randomUUID(), name, color, pages: [] };
        set(state => ({
          notebooks: state.notebooks.map(nb => {
            if (nb.id !== notebookId) return nb;
            if (groupId) return { ...nb, sectionGroups: nb.sectionGroups.map(sg => sg.id === groupId ? { ...sg, sections: [...sg.sections, newSection] } : sg) };
            return { ...nb, sections: [...nb.sections, newSection] };
          })
        }));
        get().saveToDrive(notebookId);
      },

      addPage: (sectionId, title, orientation, template, isSubpage) => {
        const pageId = crypto.randomUUID();
        let notebookId = '';
        set(state => ({
          notebooks: state.notebooks.map(nb => {
            const hasSection = nb.sections.some(s => s.id === sectionId) || nb.sectionGroups.some(sg => sg.sections.some(s => s.id === sectionId));
            if (!hasSection) return nb;
            notebookId = nb.id;
            const newPage: NotebookPage = { id: pageId, title, createdAt: new Date().toISOString(), orientation, template, elements: [], isSubpage };
            return {
              ...nb,
              sections: nb.sections.map(s => s.id === sectionId ? { ...s, pages: [...s.pages, newPage] } : s),
              sectionGroups: nb.sectionGroups.map(sg => ({ ...sg, sections: sg.sections.map(s => s.id === sectionId ? { ...s, pages: [...s.pages, newPage] } : s) }))
            };
          })
        }));
        if (notebookId) get().saveToDrive(notebookId);
        return pageId;
      },

      updatePageElements: (pageId, elements) => {
        let notebookId = '';
        set(state => ({
          notebooks: state.notebooks.map(nb => {
            const isTarget = nb.sections.some(s => s.pages.some(p => p.id === pageId)) || nb.sectionGroups.some(sg => sg.sections.some(s => s.pages.some(p => p.id === pageId)));
            if (!isTarget) return nb;
            notebookId = nb.id;
            return {
              ...nb,
              sections: nb.sections.map(s => ({ ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, elements } : p) })),
              sectionGroups: nb.sectionGroups.map(sg => ({ ...sg, sections: sg.sections.map(s => ({ ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, elements } : p) })) }))
            };
          })
        }));
        if (notebookId) get().saveToDrive(notebookId);
      },

      addElement: (pageId, element) => {
        let notebookId = '';
        set(state => ({
          notebooks: state.notebooks.map(nb => {
             const isTarget = nb.sections.some(s => s.pages.some(p => p.id === pageId)) || nb.sectionGroups.some(sg => sg.sections.some(s => s.pages.some(p => p.id === pageId)));
            if (!isTarget) return nb;
            notebookId = nb.id;
            return {
              ...nb,
              sections: nb.sections.map(s => ({ ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, elements: [...p.elements, element] } : p) })),
              sectionGroups: nb.sectionGroups.map(sg => ({ ...sg, sections: sg.sections.map(s => ({ ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, elements: [...p.elements, element] } : p) })) }))
            };
          })
        }));
        if (notebookId) get().saveToDrive(notebookId);
      },

      updateElement: (pageId, elementId, updates) => {
        let notebookId = '';
        set(state => ({
          notebooks: state.notebooks.map(nb => {
            const isTarget = nb.sections.some(s => s.pages.some(p => p.id === pageId)) || nb.sectionGroups.some(sg => sg.sections.some(s => s.pages.some(p => p.id === pageId)));
            if (!isTarget) return nb;
            notebookId = nb.id;
            return {
              ...nb,
              sections: nb.sections.map(s => ({ ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, elements: p.elements.map(el => el.id === elementId ? { ...el, ...updates } : el) } : p) })),
              sectionGroups: nb.sectionGroups.map(sg => ({ ...sg, sections: sg.sections.map(s => ({ ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, elements: p.elements.map(el => el.id === elementId ? { ...el, ...updates } : el) } : p) })) }))
            };
          })
        }));
        if (notebookId) get().saveToDrive(notebookId);
      },

      deleteElement: (pageId, elementId) => {
        let notebookId = '';
        set(state => ({
          notebooks: state.notebooks.map(nb => {
            const isTarget = nb.sections.some(s => s.pages.some(p => p.id === pageId)) || nb.sectionGroups.some(sg => sg.sections.some(s => s.pages.some(p => p.id === pageId)));
            if (!isTarget) return nb;
            notebookId = nb.id;
            return {
              ...nb,
              sections: nb.sections.map(s => ({ ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, elements: p.elements.filter(el => el.id !== elementId) } : p) })),
              sectionGroups: nb.sectionGroups.map(sg => ({ ...sg, sections: sg.sections.map(s => ({ ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, elements: p.elements.filter(el => el.id !== elementId) } : p) })) }))
            };
          })
        }));
        if (notebookId) get().saveToDrive(notebookId);
      },

      deletePage: (pageId) => {
        let notebookId = '';
        set(state => ({
          notebooks: state.notebooks.map(nb => {
             const isTarget = nb.sections.some(s => s.pages.some(p => p.id === pageId)) || nb.sectionGroups.some(sg => sg.sections.some(s => s.pages.some(p => p.id === pageId)));
            if (!isTarget) return nb;
            notebookId = nb.id;
            return {
              ...nb,
              sections: nb.sections.map(s => ({ ...s, pages: s.pages.filter(p => p.id !== pageId) })),
              sectionGroups: nb.sectionGroups.map(sg => ({ ...sg, sections: sg.sections.map(s => ({ ...s, pages: s.pages.filter(p => p.id !== pageId) })) }))
            };
          })
        }));
        if (notebookId) get().saveToDrive(notebookId);
      },

      updatePage: (pageId, updates) => {
        let notebookId = '';
        set(state => ({
          notebooks: state.notebooks.map(nb => {
            const isTarget = nb.sections.some(s => s.pages.some(p => p.id === pageId)) || nb.sectionGroups.some(sg => sg.sections.some(s => s.pages.some(p => p.id === pageId)));
            if (!isTarget) return nb;
            notebookId = nb.id;
            return {
              ...nb,
              sections: nb.sections.map(s => ({ ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, ...updates } : p) })),
              sectionGroups: nb.sectionGroups.map(sg => ({ ...sg, sections: sg.sections.map(s => ({ ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, ...updates } : p) })) }))
            };
          })
        }));
        if (notebookId) get().saveToDrive(notebookId);
      },

      renameSection: (sectionId, name) => {
        let notebookId = '';
        set(state => ({
          notebooks: state.notebooks.map(nb => {
            const isTarget = nb.sections.some(s => s.id === sectionId) || nb.sectionGroups.some(sg => sg.sections.some(s => s.id === sectionId));
            if (!isTarget) return nb;
            notebookId = nb.id;
            return {
              ...nb,
              sections: nb.sections.map(s => s.id === sectionId ? { ...s, name } : s),
              sectionGroups: nb.sectionGroups.map(sg => ({ ...sg, sections: sg.sections.map(s => s.id === sectionId ? { ...s, name } : s) }))
            };
          })
        }));
        if (notebookId) get().saveToDrive(notebookId);
      },

      renameSectionGroup: (groupId, name) => {
        let notebookId = '';
        set(state => ({
          notebooks: state.notebooks.map(nb => {
            const isTarget = nb.sectionGroups.some(sg => sg.id === groupId);
            if (!isTarget) return nb;
            notebookId = nb.id;
            return { ...nb, sectionGroups: nb.sectionGroups.map(sg => sg.id === groupId ? { ...sg, name } : sg) };
          })
        }));
        if (notebookId) get().saveToDrive(notebookId);
      },

      movePage: (pageId, newSectionId) => get().saveToDrive(),
      moveSection: (sectionId, newNotebookId, newGroupId) => get().saveToDrive(),

      getAllPagesWithMetadata: () => {
        const { notebooks } = get();
        const allPages: (NotebookPage & { notebookTitle: string; sectionTitle: string })[] = [];
        notebooks.forEach(nb => {
          nb.sections.forEach(s => s.pages.forEach(p => allPages.push({ ...p, notebookTitle: nb.name, sectionTitle: s.name })));
          nb.sectionGroups.forEach(sg => sg.sections.forEach(s => s.pages.forEach(p => allPages.push({ ...p, notebookTitle: nb.name, sectionTitle: s.name }))));
        });
        return allPages;
      },

      uploadImage: async (file: File) => {
        try {
          const { uploadFileToDrive } = await import('../lib/googleDrive');
          const result = await uploadFileToDrive(file, file.name, file.type, true);
          return { url: result.url };
        } catch (e) { return null; }
      },
    }),
    {
      name: 'notebook-storage',
      partialize: (state) => ({ notebooks: state.notebooks, notebookFileIds: state.notebookFileIds }),
    }
  )
);
