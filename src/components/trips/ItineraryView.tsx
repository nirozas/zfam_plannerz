import React, { useState, useMemo } from 'react';
import { useTripStore } from '../../store/tripStore';
import { MapPin, Clock, Plus, Compass, Trash2, ChevronDown, ChevronRight, Calendar, Pencil, Utensils, Bed, Landmark, Car, Ticket, ShoppingBag, MoreHorizontal, Upload } from 'lucide-react';
import TripMapView from './TripMapView';
import AddStopModal from './AddStopModal';
import BulkTripUploadModal from './BulkTripUploadModal';
import TripFullMapView from './TripFullMapView';
import { Maximize2 } from 'lucide-react';

// Custom Marker Sticker Icon removed, using TripMapView's internal one or we can pass it

// Day colors
const DAY_COLORS = ['#6366f1', '#0d9488', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#f97316', '#3b82f6'];
const getDayColor = (day: number) => DAY_COLORS[(day - 1) % DAY_COLORS.length];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    Dining: <Utensils size={12} />,
    Accommodation: <Bed size={12} />,
    Attraction: <Landmark size={12} />,
    Transportation: <Car size={12} />,
    Activity: <Ticket size={12} />,
    Shopping: <ShoppingBag size={12} />,
    Other: <MoreHorizontal size={12} />
};

interface ItineraryViewProps { }

