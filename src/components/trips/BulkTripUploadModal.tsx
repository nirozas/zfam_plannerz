import React, { useState } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertCircle, MapPin, DollarSign, Clock } from 'lucide-react';
import { useTripStore } from '../../store/tripStore';

interface BulkTripUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
}

const BulkTripUploadModal: React.FC<BulkTripUploadModalProps> = ({ isOpen, onClose, tripId }) => {
    const { bulkAddStops, activeTrip } = useTripStore();
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const parseStops = (text: string) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const parsedStops: any[] = [];

        lines.forEach(line => {
            let workingLine = line;

            // 1. Extract Day Number (e.g., "Day 1", "D2", or just a leading "1 | ")
            let dayNumber = 1;
            const dayMatch = workingLine.match(/(?:^|\b)(?:day|d)\s*(\d+)\b/i) || workingLine.match(/^\s*(\d+)\s*(?=[|:-]|\s)/);
            if (dayMatch) {
                dayNumber = parseInt(dayMatch[1]);
                workingLine = workingLine.replace(dayMatch[0], '').trim();
            }

            // 2. Extract Time (e.g., "10:00", "10:00am", "at 10:00", "9pm")
            let timeString = '';
            const timeMatch = workingLine.match(/(?:\b|at\s+)(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
            if (timeMatch) {
                timeString = timeMatch[1];
                workingLine = workingLine.replace(timeMatch[0], '').trim();
            }

            // 3. Extract Expense (e.g., "$50", "50 USD", "25.50")
            let expenseAmount = 0;
            const expenseMatch = workingLine.match(/(?:\$|usd|ils|eur|£|€)\s*(\d+(?:\.\d{1,2})?)/i) ||
                workingLine.match(/(\d+(?:\.\d{1,2})?)\s*(?:usd|ils|eur|£|€|\$)/i);
            if (expenseMatch) {
                expenseAmount = parseFloat(expenseMatch[1]);
                workingLine = workingLine.replace(expenseMatch[0], '').trim();
            }

            // 4. Extract Address vs Title
            let title = '';
            let address = '';

            // Clean up remaining line from common separators
            workingLine = workingLine.replace(/^[|:,-]\s*/, '').replace(/[|:,-]$/, '').trim();

            // Try to split by common markers to separate Title from Address
            const separators = [', ', ' - ', ' | '];
            let parts: string[] = [];
            for (const sep of separators) {
                if (workingLine.includes(sep)) {
                    parts = workingLine.split(sep);
                    break;
                }
            }

            if (parts.length >= 2) {
                title = parts[0].trim();
                address = parts.slice(1).join(', ').trim();
            } else {
                title = workingLine;
            }

            // 5. Category Detection (Keyword Based)
            let category = 'Attraction';
            const categories = {
                Dining: ['eat', 'food', 'restaurant', 'cafe', 'breakfast', 'lunch', 'dinner', 'pizza', 'burger', 'sushi', 'coffee', 'bakery', 'pub', 'bar', 'meal', 'drink'],
                Accommodation: ['hotel', 'stay', 'airbnb', 'resort', 'lodge', 'hostel', 'inn', 'apartment', 'night', 'villa', 'check-in'],
                Transportation: ['flight', 'train', 'bus', 'taxi', 'drive', 'car', 'rental', 'airport', 'station', 'metro', 'subway', 'ferry', 'boat', 'transfer'],
                Activity: ['tour', 'hike', 'swim', 'climb', 'walk', 'visit', 'ticket', 'show', 'concert', 'event', 'class', 'workshop'],
                Shopping: ['shop', 'store', 'mall', 'market', 'outlet', 'buy', 'souvenir'],
                Attraction: ['museum', 'park', 'tower', 'beach', 'castle', 'view', 'landmark', 'monument', 'square', 'plaza', 'garden', 'zoo', 'aquarium', 'sightseeing']
            };

            for (const [cat, keywords] of Object.entries(categories)) {
                if (keywords.some(k => title.toLowerCase().includes(k) || (address && address.toLowerCase().includes(k)))) {
                    category = cat;
                    break;
                }
            }

            // 6. Format arrival time correctly (ISO string)
            let arrivalTimeIso = undefined;
            if (timeString) {
                try {
                    let cleanTime = timeString.toLowerCase().trim();
                    let h: number, m: number = 0;

                    if (cleanTime.includes(':')) {
                        const [hStr, mStr] = cleanTime.replace(/[^\d:]/g, '').split(':');
                        h = parseInt(hStr);
                        m = parseInt(mStr);
                    } else {
                        h = parseInt(cleanTime.replace(/[^\d]/g, ''));
                    }

                    if (cleanTime.includes('pm') && h < 12) h += 12;
                    if (cleanTime.includes('am') && h === 12) h = 0;

                    const hPadded = h.toString().padStart(2, '0');
                    const mPadded = m.toString().padStart(2, '0');
                    arrivalTimeIso = new Date(`2000-01-01T${hPadded}:${mPadded}:00`).toISOString();
                } catch (e) {
                    console.warn('Invalid time format in bulk upload:', timeString);
                }
            }

            const stop: any = {
                trip_id: tripId,
                title: title.slice(0, 100) || 'Untitled Stop',
                day_number: dayNumber,
                order_index: parsedStops.length,
                address: address || undefined,
                arrival_time: arrivalTimeIso,
                category
            };

            if (expenseAmount > 0) {
                let expenseDate = new Date().toISOString().split('T')[0];
                if (activeTrip?.start_date) {
                    const sd = new Date(activeTrip.start_date);
                    sd.setDate(sd.getDate() + (dayNumber - 1));
                    expenseDate = sd.toISOString().split('T')[0];
                }

                stop.expense = {
                    trip_id: tripId,
                    amount: expenseAmount,
                    category: category === 'Dining' ? 'Food' : (category === 'Transportation' ? 'Transport' : (category === 'Accommodation' ? 'Accommodation' : 'Other')),
                    description: `Expense for ${title}`,
                    date: expenseDate,
                    currency: 'USD'
                };
            }

            parsedStops.push(stop);
        });

        return parsedStops;
    };

    const handleUpload = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const stops = parseStops(inputText);
            if (stops.length === 0) {
                throw new Error('No valid trip logs found. Try writing something like "Day 1: Breakfast at IHOP $25 at 8am"');
            }

            await bulkAddStops(stops);
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                setInputText('');
            }, 2000);
        } catch (err: any) {
            console.error('Bulk trip upload error:', err);
            setError(err.message || 'Failed to upload trip logs.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-500 to-teal-500 p-8 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <Upload size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight leading-none">Itinerary Bulk Import</h2>
                            <p className="text-teal-50 text-xs font-bold uppercase tracking-widest mt-2">Populate your trip logs in one go</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-pill">
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Itinerary Updated!</h3>
                            <p className="text-slate-500 mt-2">Your stops and expenses have been added.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                            <MapPin size={16} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address</div>
                                            <div className="text-xs font-bold text-slate-600">Optional Locations</div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                            <DollarSign size={16} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Expense</div>
                                            <div className="text-xs font-bold text-slate-600">Auto-logged costs</div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Time</div>
                                            <div className="text-xs font-bold text-slate-600">Arrival Schedules</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                                        Paste Itinerary Logs
                                        <span className="text-slate-300 normal-case font-medium italic">Flexible Format: Day, Time, Expense, & Location</span>
                                    </label>
                                    <textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder={`Day 1: Eiffel Tower, Champ de Mars - $25 at 10:00\nBreakfast at Cafe de Flore $15 at 9am\nDay 2: Louvre Museum, $20, 14:30\nCheck-in at Ritz Hotel, Day 3`}
                                        className="w-full h-64 px-5 py-4 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm font-medium text-slate-700"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={isLoading || !inputText.trim()}
                                    className="flex-[2] py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            <Upload size={20} className="group-hover:-translate-y-1 transition-transform" />
                                            Import Trip Logs
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {!isSuccess && (
                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                            <AlertCircle size={14} className="text-indigo-400" />
                            <span>TIP: Just describe your day! We'll find the days, prices, and times automatically.</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkTripUploadModal;
