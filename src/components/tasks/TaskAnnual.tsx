import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useNavigate } from 'react-router-dom';
import { isTaskVisibleOnDate } from '../../utils/recurringUtils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ZOOM_LEVELS = [50, 75, 100, 125, 150];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const hexToRgba = (hex: string, alpha: number) => {
    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    } catch { return 'transparent'; }
};

const TaskAnnual: React.FC = () => {
    const { tasks: tasksObj, categories, selectedCategories, setActiveDayDate } = useTaskStore();
    const tasks = Object.values(tasksObj || {});
    const navigate = useNavigate();

    const [year, setYear] = useState(new Date().getFullYear());
    const [zoom, setZoom] = useState(100);
    const [hoveredCell, setHoveredCell] = useState<{ date: string, tasks: typeof tasks, rect: DOMRect | null } | null>(null);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Compute task occurrences per day of the year
    const gridData = useMemo(() => {
        const data: Record<string, typeof tasks> = {};
        for (let m = 0; m < 12; m++) {
            const daysInMonth = getDaysInMonth(year, m);
            for (let d = 1; d <= daysInMonth; d++) {
                const checkDate = new Date(year, m, d);
                const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                
                const dayTasks = tasks.filter(t => {
                    if (selectedCategories.length > 0 && !selectedCategories.includes(t.categoryId)) return false;
                    return isTaskVisibleOnDate(t, checkDate);
                });
                if (dayTasks.length > 0) {
                    data[dateStr] = dayTasks;
                }
            }
        }
        return data;
    }, [tasks, year, selectedCategories]);

    const minCellWidth = Math.max(36, Math.round(48 * zoom / 100)); // px

    const handleDayClick = (dateStr: string) => {
        setActiveDayDate(dateStr);
        navigate('/tasks/day');
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            
            {/* Header Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0 bg-white z-10">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-bold text-gray-800">
                            {year} Annual Overview
                        </h2>
                        <p className="text-xs text-slate-500">Track your daily task completions across the year</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => setYear(new Date().getFullYear())} className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors">Current Year</button>
                        <button onClick={() => setYear(y => y - 1)} className="p-1.5 hover:bg-gray-100 rounded-full text-slate-500"><ChevronLeft size={16} /></button>
                        <button onClick={() => setYear(y => y + 1)} className="p-1.5 hover:bg-gray-100 rounded-full text-slate-500"><ChevronRight size={16} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                    <button
                        onClick={() => setZoom(z => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(z) - 1)])}
                        disabled={zoom === ZOOM_LEVELS[0]}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg disabled:opacity-30 hover:bg-slate-200 transition-all"
                    ><ZoomOut size={14}/></button>
                    <span className="text-xs text-slate-900 font-bold px-2 min-w-[44px] text-center">{zoom}%</span>
                    <button
                        onClick={() => setZoom(z => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(z) + 1)])}
                        disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg disabled:opacity-30 hover:bg-slate-200 transition-all"
                    ><ZoomIn size={14}/></button>
                </div>
            </div>

            {/* Main Grid Area */}
            <div className="flex-1 overflow-auto p-4 md:p-6" onScroll={() => setHoveredCell(null)}>
                <div className="flex flex-col gap-1.5 min-w-max w-full">
                    {/* Day Number Headers */}
                    <div className="flex items-center gap-1.5 mb-2">
                        {/* Spacer for month labels */}
                        <div className="w-12 shrink-0" /> 
                        {Array.from({ length: 31 }, (_, i) => (
                            <div key={i} className="flex-1 shrink-0 flex flex-col items-center justify-end" style={{ minWidth: `${minCellWidth}px` }}>
                                <span className="text-[10px] font-bold text-slate-400">{i + 1}</span>
                            </div>
                        ))}
                    </div>

                    {/* Months Rows */}
                    {MONTHS.map((month, mIdx) => {
                        const daysInMonth = getDaysInMonth(year, mIdx);
                        return (
                            <div key={month} className="flex items-stretch gap-1.5 w-full group">
                                {/* Month Label */}
                                <div className="w-12 shrink-0 flex items-center justify-end pr-3">
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-slate-700 transition-colors uppercase tracking-widest">{month}</span>
                                </div>

                                {/* Days */}
                                {Array.from({ length: 31 }, (_, dIdx) => {
                                    const day = dIdx + 1;
                                    if (day > daysInMonth) {
                                        return <div key={dIdx} className="flex-1 shrink-0" style={{ minWidth: `${minCellWidth}px` }} />;
                                    }
                                    const dateStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const dayTasks = gridData[dateStr] || [];
                                    const isToday = dateStr === todayStr;
                                    const weekdayNarrow = new Date(year, mIdx, day).toLocaleString('en-US', { weekday: 'narrow' });

                                    return (
                                        <div
                                            key={dIdx}
                                            onClick={() => handleDayClick(dateStr)}
                                            onMouseEnter={(e) => {
                                                if (dayTasks.length > 0) {
                                                    setHoveredCell({ date: dateStr, tasks: dayTasks, rect: e.currentTarget.getBoundingClientRect() });
                                                }
                                            }}
                                            onMouseLeave={() => setHoveredCell(null)}
                                            className={`flex-1 shrink-0 relative flex flex-wrap content-start p-[3px] gap-[2px] rounded-md transition-all cursor-pointer ${
                                                isToday ? 'bg-indigo-50 ring-1 ring-indigo-300 ring-offset-1' : 'bg-slate-50 hover:bg-slate-100 hover:shadow-sm border border-slate-100'
                                            }`}
                                            style={{
                                                minWidth: `${minCellWidth}px`,
                                                aspectRatio: '1 / 1',
                                            }}
                                        >
                                            {/* 1-Letter Weekday */}
                                            {minCellWidth >= 32 && (
                                                <span className="absolute top-0.5 right-1 text-[8px] font-black text-slate-300 pointer-events-none select-none">
                                                    {weekdayNarrow}
                                                </span>
                                            )}

                                            {/* Task Indicators */}
                                            {dayTasks.map((t, idx) => {
                                                // Max 9 dots to prevent overflowing tiny cells if zoom is small
                                                if (idx >= 9 && minCellWidth < 48) return null;
                                                
                                                const cat = categories.find(c => c.id === t.categoryId);
                                                const color = cat?.color || '#94a3b8'; // default slate-400
                                                const isCompleted = t.isRecurring ? (t.completedDates || []).includes(dateStr) : t.isCompleted;
                                                const isFailed = t.isRecurring ? (t.failedDates || []).includes(dateStr) : t.isFailed;
                                                
                                                let bgColor = hexToRgba(color, 0.7);
                                                if (isCompleted) bgColor = color; // Solid if completed
                                                if (isFailed) bgColor = '#fee2e2'; // Light red if failed
                                                
                                                return (
                                                    <div 
                                                        key={t.id} 
                                                        className="rounded-[2px] shrink-0"
                                                        style={{
                                                            width: `${Math.max(4, Math.floor((minCellWidth - 12) / 3))}px`,
                                                            height: `${Math.max(4, Math.floor((minCellWidth - 12) / 3))}px`,
                                                            backgroundColor: bgColor,
                                                            opacity: isFailed ? 0.5 : 1
                                                        }}
                                                    />
                                                );
                                            })}
                                            {dayTasks.length > 9 && minCellWidth < 48 && (
                                                <div className="absolute bottom-0 right-0.5 text-[7px] font-bold text-slate-400">
                                                    +{dayTasks.length - 9}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tooltip */}
            <AnimatePresence>
                {hoveredCell && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="fixed z-50 bg-slate-900 text-white p-3 rounded-xl shadow-2xl pointer-events-none max-w-[200px]"
                        style={{
                            top: hoveredCell.rect ? hoveredCell.rect.top - 10 : 0,
                            left: hoveredCell.rect ? hoveredCell.rect.left + (hoveredCell.rect.width / 2) : 0,
                            transform: 'translate(-50%, -100%)'
                        }}
                    >
                        <div className="text-xs font-bold text-slate-300 mb-1 border-b border-slate-700 pb-1">
                            {new Date(hoveredCell.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex flex-col gap-1 max-h-[150px] overflow-hidden">
                            {hoveredCell.tasks.slice(0, 5).map(t => {
                                const cat = categories.find(c => c.id === t.categoryId);
                                return (
                                    <div key={t.id} className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color || '#94a3b8' }} />
                                        <span className="text-[10px] truncate">{t.title}</span>
                                    </div>
                                )
                            })}
                            {hoveredCell.tasks.length > 5 && (
                                <div className="text-[9px] text-slate-400 italic">+{hoveredCell.tasks.length - 5} more tasks</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TaskAnnual;
