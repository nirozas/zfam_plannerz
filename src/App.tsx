import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'
import { usePlannerStore } from '@/store/plannerStore'
import HomePage from '@/components/home/HomePage'
import PlannersPage from '@/components/dashboard/PlannersPage'
import { CanvasWorkspace } from '@/components/canvas/CanvasWorkspace'
import AuthPage from '@/components/auth/AuthPage'
import SettingsPage from '@/components/settings/SettingsPage'
import ArchivePage from '@/components/archive/ArchivePage'
import LibraryPage from '@/components/library/LibraryPage'
import FavoritesPage from '@/components/favorites/FavoritesPage'
import TasksPage from '@/components/tasks/TasksPage'
import DashboardLayout from '@/components/layout/DashboardLayout'
import TripsPage from '@/components/trips/TripsPage'
import TripMasterPage from '@/components/trips/TripMasterPage'

function App() {
    const { setUser, fetchPlanners, fetchUserProfile } = usePlannerStore()

    useEffect(() => {
        // 1. Check active session on mount
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user ?? null)
            if (session?.user) {
                // Load these in background
                fetchUserProfile()
                fetchPlanners()
            }
            // Mark auth as officially checked
            usePlannerStore.getState().setAuthInitialized(true)
        }

        initAuth()

        // 2. Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchUserProfile()
                fetchPlanners()
            }
        })

        return () => subscription.unsubscribe()
    }, [setUser, fetchPlanners, fetchUserProfile])

    return (
        <BrowserRouter>
            <Routes>
                {/* Public / Auth */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/signin" element={<AuthPage />} />
                <Route path="/signup" element={<AuthPage />} />

                {/* Main App Layout */}
                <Route element={<DashboardLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/planners" element={<PlannersPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/archive" element={<ArchivePage />} />
                    <Route path="/tasks" element={<TasksPage />} />
                    <Route path="/trips" element={<TripsPage />} />
                    <Route path="/trips/:tripSlug" element={<TripMasterPage />} />
                </Route>

                {/* Standalone Pages */}
                <Route path="/planner/:plannerName" element={<CanvasWorkspace />} />

                {/* Redirects */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
