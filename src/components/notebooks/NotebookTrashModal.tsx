import React, { useState, useEffect } from 'react';
import { X, Trash2, RotateCcw, FileText, Layers, Folder, AlertTriangle, Clock } from 'lucide-react';
import { useNotebookStore } from '../../store/notebookStore';
import { TrashedItem } from '../../types/notebook';

interface NotebookTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function daysUntilExpiry(deletedAt: string): number {
  const deletedDate = new Date(deletedAt);
  const expiryDate = new Date(deletedDate);
  expiryDate.setDate(expiryDate.getDate() + 30);
  const diff = expiryDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDeletedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const typeConfig = {
  page:    { icon: FileText, label: 'Page',          color: 'text-indigo-500',  bg: 'bg-indigo-50' },
  section: { icon: Layers,   label: 'Section',       color: 'text-violet-500',  bg: 'bg-violet-50' },
  group:   { icon: Folder,   label: 'Section Group', color: 'text-amber-500',   bg: 'bg-amber-50'  },
};

function getItemTitle(item: TrashedItem): string {
  const i = item.item as any;
  return i.title ?? i.name ?? 'Unknown';
}

function getItemDetail(item: TrashedItem): string {
  if (item.type === 'page') {
    const pages = 1;
    return `1 page`;
  }
  if (item.type === 'section') {
    const pages = (item.item as any).pages?.length ?? 0;
    return `${pages} page${pages !== 1 ? 's' : ''}`;
  }
  if (item.type === 'group') {
    const sections = (item.item as any).sections?.length ?? 0;
    const pages = (item.item as any).sections?.reduce((acc: number, s: any) => acc + (s.pages?.length ?? 0), 0) ?? 0;
    return `${sections} section${sections !== 1 ? 's' : ''}, ${pages} page${pages !== 1 ? 's' : ''}`;
  }
  return '';
}

export const NotebookTrashModal: React.FC<NotebookTrashModalProps> = ({ isOpen, onClose }) => {
  const { trashedItems, restoreItem, permanentlyDeleteItem, emptyTrash, cleanOldTrash, notebooks } = useNotebookStore();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [filter, setFilter] = useState<'all' | 'page' | 'section' | 'group'>('all');

  useEffect(() => {
    if (isOpen) {
      cleanOldTrash();
      setConfirmEmpty(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = filter === 'all' ? trashedItems : trashedItems.filter(t => t.type === filter);

  const getNotebookName = (id: string) => notebooks.find(n => n.id === id)?.name ?? 'Unknown Notebook';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Trash</h2>
              <p className="text-xs text-slate-400 font-medium">Items are deleted permanently after 30 days</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all shadow-sm">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-2">
          {(['all', 'page', 'section', 'group'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${
                filter === f ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              {f === 'all' ? `All (${trashedItems.length})` : f === 'group' ? `Groups` : `${f}s`}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                <Trash2 size={28} className="text-slate-200" />
              </div>
              <p className="text-sm font-bold text-slate-400">Trash is empty</p>
              <p className="text-xs text-slate-300 mt-1">Deleted items will appear here</p>
            </div>
          ) : (
            filtered.map(item => {
              const cfg = typeConfig[item.type];
              const Icon = cfg.icon;
              const daysLeft = daysUntilExpiry(item.deletedAt);
              const isExpiringSoon = daysLeft <= 3;

              return (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-100">
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={cfg.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{getItemTitle(item)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{getNotebookName(item.originalNotebookId)}</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{getItemDetail(item)}</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className={`text-[10px] flex items-center gap-1 font-bold ${isExpiringSoon ? 'text-red-400' : 'text-slate-400'}`}>
                        {isExpiringSoon && <AlertTriangle size={9} />}
                        <Clock size={9} />
                        {daysLeft}d left
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-300 mt-0.5">Deleted {formatDeletedDate(item.deletedAt)}</p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => restoreItem(item.id)}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all"
                      title="Restore"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Permanently delete this item? This cannot be undone.')) {
                          permanentlyDeleteItem(item.id);
                        }
                      }}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"
                      title="Delete permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {trashedItems.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            {confirmEmpty ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 flex-1 font-medium">Permanently delete all {trashedItems.length} items?</p>
                <button
                  onClick={() => { emptyTrash(); setConfirmEmpty(false); }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl transition-all"
                >
                  Yes, Empty Trash
                </button>
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-black rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="w-full py-2.5 text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                Empty Trash
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
