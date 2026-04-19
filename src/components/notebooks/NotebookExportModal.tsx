import { 
  X, 
  FileText, 
  Download, 
  Cloud, 
  Loader2, 
  Layers, 
  Book, 
  Folder
} from 'lucide-react';
import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { useNotebookStore } from '../../store/notebookStore';
import { NotebookPage, NotebookElement } from '../../types/notebook';
import Konva from 'konva';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNotebookId: string | null;
  activeSectionId: string | null;
  activePageId: string | null;
  canvasRef?: React.RefObject<{ getDataURL: (pixelRatio?: number) => string | null; getStageSize: () => { width: number; height: number } }>;
}

export const NotebookExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  activeNotebookId,
  activeSectionId,
  activePageId,
  canvasRef
}) => {
  const { notebooks } = useNotebookStore();
  const [scope, setScope] = useState<'page' | 'section' | 'notebook'>('page');
  const [destination, setDestination] = useState<'local' | 'drive'>('local');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  if (!isOpen) return null;

  const currentNotebook = notebooks.find(n => n.id === activeNotebookId);

  const getPagesToExport = () => {
    if (!currentNotebook) return [];
    const pages: any[] = [];
    const add = (p: NotebookPage, sName: string) => pages.push({ page: p, meta: { nb: currentNotebook.name, s: sName, p: p.title } });

    const allSections = [...currentNotebook.sections, ...currentNotebook.sectionGroups.flatMap(sg => sg.sections)];
    
    if (scope === 'page' && activePageId) {
      for (const s of allSections) {
        const p = s.pages.find(pg => pg.id === activePageId);
        if (p) { add(p, s.name); break; }
      }
    } else if (scope === 'section' && activeSectionId) {
      const s = allSections.find(sec => sec.id === activeSectionId);
      if (s) s.pages.forEach(p => add(p, s.name));
    } else {
      currentNotebook.sections.forEach(s => s.pages.forEach(p => add(p, s.name)));
      currentNotebook.sectionGroups.forEach(sg => sg.sections.forEach(s => s.pages.forEach(p => add(p, s.name))));
    }
    return pages;
  };

  const drawTemplate = (layer: Konva.Layer, template: string, w: number, h: number) => {
    const s = 30; const c = '#cbd5e1';
    if (template === 'lined') {
      for (let y = s; y < h; y += s) layer.add(new Konva.Line({ points: [0, y, w, y], stroke: c, strokeWidth: 0.5 }));
    } else if (template === 'grid') {
      for (let y = s; y < h; y += s) layer.add(new Konva.Line({ points: [0, y, w, y], stroke: c, strokeWidth: 0.5 }));
      for (let x = s; x < w; x += s) layer.add(new Konva.Line({ points: [x, 0, x, h], stroke: c, strokeWidth: 0.5 }));
    } else if (template === 'dotted') {
      for (let y = s; y < h; y += s) for (let x = s; x < w; x += s) layer.add(new Konva.Circle({ x, y, radius: 1, fill: '#94a3b8' }));
    }
  };

  const handleExport = async () => {
    const targets = getPagesToExport();
    if (targets.length === 0) return;

    setIsExporting(true);
    setStatus('Preparing export...');

    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      // === FAST PATH: Current page — grab the live canvas directly ===
      if (scope === 'page' && canvasRef?.current) {
        const dataUrl = canvasRef.current.getDataURL(2);
        const { meta } = targets[0];
        if (dataUrl) {
          pdf.addImage(dataUrl, 'PNG', 0, 0, pw, ph);
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, 0, pw, 8, 'F');
          pdf.setFontSize(6);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`${meta.nb} > ${meta.s} | ${meta.p}`, 5, 6);
        }
      } else {
        // === FULL PATH: Section or notebook — render off-screen ===
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed; top:0; left:0; width:1200px; height:1600px; visibility:hidden; z-index:-1;';
        document.body.appendChild(container);

        for (let i = 0; i < targets.length; i++) {
          const { page, meta } = targets[i];
          setStatus(`Exporting: ${meta.p} (${i + 1}/${targets.length})`);
          setProgress(Math.round((i / targets.length) * 100));

          const isPort = page.orientation === 'portrait';
          const sw = isPort ? 794 : 1123;
          const sh = isPort ? 1123 : 794;

          const stage = new Konva.Stage({ container, width: sw, height: sh });
          const layer = new Konva.Layer();
          stage.add(layer);

          layer.add(new Konva.Rect({ width: sw, height: sh, fill: '#ffffff' }));
          drawTemplate(layer, page.template, sw, sh);

          const els = [...page.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
          for (const el of els) {
            if (el.type === 'text') {
              const isRtl = /[\u0600-\u06FF]/.test(el.text || '');
              const g = new Konva.Group({ x: el.x, y: el.y, width: el.width || 100, height: el.height || 50, rotation: el.rotation || 0 });
              g.add(new Konva.Rect({ width: el.width || 100, height: el.height || 50, fill: el.backgroundColor || 'transparent' }));
              g.add(new Konva.Text({ text: el.text || '', fontSize: el.fontSize || 16, fontFamily: 'Arial, sans-serif', fill: el.fill || '#000', align: isRtl ? 'right' : (el as any).align || 'left', width: el.width || 100, height: el.height || 50, verticalAlign: 'middle', padding: 5 }));
              layer.add(g);
            } else if (el.type === 'image') {
              await new Promise<void>(async (resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                let src = el.src || '';
                if (src.includes('drive.google.com')) {
                  try {
                    const params = new URLSearchParams(src.split('?')[1]);
                    const fid = params.get('id');
                    if (fid) {
                      const { downloadFileAsBlob } = await import('../../lib/googleDrive');
                      const b = await downloadFileAsBlob(fid);
                      src = URL.createObjectURL(b);
                    }
                  } catch (e) {}
                }
                img.src = src;
                img.onload = () => {
                  layer.add(new Konva.Image({ x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation || 0, image: img }));
                  resolve();
                };
                img.onerror = () => resolve();
              });
            } else if (el.type === 'path') {
              layer.add(new Konva.Line({ points: el.points || [], stroke: el.stroke || '#000', strokeWidth: el.strokeWidth || 2, tension: 0.5, lineCap: 'round', lineJoin: 'round', opacity: el.opacity || 1 }));
            }
          }

          layer.draw();
          const dataUrl = stage.toDataURL({ pixelRatio: 1 });

          if (i > 0) pdf.addPage(isPort ? 'p' : 'l');
          pdf.addImage(dataUrl, 'PNG', 0, 0, pw, ph);
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, 0, pw, 8, 'F');
          pdf.setFontSize(6);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`${meta.nb} > ${meta.s} | ${meta.p}`, 5, 6);
          stage.destroy();
        }
        container.remove();
      }

      setStatus('Saving...');
      setProgress(100);
      const fileName = `${currentNotebook?.name || 'Notebook'}_${Date.now()}.pdf`;
      if (destination === 'local') {
        pdf.save(fileName);
      } else {
        const { uploadFileToDrive } = await import('../../lib/googleDrive');
        await uploadFileToDrive(pdf.output('blob'), fileName, 'application/pdf');
      }

      setStatus('Export Successful!');
      setTimeout(() => { setIsExporting(false); onClose(); }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl"><FileText size={24} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Export Vault</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] opacity-60">High-Precision PDF Engine v2</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-3 gap-4">
            <ScopeBtn active={scope === 'page'} onClick={() => setScope('page')} icon={<Book size={18} />} label="Page" />
            <ScopeBtn active={scope === 'section'} onClick={() => setScope('section')} icon={<Folder size={18} />} label="Section" />
            <ScopeBtn active={scope === 'notebook'} onClick={() => setScope('notebook')} icon={<Layers size={18} />} label="All" />
          </div>

          <div className="flex gap-4">
            <button onClick={() => setDestination('local')} className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${destination === 'local' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 text-slate-400'}`}>Local</button>
            <button onClick={() => setDestination('drive')} className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${destination === 'drive' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 text-slate-400'}`}>Drive</button>
          </div>

          {isExporting && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center z-50">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{status}</h3>
              <div className="w-full h-1 bg-slate-100 rounded-full mt-4 max-w-[200px] overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-6 bg-slate-50 border-t flex justify-end gap-4">
          <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
          <button onClick={handleExport} disabled={isExporting} className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-50">Export Now</button>
        </div>
      </div>
    </div>
  );
};

const ScopeBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${active ? 'border-indigo-600 bg-white text-indigo-600 shadow-lg' : 'border-slate-50 text-slate-400 opacity-60'}`}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);
