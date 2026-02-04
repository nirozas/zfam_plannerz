import { WizardData } from '../PlannerWizard'

interface StepTwoProps {
    data: WizardData
    updateData: (data: Partial<WizardData>) => void
}

const STRUCTURES = [
    {
        value: 'Annual' as const,
        title: 'Annual',
        description: 'Organize by year with monthly and daily views',
    },
    {
        value: 'Monthly' as const,
        title: 'Monthly',
        description: 'Focus on month-by-month planning',
    },
    {
        value: 'Weekly' as const,
        title: 'Weekly',
        description: 'Week-focused layout with daily breakdowns',
    },
    {
        value: 'Freeform' as const,
        title: 'Freeform',
        description: 'Blank pages for total creative freedom',
    },
]

export function StepTwo({ data, updateData }: StepTwoProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Define your structure
                </h3>
                <p className="text-gray-600 mb-6">
                    Choose how you want to organize your planner pages.
                </p>
            </div>

            <div className="space-y-3">
                {STRUCTURES.map((structure) => (
                    <button
                        key={structure.value}
                        onClick={() => updateData({ structure: structure.value })}
                        className={`w-full p-5 rounded-xl border-2 transition-all text-left ${data.structure === structure.value
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-300 hover:border-gray-400 bg-white'
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h4
                                    className={`font-semibold text-lg mb-1 ${data.structure === structure.value
                                        ? 'text-indigo-700'
                                        : 'text-gray-900'
                                        }`}
                                >
                                    {structure.title}
                                </h4>
                                <p className="text-gray-600 text-sm">{structure.description}</p>
                            </div>
                            {data.structure === structure.value && (
                                <div className="bg-indigo-600 rounded-full p-1 ml-3">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Orientation Selection - Moved from Step One */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 mt-6">
                    Page Orientation (for all pages)
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
                            <div className="font-semibold">{orientation}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Orientation Selection - Moved from Step One */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 mt-6">
                    Page Orientation (for all pages)
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
                            <div className="font-semibold">{orientation}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
