import React, { useMemo, useEffect, useState } from 'react';
import TripMapView from './TripMapView';
import { useTripStore } from '../../store/tripStore';
import { MapPin, Compass, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { TripStop } from '../../types/trip';

const GlobalTripsMap: React.FC = () => {
    const { trips } = useTripStore();
    const navigate = useNavigate();
    const [allStops, setAllStops] = useState<(TripStop & { trip: any })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllStops = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('trip_stops')
                    .select('*');

                if (error) throw error;

                // Attach trip info
                const enriched = (data || []).map(stop => ({
                    ...stop,
                    trip: trips.find(t => t.id === stop.trip_id)
                }));
                setAllStops(enriched);
            } catch (err) {
                console.error('Error fetching stops:', err);
            } finally {
                setLoading(false);
            }
        };

        if (trips.length > 0) {
            fetchAllStops();
        } else {
            setLoading(false);
        }
    }, [trips]);

    // Group valid stops by trip to show one marker per trip
    const tripMarkers = useMemo(() => {
        const validStops = allStops.filter(s => s.latitude && s.longitude);
        const markers: (TripStop & { trip: any })[] = [];
        const seenTrips = new Set<string>();

        // Sort stops to pick the "first" one as representative
        const sortedStops = [...validStops].sort((a, b) => {
            if (a.day_number !== b.day_number) return a.day_number - b.day_number;
            if (a.arrival_time && b.arrival_time) return a.arrival_time.localeCompare(b.arrival_time);
            if (a.arrival_time) return -1;
            if (b.arrival_time) return 1;
            return a.order_index - b.order_index;
        });

        sortedStops.forEach(stop => {
            if (!seenTrips.has(stop.trip_id)) {
                const trip = trips.find(t => t.id === stop.trip_id);
                if (trip) {
                    markers.push({
                        ...stop,
                        // Use trip title and cover image for the global marker
                        title: trip.title,
                        image_url: trip.cover_url || stop.image_url,
                        trip: trip
                    });
                    seenTrips.add(stop.trip_id);
                }
            }
        });
        return markers;
    }, [allStops, trips]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50/50">
                <Loader2 size={32} className="text-indigo-400 animate-spin mb-4" />
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Loading Map Data...</h3>
            </div>
        );
    }

    if (tripMarkers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50/50">
                <Compass size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-black text-gray-500">No Mapped Journeys</h3>
                <p className="text-sm text-gray-400">Add locations to your trips to see your footprint grow.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative">
            <TripMapView
                stops={tripMarkers}
                showPath={false}
                renderPopup={(marker: any) => {
                    const trip = marker.trip;
                    return (
                        <div style={{ minWidth: 200 }}>
                            {trip?.cover_url && (
                                <div className="mb-2 rounded-lg overflow-hidden aspect-video bg-gray-100 ring-1 ring-gray-100">
                                    <img
                                        src={trip.cover_url}
                                        alt={trip.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}
                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1 flex items-center gap-1">
                                <Compass size={12} /> {trip?.location || 'Global Destination'}
                            </div>
                            <div className="font-black text-gray-900 text-sm leading-tight mb-1">
                                {trip?.title}
                            </div>
                            {trip?.start_date && (
                                <div className="text-[10px] font-bold text-gray-400">
                                    {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </div>
                            )}

                            <button
                                onClick={() => navigate(`/trips/${trip?.slug}`)}
                                className="w-full mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between group"
                            >
                                View Trip
                                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    );
                }}
            />
            {/* Overlay summary stats for the global map */}
            <div className="absolute top-6 left-6 z-[400] bg-white/90 backdrop-blur-md px-5 py-4 rounded-2xl shadow-xl border border-indigo-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <MapPin size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-gray-900 leading-tight">World Footprint</h2>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {tripMarkers.length} Journeys • {allStops.length} Total Pins
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalTripsMap;
