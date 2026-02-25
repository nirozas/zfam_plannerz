/**
 * taskStore.ts
 * Supabase-backed store for Tasks & Rituals.
 *
 * Data lives in four Supabase tables:
 *   task_categories  → categories per user
 *   tasks            → task rows (one-time + recurring metadata)
 *   task_completions → one row per (task_id, completed_date) for recurring
 *   task_attachments → Google Drive URLs per task (metadata only in Supabase)
 *
 * Attachments are stored on Google Drive; Supabase holds only the URL.
 */

import { create } from 'zustand';
import { supabase } from '../supabase/client';
import { repairDriveUrl } from '../utils/urlUtils';

// ─── Type Aliases ────────────────────────────────────────────────────────────

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
    type: RecurrenceType;
    daysOfWeek?: number[];   // 0-6 (Sun–Sat)
    dayOfMonth?: number;     // 1-31
    startDate?: string;      // YYYY-MM-DD
    endDate?: string;        // YYYY-MM-DD
}

export interface Subtask {
    id: string;
    title: string;
    isCompleted: boolean;
    imageUrl?: string;      // URL of uploaded image
    imageWidth?: number;    // Width for resizing
    imageHeight?: number;   // Height for resizing
    dueDate?: string;
    dueTime?: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    categoryId: string;
    isRecurring: boolean;
    recurrence?: RecurrenceRule;
    dateAdded: string;           // ISO string
    dueDate?: string;            // ISO string (one-time tasks)
    dueTime?: string;            // Time string (HH:mm)
    completedDates: string[];    // YYYY-MM-DD strings (recurring)
    isCompleted: boolean;        // one-time tasks
    priority: 'low' | 'medium' | 'high';
    attachments: string[];       // Storage public URLs
    subtasks: Subtask[];         // New: Subtasks list
    colSpan: number;             // New: Grid width (1-4)
    rowSpan: number;             // New: Grid height (1-4)
    assigned_to?: string;        // UUID of connection
    assigned_by?: string;        // UUID of assigner
    assigned_user?: any;         // user details
    assigner?: any;              // user details
    notifications?: NotificationRule[]; // Array of notification config
}

export interface NotificationRule {
    id: string;
    type: 'minutes_before' | 'hours_before' | 'days_before' | 'exact_time';
    value: number | string;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    icon?: string;
    sortOrder?: number;
}

export type ViewMode = 'list' | 'month' | 'week' | 'day';
export type TaskSortBy = 'dueDate' | 'name' | 'priority' | 'dateAdded';

// ─── DB Row → App Type Mappers ───────────────────────────────────────────────

/** Map a raw Supabase tasks row to our Task interface */
const rowToTask = (row: any, completedDates: string[] = [], attachments: string[] = []): Task => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    categoryId: row.category_id ?? '',
    isRecurring: row.is_recurring ?? false,
    recurrence: row.is_recurring ? {
        type: row.recurrence_type as RecurrenceType,
        daysOfWeek: row.recurrence_days_of_week ?? undefined,
        dayOfMonth: row.recurrence_day_of_month ?? undefined,
        startDate: row.recurrence_start_date ?? undefined,
        endDate: row.recurrence_end_date ?? undefined,
    } : undefined,
    dateAdded: row.date_added ?? new Date().toISOString(),
    dueDate: row.due_date ?? undefined,
    dueTime: row.due_time ?? undefined,
    completedDates,
    isCompleted: row.is_completed ?? false,
    priority: (row.priority as Task['priority']) ?? 'medium',
    attachments,
    subtasks: row.subtasks ?? [],  // Map JSONB subtasks
    colSpan: row.col_span ?? 1,    // Map integer col_span
    rowSpan: row.row_span ?? 1,    // Map integer row_span
    assigned_to: row.assigned_to ?? undefined,
    assigned_by: row.assigned_by ?? undefined,
    assigned_user: row.assigned_user ?? undefined,
    assigner: row.assigner ?? undefined,
    notifications: row.notifications ?? [],
});

/** Map a raw task_categories row to our Category interface */
const rowToCategory = (row: any): Category => ({
    id: row.id,
    name: row.name,
    color: row.color ?? '#6366f1',
    icon: row.icon ?? undefined,
    sortOrder: row.sort_order ?? 0,
});

