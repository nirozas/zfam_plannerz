import React, { useRef, useState, useEffect } from 'react';
import { Image as ImageIcon, Edit3, Check, X, Link as LinkIcon } from 'lucide-react';
import { usePlannerStore } from '../../store/plannerStore';

interface PageHeroProps {
    pageKey: string;
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    compact?: boolean;
}

const PageHero: React.FC<PageHeroProps> = ({ pageKey, title, subtitle, children, compact }) => {
    const { userProfile, globalHeroConfig, updateHeroImage, updateHeroImageUrl, updateHeroText } = usePlannerStore();
    const isAdmin = userProfile?.role === 'admin';
    const fileInputRef = useRef<HTMLInputElement>(null);

    const heroData = globalHeroConfig?.[pageKey];
    const currentHeroUrl = typeof heroData === 'string' ? heroData : (heroData?.imageUrl || '');
    const displayTitle = (heroData && typeof heroData === 'object' && heroData.title) ? heroData.title : title;
    const displaySubtitle = (heroData && typeof heroData === 'object' && heroData.subtitle) ? heroData.subtitle : subtitle;

    const [isEditing, setIsEditing] = useState(false);
    const [isEditingBg, setIsEditingBg] = useState(false);
    const [tempBgUrl, setTempBgUrl] = useState(currentHeroUrl || '');
    const [tempTitle, setTempTitle] = useState(displayTitle);
    const [tempSubtitle, setTempSubtitle] = useState(displaySubtitle || '');

    // Sync temp state when display data changes (e.g. from store)
    useEffect(() => {
        setTempTitle(displayTitle);
        setTempSubtitle(displaySubtitle || '');
        setTempBgUrl(currentHeroUrl || '');
    }, [displayTitle, displaySubtitle, currentHeroUrl]);

    const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                await updateHeroImage(pageKey, file);
                setIsEditingBg(false);
            } catch (error) {
                console.error(`Failed to update hero for ${pageKey}`, error);
                alert("Failed to update cover image.");
            }
        }
    };

    const handleSaveBgUrl = async () => {
        try {
            await updateHeroImageUrl(pageKey, tempBgUrl);
            setIsEditingBg(false);
        } catch (error) {
            console.error("Failed to update hero URL", error);
            alert("Failed to update cover image.");
        }
    };

    const handleSaveText = async () => {
        try {
            await updateHeroText(pageKey, { title: tempTitle, subtitle: tempSubtitle });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update hero text", error);
            alert("Failed to save changes.");
        }
    };

    return (
        <section className={`relative w-full ${compact ? 'h-24 md:h-32' : 'h-40 md:h-64'} flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-b border-gray-100 shrink-0 group/hero`}>
            {currentHeroUrl && (
                <img
                    src={currentHeroUrl}
                    alt="Hero Background"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                />
            )}

            {/* Overlay for better text readability */}
            {currentHeroUrl && <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-0"></div>}

            <div className="relative z-10 text-center px-4 md:px-6 w-full max-w-4xl">
                {isEditing ? (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <input
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            className={`w-full text-center ${compact ? 'text-xl md:text-2xl' : 'text-2xl md:text-4xl'} font-black uppercase tracking-tighter bg-slate-100/80 backdrop-blur-md border-2 border-slate-200 rounded-2xl p-3 md:p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all`}
                            placeholder="Page Title"
                            autoFocus
                        />
                        {!compact && (
                            <textarea
                                value={tempSubtitle}
                                onChange={(e) => setTempSubtitle(e.target.value)}
                                className="w-full text-center text-lg font-medium bg-slate-100/80 backdrop-blur-md border-2 border-slate-200 rounded-2xl p-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all resize-none h-24"
                                placeholder="Description..."
                            />
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveText}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg"
                            >
                                <Check size={18} /> Save Changes
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <X size={18} /> Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={`${currentHeroUrl ? 'bg-white/40 backdrop-blur-md p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/40 shadow-2xl shadow-slate-900/10' : ''}`}>
                            <h1 className={`${compact ? 'text-xl md:text-3xl' : 'text-3xl md:text-6xl'} font-black uppercase tracking-tighter ${!compact && 'mb-3 md:mb-6'} text-slate-900`}>
                                {displayTitle}
                            </h1>
                            {displaySubtitle && !compact && (
                                <p className="max-w-2xl mx-auto text-sm md:text-xl font-medium leading-relaxed text-slate-600">
                                    {displaySubtitle}
                                </p>
                            )}
                        </div>

                        {isEditingBg ? (
                            <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300 w-full max-w-md mx-auto">
                                <div className="relative w-full">
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
                                        <ImageIcon size={16} /> Upload
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
                            <div className={`flex items-center justify-center gap-3 ${compact ? 'mt-4' : 'mt-8'} opacity-0 group-hover/hero:opacity-100 transition-all translate-y-4 group-hover/hero:translate-y-0 duration-300`}>
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

                {children}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleHeroImageUpload}
            />
        </section>
    );
};

export default PageHero;
