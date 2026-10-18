'use client';

import { toast } from 'sonner';

type NotificationId = string | number;
type NotificationType = 'success' | 'error' | 'loading';

const durations = { success: 4000, error: 6000, loading: Infinity };

function show(type: NotificationType, message: string, id: NotificationId = `${type}:${message}`) {
    // Sonner updates an existing ID instead of stacking the same notification.
    return toast[type](message, {
        id,
        duration: durations[type],
    });
}

export const notify = {
    success: (message: string, id?: NotificationId) => show('success', message, id),
    error: (message: string, id?: NotificationId) => show('error', message, id),
    loading: (message: string, id?: NotificationId) => show('loading', message, id),
    dismiss: (id: NotificationId) => toast.dismiss(id),
};
