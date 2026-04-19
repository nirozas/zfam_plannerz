import React, { useState, useEffect } from 'react';
import { X, Save, Type } from 'lucide-react';
import { useNotebookStore } from '../../store/notebookStore';
import { PageOrientation, PageTemplate } from '../../types/notebook';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'notebook' | 'group' | 'section' | 'page';
  itemId: string;
  initialTitle: string;
}

export const NotebookEditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  itemType,
  itemId,
  initialTitle
}) => {
  const { 
    notebooks, 
    renameNotebook, 
    renameSectionGroup, 
    renameSection, 
    updatePage,
    movePage,
    moveSection,
    duplicatePage
  } = useNotebookStore();

  const [title, setTitle] = useState(initialTitle);
  const [parentId, setParentId] = useState<string>('');
  const [duplicateSectionId, setDuplicateSectionId] = useState<string>('');
  const [targetNotebookId, setTargetNotebookId] = useState<string>('');

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, itemId]);

  const [dueDate, setDueDate] = useState('');
  const [pageOrientation, setPageOrientation] = useState<PageOrientation>('portrait');
  const [pageTemplate, setPageTemplate] = useState<PageTemplate>('blank');

  useEffect(() => {
    if (itemType === 'page') {
      const page = notebooks.flatMap(nb => [...nb.sections, ...nb.sectionGroups.flatMap(sg => sg.sections)]).flatMap(s => s.pages).find(p => p.id === itemId);
      if (page) {
        setDueDate(page.dueDate || '');
        setPageOrientation(page.orientation);
        setPageTemplate(page.template);
      }
    }
  }, [itemId, itemType, notebooks]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;

    if (itemType === 'notebook') {
      renameNotebook(itemId, title);
    } else if (itemType === 'group') {
      renameSectionGroup(itemId, title);
    } else if (itemType === 'section') {
      renameSection(itemId, title);
      if (targetNotebookId) {
        moveSection(itemId, targetNotebookId, parentId || null);
      }
    } else if (itemType === 'page') {
      updatePage(itemId, { 
        title, 
        dueDate: dueDate || undefined,
        orientation: pageOrientation,
        template: pageTemplate
      });
      
      if (parentId) {
        movePage(itemId, parentId);
      }
    }

    onClose();
  };

  const handleDuplicate = () => {
    if (itemType === 'page' && duplicateSectionId) {
      duplicatePage(itemId, duplicateSectionId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800">Edit {itemType}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Title</label>
            <div className="relative">
              <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {itemType === 'page' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Due Date</label>
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Template</label>
                <select 
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                  value={pageTemplate}
                  onChange={(e) => setPageTemplate(e.target.value as any)}
                >
                  <option value="blank">Blank</option>
                  <option value="lined">Lined</option>
                  <option value="grid">Grid</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          )}

          {(itemType === 'page' || itemType === 'section') && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                {itemType === 'page' ? 'Move to Section' : 'Move to Notebook / Group'}
              </label>
              
              <div className="space-y-3">
                {itemType === 'section' && (
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                    value={targetNotebookId}
                    onChange={(e) => setTargetNotebookId(e.target.value)}
                  >
                    <option value="">Keep current notebook</option>
                    {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
                  </select>
                )}

                <select 
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">{itemType === 'page' ? 'Keep current section' : 'Root Section (No Group)'}</option>
                  {itemType === 'page' && notebooks.flatMap(nb => [
                    ...nb.sections.map(s => ({ id: s.id, name: `${nb.name} > ${s.name}` })),
                    ...nb.sectionGroups.flatMap(sg => sg.sections.map(s => ({ id: s.id, name: `${nb.name} > ${sg.name} > ${s.name}` })))
                  ]).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  
                  {itemType === 'section' && targetNotebookId && notebooks.find(n => n.id === targetNotebookId)?.sectionGroups.map(sg => (
                    <option key={sg.id} value={sg.id}>{sg.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {itemType === 'page' && (
            <div className="pt-4 border-t border-slate-100">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Duplicate to Section</label>
              <div className="flex gap-2">
                <select 
                  className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                  value={duplicateSectionId}
                  onChange={(e) => setDuplicateSectionId(e.target.value)}
                >
                  <option value="">Select destination section...</option>
                  {notebooks.flatMap(nb => [
                    ...nb.sections.map(s => ({ id: s.id, name: `${nb.name} > ${s.name}` })),
                    ...nb.sectionGroups.flatMap(sg => sg.sections.map(s => ({ id: s.id, name: `${nb.name} > ${sg.name} > ${s.name}` })))
                  ]).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button 
                  onClick={handleDuplicate}
                  disabled={!duplicateSectionId}
                  className="px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl transition-all"
                >
                  Clone
                </button>
              </div>
            </div>
          )}

          <button 
            onClick={handleSave}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
