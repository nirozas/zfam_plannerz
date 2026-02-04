import { WizardData } from '../PlannerWizard'
import { PlannerType } from '@/types'

interface StepOneProps {
    data: WizardData
    updateData: (data: Partial<WizardData>) => void
}

const COVER_COLORS = [
    { name: 'Sunset', gradient: 'from-orange-400 via-pink-500 to-purple-600' },
    { name: 'Ocean', gradient: 'from-blue-400 via-cyan-500 to-teal-600' },
    { name: 'Forest', gradient: 'from-green-400 via-emerald-500 to-teal-600' },
    { name: 'Lavender', gradient: 'from-purple-400 via-violet-500 to-indigo-600' },
    { name: 'Sunset Pink', gradient: 'from-pink-400 via-rose-500 to-red-600' },
    { name: 'Night Sky', gradient: 'from-indigo-600 via-purple-600 to-pink-500' },
]

export function StepOne({ data, updateData }: StepOneProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Let's start with the basics
                </h3>
                <p className="text-gray-600 mb-6">
                    Give your planner a name and choose a beautiful cover design.
                </p>
            </div>

            {/* Planner Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Planner Name *
                </label>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => updateData({ name: e.target.value })}
                    placeholder="e.g., My 2026 Planner"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
            </div>

            {/* Planner Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {(['Calendar', 'Notes', 'Custom'] as PlannerType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => updateData({ type })}
                            className={`p-4 rounded-lg border-2 transition-all ${data.type === type
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                }`}
                        >
                            <div className="font-semibold">{type}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Orientation Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Orientation
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {['Portrait', 'Landscape'].map((orientation) => (
                        <button
                            key={orientation}
                            onClick={() => updateData({ orientation: orientation as 'Portrait' | 'Landscape' })}
                            className={`p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-3 ${data.orientation === orientation
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                }`}
                        >
                            <div className={`border-2 border-current rounded-sm ${orientation === 'Portrait' ? 'w-4 h-6' : 'w-6 h-4'
                                }`} />
                            <div className="font-semibold">{orientation} (A4)</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Cover Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose a Cover *
                </label>
                <div className="grid grid-cols-3 gap-4">
                    {COVER_COLORS.map((cover) => (
                        <button
                            key={cover.name}
                            onClick={() => updateData({ cover: cover.gradient })}
                            className={`aspect-[3/4] rounded-lg bg-gradient-to-br ${cover.gradient} transition-all relative ${data.cover === cover.gradient
                                ? 'ring-4 ring-indigo-600 ring-offset-2'
                                : 'hover:scale-105'
                                }`}
                        >
                            {data.cover === cover.gradient && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white rounded-full p-2">
                                        <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
