import { ColorPicker } from './ColorPicker';
import { cn } from '@/lib/utils';
import { Palette, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface BackgroundPanelProps {
    backgroundColor: string;
    onBackgroundColorChange: (color: string) => void;
    onApplyToAll?: (color: string) => void;
}

const backgroundColors = [
    '#FFFFFF', '#FDFCFB', '#F3F4F6', '#FEF3C7', '#DBEAFE', '#D1FAE5', '#FCE7F3', '#E5E7EB', '#1F2937'
];

// Generate 30+ texture patterns using SVG data URIs
const generateTextures = () => {
    const textures = [];

    // Dots patterns (5 variations)
    for (let i = 0; i < 5; i++) {
        const size = 10 + i * 5;
        const spacing = 20 + i * 10;
        textures.push({
            id: `dots-${i}`,
            name: `Dots ${i + 1}`,
            svg: `<svg width="${spacing}" height="${spacing}" xmlns="http://www.w3.org/2000/svg"><circle cx="${spacing / 2}" cy="${spacing / 2}" r="${size / 2}" fill="rgba(0,0,0,0.1)"/></svg>`
        });
    }

    // Grid patterns (5 variations)
    for (let i = 0; i < 5; i++) {
        const size = 20 + i * 10;
        textures.push({
            id: `grid-${i}`,
            name: `Grid ${i + 1}`,
            svg: `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="1"/></svg>`
        });
    }

    // Diagonal lines (5 variations)
    for (let i = 0; i < 5; i++) {
        const size = 15 + i * 5;
        textures.push({
            id: `diagonal-${i}`,
            name: `Lines ${i + 1}`,
            svg: `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><path d="M 0 ${size} L ${size} 0" stroke="rgba(0,0,0,0.1)" stroke-width="1"/></svg>`
        });
    }

    // Waves (5 variations)
    for (let i = 0; i < 5; i++) {
        const amplitude = 5 + i * 2;
        const wavelength = 20 + i * 5;
        textures.push({
            id: `wave-${i}`,
            name: `Wave ${i + 1}`,
            svg: `<svg width="${wavelength}" height="${amplitude * 4}" xmlns="http://www.w3.org/2000/svg"><path d="M 0 ${amplitude * 2} Q ${wavelength / 4} ${amplitude} ${wavelength / 2} ${amplitude * 2} T ${wavelength} ${amplitude * 2}" stroke="rgba(0,0,0,0.1)" fill="none" stroke-width="1"/></svg>`
        });
    }

    // Crosshatch (5 variations)
    for (let i = 0; i < 5; i++) {
        const size = 15 + i * 5;
        textures.push({
            id: `cross-${i}`,
            name: `Cross ${i + 1}`,
            svg: `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><path d="M 0 0 L ${size} ${size} M ${size} 0 L 0 ${size}" stroke="rgba(0,0,0,0.1)" stroke-width="1"/></svg>`
        });
    }

    // Hexagons (5 variations)
    for (let i = 0; i < 5; i++) {
        const size = 20 + i * 5;
        const h = size * Math.sqrt(3) / 2;
        textures.push({
            id: `hex-${i}`,
            name: `Hex ${i + 1}`,
            svg: `<svg width="${size * 1.5}" height="${h * 2}" xmlns="http://www.w3.org/2000/svg"><polygon points="${size / 2},0 ${size},${h / 2} ${size},${h * 1.5} ${size / 2},${h * 2} 0,${h * 1.5} 0,${h / 2}" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="1"/></svg>`
        });
    }

    return textures;
};

const textures = generateTextures();

export function BackgroundPanel({
    backgroundColor,
    onBackgroundColorChange,
    onApplyToAll
}: BackgroundPanelProps) {
    const [activeTab, setActiveTab] = useState<'color' | 'texture'>('color');
    const [selectedTexture, setSelectedTexture] = useState<string | null>(null);

    const handleTextureSelect = (texture: typeof textures[0]) => {
        setSelectedTexture(texture.id);
        const dataUri = `data:image/svg+xml;base64,${btoa(texture.svg)}`;
        onBackgroundColorChange(dataUri);
    };

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4 w-64 animate-in fade-in slide-in-from-top-2 max-h-[80vh] overflow-y-auto">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setActiveTab('color')}
                    className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                        activeTab === 'color'
                            ? "bg-indigo-100 text-indigo-600"
                            : "text-gray-500 hover:bg-gray-50"
                    )}
                >
                    <Palette className="w-3 h-3 inline mr-1" />
                    Colors
                </button>
                <button
                    onClick={() => setActiveTab('texture')}
                    className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                        activeTab === 'texture'
                            ? "bg-indigo-100 text-indigo-600"
                            : "text-gray-500 hover:bg-gray-50"
                    )}
                >
                    <ImageIcon className="w-3 h-3 inline mr-1" />
                    Textures
                </button>
            </div>

            {/* Color Tab */}
            {activeTab === 'color' && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Palette className="w-4 h-4 text-gray-500" />
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Background Color
                        </label>
                    </div>
                    <ColorPicker
                        colors={backgroundColors}
                        selectedColor={backgroundColor || '#FFFFFF'}
                        onColorChange={onBackgroundColorChange}
                    />
                </div>
            )}

            {/* Texture Tab */}
            {activeTab === 'texture' && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4 text-gray-500" />
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Texture Patterns
                        </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                        {textures.map((texture) => (
                            <button
                                key={texture.id}
                                onClick={() => handleTextureSelect(texture)}
                                className={cn(
                                    "aspect-square rounded-lg border-2 transition-all p-2 hover:scale-105",
                                    selectedTexture === texture.id
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                                title={texture.name}
                                style={{
                                    backgroundImage: `url('data:image/svg+xml;base64,${btoa(texture.svg)}')`,
                                    backgroundRepeat: 'repeat',
                                    backgroundSize: 'auto'
                                }}
                            >
                                <span className="sr-only">{texture.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Apply to All Button */}
            {onApplyToAll && (
                <div className="pt-4 border-t border-gray-100">
                    <button
                        onClick={() => onApplyToAll?.(backgroundColor)}
                        className="w-full py-2 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-xs hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Apply to All Pages
                    </button>
                </div>
            )}
        </div>
    );
}
