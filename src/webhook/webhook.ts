import type { Context, Next } from "hono";
import crypto from 'crypto';

import 'dotenv/config';

const APP_SECRET = process.env.APP_SECRET || 'your_app_secret';

export async function verifySignatureMiddleware(c: Context, next: Next) {
    const signature = c.req.header('x-hub-signature');

    // Baca raw body
    const rawBody = await c.req.text();

    if (!signature) {
        console.warn('Warning: No X-Hub-Signature found. Skipping verification (development mode).');
        c.set('rawBody', rawBody); // simpan body di context buat dipakai di handler
        await next();
        return;
    }

    try {
        const [method, hash] = signature.split('=');
        const expectedHash = crypto
            .createHmac('sha1', APP_SECRET)
            .update(rawBody, 'utf-8')
            .digest('hex');

        if (hash !== expectedHash) {
            console.error('Invalid request signature');
            return c.text('Forbidden', 403);
        }

        // Kalau lolos, simpan raw body untuk lanjut parsing
        c.set('rawBody', rawBody);
        await next();
    } catch (error) {
        console.error('Signature Verification Failed:', error);
        return c.text('Forbidden', 403);
    }
}