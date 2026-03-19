import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const scheduleTaskNotification = async (taskId: string, title: string, body: string, scheduleDate: string, scheduleTime?: string) => {
    if (!Capacitor.isNativePlatform()) {
        console.log('[notifications] Not on native platform, skipping scheduling.');
        return;
    }

    try {
        const platform = Capacitor.getPlatform();
        if (platform === 'web') {
            const permission = await LocalNotifications.requestPermissions();
            if (permission.display !== 'granted') {
                console.warn('[notifications] Permission not granted.');
                return;
            }
        }

        // Parse date and time
        const [year, month, day] = scheduleDate.split('-').map(Number);
        const [hour, minute] = scheduleTime ? scheduleTime.split(':').map(Number) : [9, 0];

        const date = new Date(year, month - 1, day, hour, minute);

        // Don't schedule for the past
        if (date < new Date()) {
            console.warn('[notifications] Schedule time is in the past, skipping.');
            return;
        }

        await LocalNotifications.schedule({
            notifications: [
                {
                    title,
                    body,
                    id: Math.floor(Math.random() * 1000000), // Random ID
                    schedule: { at: date },
                    extra: { taskId }
                }
            ]
        });
        console.log(`[notifications] Scheduled "${title}" for ${date.toLocaleString()}`);
    } catch (error) {
        console.error('[notifications] Error scheduling notification:', error);
    }
};

export const cancelAllTaskNotifications = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel(pending);
        }
    } catch (error) {
        console.error('[notifications] Error cancelling notifications:', error);
    }
};

export const requestNotificationPermission = async () => {
    if (!Capacitor.isNativePlatform()) return false;
    try {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
    } catch (error) {
        console.error('[notifications] Error requesting permission:', error);
        return false;
    }
};
