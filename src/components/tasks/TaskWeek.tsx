import React, { useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { isTaskVisibleOnDate } from '../../utils/recurringUtils';

const hexToRgba = (hex: string, alpha: number) => {
    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    } catch { return 'transparent'; }
};

const TaskWeek: React.FC = () => {
    const { tasks, categories, selectedCategories, navigateToDay, setEditingTaskId } = useTaskStore();
    const [currentDate, setCurrentDate] = useState(new Date());

    const getWeekStart = (date: Date) => {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const weekStart = getWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const prevWeek = () => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() - 7);
        setCurrentDate(d);
    };

    const nextWeek = () => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        setCurrentDate(d);
    };

    const checkTasksForDate = (date: Date) => {
        return tasks.filter(t => {
            if (selectedCategories.length > 0 && !selectedCategories.includes(t.categoryId)) return false;
            return isTaskVisibleOnDate(t, date);
        });
    };

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        days.push(day);
    }

    // Single category tint
    const tintColor = selectedCategories.length === 1
        ? categories.find(c => c.id === selectedCategories[0])?.color
        : null;

    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    return (
        <div
            className="flex flex-col h-full rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            style={{ backgroundColor: tintColor ? hexToRgba(tintColor, 0.04) : '#fff' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-bold text-gray-800">
                    {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </h2>
                <div className="flex gap-2 items-center">
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors">Today</button>
                    <button onClick={prevWeek} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600"><ChevronLeft size={18} /></button>
                    <button onClick={nextWeek} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600"><ChevronRight size={18} /></button>
                </div>
            </div>

            {/* Week columns */}
            <div className="flex-1 overflow-x-auto">
                <div className="flex h-full min-w-[700px]">
                    {days.map((day, idx) => {
                        const isToday = new Date().toDateString() === day.toDateString();
                        const dayTasks = checkTasksForDate(day);
                        const dateStr = toDateStr(day);

                        return (
                            <div
                                key={idx}
                                className="flex-1 flex flex-col border-r border-gray-200 last:border-r-0 cursor-pointer"
                                style={isToday ? { backgroundColor: hexToRgba('#6366f1', 0.05) } : {}}
                                onClick={() => navigateToDay(dateStr)}
                            >
                                {/* Day header */}
                                <div
                                    className={`p-2.5 text-center border-b border-gray-100 hover:bg-indigo-50 transition-colors ${isToday ? 'bg-indigo-100' : 'bg-white'}`}
                                >
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">
                                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </div>
                                    <div className={`text-lg font-bold ${isToday ? 'text-indigo-700' : 'text-gray-700'}`}>
                                        {day.getDate()}
                                    </div>
                                    {dayTasks.length > 0 && (
                                        <div className="text-[9px] text-gray-400">{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</div>
                                    )}
                                </div>

                                {/* Task cards */}
                                <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5" onClick={e => e.stopPropagation()}>
                                    {dayTasks.map(task => {
                                        const cat = categories.find(c => c.id === task.categoryId);
                                        const catColor = cat?.color || '#6366f1';
                                        return (
                                            <div
                                                key={task.id}
                                                className="bg-white p-2 rounded-lg shadow-sm border-l-4 hover:shadow-md transition-shadow"
                                                style={{ borderLeftColor: catColor }}
                                                onClick={e => { e.stopPropagation(); setEditingTaskId(task.id); }}
                                            >
                                                {task.attachments && task.attachments.length > 0 && (
                                                    <div className="mb-1.5 h-16 w-full rounded overflow-hidden">
                                                        <img src={task.attachments[0]} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <div className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">
                                                    {task.title}
                                                </div>
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {cat && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: catColor }}>
                                                            {cat.name}
                                                        </span>
                                                    )}
                                                    {task.attachments && task.attachments.length > 0 && (
                                                        <ImageIcon size={9} className="text-gray-400" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TaskWeek;
