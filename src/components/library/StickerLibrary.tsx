import { useState } from 'react'
import React from 'react'
import { X, Smile, Plus, Palette } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface StickerLibraryProps {
    isOpen: boolean
    onClose: () => void
    onSelectSticker: (sticker: StickerItem) => void
    onEditSticker?: (sticker: StickerItem) => void
}

export interface StickerItem {
    id: string
    name: string
    icon?: React.ReactNode
    src?: string
    color: string
}

const DEFAULT_STICKERS: StickerItem[] = [
    { id: 'smile', name: 'Smile', icon: <Smile />, color: '#F59E0B' },
    // ... we will keep existing ones as placeholders or convert them if possible.
    // For now support both icon and src.
]



export function StickerLibrary({ isOpen, onClose, onSelectSticker, onEditSticker }: StickerLibraryProps) {
    const [stickers, setStickers] = useState(DEFAULT_STICKERS)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
                if (event.target?.result) {
                    const newSticker: StickerItem = {
                        id: `custom-${Date.now()}`,
                        name: file.name.split('.')[0],
                        src: event.target.result as string,
                        color: '#000000'
                    }
                    setStickers([newSticker, ...stickers])
                    // Optional: Auto-select?
                    // onSelectSticker(newSticker)
                }
            }
            reader.readAsDataURL(file)
        }
    }
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Sticker Library</h2>
                                <p className="text-sm text-gray-600">Click to add to your page</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Stickers Grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full mb-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold text-sm hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus w-4 h-4 /> Upload Sticker
                            </button>
                            <div className="grid grid-cols-3 gap-4">
                                {stickers.map((sticker) => (
                                    <motion.button
                                        key={sticker.id}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onSelectSticker(sticker)}
                                        className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 hover:border-indigo-500 transition-all flex flex-col items-center justify-center gap-2 p-4 relative"
                                    >
                                        {/* Edit Button for Image Stickers */}
                                        {sticker.src && onEditSticker && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditSticker(sticker);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-white shadow-md border border-gray-100 rounded-lg text-indigo-500 hover:text-indigo-600 hover:scale-110 transition-all z-10"
                                                title="Edit Sticker"
                                            >
                                                <Palette size={14} />
                                            </button>
                                        )}

                                        <div style={{ color: sticker.color }} className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-lg">
                                            {sticker.src ? (
                                                <img src={sticker.src} alt={sticker.name} className="w-full h-full object-contain" />
                                            ) : (
                                                sticker.icon
                                            )}
                                        </div>
                                        <span className="text-xs font-medium text-gray-700">{sticker.name}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <p className="text-sm text-gray-600 text-center">
                                More stickers coming soon! 🎨
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
