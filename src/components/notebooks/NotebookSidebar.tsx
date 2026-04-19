import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Book, 
  FileText, 
  Plus, 
  Settings,
  Hash,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Folder
} from 'lucide-react';
import { useNotebookStore } from '../../store/notebookStore';

interface NotebookSidebarProps {
  onOpenCreateModal: () => void;
  onOpenEditModal: (type: 'notebook' | 'group' | 'section' | 'page', id: string, title: string) => void;
  activeSectionGroupId: string | null;
  className?: string;
  onClose?: () => void;
}

export const NotebookSidebar: React.FC<NotebookSidebarProps> = ({ 
  onOpenCreateModal, 
  onOpenEditModal,
  className = '',
  onClose
}) => {
  const { 
    notebooks, 
    activeNotebookId, 
    activeSectionId, 
    activePageId,
    setActiveNotebook,
    setActiveSection,
    setActivePage
  } = useNotebookStore();

  const navigate = useNavigate();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  
  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderSection = (section: any) => (
    <div key={section.id} className="space-y-1">
      <div 
        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all hover:bg-slate-50 group ${
          activeSectionId === section.id ? 'bg-slate-50' : ''
        }`}
        onClick={() => {
          setActiveSection(section.id);
          toggleSection(section.id);
        }}
        onDoubleClick={() => onOpenEditModal('section', section.id, section.name)}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: section.color }} />
        <span className={`flex-1 text-xs font-black truncate uppercase tracking-widest ${
          activeSectionId === section.id ? 'text-indigo-600' : 'text-slate-500'
        }`}>
          {section.name}
        </span>
        {collapsedSections[section.id] ? <ChevronRight size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
      </div>

      {!collapsedSections[section.id] && (
        <div className="ml-4 space-y-1 animate-in slide-in-from-top-1">
          {section.pages.map((page: any) => (
            <button 
              key={page.id}
              className={`page-item w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                activePageId === page.id 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
              style={{ marginLeft: page.isSubpage ? '12px' : '0' }}
              onClick={() => setActivePage(page.id)}
              onDoubleClick={() => onOpenEditModal('page', page.id, page.title)}
            >
              <FileText size={12} className="opacity-50" />
              <span className="truncate flex-1 text-left">{page.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <aside className={`notebook-sidebar ${className}`}>
      <div className="flex items-center justify-between px-6 py-6 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/notebooks')}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
            title="Back to Library"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Notebooks</h2>
            <button 
              className="p-1 hover:bg-slate-100 text-slate-300 hover:text-indigo-600 rounded-md transition-all mt-1" 
              onClick={onOpenCreateModal}
              title="New Notebook"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        {/* Close button - only visible on mobile via CSS */}
        {onClose && (
          <button
            onClick={onClose}
            className="sidebar-toggle-btn ml-auto"
            title="Close"
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>✕</span>
          </button>
        )}
      </div>
      
      <div className="sidebar-content flex-1 overflow-auto p-4 space-y-4">
        {notebooks.map(notebook => (
          <div key={notebook.id} className="space-y-1">
            <button 
              className={`notebook-item w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold ${
                activeNotebookId === notebook.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              }`}
              onClick={() => setActiveNotebook(notebook.id)}
              onDoubleClick={() => onOpenEditModal('notebook', notebook.id, notebook.name)}
            >
              <Book size={18} />
              <span className="flex-1 truncate text-left">{notebook.name}</span>
            </button>

            {activeNotebookId === notebook.id && (
              <div className="ml-4 pt-2 space-y-2 border-l-2 border-slate-100 pl-4 animate-in slide-in-from-left-2 duration-300">
                {/* Render Section Groups */}
                {notebook.sectionGroups?.map(group => (
                  <div key={group.id} className="space-y-1">
                    <div 
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all hover:bg-slate-50"
                      onClick={() => toggleSection(group.id)}
                      onDoubleClick={() => onOpenEditModal('group', group.id, group.name)}
                    >
                      <Folder size={14} className="text-indigo-400" />
                      <span className="flex-1 text-[11px] font-bold truncate text-slate-600">
                        {group.name}
                      </span>
                      {collapsedSections[group.id] ? <ChevronRight size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
                    </div>
                    {!collapsedSections[group.id] && (
                      <div className="ml-3 space-y-2 border-l border-slate-100 pl-3 pt-1 animate-in slide-in-from-top-1">
                        {group.sections?.map(renderSection)}
                        {group.sections?.length === 0 && (
                          <div className="text-[10px] text-slate-400 italic py-1">No sections</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Render Root Sections */}
                {notebook.sections?.map(renderSection)}

                {(!notebook.sections?.length && !notebook.sectionGroups?.length) && (
                  <div className="text-[10px] text-slate-400 py-4 italic text-center">
                    No sections yet
                  </div>
                )}

                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                  onClick={onOpenCreateModal}
                >
                  <Plus size={12} /> Add Section/Page
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors">
          <Settings size={16} />
          <span>Settings</span>
        </div>
        <Hash size={16} className="text-slate-300" />
      </div>
    </aside>
  );
};