const ItineraryView: React.FC<ItineraryViewProps> = () => {
    const { activeTripStops, activeTrip, deleteStop, filters, setFilter, userRole } = useTripStore();
    const isViewer = userRole === 'viewer';
    const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
    const [isAddStopOpen, setIsAddStopOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [editingStop, setEditingStop] = useState<any | null>(null);
    const [defaultDay, setDefaultDay] = useState(1);
    const [isFullMapOpen, setIsFullMapOpen] = useState(false);

    const days = useMemo(() => {
        const d = Array.from(new Set(activeTripStops.map(s => s.day_number)));
        return d.sort((a, b) => a - b);
    }, [activeTripStops]);

    const maxDay = days.length > 0 ? Math.max(...days) : 0;

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

    // Group stops by day
    const stopsByDay = useMemo(() => {
        const groups: Record<number, typeof filteredStops> = {};
        filteredStops.forEach(stop => {
            if (!groups[stop.day_number]) groups[stop.day_number] = [];
            groups[stop.day_number].push(stop);
        });
        return groups;
    }, [filteredStops]);

    const displayDays = Object.keys(stopsByDay).map(Number).sort((a, b) => a - b);

    const openAddStop = (day?: number) => {
        setEditingStop(null);
        setDefaultDay(day ?? (maxDay + 1));
        setIsAddStopOpen(true);
    };

    const openEditStop = (stop: any) => {
        setEditingStop(stop);
        setIsAddStopOpen(true);
    };

    const toggleDay = (day: number) => {
        setCollapsedDays(prev => {
            const next = new Set(prev);
            next.has(day) ? next.delete(day) : next.add(day);
            return next;
        });
    };

    return (
        <>
            {/* On mobile: stack vertically and allow natural scroll.
                On desktop (lg+): side-by-side with fixed height. */}
            <div className="flex flex-col lg:flex-row lg:h-full">
                {/* Left: Itinerary Timeline */}
                <div className="lg:flex-[1.5] border-r border-gray-100 flex flex-col bg-white z-20 shadow-xl lg:overflow-hidden">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-50 bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-xl">
                                    <Calendar size={18} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 tracking-tight">Adventure Log</h3>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                                        {filteredStops.length} visible stop{filteredStops.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[200px] lg:max-w-none no-scrollbar">
                                <button
                                    onClick={() => setFilter('days', 'all')}
                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase transition-all border ${filters.days === 'all'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                        : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-200'
                                        }`}
                                    title="All Days"
                                >
                                    All
                                </button>
                                {days.map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setFilter('days', d)}
                                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all border ${filters.days === d
                                            ? 'text-white border-transparent'
                                            : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-200'
                                            }`}
                                        style={filters.days === d ? { background: getDayColor(d), boxShadow: `0 4px 12px ${getDayColor(d)}30` } : {}}
                                        title={`Day ${d}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                                {!isViewer && (
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <button
                                            className="flex-shrink-0 w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-all"
                                            onClick={() => openAddStop()}
                                            title="Add Stop"
                                        >
                                            <Plus size={16} />
                                        </button>
                                        <button
                                            className="flex-shrink-0 w-8 h-8 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-100"
                                            onClick={() => setIsBulkUploadOpen(true)}
                                            title="Bulk Upload Trip Logs"
                                        >
                                            <Upload size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Category Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {Object.keys(CATEGORY_ICONS).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        const newCats = filters.categories.includes(cat)
                                            ? filters.categories.filter(c => c !== cat)
                                            : [...filters.categories, cat];
                                        setFilter('categories', newCats);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${filters.categories.includes(cat)
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                        : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'
                                        }`}
                                >
                                    {CATEGORY_ICONS[cat]}
                                    {cat}
                                </button>
                            ))}
                            {filters.categories.length > 0 && (
                                <button
                                    onClick={() => setFilter('categories', [])}
                                    className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 px-2"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 lg:overflow-y-auto">
                        {filteredStops.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-5 animate-bounce">
                                    <Compass size={36} className="text-indigo-200" />
                                </div>
                                <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">No stops yet</p>
                                <p className="text-xs text-gray-300 mb-5">Start pinning places to your adventure</p>
                                {!isViewer && (
                                    <button
                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                        onClick={() => openAddStop(1)}
                                    >
                                        + Pin First Location
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                {displayDays.map(day => {
                                    const dayStops = stopsByDay[day];
                                    const color = getDayColor(day);
                                    const isCollapsed = collapsedDays.has(day);

                                    return (
                                        <div key={day} className="rounded-2xl border border-gray-100 overflow-hidden">
                                            {/* Day Header */}
                                            <button
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                                                onClick={() => toggleDay(day)}
                                                style={{ borderLeft: `3px solid ${color}` }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black" style={{ background: color }}>
                                                        {day}
                                                    </div>
                                                    <span className="text-sm font-black text-gray-800">Day {day}</span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: `${color}30`, color }}>
                                                        {dayStops.length} stop{dayStops.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!isViewer && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); openAddStop(day); }}
                                                            className="p-1.5 rounded-lg text-gray-300 hover:text-white transition-all hover:opacity-90"
                                                            style={{ '--tw-hover-bg': color } as any}
                                                            title="Add stop to this day"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    )}
                                                    {isCollapsed
                                                        ? <ChevronRight size={16} className="text-gray-400" />
                                                        : <ChevronDown size={16} className="text-gray-400" />}
                                                </div>
                                            </button>

                                            {/* Day Stops */}
                                            {!isCollapsed && (
                                                <div className="bg-white p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                                    {dayStops.map((stop, idx) => (
                                                        <div key={stop.id} className="group flex flex-col p-4 rounded-2xl border border-gray-100 hover:shadow-xl hover:border-indigo-100 shadow-sm transition-all bg-white relative">

                                                            {/* Action buttons top right popup */}
                                                            {!isViewer && (
                                                                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10 bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-sm border border-transparent hover:border-gray-100">
                                                                    <button
                                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                        onClick={() => openEditStop(stop)}
                                                                        title="Edit stop"
                                                                    >
                                                                        <Pencil size={12} />
                                                                    </button>
                                                                    <button
                                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                        onClick={() => { if (confirm('Remove this stop?')) deleteStop(stop.id); }}
                                                                        title="Delete stop"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* Image Header */}
                                                            {stop.image_url && (
                                                                <div className="w-full h-32 rounded-xl overflow-hidden bg-gray-50 mb-3 relative">
                                                                    <img
                                                                        src={stop.image_url}
                                                                        alt={stop.title}
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                                    />
                                                                    <div className="absolute inset-0 border border-black/5 rounded-xl pointer-events-none"></div>
                                                                </div>
                                                            )}

                                                            <div className="flex-1 flex flex-col">
                                                                <div className="flex items-start gap-2.5 mb-3">
                                                                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-md mt-0.5" style={{ background: color }}>
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 pr-8">
                                                                        <h4 className="font-black text-gray-900 text-sm leading-tight line-clamp-2">{stop.title}</h4>
                                                                        {stop.category && (
                                                                            <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold uppercase tracking-wider bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md border border-gray-100">
                                                                                {CATEGORY_ICONS[stop.category] || <MapPin size={10} />}
                                                                                {stop.category}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5 mt-auto">
                                                                    {stop.address && (
                                                                        <p className="text-[10px] font-medium text-gray-400 flex items-start gap-1.5 line-clamp-2">
                                                                            <MapPin size={10} className="flex-shrink-0 mt-0.5 text-rose-400" />
                                                                            {stop.address}
                                                                        </p>
                                                                    )}
                                                                    {stop.arrival_time && (
                                                                        <p className="text-[10px] font-bold text-indigo-400 flex items-center gap-1.5">
                                                                            <Clock size={10} className="text-indigo-400" />
                                                                            {new Date(stop.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                {stop.notes && (
                                                                    <div className="mt-3 text-[10px] text-gray-500 bg-amber-50 border-l-2 border-amber-300 rounded-r-lg px-2.5 py-2 line-clamp-3">
                                                                        {stop.notes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {!isViewer && (
                                                        <button
                                                            onClick={() => openAddStop(day)}
                                                            className="w-full min-h-[140px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 text-gray-300 hover:text-indigo-500 transition-all group"
                                                        >
                                                            <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                                                <Plus size={16} />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Add to Day {day}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {!isViewer && (
                                    <button
                                        onClick={() => openAddStop(maxDay + 1)}
                                        className="w-full py-3.5 border-2 border-dashed border-indigo-100 rounded-2xl text-xs font-black text-indigo-300 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Calendar size={14} /> + Add Day {maxDay + 1}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Map — on mobile give it a fixed height so it's visible;
                    on desktop it fills the remaining flex space */}
                <div className="min-h-[350px] lg:min-h-0 lg:flex-1 relative bg-gray-100 overflow-hidden border-l border-gray-200">
                    <div className="absolute inset-0 z-0">
                        <TripMapView
                            stops={filteredStops}
                            renderPopup={(stop) => (
                                <div style={{ minWidth: 200 }}>
                                    {stop.image_url && (
                                        <div className="mb-2 rounded-lg overflow-hidden aspect-video bg-gray-100">
                                            <img
                                                src={stop.image_url}
                                                alt={stop.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </div>
                                    )}
                                    <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: getDayColor(stop.day_number) }}>
                                        Day {stop.day_number}
                                    </div>
                                    <div className="font-black text-gray-900 text-sm leading-tight mb-1 flex items-center gap-2">
                                        {stop.category && CATEGORY_ICONS[stop.category]}
                                        {stop.title}
                                    </div>
                                    {stop.address && <div className="text-[10px] font-medium text-gray-400 mb-1">{stop.address}</div>}
                                    {stop.notes && <div className="text-[10px] italic text-gray-400 border-t border-gray-100 pt-1">{stop.notes}</div>}
                                </div>
                            )}
                        />
                    </div>

                    {/* Maximize Button */}
                    <div className="absolute top-5 right-5 z-[1000]">
                        <button
                            onClick={() => setIsFullMapOpen(true)}
                            className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 text-gray-500 hover:text-indigo-600 hover:scale-110 active:scale-95 transition-all group"
                            title="Expand to Full Screen Map"
                        >
                            <Maximize2 size={20} className="group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>

                    {/* Stats HUD — hidden on small screens to avoid overlap */}
                    <div className="absolute bottom-5 right-5 z-[1000] hidden md:block">
                        <div className="bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-white/10 text-white min-w-[180px]">
                            <div className="flex items-center gap-2 mb-3">
                                <Compass size={18} className="text-indigo-400 animate-spin-slow" />
                                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Map View</div>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { label: 'Total Stops', value: filteredStops.length },
                                    { label: 'Days', value: days.length },
                                    { label: 'Filter', value: filters.days === 'all' ? 'All Days' : `Day ${filters.days}` },
                                ].map(stat => (
                                    <div key={stat.label} className="flex justify-between text-[10px] font-bold">
                                        <span className="opacity-50">{stat.label}</span>
                                        <span className="text-indigo-300">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isAddStopOpen && activeTrip && (
                <AddStopModal
                    isOpen={isAddStopOpen}
                    onClose={() => { setIsAddStopOpen(false); setEditingStop(null); }}
                    tripId={activeTrip.id}
                    defaultDay={defaultDay}
                    maxDay={maxDay}
                    editingStop={editingStop}
                />
            )}
            {isFullMapOpen && (
                <TripFullMapView
                    isOpen={isFullMapOpen}
                    onClose={() => setIsFullMapOpen(false)}
                />
            )}
            {isBulkUploadOpen && activeTrip && (
                <BulkTripUploadModal
                    isOpen={isBulkUploadOpen}
                    onClose={() => setIsBulkUploadOpen(false)}
                    tripId={activeTrip.id}
                />
            )}
        </>
    );
};


export default ItineraryView;