// ─── Store Interface ─────────────────────────────────────────────────────────

interface TaskState {
    // Data
    tasks: Task[];
    categories: Category[];

    // UI State
    viewMode: ViewMode;
    selectedCategories: string[];   // empty = all
    filterType: 'all' | 'today' | 'upcoming' | 'completed';
    statusFilter: 'all' | 'completed' | 'active'; // New
    startDate: string | null;                      // New
    endDate: string | null;                        // New
    sortBy: TaskSortBy;                            // New
    activeDayDate: string;          // YYYY-MM-DD
    dayViewBackgrounds: Record<string, string>;  // dateStr -> url

    // Loading / error flags
    isLoading: boolean;
    error: string | null;

    // ── Data Actions ──────────────────────────────────────────────────────────
    loadAll: () => Promise<void>;

    addTask: (task: Omit<Task, 'id' | 'dateAdded' | 'completedDates' | 'isCompleted' | 'attachments' | 'assigned_user' | 'assigner'> & { attachmentFiles?: File[] }) => Promise<void>;
    updateTask: (id: string, updates: Partial<Omit<Task, 'id'>> & { attachmentFiles?: File[] }) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    bulkAddTasks: (tasks: any[]) => Promise<void>;
    toggleTaskCompletion: (id: string, date: string) => Promise<void>;

    addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
    updateCategory: (id: string, updates: Partial<Omit<Category, 'id'>>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;

    // ── UI Actions ────────────────────────────────────────────────────────────
    setViewMode: (mode: ViewMode) => void;
    setFilterType: (filter: 'all' | 'today' | 'upcoming' | 'completed') => void;
    setStatusFilter: (status: 'all' | 'completed' | 'active') => void;
    setDateRange: (start: string | null, end: string | null) => void;
    setSortBy: (sort: TaskSortBy) => void;         // New
    setSelectedCategories: (ids: string[]) => void;
    toggleSelectedCategory: (id: string) => void;
    setActiveDayDate: (date: string) => void;
    navigateToDay: (date: string) => void;
    setDayViewBackground: (date: string, url: string | null) => void;
    editingTaskId: string | null;
    setEditingTaskId: (id: string | null) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

import { toDateStr } from '../utils/recurringUtils';

export const useTaskStore = create<TaskState>()((set, get) => ({
    tasks: [],
    categories: [],
    viewMode: 'list',
    selectedCategories: [],
    filterType: 'all',
    statusFilter: 'all',
    startDate: null,
    endDate: null,
    sortBy: 'dueDate',
    activeDayDate: toDateStr(new Date()),
    dayViewBackgrounds: JSON.parse(localStorage.getItem('tasks-day-view-bgs') || '{}'),
    isLoading: false,
    error: null,
    editingTaskId: null,

    setEditingTaskId: (id) => set({ editingTaskId: id }),

    // ── loadAll ──────────────────────────────────────────────────────────────
    /**
     * Fetch all data for the authenticated user from Supabase.
     * Call once on mount (e.g. in a useEffect inside TasksPage).
     */
    loadAll: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Categories
            const { data: catRows, error: catErr } = await supabase
                .from('task_categories')
                .select('*')
                .eq('user_id', user.id)
                .order('sort_order', { ascending: true });
            if (catErr) throw catErr;

            let categories: Category[] = (catRows ?? []).map(rowToCategory);

            // If user has no categories yet, seed defaults
            if (categories.length === 0) {
                const defaults = [
                    { name: 'Work', color: '#3b82f6', icon: 'briefcase', sort_order: 0 },
                    { name: 'Health', color: '#10b981', icon: 'activity', sort_order: 1 },
                    { name: 'Personal', color: '#f59e0b', icon: 'user', sort_order: 2 },
                ];
                const { data: inserted } = await supabase
                    .from('task_categories')
                    .insert(defaults.map(d => ({ ...d, user_id: user.id })))
                    .select();
                categories = (inserted ?? []).map(rowToCategory);
            }

            // Set categories immediately so they show up even if tasks take time or fail
            set({ categories });

            // 2. Tasks
            try {
                // Try complex join first (requires correct FKEY names)
                let { data: taskRows, error: taskErr } = await supabase
                    .from('tasks')
                    .select(`
                        *,
                        assigned_user:profiles!tasks_assigned_to_fkey(full_name, avatar_url),
                        assigner:profiles!tasks_assigned_by_fkey(full_name, avatar_url)
                    `)
                    .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
                    .order('date_added', { ascending: false });

                // Fallback: If join fails (e.g. FKEY names mismatch), try a simple select
                if (taskErr) {
                    console.warn('[taskStore] Complex join failed, trying simple select:', taskErr.message);
                    const { data: simpleRows, error: simpleErr } = await supabase
                        .from('tasks')
                        .select('*')
                        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
                        .order('date_added', { ascending: false });

                    if (simpleErr) {
                        // If even simple select fails, maybe assigned_to column is missing
                        console.warn('[taskStore] Simple select with OR failed, trying basic user_id query:', simpleErr.message);
                        const { data: basicRows, error: basicErr } = await supabase
                            .from('tasks')
                            .select('*')
                            .eq('user_id', user.id)
                            .order('date_added', { ascending: false });

                        if (basicErr) throw basicErr;
                        taskRows = basicRows;
                    } else {
                        taskRows = simpleRows;
                    }
                }



                if (!taskRows || taskRows.length === 0) {
                    set({ tasks: [], isLoading: false });
                    return;
                }

                const taskIds = taskRows.map((r: any) => r.id);

                // 3. Completions (batch for all tasks)
                const { data: completionRows } = await supabase
                    .from('task_completions')
                    .select('task_id, completed_date')
                    .in('task_id', taskIds);

                // Group completions by task_id
                const completionMap: Record<string, string[]> = {};
                for (const row of (completionRows ?? [])) {
                    if (!completionMap[row.task_id]) completionMap[row.task_id] = [];
                    completionMap[row.task_id].push(row.completed_date as string);
                }

                // 4. Attachments (batch for all tasks)
                const { data: attachmentRows } = await supabase
                    .from('task_attachments')
                    .select('task_id, storage_url, sort_order')
                    .in('task_id', taskIds)
                    .order('sort_order', { ascending: true });

                // Group attachments by task_id
                const attachmentMap: Record<string, string[]> = {};
                for (const row of (attachmentRows ?? [])) {
                    if (!attachmentMap[row.task_id]) attachmentMap[row.task_id] = [];
                    // Apply repairDriveUrl to each attachment to ensure stable proxy
                    attachmentMap[row.task_id].push(repairDriveUrl(row.storage_url as string));
                }

                const tasks: Task[] = taskRows.map((row: any) =>
                    rowToTask(row, completionMap[row.id] ?? [], attachmentMap[row.id] ?? [])
                );

                set({ tasks, isLoading: false });
            } catch (taskErr: any) {
                console.error('[taskStore] tasks fetch error:', taskErr);
                set({ error: 'Categories loaded, but failed to fetch tasks. Please check your DB schema.', isLoading: false });
            }
        } catch (err: any) {
            console.error('[taskStore] loadAll error:', err);
            set({ error: err.message ?? 'Failed to load task data', isLoading: false });
        }
    },

    // ── addTask ──────────────────────────────────────────────────────────────
    addTask: async (taskData) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { attachmentFiles, ...rest } = taskData;

        // Build DB row
        const insertRow: Record<string, any> = {
            user_id: user.id,
            title: rest.title,
            description: rest.description ?? null,
            category_id: rest.categoryId || null,
            priority: rest.priority ?? 'medium',
            is_recurring: rest.isRecurring ?? false,
            date_added: new Date().toISOString(),
            subtasks: rest.subtasks ?? [],
            col_span: rest.colSpan ?? 1,
            row_span: rest.rowSpan ?? 1,
            assigned_to: rest.assigned_to ?? null,
            assigned_by: rest.assigned_to ? user.id : null,
            due_time: rest.dueTime ?? null,
            notifications: rest.notifications ?? [],
        };

        if (!rest.isRecurring && rest.dueDate) {
            insertRow.due_date = rest.dueDate;
        }
        if (rest.isRecurring && rest.recurrence) {
            insertRow.recurrence_type = rest.recurrence.type;
            insertRow.recurrence_days_of_week = rest.recurrence.daysOfWeek ?? null;
            insertRow.recurrence_day_of_month = rest.recurrence.dayOfMonth ?? null;
            insertRow.recurrence_start_date = rest.recurrence.startDate ?? null;
            insertRow.recurrence_end_date = rest.recurrence.endDate ?? null;
        }

        const { data: newRow, error } = await supabase
            .from('tasks')
            .insert(insertRow)
            .select()
            .single();

        if (error || !newRow) {
            console.error('[taskStore] addTask error:', error);
            return;
        }

        // Upload attachment files to Storage
        const storageUrls = await uploadAttachmentFiles(user.id, newRow.id, attachmentFiles ?? []);

        // Insert attachment rows
        if (storageUrls.length > 0) {
            await supabase.from('task_attachments').insert(
                storageUrls.map((url, i) => ({
                    task_id: newRow.id,
                    user_id: user.id,
                    storage_url: url,
                    sort_order: i,
                }))
            );
        }

        const task = rowToTask(newRow, [], storageUrls);
        set(state => ({ tasks: [task, ...state.tasks] }));
    },

    bulkAddTasks: async (tasksData) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const insertRows = tasksData.map(t => ({
            user_id: user.id,
            title: t.title,
            description: t.description || null,
            category_id: t.categoryId || null,
            priority: t.priority || 'medium',
            is_recurring: false,
            date_added: new Date().toISOString(),
            subtasks: t.subtasks || [],
            notifications: [],
        }));

        const { data: newRows, error } = await supabase
            .from('tasks')
            .insert(insertRows)
            .select();

        if (error) {
            console.error('[taskStore] bulkAddTasks error:', error);
            throw error;
        }

        // Handle attachments if present in the data (URLs)
        const attachmentInserts: any[] = [];
        newRows?.forEach((row: any, index: number) => {
            const original = tasksData[index];
            if (original.attachments && Array.isArray(original.attachments)) {
                original.attachments.forEach((url: string, i: number) => {
                    attachmentInserts.push({
                        task_id: row.id,
                        user_id: user.id,
                        storage_url: url,
                        sort_order: i
                    });
                });
            }
        });

        if (attachmentInserts.length > 0) {
            await supabase.from('task_attachments').insert(attachmentInserts);
        }

        // Map back to models
        const newTasks = (newRows || []).map((row, index) => {
            const original = tasksData[index];
            return rowToTask(row, [], original.attachments || []);
        });

        set(state => ({ tasks: [...newTasks, ...state.tasks] }));
    },

