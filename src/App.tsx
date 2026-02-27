import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'
import { usePlannerStore } from '@/store/plannerStore'
import { useCardStore } from '@/store/cardStore'
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
import CardsPage from '@/components/dashboard/CardsPage'
import PWABadge from '@/components/pwa/PWABadge'

function App() {
    const { setUser, fetchPlanners, fetchUserProfile } = usePlannerStore()
    const { fetchCards } = useCardStore()

    useEffect(() => {
        // 1. Check active session on mount
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user ?? null;
            setUser(user)

            if (user) {
                // Load critical data in parallel
                await Promise.all([
                    fetchUserProfile(),
                    fetchPlanners(),
                    fetchCards()
                ]).catch(err => console.error("Initial data fetch error:", err));
            }

            // Mark auth as officially checked
            usePlannerStore.getState().setAuthInitialized(true)
        }

        initAuth()

        // 2. Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const user = session?.user ?? null;
            const currentUser = usePlannerStore.getState().user;

            setUser(user)

            // Only re-fetch if the user actually changed/signed in
            if (user && user.id !== currentUser?.id) {
                await Promise.all([
                    fetchUserProfile(),
                    fetchPlanners(),
                    fetchCards()
                ]).catch(err => console.error("Auth change data fetch error:", err));
            }
        })

        return () => subscription.unsubscribe()
    }, [setUser, fetchPlanners, fetchUserProfile, fetchCards])

    return (
        <BrowserRouter>
            <PWABadge />
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
                    <Route path="/cards" element={<CardsPage />} />
                    <Route path="/cards/:folderId" element={<CardsPage />} />
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
