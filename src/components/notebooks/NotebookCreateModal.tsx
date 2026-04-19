import React, { useState } from 'react';
import { X, FolderPlus, FilePlus, Layers, Copy } from 'lucide-react';
import { useNotebookStore } from '../../store/notebookStore';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNotebookId: string | null;
  activeSectionGroupId: string | null;
  activeSectionId: string | null;
}

export const NotebookCreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  activeNotebookId,
  activeSectionGroupId,
  activeSectionId
}) => {
  const { addSectionGroup, addSection, addPage } = useNotebookStore();
  const [type, setType] = useState<'group' | 'section' | 'page' | 'subpage'>('page');
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) return;
    if (!activeNotebookId) return;

    if (type === 'group') {
      addSectionGroup(activeNotebookId, name);
    } else if (type === 'section') {
      addSection(activeNotebookId, activeSectionGroupId, name, '#6366f1');
    } else if (type === 'page' || type === 'subpage') {
      if (activeSectionId) {
        addPage(activeSectionId, name, 'portrait', 'blank', type === 'subpage');
      } else {
        alert('Please select a section first');
        return;
      }
    }
    
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800">Create New...</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 gap-3 mb-8">
            <TypeOption 
              active={type === 'group'} 
              onClick={() => setType('group')} 
              icon={<FolderPlus size={18} />} 
              label="Section Group" 
              desc="Container for sections"
            />
            <TypeOption 
              active={type === 'section'} 
              onClick={() => setType('section')} 
              icon={<Layers size={18} />} 
              label="Section" 
              desc="Tabs at the top"
            />
            <TypeOption 
              active={type === 'page'} 
              onClick={() => setType('page')} 
              icon={<FilePlus size={18} />} 
              label="Page" 
              desc="Standard A4 canvas"
            />
            <TypeOption 
              active={type === 'subpage'} 
              onClick={() => setType('subpage')} 
              icon={<Copy size={18} />} 
              label="Subpage" 
              desc="Nested under page"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Name / Title</label>
              <input 
                autoFocus
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Enter ${type} name...`}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>

          <button 
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl mt-8 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
          >
            Create {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        </div>
      </div>
    </div>
  );
};

const TypeOption = ({ active, onClick, icon, label, desc }: any) => (
  <button 
    onClick={onClick}
    className={`p-4 rounded-2xl text-left transition-all border-2 flex flex-col gap-2 ${
      active ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-50 hover:border-slate-100'
    }`}
  >
    <div className={`${active ? 'text-indigo-600' : 'text-slate-400'}`}>{icon}</div>
    <div>
      <div className={`text-xs font-black ${active ? 'text-indigo-900' : 'text-slate-700'}`}>{label}</div>
      <div className="text-[10px] font-medium text-slate-400 leading-tight">{desc}</div>
    </div>
  </button>
);