    // ── updateTask ───────────────────────────────────────────────────────────
    updateTask: async (id, updates) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { attachmentFiles, attachments: newAttachmentUrls, ...rest } = updates as any;

        const updateRow: Record<string, any> = {};
        if (rest.title !== undefined) updateRow.title = rest.title;
        if (rest.description !== undefined) updateRow.description = rest.description ?? null;
        if (rest.categoryId !== undefined) updateRow.category_id = rest.categoryId ?? null;
        if (rest.priority !== undefined) updateRow.priority = rest.priority;
        if (rest.isCompleted !== undefined) updateRow.is_completed = rest.isCompleted;
        if (rest.dueDate !== undefined) updateRow.due_date = rest.dueDate ?? null;
        if (rest.subtasks !== undefined) updateRow.subtasks = rest.subtasks;
        if (rest.colSpan !== undefined) updateRow.col_span = rest.colSpan;
        if (rest.rowSpan !== undefined) updateRow.row_span = rest.rowSpan;
        if (rest.dueTime !== undefined) updateRow.due_time = rest.dueTime;
        if (rest.notifications !== undefined) updateRow.notifications = rest.notifications;
        if (rest.assigned_to !== undefined) {
            updateRow.assigned_to = rest.assigned_to;
            updateRow.assigned_by = user.id;
        }
        if (rest.isRecurring !== undefined) {
            updateRow.is_recurring = rest.isRecurring;
            if (!rest.isRecurring) {
                // Clear recurrence columns
                updateRow.recurrence_type = null;
                updateRow.recurrence_days_of_week = null;
                updateRow.recurrence_day_of_month = null;
                updateRow.recurrence_start_date = null;
                updateRow.recurrence_end_date = null;
            }
        }
        if (rest.recurrence !== undefined && rest.isRecurring) {
            updateRow.recurrence_type = rest.recurrence.type ?? null;
            updateRow.recurrence_days_of_week = rest.recurrence.daysOfWeek ?? null;
            updateRow.recurrence_day_of_month = rest.recurrence.dayOfMonth ?? null;
            updateRow.recurrence_start_date = rest.recurrence.startDate ?? null;
            updateRow.recurrence_end_date = rest.recurrence.endDate ?? null;
        }

