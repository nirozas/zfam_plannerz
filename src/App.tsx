import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'
import { usePlannerStore } from '@/store/plannerStore'
import { useCardStore } from '@/store/cardStore'
import { Loader2 } from 'lucide-react'
import PWABadge from '@/components/pwa/PWABadge'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Lazy loaded page components
const HomePage = lazy(() => import('@/components/home/HomePage'))
const PlannersPage = lazy(() => import('@/components/dashboard/PlannersPage'))
const CanvasWorkspace = lazy(() => import('@/components/canvas/CanvasWorkspace').then(m => ({ default: m.CanvasWorkspace })))
const AuthPage = lazy(() => import('@/components/auth/AuthPage'))
const SettingsPage = lazy(() => import('@/components/settings/SettingsPage'))
const ArchivePage = lazy(() => import('@/components/archive/ArchivePage'))
const LibraryPage = lazy(() => import('@/components/library/LibraryPage'))
const FavoritesPage = lazy(() => import('@/components/favorites/FavoritesPage'))
const TasksPage = lazy(() => import('@/components/tasks/TasksPage'))
const TripsPage = lazy(() => import('@/components/trips/TripsPage'))
const TripMasterPage = lazy(() => import('@/components/trips/TripMasterPage'))
const CardsPage = lazy(() => import('@/components/dashboard/CardsPage'))

// Loading fallback for Suspense
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
)

function App() {
    const { setUser, fetchPlanners, fetchUserProfile, fetchGlobalHeroConfig } = usePlannerStore()
    const { fetchCards } = useCardStore()

    useEffect(() => {
        // 1. Check active session on mount
        const initAuth = async () => {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Auth initialization timeout")), 12000)
            );

            try {
                const authCheckPromise = (async () => {
                    // Always fetch global configuration (Hero images, etc.) for everyone
                    const globalConfigPromise = fetchGlobalHeroConfig();

                    // Check active session
                    const { data: { session } } = await supabase.auth.getSession()
                    const user = session?.user ?? null;
                    setUser(user)

                    if (user) {
                        // Load critical user data in parallel with global config
                        await Promise.all([
                            globalConfigPromise,
                            fetchUserProfile(),
                            fetchPlanners(),
                            fetchCards()
                        ]);
                    } else {
                        // Just wait for global config if not logged in
                        await globalConfigPromise;
                    }
                })();

                await Promise.race([authCheckPromise, timeoutPromise]);
            } catch (err) {
                console.error("Auth initialization error (could be timeout):", err);
            } finally {
                // Mark auth as officially checked - MUST happen so the loader disappears
                usePlannerStore.getState().setAuthInitialized(true)
                console.log("App auth initialization sequence finished");
            }
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
    }, [setUser, fetchPlanners, fetchUserProfile, fetchGlobalHeroConfig, fetchCards])

    return (
        <BrowserRouter>
            <PWABadge />
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
        </BrowserRouter>
    )
}

export default App
