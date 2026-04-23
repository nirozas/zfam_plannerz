import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NotebookSidebar } from '../components/notebooks/NotebookSidebar';
import { NotebookCanvas } from '../components/notebooks/NotebookCanvas';
import { 
  NotebookSideToolbar, 
  NotebookPropertyBar 
} from '../components/notebooks/NotebookToolbar';
import { NotebookCalendar } from '../components/notebooks/NotebookCalendar';
import { NotebookCreateModal } from '../components/notebooks/NotebookCreateModal';
import { NotebookEditModal } from '../components/notebooks/NotebookEditModal';
import { NotebookElementSidebar } from '../components/notebooks/NotebookElementSidebar';
import { NotebookExportModal } from '../components/notebooks/NotebookExportModal';
import { NotebookTrashModal } from '../components/notebooks/NotebookTrashModal';
import { NotebookFloatingToolbar } from '../components/notebooks/NotebookFloatingToolbar';
import { useNotebookStore } from '../store/notebookStore';
import { 
  Cloud, 
  Plus, 
  ArrowLeft, 
  ArrowRight, 
  Link, 
  Book, 
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-react';

import '../components/notebooks/Notebooks.css';

import { loadToken } from '../lib/googleDrive';

const NotebooksPage: React.FC = () => {
  const { 
    notebooks, 
    activeNotebookId, 
    activeSectionId, 
    activePageId,
    isDriveConnected,
    connectDrive,

    updatePageElements,
    updatePage,
    updateElement,
    setActivePage,
    setActiveNotebook,
    addPage,
    goToNextPage,
    goToPrevPage
  } = useNotebookStore();

  const { notebookName } = useParams();
  const navigate = useNavigate();

  // Auto-connect on mount
  useEffect(() => {
    const token = loadToken();
    if (token && !isDriveConnected) {
      connectDrive(true);
    }
  }, [connectDrive, isDriveConnected]);

  // Local UI State
  const [viewMode, setViewMode] = useState<'editor' | 'calendar'>('editor');
  const [activeTool, setActiveTool] = useState<string>('select');
  const [brushSettings, setBrushSettings] = useState({ color: '#4f46e5', width: 5, opacity: 0.3, penType: 'round' });

  
  const handleSetTool = (tool: string) => {
    setActiveTool(tool);
    if (tool !== 'select') setSelectedElementId(null);
    if (tool === 'pen') setBrushSettings(s => ({ ...s, width: 5 }));
    if (tool === 'highlighter') setBrushSettings(s => ({ ...s, width: 17 }));
  };

  const [textSettings, setTextSettings] = useState({ 
    fontFamily: 'Inter', 
    fontSize: 24, 
    fill: '#1e293b',
    backgroundColor: 'transparent',
    outlineStyle: 'none',
    outlineColor: '#cbd5e1'
  });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [editModalState, setEditModalState] = useState<{ isOpen: boolean; type: any; id: string; title: string }>({
    isOpen: false,
    type: 'page',
    id: '',
    title: ''
  });
  const [activeSectionGroupId] = useState<string | null>(null);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Handle Routing Sync
  useEffect(() => {
    if (notebookName && notebooks.length > 0) {
      const found = notebooks.find(nb => nb.name.replace(/\s+/g, '') === notebookName);
      if (found) {
        if (activeNotebookId !== found.id) {
          setActiveNotebook(found.id);
        }
      } else {
        navigate('/notebooks');
      }
    } else if (!notebookName) {
      navigate('/notebooks');
    }
  }, [notebookName, notebooks, activeNotebookId, setActiveNotebook, navigate]);

  // Zoom & Scale State
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<{ getDataURL: (pixelRatio?: number) => string | null; getStageSize: () => { width: number; height: number } }>(null);

  // Pinch-to-zoom (trackpad/mousewheel)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // Prevent browser zoom
        // smooth scaling
        setZoom(prev => {
          const delta = e.deltaY * -0.01;
          const next = Math.min(Math.max(0.25, prev + delta), 4);
          return next;
        });
      }
    };

    viewer.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewer.removeEventListener('wheel', handleWheel);
  }, []);


  // Auto-fit logic
  useEffect(() => {
    if (activePageId && viewMode === 'editor') {
      const timer = setTimeout(() => {
        handleAutoFit();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activePageId, viewMode]);

  const handleAutoFit = () => {
    if (!viewerRef.current) return;
    const { offsetWidth } = viewerRef.current;
    if (offsetWidth === 0) {
      setZoom(1);
      return;
    }
    const activePage = getActivePage();
    if (!activePage) return;
    
    const pageW = activePage.orientation === 'portrait' ? 794 : 1123;
    const isMobile = offsetWidth < 768;
    const padding = isMobile ? 16 : 60;
    const scale = (offsetWidth - padding) / pageW;
    // On mobile: always fit, no cap. On desktop: cap at 1.5x.
    setZoom(isMobile ? scale : Math.min(scale, 1.5));
  };


  const getActivePage = () => {
    if (!activeNotebookId || !activePageId) return null;
    const activeNotebook = notebooks.find(n => n.id === activeNotebookId);
    if (!activeNotebook) return null;
    
    // Search in root sections
    const rootPage = activeNotebook.sections?.flatMap(s => s.pages).find(p => p.id === activePageId);
    if (rootPage) return rootPage;
    
    // Search in section groups
    const groupPage = activeNotebook.sectionGroups?.flatMap(sg => sg.sections).flatMap(s => s.pages).find(p => p.id === activePageId);
    if (groupPage) return groupPage;
    
    return null;
  };

  const activeNotebook = notebooks.find(n => n.id === activeNotebookId);
  const activePage = getActivePage();



  const handleAddSubpage = () => {
    if (!activePage || !activeNotebook) return;

    // Dynamically find section ID if activeSectionId is null
    let sectionIdToUse = activeSectionId;
    if (!sectionIdToUse) {
      const allSections = [...activeNotebook.sections, ...activeNotebook.sectionGroups.flatMap(sg => sg.sections)];
      for (const section of allSections) {
        if (section.pages.some(p => p.id === activePageId)) {
          sectionIdToUse = section.id;
          break;
        }
      }
    }

    if (!sectionIdToUse) return;

    const baseTitle = activePage.title.replace(/\s*\(Page\s*\d+\)$/i, '');
    let nextNum = 2;
    
    const allSectionsForCount = [...activeNotebook.sections, ...activeNotebook.sectionGroups.flatMap(sg => sg.sections)];
    const sectionToUse = allSectionsForCount.find(s => s.id === sectionIdToUse);
    
    if (sectionToUse) {
      const safeBase = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${safeBase}(?:\\s*\\(Page\\s*(\\d+)\\))?$`, 'i');
      
      const existingNums = sectionToUse.pages.map(p => {
        const match = p.title.match(regex);
        if (match) {
          return match[1] ? parseInt(match[1], 10) : 1;
        }
        return 0;
      }).filter(n => n > 0);
      
      if (existingNums.length > 0) {
        nextNum = Math.max(...existingNums) + 1;
      }
    }

    const newTitle = `${baseTitle} (Page ${nextNum})`;

    const newPageId = addPage(
      sectionIdToUse,
      newTitle,
      activePage.orientation,
      activePage.template,
      true
    );
    setActivePage(newPageId);
  };

  const handleUpdateElements = (elements: any[]) => {
    if (!activePageId) return;
    
    // Add to local history for undo/redo
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(elements);
    if (newHistory.length > 50) newHistory.shift(); // Limit history size
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    updatePageElements(activePageId, elements);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const elements = history[prevIndex];
      setHistoryIndex(prevIndex);
      if (activePageId) updatePageElements(activePageId, elements);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const elements = history[nextIndex];
      setHistoryIndex(nextIndex);
      if (activePageId) updatePageElements(activePageId, elements);
    }
  };

  // Initialize history when page changes
  useEffect(() => {
    if (activePage) {
      setHistory([activePage.elements]);
      setHistoryIndex(0);
    }
  }, [activePageId]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'v': handleSetTool('select'); break;
        case 't': handleSetTool('text'); break;
        case 'p': handleSetTool('pen'); break;
        case 'h': handleSetTool('highlighter'); break;
        case 'e': handleSetTool('eraser'); break;
        case 's': handleSetTool('select'); break; 

        case 'z': 
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleUndo();
          }
          break;
        case 'y': 
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleRedo();
          }
          break;
        case 'delete':
        case 'backspace':
          if (selectedElementId) {

            const page = getActivePage();
            if (page) {
              handleUpdateElements(page.elements.filter(el => el.id !== selectedElementId));
              setSelectedElementId(null);
            }
          }
          break;
      }

    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSetTool, handleUndo, handleRedo, selectedElementId, getActivePage, handleUpdateElements]);


  const handleAddImage = async () => {
    console.log("handleAddImage triggered");
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      console.log("File selected:", file?.name);
      if (file && activePageId) {
        try {
          const result = await useNotebookStore.getState().uploadImage(file);
          console.log("Upload result:", result);
          if (result && result.url) {
            const newElement = {
              id: `img-${Date.now()}`,
              type: 'image' as const,
              x: 100,
              y: 100,
              src: result.url,
              zIndex: activePage?.elements.length || 0,
            };
            updatePageElements(activePageId, [...(activePage?.elements || []), newElement]);
          }
        } catch (error) {
          console.error("Image upload process failed:", error);
        }
      }
    };
    input.click();
  };

  const handleAddImageFromUrl = () => {
    const url = prompt('Enter Image URL:');
    if (url && activePageId) {
      const newElement = {
        id: `img-${Date.now()}`,
        type: 'image' as const,
        x: 100,
        y: 100,
        src: url,
        zIndex: activePage?.elements.length || 0,
      };
      updatePageElements(activePageId, [...(activePage?.elements || []), newElement]);
    }
  };

  const handleDuplicateElement = (id: string) => {
    if (!activePageId || !activePage) return;
    const el = activePage.elements.find((e: any) => e.id === id);
    if (el) {
      const newEl = { ...el, id: `${el.type}-${Date.now()}`, x: el.x + 20, y: el.y + 20, zIndex: activePage.elements.length };
      updatePageElements(activePageId, [...activePage.elements, newEl]);
    }
  };

  // Paste & Drop Handlers
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!activePageId) return;
      const item = e.clipboardData?.items[0];
      if (item?.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const result = await useNotebookStore.getState().uploadImage(file);
          if (result) {
            const newElement = {
              id: `img-${Date.now()}`,
              type: 'image' as const,
              x: 150,
              y: 150,
              src: result.url,
              zIndex: activePage?.elements.length || 0,
            };
            updatePageElements(activePageId, [...(activePage?.elements || []), newElement]);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activePageId, activePage, updatePageElements]);

  // Drop Handler
  useEffect(() => {
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      if (!activePageId) return;
      
      const file = e.dataTransfer?.files[0];
      const imageUrl = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain');

      // Get workspace bounds to calculate relative position
      const viewer = document.querySelector('.page-viewer');
      const rect = viewer?.getBoundingClientRect();
      const x = rect ? (e.clientX - rect.left + viewer!.scrollLeft) : 100;
      const y = rect ? (e.clientY - rect.top + viewer!.scrollTop) : 100;

      if (file && file.type.startsWith('image/')) {
        const result = await useNotebookStore.getState().uploadImage(file);
        if (result) {
          const newElement = {
            id: `img-${Date.now()}`,
            type: 'image' as const,
            x,
            y,
            src: result.url,
            zIndex: activePage?.elements.length || 0,
          };
          updatePageElements(activePageId, [...(activePage?.elements || []), newElement]);
        }
      } else if (imageUrl && (imageUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || imageUrl.startsWith('data:image'))) {
        // If it's a URL from Google Image Search or similar
        const newElement = {
          id: `img-${Date.now()}`,
          type: 'image' as const,
          x,
          y,
          src: imageUrl,
          zIndex: activePage?.elements.length || 0,
        };
        updatePageElements(activePageId, [...(activePage?.elements || []), newElement]);
      }
    };

    const handleDragOver = (e: DragEvent) => e.preventDefault();

    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [activePageId, activePage, updatePageElements]);

  const handleCalendarPageSelect = (pageId: string) => {
    setActivePage(pageId);
    setViewMode('editor');
  };

  if (!isDriveConnected) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-12 text-center space-y-8 animate-in zoom-in-95 duration-300">
          <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
            <Cloud className="text-indigo-600" size={48} />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Ready to <span className="text-indigo-600">sync?</span></h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Connect your Google Drive once to save all your notes and drawings securely. We'll remember your connection across sessions.</p>
          </div>
          <button 
            onClick={() => connectDrive()} 
            className="w-full flex items-center justify-center gap-4 bg-slate-900 text-white py-5 rounded-[2.5rem] hover:bg-indigo-600 transition-all active:scale-95 shadow-2xl shadow-indigo-100 group"
          >
            <Link size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Connect My Drive</span>
          </button>
        </div>
      </div>
    );
  }

  const handleUpdatePageMetadata = (updates: { title?: string, dueDate?: string }) => {
    if (activePageId) {
      updatePage(activePageId, updates);
    }
  };

  const handleDuplicatePage = () => {
    if (!activePage || !activeNotebook) return;

    // Find section ID
    let sectionIdToUse = activeSectionId;
    if (!sectionIdToUse) {
      const allSections = [...activeNotebook.sections, ...activeNotebook.sectionGroups.flatMap(sg => sg.sections)];
      for (const section of allSections) {
        if (section.pages.some(p => p.id === activePageId)) {
          sectionIdToUse = section.id;
          break;
        }
      }
    }

    if (!sectionIdToUse) return;

    const baseTitle = activePage.title.replace(/\s*\(Page\s*\d+\)$/i, '').replace(/\s*\(Copy\)$/i, '');
    let nextNum = 2;
    
    const allSectionsForCount = [...activeNotebook.sections, ...activeNotebook.sectionGroups.flatMap(sg => sg.sections)];
    const sectionToUse = allSectionsForCount.find(s => s.id === sectionIdToUse);
    
    if (sectionToUse) {
      const safeBase = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${safeBase}(?:\\s*\\(Page\\s*(\\d+)\\))?$`, 'i');
      const existingNums = sectionToUse.pages.map(p => {
        const match = p.title.match(regex);
        return match ? (match[1] ? parseInt(match[1], 10) : 1) : 0;
      }).filter(n => n > 0);
      
      if (existingNums.length > 0) nextNum = Math.max(...existingNums) + 1;
    }

    const newTitle = `${baseTitle} (Page ${nextNum})`;
    const newPageId = addPage(sectionIdToUse, newTitle, activePage.orientation, activePage.template, false);
    
    // Copy elements
    updatePageElements(newPageId, JSON.parse(JSON.stringify(activePage.elements)));
    setActivePage(newPageId);
  };

  return (
    <div className="notebooks-container">
      {/* Mobile sidebar overlay */}
      <div 
        className={`notebook-sidebar-overlay ${isMobileSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      <NotebookSidebar 
        onOpenCreateModal={() => setIsCreateModalOpen(true)} 
        onOpenEditModal={(type, id, title) => setEditModalState({ isOpen: true, type, id, title })}
        onOpenTrash={() => setIsTrashModalOpen(true)}
        activeSectionGroupId={activeSectionGroupId}
        className={isMobileSidebarOpen ? 'mobile-open' : ''}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {viewMode === 'editor' && (
        <NotebookSideToolbar 
          activeTool={activeTool}
          setActiveTool={handleSetTool}
          handleAddImage={handleAddImage}
          onAddImageFromUrl={handleAddImageFromUrl}
        />
      )}

      <main className="notebook-main flex-1 flex flex-col min-w-0 bg-white">
        <NotebookPropertyBar 
          activeTool={activeTool}
          brushSettings={brushSettings}
          setBrushSettings={setBrushSettings}
          textSettings={textSettings}
          setTextSettings={setTextSettings}
          pageSettings={{
            orientation: activePage?.orientation || 'portrait',
            template: activePage?.template || 'blank'
          }}
          setPageSettings={(updates) => activePageId && updatePage(activePageId, updates)}
          selectedElement={activePage?.elements.find(el => el.id === selectedElementId)}
          onUpdateElement={(id, updates) => activePageId && updateElement(activePageId, id, updates)}
          activePage={activePage}
          onOpenExport={() => setIsExportModalOpen(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onAddImageFromUrl={handleAddImageFromUrl}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onDuplicatePage={handleDuplicatePage}
          onUpdatePageMetadata={handleUpdatePageMetadata}
        />




        <div className="notebook-editor-layout">
          <div className="page-viewer no-scrollbar" ref={viewerRef}>
            {viewMode === 'calendar' ? (
              <div className="w-full h-full p-6">
                <NotebookCalendar onPageSelect={handleCalendarPageSelect} />
              </div>
            ) : activePage ? (
                <div className="flex flex-col items-center gap-10 py-10 inline-page-nav-wrapper" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                  <NotebookCanvas 
                    ref={canvasRef}
                    pageId={activePage.id}
                    elements={activePage.elements}
                    template={activePage.template}
                    orientation={activePage.orientation}
                    onUpdateElements={handleUpdateElements}
                    onSelectElement={setSelectedElementId}
                    activeTool={activeTool}
                    setActiveTool={handleSetTool}
                    brushSettings={brushSettings}
                    textSettings={textSettings}
                    selectedId={selectedElementId}
                  />

                  {selectedElementId && activePage?.elements.find(el => el.id === selectedElementId) && (
                    <NotebookFloatingToolbar 
                      element={activePage.elements.find(el => el.id === selectedElementId)}
                      zoom={zoom}
                      onUpdate={(updates) => activePageId && updateElement(activePageId, selectedElementId, updates)}
                      onDelete={() => {
                        if (activePageId && activePage) {
                          updatePageElements(activePageId, activePage.elements.filter(el => el.id !== selectedElementId));
                          setSelectedElementId(null);
                        }
                      }}
                      onDuplicate={() => handleDuplicateElement(selectedElementId)}
                      onMoveUp={() => {
                        const maxZ = Math.max(...activePage.elements.map(e => e.zIndex || 0));
                        if (activePageId) updateElement(activePageId, selectedElementId, { zIndex: maxZ + 1 });
                      }}
                      onMoveDown={() => {
                        const minZ = Math.min(...activePage.elements.map(e => e.zIndex || 0));
                        if (activePageId) updateElement(activePageId, selectedElementId, { zIndex: minZ - 1 });
                      }}
                    />
                  )}

                  <div className="inline-page-nav flex items-center gap-4 py-8">
                    <button 
                      onClick={() => goToPrevPage()}
                      className="tool-btn rounded-full bg-white shadow-md w-12 h-12 hover:scale-110 transition-all flex items-center justify-center text-slate-400 hover:text-indigo-600"
                      title="Previous Page"
                    >
                      <ArrowLeft size={24} />
                    </button>
                    <button 
                      onClick={handleAddSubpage}
                      className="tool-btn rounded-full bg-indigo-600 shadow-md shadow-indigo-200 w-12 h-12 hover:scale-110 transition-all flex items-center justify-center text-white"
                      title="Add Subpage"
                    >
                      <Plus size={24} />
                    </button>
                    <button 
                      onClick={() => goToNextPage()}
                      className="tool-btn rounded-full bg-white shadow-md w-12 h-12 hover:scale-110 transition-all flex items-center justify-center text-slate-400 hover:text-indigo-600"
                      title="Next Page"
                    >
                      <ArrowRight size={24} />
                    </button>
                  </div>
                </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Book size={64} className="mb-4 opacity-10" />
                <p className="font-bold text-sm">Select a section and page to start creating</p>
              </div>
            )}
          </div>

          <NotebookElementSidebar 
            selectedElement={activePage?.elements.find(el => el.id === selectedElementId)}
            onUpdateElement={(id, updates) => activePageId && updateElement(activePageId, id, updates)}
            onDuplicateElement={handleDuplicateElement}
            onDeleteElement={(id) => {
              if (activePageId && activePage) {
                updatePageElements(activePageId, activePage.elements.filter(el => el.id !== id));
                setSelectedElementId(null);
              }
            }}
            activePage={activePage}
            onClose={() => setSelectedElementId(null)}
          />

          {/* Zoom Controls Overlay */}
          {viewMode === 'editor' && (
            <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-xl z-50 animate-in fade-in slide-in-from-bottom-4">
              <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"><ZoomOut size={16} /></button>
              <div className="w-12 text-center text-[10px] font-black text-slate-700">{Math.round(zoom * 100)}%</div>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"><ZoomIn size={16} /></button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button onClick={handleAutoFit} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all" title="Fit to Screen"><Maximize size={16} /></button>
            </div>
          )}
        </div>


      </main>

      {/* Mobile floating page navigation */}
      <div className="mobile-page-nav">
        <button 
          onClick={() => goToPrevPage()}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-500 active:bg-indigo-50 active:text-indigo-600 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <button 
          onClick={handleAddSubpage}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-200 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
        <button 
          onClick={() => goToNextPage()}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-500 active:bg-indigo-50 active:text-indigo-600 transition-all"
        >
          <ArrowRight size={20} />
        </button>
      </div>

      <NotebookCreateModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        activeNotebookId={activeNotebookId}
        activeSectionGroupId={activeSectionGroupId}
        activeSectionId={activeSectionId}
      />

      <NotebookEditModal 
        isOpen={editModalState.isOpen}
        onClose={() => setEditModalState({ ...editModalState, isOpen: false })}
        itemType={editModalState.type}
        itemId={editModalState.id}
        initialTitle={editModalState.title}
      />



      <NotebookExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        activeNotebookId={activeNotebookId}
        activeSectionId={activeSectionId}
        activePageId={activePageId}
        canvasRef={canvasRef}
      />

      <NotebookTrashModal 
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
      />
    </div>
  );
};

export default NotebooksPage;
