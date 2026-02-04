import { WizardData } from '../PlannerWizard'
import { Calendar, FileText, DollarSign, CheckSquare, LayoutGrid } from 'lucide-react'

interface StepThreeProps {
    data: WizardData
    updateData: (data: Partial<WizardData>) => void
}

const TEMPLATES = [
    { id: 'daily', name: 'Daily Driver', icon: Calendar, color: 'indigo' },
    { id: 'weekly', name: 'Weekly Spread', icon: LayoutGrid, color: 'purple' },
    { id: 'notes', name: 'Blank Notes', icon: FileText, color: 'blue' },
    { id: 'finance', name: 'Finance Tracker', icon: DollarSign, color: 'green' },
    { id: 'tasks', name: 'Task List', icon: CheckSquare, color: 'pink' },
]

export function StepThree({ data, updateData }: StepThreeProps) {
    const toggleTemplate = (templateId: string) => {
        const templates = data.templates.includes(templateId)
            ? data.templates.filter((t) => t !== templateId)
            : [...data.templates, templateId]
        updateData({ templates })
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Choose your templates
                </h3>
                <p className="text-gray-600 mb-6">
                    Select templates to include in your planner. You can customize these later.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {TEMPLATES.map((template) => {
                    const Icon = template.icon
                    const isSelected = data.templates.includes(template.id)

                    return (
                        <button
                            key={template.id}
                            onClick={() => toggleTemplate(template.id)}
                            className={`p-6 rounded-xl border-2 transition-all ${isSelected
                                    ? `border-${template.color}-600 bg-${template.color}-50`
                                    : 'border-gray-300 hover:border-gray-400 bg-white'
                                }`}
                        >
                            <div className="flex flex-col items-center text-center">
                                <div
                                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${isSelected
                                            ? `bg-gradient-to-br from-${template.color}-500 to-${template.color}-600`
                                            : 'bg-gray-100'
                                        }`}
                                >
                                    <Icon
                                        className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-gray-400'
                                            }`}
                                    />
                                </div>
                                <h4
                                    className={`font-semibold ${isSelected ? `text-${template.color}-700` : 'text-gray-900'
                                        }`}
                                >
                                    {template.name}
                                </h4>
                                {isSelected && (
                                    <div className="mt-2">
                                        <div className={`bg-${template.color}-600 rounded-full p-1`}>
                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> You can add more templates or create custom ones after creating your planner.
                </p>
            </div>
        </div>
    )
}
