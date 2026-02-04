import { useState, useEffect } from 'react'
import { X, Search, Star, Loader2, Upload, Calendar, Plus, Hash, Maximize2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlannerStore } from '@/store/plannerStore'
import { PDFUploadTool } from './PDFUploadTool'
import { CalendarGenerator } from './CalendarGenerator'

interface TemplateLibraryProps {
    isOpen: boolean
    onClose: () => void
    onSelectTemplate?: (templateId: string, bulkOptions?: import('@/types/planner').BulkOptions) => void
}

export function TemplateLibrary({ isOpen, onClose, onSelectTemplate }: TemplateLibraryProps) {
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null)
    const [selectedPageSize, setSelectedPageSize] = useState<string>('All')
    const [isBulkSelection, setIsBulkSelection] = useState(false)
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])

    // New Tool States
    const [isPDFUploadOpen, setIsPDFUploadOpen] = useState(false)
    const [isCalendarGenOpen, setIsCalendarGenOpen] = useState(false)

    const {
        libraryAssets,
        isLoadingAssets,
        fetchLibraryAssets,
        libraryCategories,
        addTemplateAsNewPage
    } = usePlannerStore()

    useEffect(() => {
        if (isOpen) {
            fetchLibraryAssets('template');
        }
    }, [isOpen, fetchLibraryAssets])

    const allHashtags = Array.from(new Set(libraryAssets.flatMap(t => (t as any).hashtags || [])))
    const allPageSizes = Array.from(new Set(libraryAssets.map(t => (t as any).page_size || 'A4')))

    const [sortBy, setSortBy] = useState<'Newest' | 'Name' | 'Category'>('Newest')

    const filteredTemplates = libraryAssets.filter((template) => {
        const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory
        const name = template.name || (template as any).title || '';
        const desc = (template as any).description || '';
        const tags = (template as any).hashtags || [];

        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesHashtag = !selectedHashtag || tags.includes(selectedHashtag)
        const matchesPageSize = selectedPageSize === 'All' || (template as any).page_size === selectedPageSize

        return matchesCategory && matchesSearch && matchesHashtag && matchesPageSize
    }).sort((a, b) => {
        if (sortBy === 'Name') return (a.name || (a as any).title || '').localeCompare(b.name || (b as any).title || '');
        if (sortBy === 'Category') return (a.category || '').localeCompare(b.category || '');
        if (sortBy === 'Newest') return new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime();
        return 0;
    })

    const toggleTemplateSelection = (templateId: string) => {
        setSelectedTemplates(prev =>
            prev.includes(templateId)
                ? prev.filter(id => id !== templateId)
                : [...prev, templateId]
        )
    }

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            key="library-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
                        />
                        <motion.div
                            key="library-panel"
                            initial={{ opacity: 0, x: '100%' }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: '100%' }}
                            className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-[70] flex flex-col"
                        >
                            {/* Header */}
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Template Library</h2>
                                    <p className="text-sm text-gray-500 mt-1 font-medium">Design your planner with high-quality layouts</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-3 hover:bg-gray-100 rounded-2xl transition-all active:scale-95 group"
                                >
                                    <X className="w-6 h-6 text-gray-400 group-hover:text-gray-900" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {/* Actions Header */}
                                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
                                    <div className="flex bg-gray-100/50 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
                                        {['All', ...libraryCategories].map((category) => (
                                            <button
                                                key={category}
                                                onClick={() => setSelectedCategory(category)}
                                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${selectedCategory === category
                                                    ? 'bg-white text-indigo-600 shadow-md shadow-indigo-100'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex gap-3 w-full md:w-auto">
                                        <button
                                            onClick={() => setIsPDFUploadOpen(true)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-bold hover:bg-indigo-100 transition-all border border-indigo-100"
                                        >
                                            <Upload className="w-4 h-4" />
                                            <span>Upload PDF</span>
                                        </button>
                                        <button
                                            onClick={() => setIsCalendarGenOpen(true)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-purple-50 text-purple-700 rounded-2xl text-sm font-bold hover:bg-purple-100 transition-all border border-purple-100"
                                        >
                                            <Calendar className="w-4 h-4" />
                                            <span>Generate Calendar</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Search & Filters */}
                                <div className="flex flex-col gap-6 mb-10">
                                    <div className="relative group">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, tags, or description..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-14 pr-6 py-5 bg-white border-2 border-gray-100 rounded-[2.5rem] outline-none focus:border-indigo-500 transition-all text-lg font-medium shadow-sm"
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-4 items-center">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort By</span>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value as any)}
                                                className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
                                            >
                                                <option value="Newest">Newest</option>
                                                <option value="Category">Category</option>
                                                <option value="Name">Name</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                                            <Hash className="w-4 h-4 text-gray-400" />
                                            <select
                                                value={selectedHashtag || 'All'}
                                                onChange={(e) => setSelectedHashtag(e.target.value === 'All' ? null : e.target.value)}
                                                className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                                            >
                                                <option value="All">All Tags</option>
                                                {allHashtags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                                            <Maximize2 className="w-4 h-4 text-gray-400" />
                                            <select
                                                value={selectedPageSize}
                                                onChange={(e) => setSelectedPageSize(e.target.value)}
                                                className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                                            >
                                                <option value="All">All Sizes</option>
                                                {allPageSizes.map(size => <option key={size} value={size}>{size}</option>)}
                                            </select>
                                        </div>

                                        <div className="ml-auto flex items-center gap-4">
                                            <button
                                                onClick={() => setIsBulkSelection(!isBulkSelection)}
                                                className={`text-sm font-bold transition-colors ${isBulkSelection ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {isBulkSelection ? 'Cancel Bulk Selection' : 'Bulk Selection'}
                                            </button>
                                            {isBulkSelection && selectedTemplates.length > 0 && (
                                                <button className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                                                    Import {selectedTemplates.length} Selected
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Templates Grid */}
                                {isLoadingAssets ? (
                                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                                        <div className="relative">
                                            <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
                                            <Star className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-500 fill-indigo-500" />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">Curating layout library...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {filteredTemplates.map((template) => (
                                            <motion.div
                                                layout
                                                key={template.id}
                                                className={`group relative flex flex-col bg-white rounded-[2rem] overflow-hidden border-2 transition-all p-4 ${selectedTemplates.includes(template.id)
                                                    ? 'border-indigo-500 shadow-2xl shadow-indigo-50'
                                                    : 'border-gray-100 hover:border-indigo-200 hover:shadow-xl'
                                                    }`}
                                            >
                                                <div
                                                    className="relative aspect-[3/4] bg-gray-50 rounded-[1.5rem] overflow-hidden mb-5 shadow-inner cursor-pointer"
                                                    onClick={() => {
                                                        if (isBulkSelection) toggleTemplateSelection(template.id)
                                                    }}
                                                >
                                                    <img
                                                        src={template.url || (template as any).preview_url || 'https://images.unsplash.com/photo-1517842645767-c639042777db'}
                                                        alt={template.name}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />

                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onSelectTemplate) {
                                                                    onSelectTemplate(template.id);
                                                                } else {
                                                                    addTemplateAsNewPage(template.id);
                                                                }
                                                            }}
                                                            className="w-full py-4 bg-white text-indigo-700 rounded-2xl text-base font-bold flex items-center justify-center gap-3 shadow-2xl hover:bg-white/95 active:scale-95 transition-all"
                                                        >
                                                            <Plus className="w-6 h-6" />
                                                            Add as New Page
                                                        </button>
                                                    </div>

                                                    <div className="absolute top-4 left-4 flex gap-2">
                                                        <div className="px-4 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl text-[11px] font-bold text-indigo-600 shadow-sm border border-indigo-50">
                                                            {(template as any).page_size || 'A4'}
                                                        </div>
                                                    </div>

                                                    {isBulkSelection && (
                                                        <div className="absolute top-4 right-4">
                                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedTemplates.includes(template.id)
                                                                ? 'bg-indigo-600 border-indigo-600 shadow-lg scale-110'
                                                                : 'bg-white/80 border-gray-200'
                                                                }`}>
                                                                {selectedTemplates.includes(template.id) && <Check className="w-5 h-5 text-white" />}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="px-2">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h4 className="font-bold text-gray-900 line-clamp-1">{template.name || (template as any).title}</h4>
                                                        <span className="shrink-0 ml-4 px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase">{template.category}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {((template as any).hashtags || []).map((tag: string) => (
                                                            <span key={tag} className="text-[10px] font-bold text-indigo-500/70">#{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <PDFUploadTool
                isOpen={isPDFUploadOpen}
                onClose={() => setIsPDFUploadOpen(false)}
                onSuccess={() => fetchLibraryAssets('template')}
            />
            <CalendarGenerator
                isOpen={isCalendarGenOpen}
                onClose={() => setIsCalendarGenOpen(false)}
            />
        </>
    )
}
