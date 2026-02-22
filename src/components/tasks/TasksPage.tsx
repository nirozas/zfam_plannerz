import React, { useState, useEffect } from 'react';
import {
    LayoutGrid,
    Plus,
    Search,
    ListTodo,
    Columns,
    CalendarDays,
    Loader2,
    X
} from 'lucide-react';
import { usePlannerStore } from '../../store/plannerStore';
import { useTaskStore } from '../../store/taskStore';
import TaskList from './TaskList';
import TaskCalendar from './TaskCalendar';
import TaskWeek from './TaskWeek';
import TaskMasonry from './TaskMasonry';
import TasksSidebar from './TasksSidebar';
import CreateTaskModal from './CreateTaskModal';
import { toDateStr } from '../../utils/recurringUtils';
import PageHero from '../ui/PageHero';
import EditTaskModal from './EditTaskModal';

const TasksPage: React.FC = () => {

    const { user } = usePlannerStore();
    const {
        viewMode, setViewMode, setActiveDayDate, loadAll, isLoading,
        statusFilter, setStatusFilter,
        startDate, endDate, setDateRange,
        sortBy, setSortBy,
        editingTaskId, setEditingTaskId, tasks
    } = useTaskStore();

    // Switch to day view and always land on today (calendar clicks use navigateToDay instead)
    const switchToDayView = () => {
        setActiveDayDate(toDateStr(new Date()));
        setViewMode('day');
    };
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // One-time cleanup: remove old localStorage persist keys from previous store versions
    useEffect(() => {
        localStorage.removeItem('zoabi-tasks-storage');
        localStorage.removeItem('zoabi-tasks-storage-v2');
    }, []);

    // Load all tasks + categories from Supabase when the user is present
    useEffect(() => {
        if (user) loadAll();
    }, [user, loadAll]);


    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full text-gray-400 gap-3">
                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                    <span className="text-sm font-medium">Loading tasks…</span>
                </div>
            );
        }
        switch (viewMode) {
            case 'list': return <TaskList searchTerm={searchTerm} />;
            case 'month': return <TaskCalendar />;
            case 'week': return <TaskWeek />;
            case 'day': return <TaskMasonry searchTerm={searchTerm} />;
            default: return <TaskList searchTerm={searchTerm} />;
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden w-full bg-white">
            {/* Page Hero */}
            <PageHero
                pageKey="tasks"
                title="Daily Tasks & Rituals"
                subtitle="Structure your day, build better habits, and achieve your goals with focused energy."
                compact={true}
            />

            {/* Main Controls Bar */}
            <div className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between sticky top-0 z-20 bg-white/80 backdrop-blur-md gap-3">
                <div className="flex items-center gap-3 md:gap-6">
                    <div className="flex bg-gray-100/80 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-bold ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <ListTodo size={14} />
                            <span className="hidden sm:inline">List</span>
                        </button>
                        <button
                            onClick={switchToDayView}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-bold ${viewMode === 'day' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <LayoutGrid size={14} />
                            <span className="hidden sm:inline">Day</span>
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-bold ${viewMode === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Columns size={14} />
                            <span className="hidden sm:inline">Week</span>
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-bold ${viewMode === 'month' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <CalendarDays size={14} />
                            <span className="hidden sm:inline">Month</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[100px] md:flex-none">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-3 py-2 bg-gray-100/50 border border-transparent focus:bg-white focus:border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 w-full md:w-40 text-xs transition-all outline-none font-medium"
                        />
                    </div>

                    {/* Status Toggle */}
                    <div className="flex bg-gray-100/80 p-1 rounded-xl gap-0.5">
                        {(['all', 'active', 'completed'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-2.5 md:px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${statusFilter === s ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-gray-100 mx-1 hidden md:block" />

                    {/* Sorting */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-gray-100/80 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer tracking-wider hidden md:block"
                    >
                        <option value="dueDate">Due Date</option>
                        <option value="name">Name</option>
                        <option value="priority">Priority</option>
                        <option value="dateAdded">Newest</option>
                    </select>

                    {/* Date Range - hidden on mobile */}
                    <div className="hidden lg:flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2">
                        <CalendarDays size={14} className="text-gray-400" />
                        <input
                            type="date"
                            value={startDate || ''}
                            onChange={(e) => setDateRange(e.target.value || null, endDate)}
                            className="text-[10px] font-black bg-transparent border-0 focus:ring-0 p-0 text-gray-500 w-24 uppercase"
                        />
                        <span className="text-gray-300">—</span>
                        <input
                            type="date"
                            value={endDate || ''}
                            onChange={(e) => setDateRange(startDate, e.target.value || null)}
                            className="text-[10px] font-black bg-transparent border-0 focus:ring-0 p-0 text-gray-500 w-24 uppercase"
                        />
                        {(startDate || endDate) && (
                            <button onClick={() => setDateRange(null, null)} className="ml-1 text-gray-400 hover:text-red-500">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-lg shadow-indigo-100 ml-auto md:ml-2"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">New</span>
                    </button>
                </div>
            </div>


            <div className="flex-1 flex overflow-hidden">
                {/* Tasks Internal Sidebar - hidden on small screens */}
                <div className="hidden md:block">
                    <TasksSidebar />
                </div>

                {/* Task Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-3 md:p-6">
                    {renderContent()}
                </div>
            </div>

            {/* Create Task Modal */}
            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {/* Task Edition Modal (Persistent) */}
            {editingTaskId && tasks.find(t => t.id === editingTaskId) && (
                <EditTaskModal
                    task={tasks.find(t => t.id === editingTaskId)!}
                    onClose={() => setEditingTaskId(null)}
                />
            )}
        </div>
    );
};

export default TasksPage;
