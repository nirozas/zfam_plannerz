import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Folder, Book, Layers } from 'lucide-react';
import { Notebook } from '../../types/notebook';

interface LocationSelectorProps {
  notebooks: Notebook[];
  value: string;
  onChange: (value: string) => void;
  type: 'section' | 'group'; // 'section' means pick a section, 'group' means pick a group
  targetNotebookId?: string; // If provided, only show groups/sections for this notebook
  placeholder: string;
  defaultNotebookOpen?: string; // ID of the notebook to open by default
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  notebooks,
  value,
  onChange,
  type,
  targetNotebookId,
  placeholder,
  defaultNotebookOpen
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(defaultNotebookOpen ? [defaultNotebookOpen] : []));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpanded(next);
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  // Find the selected label
  let selectedLabel = '';
  if (value === '') {
    selectedLabel = type === 'group' ? 'Root Section (No Group)' : 'Keep current section';
  } else {
    for (const nb of notebooks) {
      if (type === 'group') {
        const group = nb.sectionGroups.find(sg => sg.id === value);
        if (group) selectedLabel = `${nb.name} > ${group.name}`;
      } else {
        const rootSec = nb.sections.find(s => s.id === value);
        if (rootSec) {
          selectedLabel = `${nb.name} > ${rootSec.name}`;
        } else {
          for (const sg of nb.sectionGroups) {
            const groupSec = sg.sections.find(s => s.id === value);
            if (groupSec) selectedLabel = `${nb.name} > ${sg.name} > ${groupSec.name}`;
          }
        }
      }
    }
  }

  const notebooksToRender = targetNotebookId 
    ? notebooks.filter(n => n.id === targetNotebookId)
    : notebooks;

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 transition-all"
      >
        <span className="truncate pr-4">{selectedLabel || placeholder}</span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[11000] w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-72 overflow-y-auto p-2">
          
          <div 
            onClick={() => handleSelect('')}
            className={`px-4 py-3 rounded-xl cursor-pointer text-sm transition-all ${value === '' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            {type === 'group' ? 'Root Section (No Group)' : (placeholder === 'Keep current section' ? placeholder : 'Select a Section...')}
          </div>

          {notebooksToRender.map(nb => (
            <div key={nb.id} className="mt-1">
              <div 
                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl cursor-pointer"
                onClick={(e) => toggleExpand(e, nb.id)}
              >
                {expanded.has(nb.id) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                <Book size={14} className="text-indigo-400" />
                <span className="font-bold text-slate-800 text-sm">{nb.name}</span>
              </div>

              {expanded.has(nb.id) && (
                <div className="ml-6 space-y-1 mt-1 border-l border-slate-100 pl-2">
                  {/* Render Section Groups */}
                  {nb.sectionGroups.map(sg => (
                    <div key={sg.id}>
                      <div 
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer ${type === 'group' && value === sg.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                        onClick={(e) => {
                          if (type === 'group') {
                            handleSelect(sg.id);
                          } else {
                            toggleExpand(e, sg.id);
                          }
                        }}
                      >
                        {type === 'section' && (
                          expanded.has(sg.id) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
                        )}
                        <Folder size={14} className={type === 'group' && value === sg.id ? 'text-indigo-500' : 'text-slate-400'} />
                        <span className={`text-sm ${type === 'group' && value === sg.id ? 'font-bold' : 'font-medium'}`}>{sg.name}</span>
                      </div>

                      {/* Render Sections inside this group if type === 'section' */}
                      {type === 'section' && expanded.has(sg.id) && (
                        <div className="ml-6 mt-1 space-y-1 border-l border-slate-100 pl-2">
                          {sg.sections.map(sec => (
                            <div 
                              key={sec.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer ${value === sec.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
                              onClick={() => handleSelect(sec.id)}
                            >
                              <Layers size={14} className={value === sec.id ? 'text-indigo-500' : 'text-slate-400'} />
                              <span className="text-sm">{sec.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Render Root Sections if type === 'section' */}
                  {type === 'section' && nb.sections.map(sec => (
                    <div 
                      key={sec.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer ${value === sec.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
                      onClick={() => handleSelect(sec.id)}
                    >
                      <Layers size={14} className={value === sec.id ? 'text-indigo-500' : 'text-slate-400'} />
                      <span className="text-sm">{sec.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
