import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Palette, BookOpen, Layout, Wand2, GraduationCap, Plus, Trash2, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePlannerStore, slugify } from '../../store/plannerStore';
import { PAGE_PRESETS } from '../../types/planner';
import PlannerCover from './PlannerCover';
import './CreationWizard.css';

interface Props {
    onClose: () => void;
}

const CATEGORIES = [
    { id: 'Productivity', icon: Wand2, label: 'Productivity', desc: 'Daily, Weekly, and Monthly planning.' },
    { id: 'Wellness', icon: Wand2, label: 'Wellness', desc: 'Habits, Mood, and Health tracking.' },
    { id: 'Finance', icon: Wand2, label: 'Finance', desc: 'Budgets, Expenses, and Savings.' },
    { id: 'Academic', icon: GraduationCap, label: 'Academic', desc: 'Schedules, Grades, and Study logs.' },
    { id: 'Lifestyle', icon: Wand2, label: 'Lifestyle', desc: 'Travel, Reading, and Hobbies.' },
    { id: 'Custom', icon: Wand2, label: 'Blank', desc: 'Start with a clean slate.' },
];

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#1f2937'];

interface TemplateSelection {
    assetId: string;
    title: string;
    url: string;
    count: number;
    section: string;
    frequency: 'once' | 'monthly' | 'weekly' | 'daily';
}

