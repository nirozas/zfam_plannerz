import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { StepOne } from './steps/StepOne'
import { StepTwo } from './steps/StepTwo'
import { StepThree } from './steps/StepThree'
import { PlannerType } from '@/types'
import { supabase } from '@/lib/supabase'
import { generateUUID } from '@/store/plannerStore'

interface PlannerWizardProps {
    isOpen: boolean
    onClose: () => void
    onComplete: () => void
}

export interface WizardData {
    name: string
    type: PlannerType
    cover: string
    structure: 'Annual' | 'Monthly' | 'Weekly' | 'Freeform'
    orientation: 'Portrait' | 'Landscape'
    templates: string[]
}

export function PlannerWizard({ isOpen, onClose, onComplete }: PlannerWizardProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [wizardData, setWizardData] = useState<WizardData>({
        name: '',
        type: 'Calendar',
        cover: '',
        structure: 'Monthly',
        orientation: 'Portrait',
        templates: [],
    })
    const [saving, setSaving] = useState(false)

    const totalSteps = 3

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleComplete = async () => {
        setSaving(true)
        try {
            // Get the authenticated user
            const { data: { user } } = await supabase.auth.getUser()

            // For development without auth, use a placeholder ID
            const userId = user?.id || '00000000-0000-0000-0000-000000000000'

            const { data, error } = await supabase
                .from('planners')
                .insert({
                    name: wizardData.name,
                    type: wizardData.type,
                    cover_url: wizardData.cover,
                    structure: wizardData.structure,
                    user_id: userId,
                })
                .select()
                .single()

            if (error) throw error

            // Create initial pages with correct dimensions
            const isPortrait = wizardData.orientation === 'Portrait'
            // A4 Dimensions at ~96 DPI
            const width = isPortrait ? 794 : 1123
            const height = isPortrait ? 1123 : 794
            const dimensions = { width, height }
            const layout = isPortrait ? 'portrait' : 'landscape'

            const plannerId = data.id
            const initialPages = [
                { id: generateUUID(), templateId: 'cover', section: 'COVER', name: 'Cover' },
                { id: generateUUID(), templateId: 'daily', section: 'JAN', name: 'Daily View' },
                { id: generateUUID(), templateId: 'weekly', section: 'JAN', name: 'Weekly View' },
                { id: generateUUID(), templateId: 'notes', section: 'NOTES', name: 'Notes' },
            ]

            for (let i = 0; i < initialPages.length; i++) {
                const page = initialPages[i]

                // Insert page
                await supabase.from('pages').insert({
                    id: page.id,
                    planner_id: plannerId,
                    page_number: i,
                    template_id: page.templateId,
                    section: page.section,
                    // Store dimensions and layout in the page data if supported, 
                    // or rely on the defaults being overridden by local state if needed.
                    // However, standard DB schema might not have 'dimensions' column yet.
                    // If supabase errors here, we might need to update schema or store in a json column.
                    // For now, let's assume standard 'pages' table. If we need custom dims, 
                    // we usually store them in 'layout' or 'dimensions' jsonb.
                    // Let's try to insert dimensions if possible, or reliance on template behavior.

                    // IF the table supports it:
                    dimensions: dimensions, // Might default to null if column missing
                    layout: layout
                })

                // Create empty layer
                await supabase.from('layers').insert({
                    page_id: page.id,
                    elements: [],
                    ink_paths: []
                })
            }

            console.log('Planner created:', data)
            onComplete()
            onClose()
            setCurrentStep(1)
            setWizardData({
                name: '',
                type: 'Calendar',
                cover: '',
                structure: 'Monthly',
                orientation: 'Portrait',
                templates: [],
            })
        } catch (error) {
            console.error('Error creating planner:', error)
            alert('Failed to create planner. Please check the console for details.')
        } finally {
            setSaving(false)
        }
    }

    const updateData = (data: Partial<WizardData>) => {
        setWizardData({ ...wizardData, ...data })
    }

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <StepOne data={wizardData} updateData={updateData} />
            case 2:
                return <StepTwo data={wizardData} updateData={updateData} />
            case 3:
                return <StepThree data={wizardData} updateData={updateData} />
            default:
                return null
        }
    }

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return wizardData.name.trim() !== '' && wizardData.cover !== ''
            case 2:
                return true
            case 3:
                return true
            default:
                return false
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Planner">
            <div className="p-6">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center flex-1">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= step
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                        : 'bg-gray-200 text-gray-500'
                                        }`}
                                >
                                    {currentStep > step ? <Check className="w-5 h-5" /> : step}
                                </div>
                                {step < 3 && (
                                    <div
                                        className={`flex-1 h-1 mx-2 transition-all ${currentStep > step ? 'bg-indigo-600' : 'bg-gray-200'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                        <span>Basic Info</span>
                        <span>Structure</span>
                        <span>Templates</span>
                    </div>
                </div>

                {/* Step Content */}
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="min-h-[400px]"
                >
                    {renderStep()}
                </motion.div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>

                    {currentStep < totalSteps ? (
                        <Button onClick={handleNext} disabled={!canProceed()}>
                            Next
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleComplete} disabled={!canProceed() || saving}>
                            <Check className="w-4 h-4 mr-2" />
                            {saving ? 'Creating...' : 'Create Planner'}
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    )
}
