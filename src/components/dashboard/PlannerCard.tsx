import { Calendar, FileText, MoreVertical, Archive, Trash2, Copy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Planner } from '@/types'
import { useState } from 'react'
import { usePlannerStore } from '@/store/plannerStore'

interface PlannerCardProps {
    planner: Planner
    index: number
}

export function PlannerCard({ planner, index }: PlannerCardProps) {
    const [showMenu, setShowMenu] = useState(false)
    const navigate = useNavigate()
    const { duplicatePlanner, deletePlanner, archivePlanner } = usePlannerStore()

    const handleDuplicate = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setShowMenu(false)

        const newName = window.prompt("Enter a name for the duplicated planner:", `${planner.name} (Copy)`)
        if (newName === null) return; // User cancelled

        const nameToUse = newName.trim() || `${planner.name} (Copy)`;
        await duplicatePlanner(planner.id, nameToUse);
    }

    // ... existing helper functions ...
    const getIcon = () => {
        switch (planner.type) {
            case 'Calendar':
                return <Calendar className="w-6 h-6 text-white" />
            case 'Notes':
                return <FileText className="w-6 h-6 text-white" />
            default:
                return <FileText className="w-6 h-6 text-white" />
        }
    }

    const handleCardClick = () => {
        navigate(`/planner/${planner.id}`)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative cursor-pointer"
            onClick={handleCardClick}
        >
            {/* 3D Card Effect */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                {/* Cover Image */}
                <div
                    className="h-56 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden"
                    style={{
                        backgroundImage: planner.cover_url ? `url(${planner.cover_url})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />

                    {/* Icon Badge */}
                    <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-3 rounded-xl">
                        {getIcon()}
                    </div>

                    {/* Menu Button */}
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowMenu(!showMenu)
                            }}
                            className="bg-white/20 backdrop-blur-md p-2 rounded-lg hover:bg-white/30 transition-colors"
                        >
                            <MoreVertical className="w-5 h-5 text-white" />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                                <button
                                    onClick={handleDuplicate}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                    <Copy className="w-4 h-4" />
                                    Duplicate
                                </button>
                                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                    <Archive className="w-4 h-4" />
                                    Archive
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Are you sure you want to delete this planner?')) {
                                            deletePlanner(planner.id);
                                        }
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Binder Rings (3D Effect) */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-8">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="w-4 h-8 bg-gradient-to-r from-gray-400 to-gray-600 rounded-r-full shadow-lg"
                            />
                        ))}
                    </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">
                        {planner.name}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="capitalize">{planner.type}</span>
                        <span>{planner.structure}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                            Updated {new Date(planner.updated_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3D Shadow Effect */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
        </motion.div>
    )
}