        if (Object.keys(updateRow).length > 0) {
            const { error } = await supabase
                .from('tasks')
                .update(updateRow)
                .eq('id', id);
            if (error) { console.error('[taskStore] updateTask error:', error); return; }
        }

        // Handle attachment replacements
        let finalAttachments: string[] | undefined;
        if (newAttachmentUrls !== undefined || attachmentFiles) {
            // Delete existing DB attachment rows for this task
            await supabase.from('task_attachments').delete().eq('task_id', id);

            // Start fresh from the URL list passed in (already-saved URLs the user kept)
            const kept: string[] = newAttachmentUrls ?? [];

            // Upload any new files
            const uploaded = await uploadAttachmentFiles(user.id, id, attachmentFiles ?? []);
            finalAttachments = [...kept, ...uploaded];

            if (finalAttachments.length > 0) {
                await supabase.from('task_attachments').insert(
                    finalAttachments.map((url, i) => ({
                        task_id: id,
                        user_id: user.id,
                        storage_url: url,
                        sort_order: i,
                    }))
                );
            }
        }

        set(state => ({
            tasks: state.tasks.map(t => {
                if (t.id !== id) return t;
                const merged: Task = {
                    ...t,
                    title: rest.title ?? t.title,
                    description: rest.description !== undefined ? rest.description : t.description,
                    categoryId: rest.categoryId !== undefined ? rest.categoryId : t.categoryId,
                    priority: rest.priority ?? t.priority,
                    isCompleted: rest.isCompleted ?? t.isCompleted,
                    dueDate: rest.dueDate !== undefined ? rest.dueDate : t.dueDate,
                    dueTime: rest.dueTime !== undefined ? rest.dueTime : t.dueTime,
                    notifications: rest.notifications !== undefined ? rest.notifications : t.notifications,
                    isRecurring: rest.isRecurring ?? t.isRecurring,
                    recurrence: rest.recurrence !== undefined ? rest.recurrence : t.recurrence,
                    attachments: finalAttachments ?? t.attachments,
                    subtasks: rest.subtasks ?? t.subtasks,
                    colSpan: rest.colSpan ?? t.colSpan,
                    rowSpan: rest.rowSpan ?? t.rowSpan,
                };
                return merged;
            })
        }));
    },

    // ── deleteTask ───────────────────────────────────────────────────────────
    deleteTask: async (id) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Cascades in DB handle task_completions and task_attachments rows.
        // Note: We do NOT delete from Google Drive — files remain in user's Drive folder.
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) { console.error('[taskStore] deleteTask error:', error); return; }

        set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    },

    // ── toggleTaskCompletion ─────────────────────────────────────────────────
    toggleTaskCompletion: async (id, dateStr) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const task = get().tasks.find(t => t.id === id);
        if (!task) return;

        if (!task.isRecurring) {
            // One-time task: toggle is_completed in DB
            const newCompleted = !task.isCompleted;
            const { error } = await supabase
                .from('tasks')
                .update({ is_completed: newCompleted })
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) { console.error('[taskStore] toggle one-time error:', error); return; }

            set(state => ({
                tasks: state.tasks.map(t =>
                    t.id === id ? { ...t, isCompleted: newCompleted } : t
                )
            }));
        } else {
            // Recurring: use the RPC for atomic toggle
            const { error } = await supabase.rpc('toggle_task_completion', {
                p_task_id: id,
                p_completed_date: dateStr,
            });
            if (error) { console.error('[taskStore] toggle recurring error:', error); return; }

            set(state => ({
                tasks: state.tasks.map(t => {
                    if (t.id !== id) return t;
                    const already = t.completedDates.includes(dateStr);
                    return {
                        ...t,
                        completedDates: already
                            ? t.completedDates.filter(d => d !== dateStr)
                            : [...t.completedDates, dateStr],
                    };
                })
            }));
        }
    },

    // ── addCategory ──────────────────────────────────────────────────────────
    addCategory: async (cat) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const sortOrder = get().categories.length;
        const { data, error } = await supabase
            .from('task_categories')
            .insert({
                user_id: user.id,
                name: cat.name,
                color: cat.color,
                icon: cat.icon ?? null,
                sort_order: sortOrder,
            })
            .select()
            .single();

        if (error || !data) { console.error('[taskStore] addCategory error:', error); return; }
        set(state => ({ categories: [...state.categories, rowToCategory(data)] }));
    },

    // ── updateCategory ───────────────────────────────────────────────────────
    updateCategory: async (id, updates) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updateRow: Record<string, any> = {};
        if (updates.name !== undefined) updateRow.name = updates.name;
        if (updates.color !== undefined) updateRow.color = updates.color;
        if (updates.icon !== undefined) updateRow.icon = updates.icon ?? null;

        const { error } = await supabase
            .from('task_categories')
            .update(updateRow)
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) { console.error('[taskStore] updateCategory error:', error); return; }

        set(state => ({
            categories: state.categories.map(c =>
                c.id === id ? { ...c, ...updates } : c
            )
        }));
    },

    // ── deleteCategory ───────────────────────────────────────────────────────
    deleteCategory: async (id) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('task_categories')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) { console.error('[taskStore] deleteCategory error:', error); return; }

        // Nullify category_id on affected tasks locally
        set(state => ({
            categories: state.categories.filter(c => c.id !== id),
            tasks: state.tasks.map(t => t.categoryId === id ? { ...t, categoryId: '' } : t),
        }));
    },

    // ── UI Actions ────────────────────────────────────────────────────────────
    setViewMode: (mode) => set({ viewMode: mode }),
    setFilterType: (filter) => set({ filterType: filter }),
    setStatusFilter: (status) => set({ statusFilter: status }),
    setDateRange: (start, end) => set({ startDate: start, endDate: end }),
    setSelectedCategories: (ids) => set({ selectedCategories: ids }),
    toggleSelectedCategory: (id) => set(state => ({
        selectedCategories: state.selectedCategories.includes(id)
            ? state.selectedCategories.filter(c => c !== id)
            : [...state.selectedCategories, id],
    })),
    setActiveDayDate: (date) => set({ activeDayDate: date }),
    navigateToDay: (date) => set({ viewMode: 'day', activeDayDate: date }),
    setSortBy: (sort) => set({ sortBy: sort }),
    setDayViewBackground: (date, url) => {
        const current = { ...get().dayViewBackgrounds };
        if (url) {
            current[date] = url;
        } else {
            delete current[date];
        }
        localStorage.setItem('tasks-day-view-bgs', JSON.stringify(current));
        set({ dayViewBackgrounds: current });
    },
}));

// ─── Storage Helper ──────────────────────────────────────────────────────────

/**
 * Upload task attachment files to Google Drive.
 * Returns an array of public view URLs.
 */
async function uploadAttachmentFiles(
    _userId: string,
    _taskId: string,
    files: File[]
): Promise<string[]> {
    const { uploadFileToDrive, signIn, checkIsSignedIn } = await import('../lib/googleDrive');
    if (!checkIsSignedIn()) await signIn();

    const urls: string[] = [];
    for (const file of files) {
        try {
            const result = await uploadFileToDrive(file, file.name, file.type || 'application/octet-stream', false, undefined, 'Task Attachments');
            urls.push(result.url);
        } catch (err) {
            console.error('[taskStore] uploadAttachmentFiles error:', err);
        }
    }
    return urls;
}
