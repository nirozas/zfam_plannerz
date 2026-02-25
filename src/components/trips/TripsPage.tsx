import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { useTripStore } from '../../store/tripStore';
import { Plus, Search, MapPin, Calendar, Compass, ArrowRight, RotateCcw, Plane, Clock, Sparkles, TrendingUp, Trash2, Pencil, Grid, Map, Users, Share2 } from 'lucide-react';
import CreateTripModal from './CreateTripModal';
import GlobalTripsMap from './GlobalTripsMap';
import ShareTripModal from './ShareTripModal';
import './TripsPage.css';

type TripStatus = 'all' | 'upcoming' | 'ongoing' | 'past';

const getTripStatus = (trip: any): 'upcoming' | 'ongoing' | 'past' | 'unscheduled' => {
    if (!trip.start_date) return 'unscheduled';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(trip.start_date);
    const end = trip.end_date ? new Date(trip.end_date) : start;
    if (today < start) return 'upcoming';
    if (today > end) return 'past';
    return 'ongoing';
};

const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
};

const getDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
};

const STATUS_CONFIG = {
    upcoming: { label: 'Upcoming', color: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50', badge: 'bg-indigo-500' },
    ongoing: { label: 'Live Now ✈', color: 'bg-teal-500', text: 'text-teal-600', bg: 'bg-teal-50', badge: 'bg-teal-500' },
    past: { label: 'Explored', color: 'bg-gray-400', text: 'text-gray-500', bg: 'bg-gray-50', badge: 'bg-gray-400' },
    unscheduled: { label: 'Planning', color: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50', badge: 'bg-amber-400' },
};

const CONTINENT_MAP: Record<string, string> = {
    // North America
    'USA': 'North America', 'United States': 'North America', 'Canada': 'North America', 'Mexico': 'North America', 'Cuba': 'North America', 'Jamaica': 'North America',
    // Europe
    'UK': 'Europe', 'United Kingdom': 'Europe', 'France': 'Europe', 'Germany': 'Europe', 'Italy': 'Europe', 'Spain': 'Europe', 'Greece': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe', 'Switzerland': 'Europe', 'Austria': 'Europe', 'Portugal': 'Europe', 'Sweden': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe', 'Ireland': 'Europe', 'Poland': 'Europe', 'Turkey': 'Europe', 'Ukraine': 'Europe',
    // Asia
    'Israel': 'Asia', 'Japan': 'Asia', 'China': 'Asia', 'Thailand': 'Asia', 'India': 'Asia', 'Vietnam': 'Asia', 'South Korea': 'Asia', 'Indonesia': 'Asia', 'Philippines': 'Asia', 'Malaysia': 'Asia', 'Singapore': 'Asia', 'United Arab Emirates': 'Asia', 'UAE': 'Asia', 'Saudi Arabia': 'Asia', 'Jordan': 'Asia', 'Georgia': 'Asia',
    // Oceania
    'Australia': 'Oceania', 'New Zealand': 'Oceania', 'Fiji': 'Oceania',
    // South America
    'Brazil': 'South America', 'Argentina': 'South America', 'Colombia': 'South America', 'Peru': 'South America', 'Chile': 'South America', 'Ecuador': 'South America',
    // Africa
    'South Africa': 'Africa', 'Egypt': 'Africa', 'Morocco': 'Africa', 'Kenya': 'Africa', 'Nigeria': 'Africa', 'Tanzania': 'Africa', 'Tunisia': 'Africa'
};

const MONTHS = [
    { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
    { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
    { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
    { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' }
];

const TripsPage: React.FC = () => {
    const { trips, fetchTrips, isLoading, error: storeError } = useTripStore();
    const [userId, setUserId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TripStatus>('all');
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [monthFilter, setMonthFilter] = useState<string>('all');
    const [countryFilter, setCountryFilter] = useState<string>('all');
    const [participantFilter, setParticipantFilter] = useState<string>('all');
    const [continentFilter, setContinentFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingTrip, setEditingTrip] = useState<any | null>(null);
    const [sharingTripId, setSharingTripId] = useState<string | null>(null);
    const { deleteTrip } = useTripStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchTrips();
        supabase.auth.getUser().then(({ data }: any) => {
            setUserId(data.user?.id || null);
        });
    }, [fetchTrips]);

    const availableYears = useMemo(() => {
        const years = new Set(trips.map(t => t.start_date ? new Date(t.start_date).getFullYear().toString() : null).filter(Boolean));
        return Array.from(years).sort().reverse() as string[];
    }, [trips]);

    const availableCountries = useMemo(() => {
        const countries = new Set(trips.map(t => t.location?.split(',').pop()?.trim()).filter(Boolean));
        return Array.from(countries).sort() as string[];
    }, [trips]);

    const availableParticipants = useMemo(() => {
        const parts = new Set(trips.flatMap(t => t.participants || []));
        return Array.from(parts).sort() as string[];
    }, [trips]);

    const availableContinents = useMemo(() => {
        const continents = new Set(Object.values(CONTINENT_MAP));
        return Array.from(continents).sort() as string[];
    }, []);

    const filtered = useMemo(() => {
        return trips.filter(trip => {
            const matchSearch = trip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trip.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trip.hashtags?.some((h: string) => h.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!matchSearch) return false;

            if (statusFilter !== 'all') {
                const status = getTripStatus(trip);
                if (statusFilter === 'upcoming' && status !== 'upcoming') return false;
                if (statusFilter === 'ongoing' && status !== 'ongoing') return false;
                if (statusFilter === 'past' && status !== 'past') return false;
            }

            if (yearFilter !== 'all' && trip.start_date) {
                if (new Date(trip.start_date).getFullYear().toString() !== yearFilter) return false;
            }

            if (monthFilter !== 'all' && trip.start_date) {
                if (new Date(trip.start_date).getMonth().toString() !== monthFilter) return false;
            }

            if (countryFilter !== 'all') {
                const country = trip.location?.split(',').pop()?.trim();
                if (country !== countryFilter) return false;
            }

            if (continentFilter !== 'all') {
                const country = trip.location?.split(',').pop()?.trim();
                const continent = country ? CONTINENT_MAP[country] : null;
                if (continent !== continentFilter) return false;
            }

            if (participantFilter !== 'all') {
                if (!trip.participants?.includes(participantFilter)) return false;
            }

            return true;
        }).sort((a, b) => {
            if (!a.start_date && !b.start_date) return 0;
            if (!a.start_date) return 1;
            if (!b.start_date) return -1;
            return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        });
    }, [trips, searchTerm, statusFilter, yearFilter, monthFilter, countryFilter, continentFilter, participantFilter]);

    const stats = useMemo(() => ({
        total: trips.length,
        upcoming: trips.filter(t => getTripStatus(t) === 'upcoming').length,
        ongoing: trips.filter(t => getTripStatus(t) === 'ongoing').length,
        countries: new Set(trips.map(t => t.location?.split(',').pop()?.trim()).filter(Boolean)).size,
    }), [trips]);

    return (
        <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8fffc 0%, #f0f4ff 100%)' }}>
            {/* Immersive Hero — compact on mobile */}
            <div className="relative px-4 md:px-8 pt-4 md:pt-10 pb-0 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-indigo-100/40 rounded-full blur-3xl" />
                </div>

                <div className="relative">
                    <div className="flex flex-col md:flex-row items-start justify-between mb-4 md:mb-6 gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2 md:mb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                                    ✈ Adventure Hub
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-5xl font-black text-gray-900 tracking-tight leading-none mb-1 md:mb-2">
                                My Journeys
                            </h1>
                            <p className="text-xs md:text-base font-medium text-gray-500">Plan trips, track expenses, map every memory.</p>
                        </div>
                        <button
                            className="w-full md:w-auto hover:bg-teal-700 text-white px-5 md:px-6 py-2.5 md:py-3.5 rounded-2xl font-black text-xs md:text-sm transition-all shadow-xl shadow-teal-200 hover:shadow-teal-300 hover:scale-105 active:scale-95 group relative flex items-center justify-center gap-2 bg-teal-600"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus size={20} />
                            New Adventure
                            <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>

                    {/* Stats Row — hidden on mobile to save vertical space */}
                    <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                        {[
                            { label: 'Total Trips', value: stats.total, icon: <Compass size={16} />, color: 'text-teal-600', bg: 'bg-teal-50' },
                            { label: 'Upcoming', value: stats.upcoming, icon: <Plane size={16} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'In Progress', value: stats.ongoing, icon: <TrendingUp size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Destinations', value: stats.countries, icon: <MapPin size={16} />, color: 'text-rose-600', bg: 'bg-rose-50' },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white shadow-sm flex items-center gap-3">
                                <div className={`p-2 ${stat.bg} ${stat.color} rounded-xl`}>{stat.icon}</div>
                                <div>
                                    <div className="text-2xl font-black text-gray-900">{stat.value}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls Bar / Filters Panel */}
            <div className="px-4 md:px-8 py-3 bg-white/80 backdrop-blur-md border-b border-gray-100 flex flex-col md:flex-row items-center gap-3 sticky top-0 z-10 flex-wrap">
                <div className="relative w-full md:flex-1 min-w-[200px] max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search trips..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-100/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all text-xs outline-none font-medium"
                    />
                </div>

                <div className="h-6 w-px bg-gray-200/60 hidden md:block" />

                {/* Dropdown Filters \u2014 hidden on mobile to save space */}
                <div className="hidden md:flex items-center gap-2 flex-wrap">
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-gray-50 border border-transparent hover:border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    >
                        <option value="all">Year</option>
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>

                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-gray-50 border border-transparent hover:border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    >
                        <option value="all">Month</option>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>

                    <select
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-gray-50 border border-transparent hover:border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    >
                        <option value="all">Country</option>
                        {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        value={continentFilter}
                        onChange={(e) => setContinentFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-gray-50 border border-transparent hover:border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    >
                        <option value="all">Continent</option>
                        {availableContinents.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        value={participantFilter}
                        onChange={(e) => setParticipantFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-gray-50 border border-transparent hover:border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                    >
                        <option value="all">Traveler</option>
                        {availableParticipants.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    {(yearFilter !== 'all' || monthFilter !== 'all' || countryFilter !== 'all' || continentFilter !== 'all' || participantFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setYearFilter('all'); setMonthFilter('all'); setCountryFilter('all');
                                setContinentFilter('all'); setParticipantFilter('all'); setStatusFilter('all'); setSearchTerm('');
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Reset All Filters"
                        >
                            <RotateCcw size={14} />
                        </button>
                    )}
                </div>

                <div className="h-6 w-px bg-gray-200/60 hidden lg:block" />

                {/* Status Filter Pills */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {(['all', 'upcoming', 'ongoing', 'past'] as TripStatus[]).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === s
                                ? 'bg-teal-600 text-white shadow-md shadow-teal-100'
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                }`}
                        >
                            {s === 'all' ? 'All' : s === 'ongoing' ? 'Live' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                    <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-teal-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Grid size={13} />
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-teal-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Map size={13} />
                        </button>
                    </div>

                    <button
                        className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
                        onClick={() => fetchTrips()}
                        title="Refresh"
                    >
                        <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Main Area */}
            {viewMode === 'map' ? (
                <div className="flex-1 w-full bg-gray-50 relative overflow-hidden">
                    <GlobalTripsMap />
                </div>
            ) : (
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {storeError && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in slide-in-from-top-4 duration-300">
                            <Compass size={20} className="text-rose-400" />
                            <div className="flex-1 text-sm font-bold">{storeError}</div>
                            <button onClick={() => fetchTrips()} className="text-xs font-black uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all">Retry</button>
                        </div>
                    )}
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-80 text-gray-400 gap-5">
                            <div className="p-8 bg-white rounded-3xl shadow-sm border border-gray-50">
                                <Compass size={56} className="text-teal-100 animate-pulse" />
                            </div>
                            <div className="text-center">
                                <p className="font-black text-gray-700 text-lg">No adventures found</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    {searchTerm ? `No results for "${searchTerm}"` : 'Start by clicking "New Adventure" above.'}
                                </p>
                            </div>
                            {!searchTerm && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all"
                                >
                                    <Sparkles size={16} /> Plan Your First Trip
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtered.map((trip, i) => (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    index={i}
                                    currentUserId={userId}
                                    onClick={() => navigate(`/trips/${trip.slug}`)}
                                    onShare={() => setSharingTripId(trip.id)}
                                    onEdit={() => {
                                        setEditingTrip(trip);
                                        setIsCreateModalOpen(true);
                                    }}
                                    onDelete={async () => {
                                        if (confirm(`Are you sure you want to delete "${trip.title}"?`)) {
                                            await deleteTrip(trip.id);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </main>
            )}

            <CreateTripModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingTrip(null);
                }}
                editingTrip={editingTrip}
            />

            {sharingTripId && (
                <ShareTripModal
                    tripId={sharingTripId}
                    onClose={() => setSharingTripId(null)}
                />
            )}
        </div>
    );
};

interface TripCardProps {
    trip: any;
    index: number;
    currentUserId: string | null;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onShare: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, index, currentUserId, onClick, onEdit, onDelete, onShare }) => {
    const status = getTripStatus(trip);
    const cfg = (STATUS_CONFIG as any)[status] || STATUS_CONFIG.past;
    const duration = getDuration(trip.start_date, trip.end_date);
    const daysUntil = trip.start_date ? getDaysUntil(trip.start_date) : null;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const dateRange = trip.start_date && trip.end_date
        ? `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}, ${new Date(trip.end_date).getFullYear()}`
        : trip.start_date ? formatDate(trip.start_date) : 'Dates TBD';

    // Gradient fallbacks per index
    const gradients = [
        'from-teal-400 to-cyan-600',
        'from-indigo-400 to-purple-600',
        'from-rose-400 to-orange-500',
        'from-amber-400 to-yellow-500',
        'from-emerald-400 to-teal-600',
        'from-violet-400 to-indigo-600',
    ];
    const gradient = gradients[index % gradients.length];

    return (
        <div
            className="group relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100/80 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col"
            onClick={onClick}
            style={{ animationDelay: `${index * 60}ms` }}
        >
            {/* Cover Image */}
            <div className="relative h-52 overflow-hidden flex-shrink-0">
                {trip.cover_url ? (
                    <img
                        src={trip.cover_url}
                        alt={trip.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        <Compass size={56} className="text-white/30" />
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Status Badge */}
                <div className={`absolute top-3 left-3 flex items-center gap-1.5 ${cfg.badge} text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full`}>
                    {status === 'ongoing' && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping absolute" />}
                    {status === 'ongoing' && <span className="w-1.5 h-1.5 bg-white rounded-full relative" />}
                    {cfg.label}
                </div>

                {/* Collaboration Badge */}
                {trip.user_id !== currentUserId && (
                    <div className="absolute top-12 left-3 flex items-center gap-1.5 bg-indigo-600/80 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border border-white/20">
                        <Users size={10} /> Shared
                    </div>
                )}

                {/* Duration Badge */}
                {duration && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl">
                        {duration}d
                    </div>
                )}

                {/* Bottom info on image */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-xl font-black text-white leading-tight drop-shadow-lg mb-1 line-clamp-1">
                        {trip.title}
                    </h3>
                    {trip.location && (
                        <div className="flex items-center gap-1.5 text-white/80 text-xs font-bold">
                            <MapPin size={12} />
                            {trip.location}
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col">
                {/* Date Row */}
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-3">
                    <Calendar size={13} className="text-teal-400 flex-shrink-0" />
                    <span>{dateRange}</span>
                </div>

                {/* Countdown for upcoming */}
                {status === 'upcoming' && daysUntil !== null && daysUntil > 0 && (
                    <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2 mb-3">
                        <Clock size={13} className="text-indigo-400" />
                        <span className="text-xs font-black text-indigo-600">
                            {daysUntil === 1 ? 'Tomorrow!' : `${daysUntil} days to go`}
                        </span>
                    </div>
                )}

                {/* Ongoing indicator */}
                {status === 'ongoing' && (
                    <div className="flex items-center gap-2 bg-teal-50 rounded-xl px-3 py-2 mb-3">
                        <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                        <span className="text-xs font-black text-teal-600">Adventure in Progress!</span>
                    </div>
                )}

                {/* Hashtags */}
                {trip.hashtags && trip.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-3 border-t border-gray-50">
                        {trip.hashtags.slice(0, 3).map((tag: string, i: number) => (
                            <span key={i} className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">
                                #{tag}
                            </span>
                        ))}
                        {trip.hashtags.length > 3 && (
                            <span className="text-[10px] font-bold text-gray-300">+{trip.hashtags.length - 3}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Actions Overlay (visible on hover) - Only if not viewer */}
            {trip.userRole !== 'viewer' && (
                <div className="absolute top-3 right-12 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 translate-y-[-10px] group-hover:translate-y-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 rounded-xl shadow-lg hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110 group/btn"
                        title="Edit Trip"
                    >
                        <Pencil size={15} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onShare(); }}
                        className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 rounded-xl shadow-lg hover:bg-teal-600 hover:text-white transition-all transform hover:scale-110 group/btn"
                        title="Share Trip"
                    >
                        <Share2 size={15} />
                    </button>
                    {/* Delete should probably be owner only? Or editor too? Usually owner only. Let's stick to owner for delete. */}
                    {trip.userRole === 'owner' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 rounded-xl shadow-lg hover:bg-rose-600 hover:text-white transition-all transform hover:scale-110 group/btn"
                            title="Delete Trip"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            )}

            {/* Hover CTA */}
            <div className="px-5 py-3 bg-gradient-to-r from-teal-50 to-indigo-50 flex items-center justify-between translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <span className="text-xs font-black text-teal-700 uppercase tracking-widest">Open Adventure</span>
                <div className="p-1.5 bg-teal-600 text-white rounded-lg">
                    <ArrowRight size={14} />
                </div>
            </div>
        </div>
    );
};

export default TripsPage;
