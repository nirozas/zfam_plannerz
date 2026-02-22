import React, { useState, useRef } from 'react';
import { useTripStore } from '../../store/tripStore';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Calendar, Compass, Hash, Image as ImageIcon, Plus, Loader2, Check } from 'lucide-react';
import { supabase } from '../../supabase/client';

interface CreateTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingTrip?: any | null;
}

const CreateTripModal: React.FC<CreateTripModalProps> = ({ isOpen, onClose, editingTrip }) => {
    const { createTrip, updateTrip } = useTripStore();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [hashtags, setHashtags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [participants, setParticipants] = useState<string[]>([]);
    const [participantInput, setParticipantInput] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverUrlInput, setCoverUrlInput] = useState('');
    const [useUrl, setUseUrl] = useState(false);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            if (editingTrip) {
                setTitle(editingTrip.title || '');
                setDescription(editingTrip.description || '');
                setLocation(editingTrip.location || '');
                setStartDate(editingTrip.start_date || '');
                setEndDate(editingTrip.end_date || '');
                setHashtags(editingTrip.hashtags || []);
                setParticipants(editingTrip.participants || []);
                setCoverPreview(editingTrip.cover_url || null);
                if (editingTrip.cover_url && !editingTrip.cover_url.includes('supabase')) {
                    setCoverUrlInput(editingTrip.cover_url);
                    setUseUrl(true);
                }
            } else {
                resetForm();
            }
        }
    }, [isOpen, editingTrip]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        setUseUrl(false);
        setCoverPreview(URL.createObjectURL(file));
    };

    const addTag = () => {
        const tag = tagInput.trim().replace(/^#/, '');
        if (tag && !hashtags.includes(tag)) {
            setHashtags(prev => [...prev, tag]);
        }
        setTagInput('');
    };

    const removeTag = (tag: string) => setHashtags(prev => prev.filter(t => t !== tag));

    const addParticipant = () => {
        const name = participantInput.trim();
        if (name && !participants.includes(name)) {
            setParticipants(prev => [...prev, name]);
        }
        setParticipantInput('');
    };

    const removeParticipant = (name: string) => setParticipants(prev => prev.filter(p => p !== name));

    const uploadCover = async (file: File): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const ext = file.name.split('.').pop();
        const path = `trip-covers/${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('planner-assets').upload(path, file, { upsert: true });
        if (error) { console.error(error); return null; }
        const { data } = supabase.storage.from('planner-assets').getPublicUrl(path);
        return data.publicUrl;
    };

    const resetForm = () => {
        setTitle(''); setDescription(''); setLocation('');
        setStartDate(''); setEndDate(''); setHashtags([]);
        setParticipants([]); setParticipantInput('');
        setTagInput(''); setCoverFile(null); setCoverUrlInput(''); setUseUrl(false);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverPreview(null);
    };

    const generateSlug = (text: string) => {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setIsSaving(true);
        try {
            console.log('[CreateTripModal] Starting submission...', { title, location, hashtags });
            let cover_url = editingTrip?.cover_url || null;
            if (useUrl && coverUrlInput.trim()) {
                cover_url = coverUrlInput.trim();
            } else if (coverFile) {
                const url = await uploadCover(coverFile);
                if (url) cover_url = url;
            }

            const tripData = {
                title: title.trim(),
                slug: generateSlug(title.trim()) || `trip-${Date.now()}`,
                description: description.trim() || null,
                location: location.trim() || null,
                start_date: startDate || null,
                end_date: endDate || null,
                hashtags: hashtags || [],
                participants: participants || [],
                cover_url: cover_url,
                is_archived: editingTrip?.is_archived ?? false,
            };

            console.log('[CreateTripModal] Sending data to store:', tripData);

            if (editingTrip) {
                await updateTrip(editingTrip.id, tripData);
                onClose();
            } else {
                const trip = await createTrip(tripData);
                console.log('[CreateTripModal] Trip created successfully:', trip);
                if (trip?.slug) {
                    navigate(`/trips/${trip.slug}`);
                    onClose();
                } else {
                    onClose();
                }
            }
        } catch (err: any) {
            console.error('[CreateTripModal] error:', err);
            alert(`Failed to save adventure: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Cover Image Area */}
                <div className="flex flex-col gap-2 p-6 bg-gray-50 rounded-t-3xl border-b border-gray-100">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <button
                            type="button"
                            onClick={() => setUseUrl(false)}
                            className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${!useUrl ? 'bg-white text-teal-600 shadow-sm border border-teal-100' : 'text-gray-400 hover:text-gray-600 bg-transparent'}`}
                        >
                            Upload File
                        </button>
                        <button
                            type="button"
                            onClick={() => setUseUrl(true)}
                            className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${useUrl ? 'bg-white text-teal-600 shadow-sm border border-teal-100' : 'text-gray-400 hover:text-gray-600 bg-transparent'}`}
                        >
                            Use URL
                        </button>
                    </div>

                    {!useUrl ? (
                        <div
                            className="relative h-32 bg-white rounded-2xl border-2 border-dashed border-teal-200 flex flex-col items-center justify-center cursor-pointer group/upload hover:border-teal-400 hover:bg-teal-50 transition-all shadow-sm"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {coverPreview && !useUrl ? (
                                <img src={coverPreview} alt="cover" className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <>
                                    <ImageIcon size={24} className="text-teal-300 group-hover/upload:scale-110 transition-transform mb-2" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-teal-400">Choose Image File</span>
                                </>
                            )}
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm relative h-32 flex flex-col justify-center">
                            {coverPreview && useUrl && (
                                <img src={coverPreview} alt="cover" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-40 pointer-events-none" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            )}
                            <div className="flex items-center gap-3 relative z-10 bg-white/80 p-3 rounded-xl backdrop-blur-sm border border-gray-100">
                                <ImageIcon size={18} className="text-teal-500" />
                                <input
                                    type="url"
                                    value={coverUrlInput}
                                    onChange={(e) => {
                                        setCoverUrlInput(e.target.value);
                                        setCoverPreview(e.target.value);
                                    }}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-gray-800 placeholder-gray-400 outline-none"
                                    placeholder="Paste image URL here..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8">
                    <button onClick={onClose} className="absolute top-5 right-5 p-2 text-white/80 hover:text-white bg-black/20 rounded-full transition-colors backdrop-blur-sm">
                        <X size={18} />
                    </button>

                    <h2 className="text-3xl font-black text-gray-900 mb-8 tracking-tight flex items-center gap-3">
                        <Compass size={28} className="text-teal-500" />
                        {editingTrip ? 'Edit Adventure' : 'New Adventure'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full text-2xl font-black border-none border-b-2 border-gray-100 focus:border-teal-500 focus:ring-0 px-0 py-2 placeholder-gray-200 outline-none transition-all"
                                placeholder="What's the adventure called?"
                                autoFocus
                            />
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                            <MapPin size={18} className="text-rose-400 flex-shrink-0" />
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 placeholder-gray-300 outline-none"
                                placeholder="Destination (e.g. Tokyo, Japan)"
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Departure</label>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
                                    <Calendar size={16} className="text-teal-400" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Return</label>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
                                    <Calendar size={16} className="text-indigo-400" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 placeholder-gray-300 border-none focus:ring-2 focus:ring-teal-500/30 outline-none resize-none transition-all"
                                placeholder="What's this trip about? Any special plans?"
                            />
                        </div>

                        {/* Hashtags */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Tags</label>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 flex-1">
                                    <Hash size={16} className="text-gray-300" />
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 placeholder-gray-300 outline-none"
                                        placeholder="Add a tag and press Enter..."
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addTag}
                                    className="p-3 bg-teal-100 text-teal-600 rounded-2xl hover:bg-teal-200 transition-all"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            {hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {hashtags.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="flex items-center gap-1.5 text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all group"
                                        >
                                            #{tag}
                                            <X size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Participants */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Participants</label>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 flex-1">
                                    <Plus size={16} className="text-gray-300" />
                                    <input
                                        type="text"
                                        value={participantInput}
                                        onChange={e => setParticipantInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addParticipant(); } }}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 placeholder-gray-300 outline-none"
                                        placeholder="Add traveler name..."
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addParticipant}
                                    className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl hover:bg-indigo-200 transition-all"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            {participants.length > 0 && (
                                <div className="flex flex-wrap gap-2 text-indigo-600">
                                    {participants.map(name => (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => removeParticipant(name)}
                                            className="flex items-center gap-1.5 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all group"
                                        >
                                            {name}
                                            <X size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
                            <button
                                type="button"
                                onClick={() => { resetForm(); onClose(); }}
                                className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !title.trim()}
                                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-black shadow-lg shadow-teal-100 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {isSaving ? (editingTrip ? 'Updating...' : 'Creating...') : (editingTrip ? 'Save Changes' : 'Start Adventure')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateTripModal;
