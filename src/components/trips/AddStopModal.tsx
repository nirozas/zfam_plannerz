import React, { useState } from 'react';
import { useTripStore } from '../../store/tripStore';
import { X, MapPin, Clock, FileText, Navigation, Loader2, Check, Search, Image as ImageIcon, Utensils, Bed, Landmark, Car, Ticket, ShoppingBag, MoreHorizontal, Wand2, DollarSign } from 'lucide-react';
import { Resizable } from 're-resizable';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import ImageEditorModal from './ImageEditorModal';

if (typeof window !== 'undefined') {
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIconRetina,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
    });
}

// Map interactions component
const LocationPicker = ({ lat, lng, onLocationSelect }: { lat: string, lng: string, onLocationSelect: (lat: number, lng: number) => void }) => {
    const map = useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
    });

    React.useEffect(() => {
        if (lat && lng) {
            map.flyTo([parseFloat(lat), parseFloat(lng)], Math.max(map.getZoom(), 13), { duration: 1.0 });
        }
    }, [lat, lng, map]);

    return lat && lng ? (
        <Marker position={[parseFloat(lat), parseFloat(lng)]} />
    ) : null;
};

interface AddStopModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
    defaultDay?: number;
    maxDay: number;
    editingStop?: any | null;
}

const AddStopModal: React.FC<AddStopModalProps> = ({ isOpen, onClose, tripId, defaultDay = 1, maxDay, editingStop }) => {
    const { addStop, updateStop, activeTripStops, addExpense, activeTrip } = useTripStore();

    const [title, setTitle] = useState(editingStop?.title || '');
    const [address, setAddress] = useState(editingStop?.address || '');
    const [notes, setNotes] = useState(editingStop?.notes || '');
    const [imageUrl, setImageUrl] = useState(editingStop?.image_url || '');
    const [dayNumber, setDayNumber] = useState(editingStop?.day_number || defaultDay);
    const [arrivalTime, setArrivalTime] = useState(editingStop?.arrival_time ? new Date(editingStop.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    const [lat, setLat] = useState(editingStop?.latitude?.toString() || '');
    const [lng, setLng] = useState(editingStop?.longitude?.toString() || '');
    const [category, setCategory] = useState<any>(editingStop?.category || 'Attraction');
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCurrency, setExpenseCurrency] = useState('USD');
    const [shouldLogExpense, setShouldLogExpense] = useState(false);

    const categories = [
        { id: 'Attraction', icon: <Landmark size={14} /> },
        { id: 'Dining', icon: <Utensils size={14} /> },
        { id: 'Accommodation', icon: <Bed size={14} /> },
        { id: 'Activity', icon: <Ticket size={14} /> },
        { id: 'Transportation', icon: <Car size={14} /> },
        { id: 'Shopping', icon: <ShoppingBag size={14} /> },
        { id: 'Other', icon: <MoreHorizontal size={14} /> },
    ];

    if (!isOpen) return null;

    // Available days include existing days + new day option
    const existingDays = Array.from(new Set(activeTripStops.map(s => s.day_number))).sort((a, b) => a - b);
    const nextDay = maxDay + 1;

    const geocodeAddress = async () => {
        if (!address.trim()) return;
        setIsGeocoding(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5`);
            const data = await res.json();
            if (data && data.length > 0) {
                setSearchResults(data);
            } else {
                setSearchResults([]);
            }
        } catch (err) {
            console.error('Geocoding failed:', err);
        } finally {
            setIsGeocoding(false);
        }
    };

    const selectAddress = (result: any) => {
        setLat(result.lat);
        setLng(result.lon);
        setAddress(result.display_name);
        if (!title) setTitle(result.display_name.split(',')[0]);
        setSearchResults([]);
    };

    const resetForm = () => {
        setTitle(''); setAddress(''); setNotes('');
        setDayNumber(defaultDay); setArrivalTime('');
        setLat(''); setLng(''); setImageUrl('');
        setCategory('Attraction');
        setExpenseAmount(''); setShouldLogExpense(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setIsSaving(true);
        try {
            const stopData = {
                trip_id: tripId,
                title: title.trim(),
                address: address.trim() || undefined,
                notes: notes.trim() || undefined,
                category: category,
                image_url: imageUrl.trim() || null,
                day_number: dayNumber,
                arrival_time: arrivalTime ? new Date(`2000-01-01T${arrivalTime}`).toISOString() : undefined,
                latitude: lat ? parseFloat(lat) : undefined,
                longitude: lng ? parseFloat(lng) : undefined,
            };

            if (editingStop) {
                await updateStop(editingStop.id, stopData);
            } else {
                const orderIndex = activeTripStops.filter(s => s.day_number === dayNumber).length;
                await addStop({
                    ...stopData,
                    order_index: orderIndex,
                });
            }

            // Handle expense logging
            if (shouldLogExpense && parseFloat(expenseAmount) > 0) {
                let expenseCat = category;

                let expenseDate = new Date().toISOString().split('T')[0];
                if (activeTrip?.start_date) {
                    const sd = new Date(activeTrip.start_date);
                    sd.setDate(sd.getDate() + (dayNumber - 1));
                    expenseDate = sd.toISOString().split('T')[0];
                }

                await addExpense({
                    trip_id: tripId,
                    amount: parseFloat(expenseAmount),
                    currency: expenseCurrency,
                    category: expenseCat as any,
                    date: expenseDate,
                    description: title.trim()
                });
            }

            resetForm();
            onClose();
        } catch (err) {
            console.error('[AddStopModal] error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded-2xl">
                            <Navigation size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900">{editingStop ? 'Edit Stop' : 'Log a Stop'}</h3>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{editingStop ? 'Refine your journey' : 'Drop a new pin'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 overflow-y-auto">
                    <div className="space-y-5">
                        {/* Title */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Stop Name</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                autoFocus
                                className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm font-bold text-gray-800 placeholder-gray-300 border-none focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                placeholder="Name of this location..."
                            />
                        </div>

                        {/* Address + Geocode */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Address / Location</label>
                            <div className="relative mb-3">
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-2.5 flex-1">
                                        <MapPin size={14} className="text-rose-400 flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={e => {
                                                setAddress(e.target.value);
                                                if (searchResults.length > 0) setSearchResults([]);
                                            }}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), geocodeAddress())}
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-medium text-gray-700 placeholder-gray-300 outline-none"
                                            placeholder="Address..."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={geocodeAddress}
                                        disabled={isGeocoding || !address.trim()}
                                        className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all disabled:opacity-40"
                                    >
                                        {isGeocoding ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                    </button>
                                </div>

                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
                                    <div className="absolute top-12 left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-xl z-[500] max-h-48 overflow-y-auto">
                                        {searchResults.map((result, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => selectAddress(result)}
                                                className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 cursor-pointer text-xs text-gray-700 flex items-start gap-2"
                                            >
                                                <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                <span>{result.display_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Mini Map */}
                            <div className="w-full h-40 rounded-2xl overflow-hidden border border-gray-100 relative z-0 shadow-inner">
                                <MapContainer
                                    center={lat && lng ? [parseFloat(lat), parseFloat(lng)] : [20, 0]}
                                    zoom={lat && lng ? 13 : 2}
                                    className="w-full h-full"
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        attribution='&copy; OpenStreetMap'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <LocationPicker
                                        lat={lat}
                                        lng={lng}
                                        onLocationSelect={(newLat, newLng) => {
                                            setLat(newLat.toString());
                                            setLng(newLng.toString());
                                        }}
                                    />
                                </MapContainer>
                                <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-sm pointer-events-none">
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                        {lat && lng ? 'Location Set' : 'Click Map to set Pin'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Category Selection */}
                        <div className="py-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5 block">Category</label>
                            <div className="flex flex-wrap gap-1.5">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${category === cat.id
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                                            : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-200'
                                            }`}
                                    >
                                        {cat.icon}
                                        {cat.id}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {/* Day & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Day</label>
                                <select
                                    value={dayNumber}
                                    onChange={e => setDayNumber(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-gray-50 rounded-2xl text-xs font-bold text-gray-700 border-none focus:ring-2 focus:ring-indigo-500/30 outline-none appearance-none"
                                >
                                    {existingDays.map(d => <option key={d} value={d}>Day {d}</option>)}
                                    <option value={nextDay}>Day {nextDay} (New)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Arrival</label>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-2.5">
                                    <Clock size={14} className="text-indigo-400" />
                                    <input
                                        type="time"
                                        value={arrivalTime}
                                        onChange={e => setArrivalTime(e.target.value)}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-gray-700 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 flex items-center gap-2">
                                <FileText size={10} /> Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-xs font-medium text-gray-700 placeholder-gray-300 border-none focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none"
                                placeholder="Tips or reminders..."
                            />
                        </div>

                        {/* Expense Linking */}
                        {!editingStop && (
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                    <input
                                        type="checkbox"
                                        checked={shouldLogExpense}
                                        onChange={e => setShouldLogExpense(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                    />
                                    <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Connect an Expense</span>
                                </label>

                                {shouldLogExpense && (
                                    <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 flex-1 border border-gray-100">
                                            <DollarSign size={14} className="text-emerald-500" />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={expenseAmount}
                                                onChange={e => setExpenseAmount(e.target.value)}
                                                className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-gray-700 outline-none placeholder-gray-300"
                                                placeholder="Amount..."
                                            />
                                        </div>
                                        <select
                                            value={expenseCurrency}
                                            onChange={e => setExpenseCurrency(e.target.value)}
                                            className="w-20 px-3 py-2 bg-white rounded-xl text-xs font-bold text-gray-700 border border-gray-100 focus:ring-2 focus:ring-indigo-500/30 outline-none appearance-none text-center"
                                        >
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                            <option value="ILS">ILS</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Image URL & Studio */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <ImageIcon size={10} /> Image & Studio
                                </label>
                                {imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditorOpen(true)}
                                        className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                    >
                                        <Wand2 size={10} /> Refine Image
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 rounded-2xl text-xs font-medium text-gray-700 placeholder-gray-300 border-none focus:ring-2 focus:ring-indigo-500/30 outline-none mb-3"
                                placeholder="Paste image URL..."
                            />

                            {imageUrl && (
                                <div className="flex justify-center">
                                    <Resizable
                                        defaultSize={{ width: '100%', height: 120 }}
                                        minHeight={60}
                                        maxHeight={300}
                                        className="rounded-2xl overflow-hidden border-2 border-dashed border-indigo-100 group relative"
                                        handleClasses={{
                                            bottomRight: 'w-4 h-4 bg-indigo-500 rounded-full bottom-[-8px] right-[-8px] border-2 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize'
                                        }}
                                    >
                                        <img
                                            key={imageUrl}
                                            src={imageUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover pointer-events-none bg-gray-50 flex items-center justify-center"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                            onLoad={(e) => (e.currentTarget.style.display = 'block')}
                                        />
                                        <div className="absolute inset-0 bg-black/5 pointer-events-none group-hover:bg-transparent transition-colors" />
                                    </Resizable>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => { resetForm(); onClose(); }}
                        className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving || !title.trim()}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {isSaving ? (editingStop ? 'Updating...' : 'Logging...') : (editingStop ? 'Update Stop' : 'Drop Pin')}
                    </button>
                </div>

                {/* Editor Modal */}
                {imageUrl && (
                    <ImageEditorModal
                        isOpen={isEditorOpen}
                        onClose={() => setIsEditorOpen(false)}
                        imageUrl={imageUrl}
                        onSave={(newUrl) => setImageUrl(newUrl)}
                    />
                )}
            </div>
        </div>
    );
};

export default AddStopModal;
