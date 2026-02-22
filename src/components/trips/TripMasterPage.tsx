import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTripStore } from '../../store/tripStore';
import {
    DollarSign, Map as MapIcon, ChevronLeft, Info, AlertCircle,
    MapPin, Calendar, Clock, Luggage, Hash, Share2
} from 'lucide-react';
import ItineraryView from './ItineraryView';
import ExpenseTracker from './ExpenseTracker';
import TripDetailsTab from './TripDetailsTab';
import PackingList from './PackingList';
import ShareTripModal from './ShareTripModal';
import './TripMasterPage.css';

const getDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const TripMasterPage: React.FC = () => {
    const { tripSlug } = useParams<{ tripSlug: string }>();
    const navigate = useNavigate();
    const { activeTrip, activeTripStops, activeTripExpenses, fetchTripDetails, isLoading, error, userRole } = useTripStore();
    const isViewer = userRole === 'viewer';
    const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'packing' | 'details'>('itinerary');
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        console.log('[TripMasterPage] slug:', tripSlug);
        if (tripSlug) {
            fetchTripDetails(tripSlug);
        }
    }, [tripSlug, fetchTripDetails]);

    useEffect(() => {
        console.log('[TripMasterPage] activeTrip:', activeTrip);
        console.log('[TripMasterPage] isLoading:', isLoading);
        console.log('[TripMasterPage] error:', error);
    }, [activeTrip, isLoading, error]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-teal-600">
                <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                <p className="font-bold uppercase tracking-widest text-xs">Loading Journey...</p>
            </div>
        );
    }

    if (!isLoading && (error || !activeTrip)) {
        console.warn('[TripMasterPage] Trip not found or error:', { error, activeTrip });
        return (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8 bg-gray-50">
                <div className="p-6 bg-rose-50 rounded-3xl animate-in zoom-in duration-300">
                    <AlertCircle size={64} className="text-rose-500" />
                </div>
                <div className="text-center animate-in slide-in-from-bottom duration-500">
                    <h2 className="text-2xl font-black text-gray-900">Journey Not Found</h2>
                    <p className="text-gray-500 mt-2">This trip doesn't exist or was deleted.</p>
                </div>
                <button
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all flex items-center gap-2 shadow-lg shadow-teal-100"
                    onClick={() => navigate('/trips')}
                >
                    <ChevronLeft size={20} /> Back to Gallery
                </button>
            </div>
        );
    }

    if (!activeTrip) return null; // Final safety

    const duration = getDuration(activeTrip.start_date || undefined, activeTrip.end_date || undefined);
    const totalExpenses = (activeTripExpenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            {/* Custom Cover Hero */}
            <div className="relative flex-shrink-0">
                {/* Background: cover image or gradient */}
                <div className="h-40 md:h-56 relative overflow-hidden">
                    {activeTrip.cover_url ? (
                        <>
                            {/* Blurred background layer */}
                            <div
                                className="absolute inset-0 scale-110 blur-sm opacity-60"
                                style={{ backgroundImage: `url(${activeTrip.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                            />
                            {/* Sharp center image */}
                            <img
                                src={activeTrip.cover_url}
                                alt={activeTrip.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-indigo-500 to-purple-600" />
                    )}
                    {/* Gradient overlay from bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

                    {/* Back button */}
                    <button
                        onClick={() => navigate('/trips')}
                        className="absolute top-4 left-4 flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-black/50 transition-all z-10"
                    >
                        <ChevronLeft size={16} /> All Trips
                    </button>

                    {/* Share button */}
                    {!isViewer && (
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="absolute top-4 right-4 flex items-center gap-2 bg-indigo-600/30 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-600/50 transition-all z-10"
                        >
                            <Share2 size={16} /> Share
                        </button>
                    )}

                    {/* Trip title & meta on image */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4">
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-3xl font-black text-white leading-tight drop-shadow-lg mb-1 md:mb-2 truncate">
                                    {activeTrip.title}
                                </h1>
                                <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                                    {activeTrip.location && (
                                        <div className="flex items-center gap-1.5 text-white/80 text-xs font-bold">
                                            <MapPin size={13} />
                                            {activeTrip.location}
                                        </div>
                                    )}
                                    {activeTrip.start_date && (
                                        <div className="flex items-center gap-1.5 text-white/80 text-xs font-bold">
                                            <Calendar size={13} />
                                            {formatDate(activeTrip.start_date)}
                                            {activeTrip.end_date && ` – ${formatDate(activeTrip.end_date)}`}
                                        </div>
                                    )}
                                    {duration && (
                                        <div className="flex items-center gap-1.5 text-white/80 text-xs font-bold">
                                            <Clock size={13} />
                                            {duration} day{duration !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hashtags */}
                            {(activeTrip.hashtags || []).length > 0 && (
                                <div className="flex gap-1.5 flex-wrap justify-end">
                                    {activeTrip.hashtags.slice(0, 3).map((tag: string) => (
                                        <span key={tag} className="text-[10px] font-black text-white/90 bg-white/20 backdrop-blur-sm border border-white/30 px-2.5 py-1 rounded-full">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Strip */}
                <div className="grid grid-cols-4 border-b border-gray-100 bg-white">
                    {[
                        { label: 'Stops', value: activeTripStops.length, icon: <MapPin size={14} />, color: 'text-indigo-600' },
                        { label: 'Days', value: duration ?? '—', icon: <Clock size={14} />, color: 'text-teal-600' },
                        { label: 'Spent', value: `$${totalExpenses.toFixed(0)}`, icon: <DollarSign size={14} />, color: 'text-rose-500' },
                        { label: 'Tags', value: (activeTrip.hashtags || []).length, icon: <Hash size={14} />, color: 'text-amber-500' },
                    ].map(stat => (
                        <div key={stat.label} className="flex flex-col items-center justify-center py-2 md:py-3 gap-0.5 border-r border-gray-50 last:border-r-0">
                            <div className={`${stat.color} font-black text-base md:text-xl`}>{stat.value}</div>
                            <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <span className={`${stat.color} hidden sm:inline`}>{stat.icon}</span>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-100 flex items-center px-2 sticky top-0 z-20 shadow-sm overflow-x-auto no-scrollbar">
                <nav className="flex gap-1 flex-1 min-w-0">
                    <TabButton active={activeTab === 'itinerary'} onClick={() => setActiveTab('itinerary')} icon={<MapIcon size={16} />} label="Itinerary" />
                    <TabButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<DollarSign size={16} />} label="Expenses" />
                    <TabButton active={activeTab === 'packing'} onClick={() => setActiveTab('packing')} icon={<Luggage size={16} />} label="Packing" />
                    <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<Info size={16} />} label="Details" />
                </nav>
            </div>

            {/* Tab Content — overflow-y-auto so the user can scroll */}
            <main className="flex-1 overflow-y-auto relative">
                {activeTab === 'itinerary' && <ItineraryView />}
                {activeTab === 'expenses' && <ExpenseTracker trip={activeTrip} />}
                {activeTab === 'packing' && activeTrip && <PackingList tripId={activeTrip.id} />}
                {activeTab === 'details' && <TripDetailsTab tripId={activeTrip.id} />}
            </main>

            {showShareModal && (
                <ShareTripModal
                    tripId={activeTrip.id}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>
    );
};

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
    <button
        className={`flex items-center gap-1.5 py-3 md:py-4 px-3 md:px-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap flex-shrink-0 ${active ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl'
            }`}
        onClick={onClick}
    >
        {icon}
        {label}
        {active && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full shadow-[0_-2px_8px_rgba(13,148,136,0.4)]" />
        )}
    </button>
);

export default TripMasterPage;
