import React, { useState, useRef } from 'react';
import { useTripStore } from '../../store/tripStore';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Hash, Image as ImageIcon, Save, Loader2, Pencil, X, FileText, Plus, Trash2 } from 'lucide-react';

interface TripDetailsTabProps {
    tripId: string;
}

const TripDetailsTab: React.FC<TripDetailsTabProps> = ({ tripId }) => {
    const { activeTrip, activeTripExpenses, updateTrip, deleteTrip, userRole } = useTripStore();
    const isViewer = userRole === 'viewer';
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editable state (initialized from activeTrip)
    const [title, setTitle] = useState(activeTrip?.title || '');
    const [description, setDescription] = useState(activeTrip?.description || '');
    const [location, setLocation] = useState(activeTrip?.location || '');
    const [startDate, setStartDate] = useState(activeTrip?.start_date || '');
    const [endDate, setEndDate] = useState(activeTrip?.end_date || '');
    const [hashtags, setHashtags] = useState<string[]>(activeTrip?.hashtags || []);
    const [tagInput, setTagInput] = useState('');
    const [participants, setParticipants] = useState<string[]>(activeTrip?.participants || []);
    const [participantInput, setParticipantInput] = useState('');
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverUrl, setCoverUrl] = useState(activeTrip?.cover_url || '');

    if (!activeTrip) return null;

    const startEdit = () => {
        setTitle(activeTrip.title);
        setDescription(activeTrip.description || '');
        setLocation(activeTrip.location || '');
        setStartDate(activeTrip.start_date || '');
        setEndDate(activeTrip.end_date || '');
        setHashtags(activeTrip.hashtags || []);
        setParticipants(activeTrip.participants || []);
        setCoverPreview(null);
        setCoverFile(null);
        setCoverUrl(activeTrip.cover_url || '');
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setCoverFile(null);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverPreview(null);
        setIsEditing(false);
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const uploadCover = async (file: File): Promise<string | null> => {
        try {
            const { uploadFileToDrive, signIn, checkIsSignedIn } = await import('../../lib/googleDrive');
            if (!checkIsSignedIn()) await signIn();
            const result = await uploadFileToDrive(file, `trip-cover-${Date.now()}`, file.type, true, undefined, 'Trip Covers');
            return result.url;
        } catch (err) {
            console.error('[TripDetailsTab] Cover upload error:', err);
            return null;
        }
    };

    const addTag = () => {
        const tag = tagInput.trim().replace(/^#/, '');
        if (tag && !hashtags.includes(tag)) setHashtags(prev => [...prev, tag]);
        setTagInput('');
    };

    const addParticipant = () => {
        const name = participantInput.trim();
        if (name && !participants.includes(name)) setParticipants(prev => [...prev, name]);
        setParticipantInput('');
    };

    const generateSlug = (text: string) => {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const newSlug = generateSlug(title.trim()) || activeTrip.slug;
            let updates: any = {
                title: title.trim(),
                slug: newSlug,
                description: description.trim() || null,
                location: location.trim() || null,
                start_date: startDate || null,
                end_date: endDate || null,
                hashtags,
                participants,
                cover_url: coverUrl || null,
            };
            if (coverFile) {
                const url = await uploadCover(coverFile);
                if (url) updates.cover_url = url;
            }
            await updateTrip(tripId, updates);
            setIsEditing(false);
            setCoverFile(null);
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            setCoverPreview(null);

            // If the slug changed, update the URL
            if (newSlug !== activeTrip.slug) {
                navigate(`/trips/${newSlug}`, { replace: true });
            }
        } catch (err) {
            console.error('[TripDetailsTab] save error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const currentCover = coverPreview || coverUrl || activeTrip.cover_url;

    // Duration
    const getDuration = () => {
        if (!activeTrip.start_date || !activeTrip.end_date) return null;
        const diff = new Date(activeTrip.end_date).getTime() - new Date(activeTrip.start_date).getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
        return days;
    };
    const duration = getDuration();

    return (
        <div className="h-full overflow-y-auto p-8 bg-gray-50/30">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Trip Details</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Manage your adventure settings</p>
                    </div>
                    {!isEditing ? (
                        !isViewer && (
                            <button
                                onClick={startEdit}
                                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-100"
                            >
                                <Pencil size={14} /> Edit Details
                            </button>
                        )
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={cancelEdit}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                                <X size={14} /> Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left Column: Visuals & Core Info */}
                    <div className="space-y-8">
                        {/* Cover Photo Card */}
                        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                            <div
                                className={`relative h-64 ${isEditing ? 'cursor-pointer group' : ''}`}
                                onClick={() => isEditing && fileInputRef.current?.click()}
                            >
                                {currentCover ? (
                                    <img src={currentCover} alt={activeTrip.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-teal-100 to-indigo-100 flex items-center justify-center">
                                        <ImageIcon size={64} className="text-teal-200" />
                                    </div>
                                )}
                                {isEditing && (
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-sm font-black bg-black/40 px-5 py-2.5 rounded-2xl backdrop-blur-sm">
                                            Change Cover Photo
                                        </span>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleCoverChange} />
                            </div>
                        </div>

                        {/* Cover URL Input when Editing */}
                        {isEditing && (
                            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <ImageIcon size={12} className="text-indigo-400" /> Image URL
                                </label>
                                <input
                                    type="text"
                                    value={coverUrl}
                                    onChange={e => {
                                        setCoverUrl(e.target.value);
                                        setCoverPreview(null);
                                        setCoverFile(null);
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm font-bold text-gray-700 border-none focus:ring-2 focus:ring-teal-500/30 outline-none"
                                    placeholder="Paste an image URL here, or click the cover above to upload..."
                                />
                            </div>
                        )}

                        {/* Core Info Card */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Adventure Info</h3>

                            {/* Title */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Trip Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-lg font-black text-gray-900 border-none focus:ring-2 focus:ring-teal-500/30 outline-none"
                                    />
                                ) : (
                                    <p className="text-2xl font-black text-gray-900">{activeTrip.title}</p>
                                )}
                            </div>

                            {/* Location */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <MapPin size={12} className="text-rose-400" /> Destination
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm font-bold text-gray-700 border-none focus:ring-2 focus:ring-teal-500/30 outline-none"
                                        placeholder="Where is this adventure taking you?"
                                    />
                                ) : (
                                    <p className="text-sm font-bold text-gray-700">{activeTrip.location || <span className="text-gray-300">No location set</span>}</p>
                                )}
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Calendar size={12} className="text-teal-400" /> Departure
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm font-bold text-gray-700 border-none focus:ring-2 focus:ring-teal-500/30 outline-none"
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-gray-700">
                                            {activeTrip.start_date ? new Date(activeTrip.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : <span className="text-gray-300">Not set</span>}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Calendar size={12} className="text-indigo-400" /> Return
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm font-bold text-gray-700 border-none focus:ring-2 focus:ring-teal-500/30 outline-none"
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-gray-700">
                                            {activeTrip.end_date ? new Date(activeTrip.end_date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : <span className="text-gray-300">Not set</span>}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Duration Badge */}
                            {duration && !isEditing && (
                                <div className="flex items-center gap-2 bg-teal-50 px-4 py-3 rounded-2xl w-fit">
                                    <span className="text-2xl font-black text-teal-600">{duration}</span>
                                    <span className="text-xs font-black text-teal-500 uppercase tracking-widest">day{duration !== 1 ? 's' : ''} of adventure</span>
                                </div>
                            )}
                        </div>

                        {/* Description Card */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <FileText size={12} /> Trip Description
                            </h3>
                            {isEditing ? (
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm font-medium text-gray-700 placeholder-gray-300 border-none focus:ring-2 focus:ring-teal-500/30 outline-none resize-none"
                                    placeholder="Describe this adventure... What are you looking forward to?"
                                />
                            ) : activeTrip.description ? (
                                <p className="text-sm font-medium text-gray-700 leading-relaxed">{activeTrip.description}</p>
                            ) : (
                                <p className="text-sm text-gray-300 italic">No description yet. Click "Edit Details" to add one.</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Tags, Travelers & Stats */}
                    <div className="space-y-8">
                        {/* Hashtags Card */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Hash size={12} /> Tags
                            </h3>

                            {isEditing && (
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                        className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-bold placeholder-gray-300 border-none focus:ring-2 focus:ring-teal-500/30 outline-none"
                                        placeholder="#addtag..."
                                    />
                                    <button
                                        type="button"
                                        onClick={addTag}
                                        className="px-4 py-2.5 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-100 transition-all"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {(isEditing ? hashtags : (activeTrip.hashtags || [])).map(tag => (
                                    <span
                                        key={tag}
                                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${isEditing ? 'bg-teal-50 text-teal-600' : 'bg-gray-50 text-gray-600'}`}
                                    >
                                        #{tag}
                                        {isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => setHashtags(prev => prev.filter(t => t !== tag))}
                                                className="text-teal-300 hover:text-red-400 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </span>
                                ))}
                                {(!isEditing && (!activeTrip.hashtags || activeTrip.hashtags.length === 0)) && (
                                    <span className="text-sm text-gray-300 italic">No tags yet.</span>
                                )}
                            </div>
                        </div>

                        {/* Travelers Card */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Plus size={12} className="text-indigo-400" /> Travelers
                            </h3>

                            {isEditing && (
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={participantInput}
                                        onChange={e => setParticipantInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addParticipant(); } }}
                                        className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-bold placeholder-gray-300 border-none focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                        placeholder="Add traveler name..."
                                    />
                                    <button
                                        type="button"
                                        onClick={addParticipant}
                                        className="px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {(isEditing ? participants : (activeTrip.participants || [])).map(name => (
                                    <span
                                        key={name}
                                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${isEditing ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-600'}`}
                                    >
                                        {name}
                                        {isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => setParticipants(prev => prev.filter(p => p !== name))}
                                                className="text-indigo-300 hover:text-red-400 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </span>
                                ))}
                                {(!isEditing && (!activeTrip.participants || activeTrip.participants.length === 0)) && (
                                    <span className="text-sm text-gray-300 italic">No travelers added yet.</span>
                                )}
                            </div>
                        </div>

                        {/* Spending Summary Card */}
                        {!isEditing && (
                            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        Spending Summary
                                    </h3>
                                    <div className="px-3 py-1 bg-rose-50 rounded-full">
                                        <span className="text-[10px] font-black text-rose-500 uppercase">
                                            Total: ${activeTripExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {Object.entries(
                                        activeTripExpenses.reduce((acc, exp) => {
                                            acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
                                            return acc;
                                        }, {} as Record<string, number>)
                                    )
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([cat, amount]) => {
                                            const total = activeTripExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
                                            const pct = total > 0 ? (amount / total) * 100 : 0;
                                            return (
                                                <div key={cat} className="group">
                                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                                        <span className="text-gray-600">{cat}</span>
                                                        <span className="text-gray-900">${amount.toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    {activeTripExpenses.length === 0 && (
                                        <p className="text-xs text-gray-400 italic">No expenses recorded yet.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Danger Zone */}
                        {!isViewer && (
                            <div className="bg-white rounded-3xl p-8 border border-rose-100 shadow-sm">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-4 flex items-center gap-2">
                                    <Trash2 size={12} /> Danger Zone
                                </h3>
                                <p className="text-xs font-medium text-gray-400 mb-4">Deleting a trip is permanent and cannot be undone. All stops and expenses will be removed.</p>
                                <button
                                    className="px-5 py-2.5 bg-rose-50 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                    onClick={async () => {
                                        if (confirm('Are you sure? This will permanently delete this trip and all associated data.')) {
                                            try {
                                                await deleteTrip(tripId);
                                                navigate('/trips');
                                            } catch (err) {
                                                console.error('[TripDetailsTab] delete error:', err);
                                            }
                                        }
                                    }}
                                >
                                    Delete This Trip
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripDetailsTab;
