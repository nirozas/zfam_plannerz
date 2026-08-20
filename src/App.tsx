import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'
import { usePlannerStore } from '@/store/plannerStore'
import { useCardStore } from '@/store/cardStore'
import { useTaskStore } from '@/store/taskStore'
import { Loader2 } from 'lucide-react'
import PWABadge from '@/components/pwa/PWABadge'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Lazy load wrapper to handle chunk errors (e.g. after a new deployment)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
    lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
        );
        try {
            const component = await componentImport();
            window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
            return component;
        } catch (error) {
            if (!pageHasAlreadyBeenForceRefreshed) {
                // Assume that the error is due to a chunk missing and force a reload
                window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
                window.location.reload();
                // Return a Promise that never resolves so Suspense keeps showing the loading fallback
                return new Promise(() => {});
            }
            throw error;
        }
    });

// Lazy loaded page components
const HomePage = lazyWithRetry(() => import('@/components/home/HomePage'))
const PlannersPage = lazyWithRetry(() => import('@/components/dashboard/PlannersPage'))
const CanvasWorkspace = lazyWithRetry(() => import('@/components/canvas/CanvasWorkspace').then(m => ({ default: m.CanvasWorkspace })))
const AuthPage = lazyWithRetry(() => import('@/components/auth/AuthPage'))
const SettingsPage = lazyWithRetry(() => import('@/components/settings/SettingsPage'))
const ArchivePage = lazyWithRetry(() => import('@/components/archive/ArchivePage'))
const LibraryPage = lazyWithRetry(() => import('@/components/library/LibraryPage'))
const FavoritesPage = lazyWithRetry(() => import('@/components/favorites/FavoritesPage'))
const TasksPage = lazyWithRetry(() => import('@/components/tasks/TasksPage'))
const TripsPage = lazyWithRetry(() => import('@/components/trips/TripsPage'))
const TripMasterPage = lazyWithRetry(() => import('@/components/trips/TripMasterPage'))
const CardsPage = lazyWithRetry(() => import('@/components/dashboard/CardsPage'))
const FinancesPage = lazyWithRetry(() => import('@/pages/FinancesPage'))
const NotebooksPage = lazyWithRetry(() => import('@/pages/NotebooksPage'))
const NotebookSelectorPage = lazyWithRetry(() => import('@/components/notebooks/NotebookSelectorPage').then(m => ({ default: m.NotebookSelectorPage })))
const HealthPage = lazyWithRetry(() => import('@/pages/HealthPage'))

// Loading fallback for Suspense
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
)

function App() {
    const { setUser, fetchPlanners, fetchUserProfile, fetchGlobalHeroConfig } = usePlannerStore()
    const { fetchCards } = useCardStore()
    const { loadAll: loadTasks } = useTaskStore()

    useEffect(() => {
        // 1. Check active session on mount
        const initAuth = async () => {
            const unlock = () => {
                usePlannerStore.getState().setAuthInitialized(true)
            };

            // FAILSAFE: If auth doesn't resolve in 1.5s, just show the UI as guest.
            // This prevents the "white screen of death" on slow connections.
            const failsafe = setTimeout(() => {
                console.warn("Auth initialization taking too long, failsafe triggered.");
                unlock();
            }, 1500);

            try {
                // start global config in background
                fetchGlobalHeroConfig();

                // 1. Fast local session check
                const { data: { session } } = await supabase.auth.getSession()
                const user = session?.user ?? null;
                setUser(user)

                if (user) {
                    // 2. Trigger data fetches in background (don't await them)
                    Promise.allSettled([
                        fetchUserProfile(),
                        fetchPlanners(),
                        fetchCards(),
                        loadTasks()
                    ]).catch(e => console.error("Background fetch error", e));
                }
            } catch (err) {
                console.error("Auth initialization fatal error:", err);
            } finally {
                clearTimeout(failsafe);
                unlock();
                console.log("App initialization sequence finished");
            }
        }

        initAuth()

        // 2. Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            const user = session?.user ?? null;
            setUser(user)

            // TRIGGER FETCH on any valid sign-in or session-restoration event
            // to ensure data is "fitched back" correctly.
            if (user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
                Promise.allSettled([
                    fetchUserProfile(),
                    fetchPlanners(),
                    fetchCards(),
                    loadTasks()
                ]);
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
                        <Route path="/tasks/:viewMode" element={<TasksPage />} />
                        <Route path="/trips" element={<TripsPage />} />
                        <Route path="/trips/:tripSlug" element={<TripMasterPage />} />
                        <Route path="/cards" element={<CardsPage />} />
                        <Route path="/cards/:folderId" element={<CardsPage />} />
                        <Route path="/finances" element={<FinancesPage />} />
                        <Route path="/notebooks" element={<NotebookSelectorPage />} />
                        <Route path="/notebooks/:notebookName" element={<NotebooksPage />} />
                        <Route path="/health" element={<HealthPage />} />
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
