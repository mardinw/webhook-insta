import { Hono, type Context, type Next } from 'hono';
import 'dotenv/config';
import { sendMessageToChatwoot } from './chatwoot/chatwoot.js';
import { getInstagramProfile, replyToInstagram } from './instagram/instagram.js';
import { verifySignatureMiddleware } from './webhook/webhook.js';

const app = new Hono();

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'verify_token';


// Handler untuk verifikasi webhook (GET /webhook)
app.get('/webhook', (c: Context) => {
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return c.text(challenge ?? '', 200);
        } else {
            return c.text('Forbidden', 403);
        }
    }
    return c.text('Bad Request', 400);
});

// Handler untuk webhook event (POST /webhook)
app.post('/webhook', verifySignatureMiddleware, async (c: Context) => {
    try {
        const rawBody = c.get('rawBody') as string;
        console.log('Raw body received in POST handler:', rawBody); // Log raw body

        const body = JSON.parse(rawBody) as WebhookRequestBody;

        console.log('Received verified webhook event:', JSON.stringify(body, null, 2));

        if (body.object !== 'page' && body.object !== 'instagram') {
            return c.text('Not Found', 404);
        }

        for (const entry of body.entry) {
            const messagingEvents = entry.messaging ?? [];

            for (const event of messagingEvents) {
                if (event.message) {
                    const senderId = event.sender.id;
                    const messageText = event.message.text;

                    console.log(`Received message from ${senderId}: ${messageText}`);
                    // Ambil profile Instagram sebelum mengirim ke Chatwoot
                    const profile = await getInstagramProfile(senderId);
                    if (!profile) {
                        console.error('Failed to fetch Instagram profile. Skipping message send.');
                        return;
                    }


                    await sendMessageToChatwoot(senderId, messageText, profile);
                }
            }
        }

        return c.text('EVENT_RECEIVED', 200);
    } catch (error) {
        console.error('Error handling webhook event:', error);
        return c.text('Internal Server Error', 500);
    }
});

app.post('/chatwoot-webhook', async (c: Context) => {
    try {
        const body = await c.req.json();

        console.log('Received Chatwoot webhook:', JSON.stringify(body, null, 2));

        if (body.event === 'message_created') {
            const messageType = body.message_type; // incoming/outgoing
            const content = body.content;
            console.log(content);
            const senderId = body.conversation.meta.sender.identifier; // PSID Instagram user
            console.log(senderId);

            if (messageType === 'outgoing' && senderId) {
                console.log(`Sending reply to Instagram user ${senderId}: ${content}`);
                await replyToInstagram(senderId, content);
            }
        }

        return c.text('OK', 200);
    } catch (error) {
        console.error('Error handling Chatwoot webhook:', error);
        return c.text('Internal Server Error', 500);
    }
});


export default app;