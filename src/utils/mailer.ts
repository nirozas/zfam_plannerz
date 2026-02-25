/**
 * Utility to send emails via the Vercel serverless function.
 * Requires RESEND_API_KEY to be set in Vercel environment variables.
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to, subject, html }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Email sending failed:', result.error);
            return { success: false, error: result.error };
        }

        return { success: true, data: result.data };
    } catch (error: any) {
        console.error('Email sending error:', error);
        return { success: false, error: error.message };
    }
}

export const createInvitationEmail = (inviterName: string, resourceName: string, type: 'trip' | 'card' | 'connection') => {
    let content = '';

    if (type === 'trip') {
        content = `${inviterName} has invited you to collaborate on the trip: <strong>${resourceName}</strong>.`;
    } else if (type === 'card') {
        content = `${inviterName} has shared a vault entry with you: <strong>${resourceName}</strong>.`;
    } else if (type === 'connection') {
        content = `${inviterName} wants to connect with you on Zoabi Planner.`;
    }

    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 10px;">
            <h2 style="color: #4f46e5;">Zoabi Planner Notification</h2>
            <p style="font-size: 16px; color: #374151;">Hello!</p>
            <p style="font-size: 16px; color: #374151;">${content}</p>
            <div style="margin-top: 30px;">
                <a href="${window.location.origin}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Workspace</a>
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #9ca3af;">If you don't have an account, you'll need to sign up with this email address to see the shared content.</p>
        </div>
    `;
};
