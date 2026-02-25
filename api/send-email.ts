import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Zoabi Planner <notifications@resend.dev>', // Or their verified domain
            to,
            subject,
            html,
        });

        if (error) {
            return res.status(400).json({ error });
        }

        return res.status(200).json({ data });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}
