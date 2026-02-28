import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlannerStore } from '../../store/plannerStore';
import { CheckSquare, Plane, Sparkles, BookOpen, Clock, Image as ImageIcon, Edit3, Check, X, Link as LinkIcon, StickyNote, AlertTriangle } from 'lucide-react';
import './HomePage.css';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const userProfile = usePlannerStore(state => state.userProfile);
    const globalHeroConfig = usePlannerStore(state => state.globalHeroConfig);
    const updateHeroImage = usePlannerStore(state => state.updateHeroImage);
    const updateHeroImageUrl = usePlannerStore(state => state.updateHeroImageUrl);
    const updateHeroText = usePlannerStore(state => state.updateHeroText);
    const updateHomeBoxImageUrl = usePlannerStore(state => state.updateHomeBoxImageUrl);
    const userStats = usePlannerStore(state => state.userStats);
    const fetchUserStats = usePlannerStore(state => state.fetchUserStats);
    const isAdmin = userProfile?.role === 'admin';
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchUserStats();
    }, [fetchUserStats]);

    // 800MB in bytes
    const STORAGE_LIMIT = 800 * 1024 * 1024;
    const isOverStorageLimit = (userStats?.totalSize || 0) > STORAGE_LIMIT;

    const firstName = userProfile?.full_name?.split(' ')[0] || '';

    // Hero Data from store (using globally applied config)
    const heroData = globalHeroConfig?.['home'];
    const currentHeroUrl = typeof heroData === 'string' ? heroData : (heroData?.imageUrl || '');
    const displayTitle = (heroData && typeof heroData === 'object' && heroData.title) ? heroData.title : 'Organize your Ideas and Life events.';
    const displaySubtitle = (heroData && typeof heroData === 'object' && heroData.subtitle) ? heroData.subtitle : 'A seamless digital workspace designed to help you capture thoughts, structure your goals, and document your journey.';

    const [isEditing, setIsEditing] = useState(false);
    const [isEditingBg, setIsEditingBg] = useState(false);
    const [tempBgUrl, setTempBgUrl] = useState(currentHeroUrl || '');
    const [tempTitle, setTempTitle] = useState(displayTitle);
    const [tempSubtitle, setTempSubtitle] = useState(displaySubtitle);

    const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
    const [tempBoxUrl, setTempBoxUrl] = useState('');
    const boxFileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTempTitle(displayTitle);
        setTempSubtitle(displaySubtitle);
        setTempBgUrl(currentHeroUrl || '');
    }, [displayTitle, displaySubtitle, currentHeroUrl]);

    const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                await updateHeroImage('home', file);
                setIsEditingBg(false);
            } catch (error) {
                console.error("Failed to update home hero", error);
                alert("Failed to update cover.");
            }
        }
    };

    const handleSaveBgUrl = async () => {
        try {
            await updateHeroImageUrl('home', tempBgUrl);
            setIsEditingBg(false);
        } catch (error) {
            console.error("Failed to update hero URL", error);
            alert("Failed to update cover image.");
        }
    };

    const handleSaveText = async () => {
        try {
            await updateHeroText('home', { title: tempTitle, subtitle: tempSubtitle });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update home hero text", error);
            alert("Failed to save changes.");
        }
    };

    const handleBoxImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && editingBoxId) {
            try {
                // We use updateHeroImage because it handles storage upload and returns the URL.
                // However, updateHeroImage is hardcoded to use hero_config[pageKey].
                // Let's reuse updateHeroImage but we might need a generic one or just use it as is if it fits.
                // Actually updateHeroImage in plannerStore.ts takes 'page' as first arg.
                // It will store it in hero_config[page]. This is exactly what we want for boxes if we use 'home_box_' + id.
                await updateHeroImage(`home_box_${editingBoxId}`, file);
                setEditingBoxId(null);
            } catch (error) {
                console.error("Failed to upload box image", error);
                alert("Failed to update image.");
            }
        }
    };

    const handleSaveBoxUrl = async () => {
        if (!editingBoxId) return;
        try {
            await updateHomeBoxImageUrl(editingBoxId, tempBoxUrl);
            setEditingBoxId(null);
        } catch (error) {
            console.error("Failed to update box URL", error);
            alert("Failed to update image.");
        }
    };

    const categories = [
        {
            id: 'planners',
            title: 'Digital Planners',
            description: 'Organize your notebooks, journals, and dedicated planners.',
            icon: <BookOpen size={32} />,
            color: 'from-blue-500 to-indigo-600',
            path: '/planners',
            active: true
        },
        {
            id: 'tasks',
            title: 'Tasks & Rituals',
            description: 'Stay on top of your daily goals and habits.',
            icon: <CheckSquare size={32} />,
            color: 'from-violet-500 to-purple-600',
            path: '/tasks',
            active: true
        },
        {
            id: 'trips',
            title: 'Adventure Trips',
            description: 'Plan your next journey and track your travel memories.',
            icon: <Plane size={32} />,
            color: 'from-emerald-500 to-teal-600',
            path: '/trips',
            active: true
        },
        {
            id: 'cards',
            title: 'Recursive Cards',
            description: 'Capture, link, and nest your ideas in a recursive knowledge base.',
            icon: <StickyNote size={32} />,
            color: 'from-amber-400 to-orange-500',
            path: '/cards',
            active: true
        }
    ];

    return (
        <div className="home-container">
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleHeroImageUpload}
            />

            <input
                type="file"
                ref={boxFileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleBoxImageUpload}
            />

            {/* Hero Section */}
            <section className="home-hero overflow-hidden relative group/hero min-h-[500px] flex items-center">
                {currentHeroUrl && (
                    <img
                        src={currentHeroUrl}
                        alt="Hero Background"
                        referrerPolicy="no-referrer"
                        className="hero-background-image absolute inset-0 w-full h-full object-cover opacity-60 z-0"
                    />
                )}
                <div className="hero-blur-blobs">
                    <div className="blob blob-1"></div>
                    <div className="blob blob-2"></div>
                </div>

                <div className="hero-content relative z-10 w-full">
                    {isEditing ? (
                        <div className="max-w-4xl animate-in fade-in zoom-in duration-300">
                            <div className="welcome-tag mb-4">
                                <Sparkles size={14} className="text-amber-400" />
                                <span>Editing Home Hero</span>
                            </div>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={tempTitle}
                                    onChange={(e) => setTempTitle(e.target.value)}
                                    className="w-full text-left text-5xl font-black tracking-tighter bg-slate-100/80 backdrop-blur-md border-2 border-slate-200 rounded-2xl p-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
                                    placeholder="Hero Title"
                                    autoFocus
                                />
                                <textarea
                                    value={tempSubtitle}
                                    onChange={(e) => setTempSubtitle(e.target.value)}
                                    className="w-full text-left text-lg font-medium bg-slate-100/80 backdrop-blur-md border-2 border-slate-200 rounded-2xl p-6 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all resize-none h-32"
                                    placeholder="Hero subtitle or description..."
                                />
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleSaveText}
                                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl"
                                    >
                                        <Check size={20} /> Save Changes
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <X size={20} /> Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-center mb-8">
                                <img
                                    src="/nexus_logo.png"
                                    alt="Zoabi Nexus Vault"
                                    className="h-32 md:h-48 drop-shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 rounded-3xl"
                                />
                            </div>
                            <div className="welcome-tag">
                                <Sparkles size={14} className="text-indigo-500" />
                                <span>Curating your digital path{firstName ? `, ${firstName}` : ''}</span>
                            </div>
                            <h1 className="hero-title">
                                {displayTitle.split(' ').map((word, i) => (
                                    <span key={i} className={['Ideas', 'Life', 'events.', 'journey.'].includes(word.replace(/[.,]/g, '')) ? 'gradient-text' : ''}>
                                        {word}{' '}
                                    </span>
                                ))}
                            </h1>
                            <p className="hero-subtitle">
                                {displaySubtitle}
                            </p>

                            {isEditingBg ? (
                                <div className="max-w-md animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                                    <div className="relative">
                                        <LinkIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={tempBgUrl}
                                            onChange={(e) => setTempBgUrl(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-100/80 backdrop-blur-md border-2 border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all font-mono text-sm"
                                            placeholder="Paste image URL here..."
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveBgUrl}
                                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg text-sm"
                                        >
                                            <Check size={16} /> Apply URL
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
                                        >
                                            <ImageIcon size={16} /> Upload Image
                                        </button>
                                        <button
                                            onClick={() => setIsEditingBg(false)}
                                            className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : isAdmin ? (
                                <div className="flex items-center gap-3 mt-10 opacity-0 group-hover/hero:opacity-100 transition-all translate-y-4 group-hover/hero:translate-y-0 duration-300">
                                    <button
                                        className="px-5 py-2.5 bg-slate-900/10 backdrop-blur-md border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-800 hover:bg-slate-900/20 transition-all flex items-center gap-2"
                                        onClick={() => setIsEditingBg(true)}
                                    >
                                        <ImageIcon size={14} /> Change Cover
                                    </button>
                                    <button
                                        className="px-5 py-2.5 bg-slate-900/10 backdrop-blur-md border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-800 hover:bg-slate-900/20 transition-all flex items-center gap-2"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <Edit3 size={14} /> Edit Content
                                    </button>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </section>

            {/* Navigation Grid */}
            <section className="nav-grid-section">
                <div className="section-header">
                    <h2 className="section-title">Your Workspace</h2>
                    <div className="current-time">
                        <Clock size={14} />
                        <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                    </div>
                </div>

                {isOverStorageLimit && (
                    <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-2 bg-amber-100 rounded-xl">
                            <AlertTriangle size={20} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide mb-1">Storage Warning</h4>
                            <p className="text-sm text-amber-800 leading-relaxed">
                                You are using <strong>{(userStats!.totalSize / (1024 * 1024)).toFixed(1)}MB</strong> of storage.
                                We suggest moving your heavy files (PDFs, Images) to the <strong>Google Drive Vault</strong> to save space and keep the app fast.
                            </p>
                            <button
                                onClick={() => navigate('/settings')}
                                className="mt-3 text-xs font-bold text-amber-900 underline underline-offset-4 hover:text-amber-700 transition-colors"
                            >
                                Open Storage Settings →
                            </button>
                        </div>
                    </div>
                )}

                <div className="home-nav-grid">
                    {categories.map((cat) => {
                        const boxData = globalHeroConfig?.[`home_box_${cat.id}`];
                        const boxImg = typeof boxData === 'object' ? boxData?.imageUrl : null;

                        return (
                            <div
                                key={cat.id}
                                className={`nav-card group ${!cat.active ? 'disabled' : ''} ${editingBoxId === cat.id ? 'is-editing' : ''}`}
                                onClick={() => !editingBoxId && cat.active && navigate(cat.path)}
                            >
                                {editingBoxId === cat.id ? (
                                    <div className="box-edit-overlay p-6 flex flex-col gap-3 bg-slate-900/90 backdrop-blur-xl absolute inset-0 z-30 animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Customize Appearance</span>
                                            <button onClick={() => setEditingBoxId(null)} className="text-white/50 hover:text-white transition-colors"><X size={18} /></button>
                                        </div>
                                        <div className="relative">
                                            <LinkIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input
                                                value={tempBoxUrl}
                                                onChange={(e) => setTempBoxUrl(e.target.value)}
                                                placeholder="Enter image URL..."
                                                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-400 placeholder:text-white/30"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <button
                                                onClick={() => boxFileInputRef.current?.click()}
                                                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10"
                                            >
                                                <ImageIcon size={14} /> Upload
                                            </button>
                                            <button
                                                onClick={handleSaveBoxUrl}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <Check size={14} /> Save
                                            </button>
                                        </div>
                                        {boxImg && (
                                            <button
                                                onClick={() => updateHomeBoxImageUrl(cat.id, null)}
                                                className="mt-4 text-[10px] font-bold text-rose-400 uppercase tracking-widest hover:text-rose-300 transition-colors mx-auto"
                                            >
                                                Reset to Default Icon
                                            </button>
                                        )}
                                    </div>
                                ) : isAdmin ? (
                                    <button
                                        className="box-edit-btn opacity-0 group-hover:opacity-100 absolute top-6 right-6 z-20 p-2.5 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl text-slate-900 transition-all duration-300 shadow-xl hover:scale-110"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingBoxId(cat.id);
                                            setTempBoxUrl(boxImg || '');
                                        }}
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                ) : null}

                                <div className="card-visual">
                                    <div className={`visual-surface ${boxImg ? 'has-image' : `bg-gradient-to-br ${cat.color}`}`}>
                                        {boxImg ? (
                                            <img src={boxImg} alt={cat.title} referrerPolicy="no-referrer" className="card-main-image" />
                                        ) : (
                                            <div className="icon-wrapper">
                                                {cat.icon}
                                            </div>
                                        )}
                                        <div className="visual-overlay" />
                                    </div>
                                </div>

                                <div className="card-info">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="card-title-new">{cat.title}</h3>
                                        <div className="arrow-badge">
                                            <Sparkles size={14} />
                                        </div>
                                    </div>
                                    <p className="card-description-new">{cat.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Footer Insights */}
            <footer className="home-footer">
                <p>&copy; 2026 ZOABI Nexus Vault. Beautifully organized workspace.</p>
            </footer>
        </div>
    );
};

export default HomePage;
