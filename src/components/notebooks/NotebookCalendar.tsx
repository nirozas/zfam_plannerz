import React, { useState } from 'react';
import { useNotebookStore } from '../../store/notebookStore';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  LayoutList, 
  Columns,
  Clock,
  Plus
} from 'lucide-react';

type CalendarViewMode = 'month' | 'week' | 'day';

export const NotebookCalendar: React.FC<{ onPageSelect: (id: string) => void }> = ({ onPageSelect }) => {
  const { getAllPagesWithMetadata } = useNotebookStore();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const allPages = getAllPagesWithMetadata();

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {currentDate.toLocaleString('default', { 
              month: 'long', 
              year: 'numeric',
              day: viewMode === 'day' ? 'numeric' : undefined 
            })}
          </h2>
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
            <ViewTab active={viewMode === 'month'} onClick={() => setViewMode('month')} icon={<CalendarIcon size={14} />} label="Month" />
            <ViewTab active={viewMode === 'week'} onClick={() => setViewMode('week')} icon={<Columns size={14} />} label="Week" />
            <ViewTab active={viewMode === 'day'} onClick={() => setViewMode('day')} icon={<LayoutList size={14} />} label="Day" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">Today</button>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={handlePrev} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft size={18} /></button>
            <button onClick={handleNext} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-6 py-3 border-b border-slate-50 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />
          <span>Created</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200" />
          <span>Due Date</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto bg-slate-50/30">
        {viewMode === 'month' && <MonthGrid date={currentDate} pages={allPages} onPageClick={onPageSelect} />}
        {viewMode === 'week' && <WeekGrid date={currentDate} pages={allPages} onPageClick={onPageSelect} />}
        {viewMode === 'day' && <DayGrid date={currentDate} pages={allPages} onPageClick={onPageSelect} />}
      </div>
    </div>
  );
};

const ViewTab = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'
    }`}
  >
    {icon} {label}
  </button>
);

const MonthGrid = ({ date, pages, onPageClick }: any) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const renderDays = () => {
    const days = [];
    // Padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`pad-${i}`} className="min-h-[120px] bg-slate-50/50 border-b border-r border-slate-100/50" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const current = new Date(year, month, d);
      const isToday = current.toDateString() === new Date().toDateString();
      
      const createdPages = pages.filter((p: any) => new Date(p.createdAt).toDateString() === current.toDateString());
      const duePages = pages.filter((p: any) => p.dueDate && new Date(p.dueDate).toDateString() === current.toDateString());

      days.push(
        <div key={d} className={`min-h-[120px] bg-white border-b border-r border-slate-100 p-2 hover:bg-slate-50/50 transition-colors group relative ${isToday ? 'ring-1 ring-inset ring-indigo-100 bg-indigo-50/10' : ''}`}>
          <span className={`text-xs font-black ${isToday ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md' : 'text-slate-400'}`}>
            {d}
          </span>
          <div className="mt-2 space-y-1.5">
            {createdPages.map((p: any) => (
              <PageEntry key={p.id} page={p} type="created" onClick={() => onPageClick(p.id)} extended />
            ))}
            {duePages.map((p: any) => (
              <PageEntry key={p.id} page={p} type="due" onClick={() => onPageClick(p.id)} extended />
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="grid grid-cols-7 h-full">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
        <div key={d} className="py-2 text-center text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">{d}</div>
      ))}
      {renderDays()}
    </div>
  );
};

const WeekGrid = ({ date, pages, onPageClick }: any) => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());

  const days = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(startOfWeek);
    current.setDate(startOfWeek.getDate() + i);
    const createdPages = pages.filter((p: any) => new Date(p.createdAt).toDateString() === current.toDateString());
    const duePages = pages.filter((p: any) => p.dueDate && new Date(p.dueDate).toDateString() === current.toDateString());

    days.push(
      <div key={i} className="flex-1 min-w-[150px] border-r border-slate-100 bg-white">
        <div className="p-4 border-b border-slate-50 text-center bg-slate-50/30">
          <div className="text-[10px] font-black text-slate-400 uppercase">{current.toLocaleString('default', { weekday: 'short' })}</div>
          <div className={`text-lg font-black mt-1 ${current.toDateString() === new Date().toDateString() ? 'text-indigo-600' : 'text-slate-800'}`}>
            {current.getDate()}
          </div>
        </div>
        <div className="p-3 space-y-2">
          {createdPages.map((p: any) => <PageEntry key={p.id} page={p} type="created" onClick={() => onPageClick(p.id)} extended />)}
          {duePages.map((p: any) => <PageEntry key={p.id} page={p} type="due" onClick={() => onPageClick(p.id)} extended />)}
        </div>
      </div>
    );
  }

  return <div className="flex h-full">{days}</div>;
};

const DayGrid = ({ date, pages, onPageClick }: any) => {
  const createdPages = pages.filter((p: any) => new Date(p.createdAt).toDateString() === date.toDateString());
  const duePages = pages.filter((p: any) => p.dueDate && new Date(p.dueDate).toDateString() === date.toDateString());

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-sm"><Plus size={24} /></div>
            <h3 className="text-xl font-black text-slate-800">Pages Created</h3>
          </div>
          <div className="space-y-4">
            {createdPages.length > 0 ? createdPages.map((p: any) => (
              <BigPageCard key={p.id} page={p} type="created" onClick={() => onPageClick(p.id)} />
            )) : <EmptyState message="No pages created today" />}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shadow-sm"><Clock size={24} /></div>
            <h3 className="text-xl font-black text-slate-800">Due Today</h3>
          </div>
          <div className="space-y-4">
            {duePages.length > 0 ? duePages.map((p: any) => (
              <BigPageCard key={p.id} page={p} type="due" onClick={() => onPageClick(p.id)} />
            )) : <EmptyState message="Nothing due today" />}
          </div>
        </section>
      </div>
    </div>
  );
};

const PageEntry = ({ page, type, onClick, extended }: any) => (
  <div 
    onClick={onClick}
    className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer hover:scale-[1.02] transition-all border-l-4 truncate shadow-md ${
      type === 'created' 
        ? 'bg-indigo-50 text-indigo-800 border-indigo-500 hover:bg-indigo-100' 
        : 'bg-rose-50 text-rose-800 border-rose-500 hover:bg-rose-100'
    }`}
  >
    {extended && (
      <div className="opacity-60 text-[8px] mb-0.5 uppercase tracking-tighter truncate">
        {page.notebookTitle} › {page.sectionTitle}
      </div>
    )}
    <div className="truncate">{page.title}</div>
  </div>
);

const BigPageCard = ({ page, type, onClick }: any) => (
  <div 
    onClick={onClick}
    className="group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
  >
    <div className={`absolute top-0 left-0 w-1.5 h-full ${type === 'created' ? 'bg-indigo-500' : 'bg-rose-500'}`} />
    <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{page.notebookTitle} › {page.sectionTitle}</div>
    <div className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{page.title}</div>
    <div className="flex items-center gap-4 mt-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
        <Clock size={12} /> {new Date(page.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

const EmptyState = ({ message }: any) => (
  <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center text-slate-400 font-medium">
    {message}
  </div>
);
