import React, { useState, useMemo } from 'react';
import { useTripStore } from '../../store/tripStore';
import {
    X, Map as MapIcon, Layers, Calendar, Filter,
    Minimize2, ChevronLeft, ChevronRight,
    Utensils, Bed, Landmark, Car, Ticket, ShoppingBag, MoreHorizontal,
    Compass, Info, Eye, EyeOff
} from 'lucide-react';
import TripMapView from './TripMapView';

const DAY_COLORS = ['#6366f1', '#0d9488', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#f97316', '#3b82f6'];
const getDayColor = (day: number) => DAY_COLORS[(day - 1) % DAY_COLORS.length];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    Dining: <Utensils size={14} />,
    Accommodation: <Bed size={14} />,
    Attraction: <Landmark size={14} />,
    Transportation: <Car size={14} />,
    Activity: <Ticket size={14} />,
    Shopping: <ShoppingBag size={14} />,
    Other: <MoreHorizontal size={14} />
};

interface TripFullMapViewProps {
    isOpen: boolean;
    onClose: () => void;
}

const TripFullMapView: React.FC<TripFullMapViewProps> = ({ isOpen, onClose }) => {
    const { activeTripStops, activeTrip, filters, setFilter } = useTripStore();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showPath, setShowPath] = useState(true);

    const days = useMemo(() => {
        const d = Array.from(new Set(activeTripStops.map(s => s.day_number)));
        return d.sort((a, b) => a - b);
    }, [activeTripStops]);

    const filteredStops = useMemo(() => {
        return [...activeTripStops].filter(s => {
            const matchesDay = filters.days === 'all' || s.day_number === filters.days;
            const matchesCategory = filters.categories.length === 0 || (s.category && filters.categories.includes(s.category));
            return matchesDay && matchesCategory;
        }).sort((a, b) => {
            if (a.day_number !== b.day_number) return a.day_number - b.day_number;
            if (a.arrival_time && b.arrival_time) {
                return a.arrival_time.localeCompare(b.arrival_time);
            }
            if (a.arrival_time) return -1;
            if (b.arrival_time) return 1;
            return a.order_index - b.order_index;
        });
    }, [activeTripStops, filters.days, filters.categories]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[3000] bg-white flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Sidebar / Controls — on mobile it's a slide-over overlay */}
            <div className={`
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${sidebarOpen ? 'md:w-80' : 'md:w-0 md:overflow-hidden'}
                fixed md:relative inset-y-0 left-0 w-[85vw] max-w-[320px] md:max-w-none
                bg-white border-r border-gray-100 flex flex-col transition-all duration-300 z-30
                shadow-2xl md:shadow-none
            `}>
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded-2xl">
                            <MapIcon size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 leading-tight">Map Exploratory</h3>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">Full Screen Experience</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                    {/* View Options */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Layers size={12} /> View Options
                        </h4>

                        {/* Toggle Route */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                {showPath ? <Eye size={16} className="text-indigo-600" /> : <EyeOff size={16} className="text-gray-300" />}
                                <span className={`text-[11px] font-black uppercase tracking-wider ${showPath ? 'text-gray-900' : 'text-gray-400'}`}>Show Route Path</span>
                            </div>
                            <button
                                onClick={() => setShowPath(!showPath)}
                                className={`w-10 h-6 rounded-full transition-all relative ${showPath ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showPath ? 'left-5' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Days Filter */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Calendar size={12} /> Trip Schedule
                            </h4>
                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                                {filters.days === 'all' ? 'All Days' : `Day ${filters.days}`}
                            </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => setFilter('days', 'all')}
                                className={`h-12 rounded-xl text-[10px] font-black uppercase transition-all border ${filters.days === 'all'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                    : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-200'
                                    }`}
                            >
                                All
                            </button>
                            {days.map(d => (
                                <button
                                    key={d}
                                    onClick={() => setFilter('days', d)}
                                    className={`h-12 rounded-xl text-[11px] font-black transition-all border ${filters.days === d
                                        ? 'text-white border-transparent scale-105 z-10'
                                        : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-200'
                                        }`}
                                    style={filters.days === d ? { background: getDayColor(d), boxShadow: `0 8px 16px ${getDayColor(d)}30` } : {}}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Categories Filter */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Filter size={12} /> View categories
                            </h4>
                            {filters.categories.length > 0 && (
                                <button
                                    onClick={() => setFilter('categories', [])}
                                    className="text-[9px] font-bold text-rose-500 hover:underline"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            {Object.keys(CATEGORY_ICONS).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        const newCats = filters.categories.includes(cat)
                                            ? filters.categories.filter(c => c !== cat)
                                            : [...filters.categories, cat];
                                        setFilter('categories', newCats);
                                    }}
                                    className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border ${filters.categories.includes(cat)
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-xl'
                                        : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`${filters.categories.includes(cat) ? 'text-indigo-400' : 'text-gray-300'}`}>
                                            {CATEGORY_ICONS[cat]}
                                        </div>
                                        {cat}
                                    </div>
                                    <div className={`w-1.5 h-1.5 rounded-full ${filters.categories.includes(cat) ? 'bg-indigo-400' : 'bg-gray-200'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Trip Summary Mini-Card */}
                    <div className="mt-8 p-5 bg-gray-50 rounded-[2rem] border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                            <Compass size={40} className="text-indigo-600" />
                        </div>
                        <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Live Stats</h5>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Visible Stops</span>
                                <span className="text-sm font-black text-gray-900">{filteredStops.length}</span>
                            </div>
                            <div className="h-1.5 bg-white rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-1000"
                                    style={{ width: `${Math.min((filteredStops.length / (activeTripStops.length || 1)) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-[9px] font-medium text-gray-400 italic">"Adventure is worthwhile in itself."</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-50 flex items-center justify-center">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Minimize2 size={16} /> Close Map view
                    </button>
                </div>
            </div>

            {/* Backdrop overlay when sidebar is open on mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Map Area */}
            <div className="flex-1 relative h-full bg-gray-100">
                {/* Floating Navigation Controls */}
                <div className="absolute top-6 left-6 z-[100] flex items-center gap-2">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 text-gray-600 hover:text-indigo-600 hover:scale-110 active:scale-95 transition-all"
                        title={sidebarOpen ? "Hide Controls" : "Show Controls"}
                    >
                        {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                    {!sidebarOpen && (
                        <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-white/50 flex items-center gap-4 animate-in slide-in-from-left-4 duration-300">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-50 rounded-lg">
                                    <MapIcon size={14} className="text-indigo-600" />
                                </div>
                                <span className="text-xs font-black text-gray-900">{activeTrip?.title}</span>
                            </div>
                            <div className="h-4 w-px bg-gray-200" />
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                Day {filters.days === 'all' ? 'All' : filters.days}
                            </span>
                        </div>
                    )}
                </div>

                <div className="absolute top-6 right-6 z-[100]">
                    <button
                        onClick={onClose}
                        className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 text-gray-400 hover:text-rose-500 hover:scale-110 active:scale-95 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* The Map */}
                <TripMapView
                    stops={filteredStops}
                    showPath={showPath}
                    renderPopup={(stop) => (
                        <div style={{ minWidth: 220 }} className="p-1">
                            {stop.image_url && (
                                <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-gray-100 shadow-inner">
                                    <img
                                        src={stop.image_url}
                                        alt={stop.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ background: getDayColor(stop.day_number) }}>
                                    Day {stop.day_number}
                                </div>
                                {stop.category && (
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase">
                                        {CATEGORY_ICONS[stop.category]}
                                        {stop.category}
                                    </div>
                                )}
                            </div>
                            <div className="font-black text-gray-900 text-sm leading-tight mb-2">
                                {stop.title}
                            </div>
                            {stop.address && (
                                <div className="text-[10px] font-medium text-gray-400 mb-3 flex items-start gap-1">
                                    <Info size={10} className="mt-0.5 flex-shrink-0" />
                                    {stop.address}
                                </div>
                            )}
                            {stop.notes && (
                                <div className="text-[10px] italic text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100">
                                    {stop.notes}
                                </div>
                            )}
                        </div>
                    )}
                />

                {/* Bottom Legend / HUD */}
                <div className="absolute bottom-6 left-6 right-6 md:left-auto z-[100] flex justify-center">
                    <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-white/50 flex items-center gap-6 overflow-x-auto no-scrollbar max-w-full">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Layers size={14} className="text-gray-400" />
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Map Legend</span>
                        </div>
                        <div className="h-4 w-px bg-gray-200 flex-shrink-0" />
                        <div className="flex items-center gap-4 flex-shrink-0">
                            {days.slice(0, 5).map(d => (
                                <div key={d} className="flex items-center gap-1.5">
                                    <div className="w-2 hs-2 rounded-full" style={{ background: getDayColor(d) }} />
                                    <span className="text-[9px] font-black text-gray-600 uppercase">Day {d}</span>
                                </div>
                            ))}
                            {days.length > 5 && (
                                <span className="text-[9px] font-black text-gray-400 uppercase">+{days.length - 5} More</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripFullMapView;
