import React, { useMemo } from 'react';
import { useTaskStore, Task } from '../../store/taskStore';
import TaskItem from './TaskItem';

const isRecurringDueOnDate = (task: Task, date: Date): boolean => {
    if (!task.recurrence) return false;
    const { type, daysOfWeek, dayOfMonth } = task.recurrence;
    if (type === 'daily') return true;
    if (type === 'weekly' && daysOfWeek?.includes(date.getDay())) return true;
    if (type === 'monthly' && dayOfMonth === date.getDate()) return true;
    return false;
};

interface TaskListProps {
    searchTerm: string;
}

const hexToRgba = (hex: string, alpha: number) => {
    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    } catch { return 'transparent'; }
};

const TaskList: React.FC<TaskListProps> = ({ searchTerm }) => {
    const { tasks, categories, selectedCategories, filterType, statusFilter, startDate, endDate, sortBy } = useTaskStore();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Background tint when single category selected
    const tintColor = selectedCategories.length === 1
        ? categories.find(c => c.id === selectedCategories[0])?.color
        : null;

    const groupedTasks = useMemo(() => {
        let filtered = tasks.filter(t => {
            // Search filter
            if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;

            // Category filter
            if (selectedCategories.length > 0 && !selectedCategories.includes(t.categoryId)) return false;

            // Status filter
            if (statusFilter === 'completed') {
                const isTaskDone = t.isCompleted || (t.isRecurring && t.completedDates.includes(todayStr));
                if (!isTaskDone) return false;
            } else if (statusFilter === 'active') {
                const isTaskDone = t.isCompleted || (t.isRecurring && t.completedDates.includes(todayStr));
                if (isTaskDone) return false;
            }

            // Date Range filter
            if (startDate || endDate) {
                const taskDate = t.dueDate ? new Date(t.dueDate) : (t.isRecurring && t.recurrence?.startDate ? new Date(t.recurrence.startDate) : new Date(t.dateAdded));
                taskDate.setHours(0, 0, 0, 0);

                if (startDate) {
                    const s = new Date(startDate);
                    s.setHours(0, 0, 0, 0);
                    if (taskDate < s) return false;
                }
                if (endDate) {
                    const e = new Date(endDate);
                    e.setHours(0, 0, 0, 0);
                    if (taskDate > e) return false;
                }
            }

            return true;
        });

        // ── Sorting ──
        filtered.sort((a, b) => {
            if (sortBy === 'name') return a.title.localeCompare(b.title);
            if (sortBy === 'dueDate') {
                const da = a.dueDate ? new Date(a.dueDate).getTime() : (a.isRecurring && a.recurrence?.startDate ? new Date(a.recurrence.startDate).getTime() : Infinity);
                const db = b.dueDate ? new Date(b.dueDate).getTime() : (b.isRecurring && b.recurrence?.startDate ? new Date(b.recurrence.startDate).getTime() : Infinity);
                return da - db;
            }
            if (sortBy === 'priority') {
                const pMap = { high: 0, medium: 1, low: 2 };
                return pMap[a.priority] - pMap[b.priority];
            }
            // Default: dateAdded desc
            return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        });


        if (filterType === 'completed') {
            return {
                overdue: [],
                today: [],
                upcoming: filtered.filter(t => t.isCompleted || (t.isRecurring && t.completedDates.includes(todayStr)))
            };
        }

        const overdue: Task[] = [];
        const todayTasks: Task[] = [];
        const upcoming: Task[] = [];

        filtered.forEach(task => {
            if (!task.isRecurring && task.isCompleted && statusFilter !== 'completed') return;

            if (task.isRecurring) {
                if (task.completedDates.includes(todayStr) && statusFilter !== 'completed') return;
                // Check recurrence bounds
                if (task.recurrence?.startDate && new Date(task.recurrence.startDate) > today) {
                    upcoming.push(task); return;
                }
                if (task.recurrence?.endDate && new Date(task.recurrence.endDate) < today) return;
                if (isRecurringDueOnDate(task, today)) {
                    todayTasks.push(task);
                } else {
                    upcoming.push(task);
                }
                return;
            }

            if (!task.dueDate) { upcoming.push(task); return; }

            const due = new Date(task.dueDate);
            const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
            const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            if (dueDay.getTime() === todayDay.getTime()) todayTasks.push(task);
            else if (dueDay < todayDay) overdue.push(task);
            else upcoming.push(task);
        });

        return { overdue, today: todayTasks, upcoming };
    }, [tasks, selectedCategories, filterType, statusFilter, startDate, endDate, searchTerm, todayStr, sortBy]);

    const bgStyle = tintColor ? { backgroundColor: hexToRgba(tintColor, 0.05), minHeight: '100%', borderRadius: '0.75rem', padding: '1rem' } : {};

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300 gap-3">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12l2 2 4-4" /></svg>
                <p className="text-sm">No tasks yet. Create one to get started!</p>
            </div>
        );
    }

    if (filterType === 'today') {
        return (
            <div style={bgStyle}>
                <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-3">Today's Tasks</h3>
                {groupedTasks.overdue.length > 0 && (
                    <div className="mb-4">
                        <div className="text-xs font-bold text-red-500 mb-2 uppercase tracking-wide">Overdue</div>
                        <div className="space-y-1">{groupedTasks.overdue.map(t => <TaskItem key={t.id} task={t} dateContext={todayStr} />)}</div>
                    </div>
                )}
                {groupedTasks.today.length > 0 ? (
                    <div className="space-y-1">{groupedTasks.today.map(t => <TaskItem key={t.id} task={t} dateContext={todayStr} />)}</div>
                ) : (
                    <p className="text-sm text-gray-400 italic">No tasks due today.</p>
                )}
            </div>
        );
    }

    if (filterType === 'upcoming') {
        return (
            <div style={bgStyle}>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Upcoming</h3>
                {groupedTasks.upcoming.length > 0 ? (
                    <div className="space-y-1">{groupedTasks.upcoming.map(t => <TaskItem key={t.id} task={t} />)}</div>
                ) : (
                    <p className="text-sm text-gray-400 italic">No upcoming tasks.</p>
                )}
            </div>
        );
    }

    if (filterType === 'completed') {
        return (
            <div style={bgStyle}>
                <h3 className="text-sm font-bold text-green-600 uppercase tracking-wide mb-3">Completed</h3>
                {groupedTasks.upcoming.length > 0 ? (
                    <div className="space-y-1">{groupedTasks.upcoming.map(t => <TaskItem key={t.id} task={t} dateContext={todayStr} />)}</div>
                ) : (
                    <p className="text-sm text-gray-400 italic">No completed tasks yet.</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8" style={bgStyle}>
            {groupedTasks.overdue.length > 0 && (
                <section>
                    <h3 className="text-sm font-bold text-red-500 mb-3 uppercase tracking-wide flex items-center gap-2">
                        Overdue <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{groupedTasks.overdue.length}</span>
                    </h3>
                    <div className="space-y-1">{groupedTasks.overdue.map(task => <TaskItem key={task.id} task={task} dateContext={todayStr} />)}</div>
                </section>
            )}

            <section>
                <h3 className="text-sm font-bold text-indigo-600 mb-3 uppercase tracking-wide flex items-center gap-2">
                    Today <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{groupedTasks.today.length}</span>
                </h3>
                <div className="space-y-1">
                    {groupedTasks.today.length > 0 ? (
                        groupedTasks.today.map(task => <TaskItem key={task.id} task={task} dateContext={todayStr} />)
                    ) : (
                        <p className="text-sm text-gray-400 italic p-4 border border-dashed border-gray-200 rounded-lg text-center">No tasks scheduled for today</p>
                    )}
                </div>
            </section>

            {groupedTasks.upcoming.length > 0 && (
                <section>
                    <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">Upcoming / Later</h3>
                    <div className="space-y-1">{groupedTasks.upcoming.map(task => <TaskItem key={task.id} task={task} />)}</div>
                </section>
            )}
        </div>
    );
};

export default TaskList;