const CreationWizard: React.FC<Props> = ({ onClose }) => {
    const { createNewPlanner, fetchLibraryAssets, fetchMultipleLibraryAssets, libraryAssets } = usePlannerStore();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Assets state
    const [covers, setCovers] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        category: 'Productivity',
        color: COLORS[0],
        dimensions: PAGE_PRESETS[0] as typeof PAGE_PRESETS[number],
        coverAsset: null as any | null,
        selectedTemplates: [] as TemplateSelection[]
    });

    useEffect(() => {
        const loadAssets = async () => {
            setIsLoadingAssets(true);
            try {
                // Use the new fetchMultipleLibraryAssets
                await fetchMultipleLibraryAssets(['cover', 'template']);
            } catch (err) {
                console.error("Failed to load assets for wizard:", err);
            } finally {
                setIsLoadingAssets(false);
            }
        };
        loadAssets();
    }, [fetchLibraryAssets]);

    // Update local covers/templates when store changes
    useEffect(() => {
        setCovers(libraryAssets.filter(a => a.type === 'cover'));
        setTemplates(libraryAssets.filter(a => a.type === 'template'));
    }, [libraryAssets]);

    const handleCreate = async () => {
        setIsCreating(true);
        setError(null);
        try {
            const planner = await createNewPlanner(
                formData.name || `${formData.category} Planner`,
                formData.category,
                formData.color,
                {
                    dimensions: {
                        width: formData.dimensions.width,
                        height: formData.dimensions.height,
                        layout: formData.dimensions.layout
                    },
                    coverAssetId: formData.coverAsset?.id,
                    initialTemplates: formData.selectedTemplates.map(t => ({
                        assetId: t.assetId,
                        count: t.count,
                        section: t.section,
                        frequency: t.frequency
                    }))
                }
            );
            onClose();
            if (planner) {
                navigate(`/planner/${slugify(planner.name)}`);
            }
        } catch (err: any) {
            console.error('Creation error:', err);
            setError(err.message || 'Failed to create planner');
        } finally {
            setIsCreating(false);
        }
    };

    const addTemplateChoice = (asset: any) => {
        const exists = formData.selectedTemplates.find(t => t.assetId === asset.id);
        if (exists) return;

        setFormData({
            ...formData,
            selectedTemplates: [
                ...formData.selectedTemplates,
                {
                    assetId: asset.id,
                    title: asset.title,
                    url: asset.url,
                    count: 1,
                    section: 'General',
                    frequency: 'once'
                }
            ]
        });
    };

    const updateTemplateChoice = (index: number, updates: Partial<TemplateSelection>) => {
        const newTemplates = [...formData.selectedTemplates];
        newTemplates[index] = { ...newTemplates[index], ...updates };
        setFormData({ ...formData, selectedTemplates: newTemplates });
    };

    const removeTemplateChoice = (index: number) => {
        const newTemplates = [...formData.selectedTemplates];
        newTemplates.splice(index, 1);
        setFormData({ ...formData, selectedTemplates: newTemplates });
    };

    return (
        <div className="wizard-overlay" onClick={onClose}>
            <motion.div
                className="wizard-container glass-card"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="wizard-sidebar">
                    <div className="wizard-progress">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`progress-step ${step >= i ? 'active' : ''} ${step > i ? 'complete' : ''}`}>
                                <div className="step-number">{step > i ? <Check size={16} /> : i}</div>
                                <div className="step-label">
                                    {i === 1 ? 'Concept' : i === 2 ? 'Style' : i === 3 ? 'Templates' : 'Review'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="wizard-main">
                    <button className="wizard-close" onClick={onClose} disabled={isCreating}><X size={24} /></button>

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="wizard-content"
                            >
                                <h1>Define your concept</h1>
                                <p>What will you be organizing today?</p>

                                <div className="input-group">
                                    <label className="wizard-label">Planner Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter planner name..."
                                        className="wizard-input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="wizard-label">Page Dimensions</label>
                                    <div className="preset-selector">
                                        {PAGE_PRESETS.map(preset => (
                                            <button
                                                key={preset.name}
                                                className={`preset-btn ${formData.dimensions.name === preset.name ? 'active' : ''}`}
                                                onClick={() => setFormData({ ...formData, dimensions: preset })}
                                            >
                                                <strong>{preset.name}</strong>
                                                <span>{preset.width}x{preset.height}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <label className="wizard-label" style={{ marginTop: '1rem' }}>Category</label>
                                <div className="category-selection">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            className={`cat-card ${formData.category === cat.id ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, category: cat.id })}
                                        >
                                            <cat.icon size={24} />
                                            <div className="cat-info">
                                                <strong>{cat.label}</strong>
                                                <span>{cat.desc}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="wizard-content"
                            >
                                <h1>Personalize your cover</h1>
                                <p>Choose a color or a library cover for your planner.</p>

                                <div className="style-layout">
                                    <div className="preview-section">
                                        <div className="preview-container">
                                            {formData.coverAsset ? (
                                                <div className="library-cover-preview">
                                                    <img src={formData.coverAsset.url} alt="Cover Preview" />
                                                    <div className="cover-overlay">
                                                        <h2>{formData.name || 'Your Planner'}</h2>
                                                    </div>
                                                </div>
                                            ) : (
                                                <PlannerCover
                                                    color={formData.color}
                                                    title={formData.name || 'Your Planner'}
                                                    category={formData.category}
                                                />
                                            )}
                                        </div>

                                        <div className="color-grid">
                                            {COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    className={`color-pill ${formData.color === c && !formData.coverAsset ? 'active' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => setFormData({ ...formData, color: c, coverAsset: null })}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="library-section">
                                        <label className="wizard-label">Library Covers</label>
                                        {isLoadingAssets ? (
                                            <div className="loading-assets">Loading covers...</div>
                                        ) : (
                                            <div className="asset-grid mini">
                                                {covers.map(asset => (
                                                    <div
                                                        key={asset.id}
                                                        className={`asset-item ${formData.coverAsset?.id === asset.id ? 'active' : ''}`}
                                                        onClick={() => setFormData({ ...formData, coverAsset: asset })}
                                                    >
                                                        <img src={asset.url} alt={asset.title} />
                                                        <div className="asset-check"><Check size={12} /></div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="wizard-content"
                            >
                                <h1>Template Selection</h1>
                                <p>Add functional pages to your planner.</p>

                                <div className="templates-layout">
                                    <div className="templates-available">
                                        <label className="wizard-label">Available Templates</label>
                                        <div className="asset-grid mini">
                                            {templates.map(asset => (
                                                <div key={asset.id} className="asset-item" onClick={() => addTemplateChoice(asset)}>
                                                    <img src={asset.url} alt={asset.title} title={asset.title} />
                                                    <div className="add-overlay"><Plus size={16} /></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="templates-selected">
                                        <label className="wizard-label">Selected Pages ({formData.selectedTemplates.length})</label>
                                        <div className="selection-list">
                                            {formData.selectedTemplates.length === 0 && (
                                                <div className="empty-selection">No templates selected. Click an image to add.</div>
                                            )}
                                            {formData.selectedTemplates.map((t, idx) => (
                                                <div key={t.assetId} className="selection-card">
                                                    <img src={t.url} alt={t.title} className="card-thumb" />
                                                    <div className="card-controls">
                                                        <div className="card-top">
                                                            <strong>{t.title}</strong>
                                                            <button className="remove-btn" onClick={() => removeTemplateChoice(idx)}><Trash2 size={14} /></button>
                                                        </div>
                                                        <div className="card-options">
                                                            <div className="option-field">
                                                                <span>Qty</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={t.count}
                                                                    onChange={e => updateTemplateChoice(idx, { count: parseInt(e.target.value) || 1 })}
                                                                />
                                                            </div>
                                                            <div className="option-field">
                                                                <span>Section</span>
                                                                <input
                                                                    type="text"
                                                                    value={t.section}
                                                                    onChange={e => updateTemplateChoice(idx, { section: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="option-field">
                                                                <span>Freq</span>
                                                                <select
                                                                    value={t.frequency}
                                                                    onChange={e => updateTemplateChoice(idx, { frequency: e.target.value as any })}
                                                                >
                                                                    <option value="once">Once</option>
                                                                    <option value="monthly">Monthly</option>
                                                                    <option value="weekly">Weekly</option>
                                                                    <option value="daily">Daily</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="wizard-content review-step"
                            >
                                <h1>Ready to build?</h1>
                                <p>Review your planner configuration.</p>

                                {error && <div className="creation-error alert-error">{error}</div>}

                                <div className="review-summary glass-card">
                                    <div className="summary-item">
                                        <BookOpen size={20} />
                                        <div>
                                            <strong>{formData.name || "Main Planner"}</strong>
                                            <span>Name</span>
                                        </div>
                                    </div>
                                    <div className="summary-item">
                                        <Layout size={20} />
                                        <div>
                                            <strong>{formData.category}</strong>
                                            <span>Category</span>
                                        </div>
                                    </div>
                                    <div className="summary-item">
                                        <Palette size={20} />
                                        <div>
                                            {formData.coverAsset ? (
                                                <strong>Library Cover</strong>
                                            ) : (
                                                <div className="color-dot" style={{ backgroundColor: formData.color }} />
                                            )}
                                            <span>Cover Style</span>
                                        </div>
                                    </div>
                                    <div className="summary-item">
                                        <Layout size={20} />
                                        <div>
                                            <strong>{formData.dimensions.name}</strong>
                                            <span>Dimensions</span>
                                        </div>
                                    </div>
                                    <div className="summary-item">
                                        <Hash size={20} />
                                        <div>
                                            <strong>{formData.selectedTemplates.length} Templates</strong>
                                            <span>Initial Content</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="creation-perks">
                                    <div className="perk">
                                        <Check size={16} />
                                        <span>Custom Scaling Applied</span>
                                    </div>
                                    <div className="perk">
                                        <Check size={16} />
                                        <span>Triple-Axis Navigation Ready</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="wizard-footer">
                        {step > 1 && (
                            <button className="wizard-btn secondary" onClick={() => setStep(step - 1)} disabled={isCreating}>
                                <ChevronLeft size={20} /> Back
                            </button>
                        )}
                        <div style={{ flex: 1 }} />
                        {step < 4 ? (
                            <button className="wizard-btn primary" onClick={() => setStep(step + 1)}>
                                Next <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button className="wizard-btn primary create-btn" onClick={handleCreate} disabled={isCreating}>
                                {isCreating ? (
                                    <>
                                        <div className="spinner-small" /> Building...
                                    </>
                                ) : (
                                    <>
                                        Build My Planner <Check size={20} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CreationWizard;
