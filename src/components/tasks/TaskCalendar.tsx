import React, { useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isTaskVisibleOnDate } from '../../utils/recurringUtils';

const hexToRgba = (hex: string, alpha: number) => {
    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    } catch { return 'transparent'; }
};

const TaskCalendar: React.FC = () => {
    const { tasks, categories, selectedCategories, navigateToDay, setEditingTaskId } = useTaskStore();
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();

    const checkTasksForDate = (day: number) => {
        const checkDate = new Date(year, month, day);
        return tasks.filter(t => {
            if (selectedCategories.length > 0 && !selectedCategories.includes(t.categoryId)) return false;
            return isTaskVisibleOnDate(t, checkDate);
        });
    };

    // Background tint from single selected category
    const tintColor = selectedCategories.length === 1
        ? categories.find(c => c.id === selectedCategories[0])?.color
        : null;

    const renderDays = () => {
        const cells = [];
        for (let i = 0; i < startDay; i++) {
            cells.push(<div key={`e${i}`} className="bg-transparent min-h-[6rem]" />);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dayTasks = checkTasksForDate(d);
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            cells.push(
                <div
                    key={d}
                    onClick={() => navigateToDay(dateStr)}
                    className={`min-h-[6rem] border border-gray-100 p-1.5 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all relative ${isToday ? 'border-indigo-200' : ''}`}
                    style={tintColor ? { backgroundColor: hexToRgba(tintColor, 0.06) } : { backgroundColor: isToday ? hexToRgba('#6366f1', 0.07) : '#fff' }}
                >
                    {/* Date number */}
                    <div className="flex justify-end mb-1">
                        {isToday ? (
                            <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{d}</span>
                        ) : (
                            <span className="text-xs font-medium text-gray-500">{d}</span>
                        )}
                    </div>

                    {/* Tasks */}
                    <div className="space-y-0.5">
                        {dayTasks.slice(0, 3).map(task => {
                            const cat = categories.find(c => c.id === task.categoryId);
                            return (
                                <div
                                    key={task.id}
                                    className="text-[10px] truncate px-1.5 py-0.5 rounded font-medium"
                                    style={{
                                        backgroundColor: cat ? hexToRgba(cat.color, 0.15) : '#e0e7ff',
                                        color: cat?.color || '#4f46e5',
                                        borderLeft: `3px solid ${cat?.color || '#4f46e5'}`,
                                    }}
                                    onClick={e => { e.stopPropagation(); setEditingTaskId(task.id); }}
                                >
                                    {task.title}
                                </div>
                            );
                        })}
                        {dayTasks.length > 3 && (
                            <div className="text-[10px] text-gray-400 pl-1">+{dayTasks.length - 3} more</div>
                        )}
                    </div>
                </div>
            );
        }
        return cells;
    };

    return (
        <div
            className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            style={tintColor ? { backgroundColor: hexToRgba(tintColor, 0.03) } : {}}
        >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2 items-center">
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors">Today</button>
                    <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-full"><ChevronLeft size={18} /></button>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-full"><ChevronRight size={18} /></button>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{day}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 flex-1 gap-px bg-gray-100 overflow-auto">
                {renderDays()}
            </div>
        </div>
    );
};

export default TaskCalendar;
