import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { usePlannerStore } from '@/store/plannerStore'
import Dashboard from '@/components/dashboard/Dashboard'
import { CanvasWorkspace } from '@/components/canvas/CanvasWorkspace'
import AuthPage from '@/components/auth/AuthPage'
import SettingsPage from '@/components/settings/SettingsPage'
import ArchivePage from '@/components/archive/ArchivePage'
import LibraryPage from '@/components/library/LibraryPage'
import FavoritesPage from '@/components/favorites/FavoritesPage'

function App() {
    const { setUser, fetchPlanners, fetchUserProfile } = usePlannerStore()

    useEffect(() => {
        // 1. Check active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchUserProfile()
                fetchPlanners()
            }
        })

        // 2. Listen for auth changes (sign in, sign out, refresh)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            // If we just signed in, fetch immediately
            if (session?.user) {
                fetchUserProfile()
                fetchPlanners()
            }
        })

        return () => subscription.unsubscribe()
    }, [setUser, fetchPlanners])

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/homepage" element={<Dashboard />} />
                <Route path="/" element={<Navigate to="/homepage" replace />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/signin" element={<AuthPage />} />
                <Route path="/signup" element={<AuthPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/archive" element={<ArchivePage />} />
                <Route path="/planner/:plannerName" element={<CanvasWorkspace />} />
                <Route path="*" element={<Navigate to="/homepage" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
