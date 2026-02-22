/**
 * recurringUtils.ts
 *
 * Shared utility for determining whether a recurring or one-time task
 * is visible on a given calendar date.
 *
 * Key correctness rules:
 *  - Date strings ('YYYY-MM-DD') are parsed in LOCAL time to avoid
 *    UTC-boundary timezone bugs (e.g. UTC-8 where `new Date('2026-02-19')`
 *    becomes Feb 18 16:00 locally).
 *  - Weekly tasks without explicit daysOfWeek show every day.
 *  - Monthly tasks without explicit dayOfMonth fall back to the
 *    day-of-month of their startDate (or dateAdded).
 */

import type { Task } from '../store/taskStore';

/** Parse a YYYY-MM-DD string as a LOCAL midnight Date (no timezone shift). */
/** Parse a YYYY-MM-DD string (or ISO prefix) as a LOCAL midnight Date. */
export const localDate = (dateStr: string): Date => {
    // Ensure we only look at YYYY-MM-DD part
    const cleanStr = dateStr.slice(0, 10);
    const [y, m, d] = cleanStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};

/** Format a Date as YYYY-MM-DD in local time. */
export const toDateStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Returns true if `task` should appear on `checkDate`.
 * Works for both one-time and recurring tasks.
 */
export const isTaskVisibleOnDate = (task: Task, checkDate: Date): boolean => {
    // ── One-time task ──────────────────────────────────────────────────────
    if (!task.isRecurring) {
        if (task.dueDate) {
            // dueDate is an ISO string; compare only the date portion in local time
            const due = localDate(task.dueDate);
            return (
                due.getFullYear() === checkDate.getFullYear() &&
                due.getMonth() === checkDate.getMonth() &&
                due.getDate() === checkDate.getDate()
            );
        }
        return false;
    }

    // ── Chrome/Refactor: Check Recurrence ──────────────────────────────────
    const rec = task.recurrence;
    if (!rec) return false; // isRecurring=true but no rule — skip gracefully

    // ── Bound checks (parsed as local dates) ──────────────────────────
    if (rec.startDate) {
        const start = localDate(rec.startDate);
        // Normalize to midnight for pure date comparison
        start.setHours(0, 0, 0, 0);
        const check = new Date(checkDate);
        check.setHours(0, 0, 0, 0);
        if (check < start) return false;
    }
    if (rec.endDate) {
        const end = localDate(rec.endDate);
        end.setHours(23, 59, 59, 999);
        const check = new Date(checkDate);
        check.setHours(0, 0, 0, 0);
        if (check > end) return false;
    }

    // ── Recurrence type checks ─────────────────────────────────────────
    switch (rec.type) {
        case 'daily':
            return true;

        case 'weekly':
            if (rec.daysOfWeek && rec.daysOfWeek.length > 0) {
                // User specified specific days of week
                return rec.daysOfWeek.includes(checkDate.getDay());
            } else {
                // Fallback: repeat on same weekday as start date (or dateAdded)
                const anchorRaw = rec.startDate || task.dateAdded;
                if (!anchorRaw) return false; // Should not happen
                const anchor = localDate(anchorRaw);
                return checkDate.getDay() === anchor.getDay();
            }

        case 'monthly': {
            // Which day-of-month should this repeat on?
            let repeatDay: number;
            if (rec.dayOfMonth != null) {
                repeatDay = rec.dayOfMonth;
            } else {
                const anchorRaw = rec.startDate || task.dateAdded;
                repeatDay = localDate(anchorRaw).getDate();
            }
            return checkDate.getDate() === repeatDay;
        }

        case 'yearly': {
            // Repeat on same month+day as startDate or dateAdded
            const anchorRaw = rec.startDate || task.dateAdded;
            const anchor = localDate(anchorRaw);
            return (
                checkDate.getMonth() === anchor.getMonth() &&
                checkDate.getDate() === anchor.getDate()
            );
        }

        default:
            return false;
    }
};
