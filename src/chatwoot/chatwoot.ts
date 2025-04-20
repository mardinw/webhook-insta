
import 'dotenv/config';

const CHATWOOT_API_URL = process.env.CHATWOOT_API_URL || 'your url';
const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || 'yourid';
const CHATWOOT_API_ACCESS_TOKEN = process.env.CHATWOOT_API_ACCESS_TOKEN || 'access_token';

// Fungsi untuk mengirim pesan ke Chatwoot
export async function sendMessageToChatwoot(senderId: string, messageText: string, profile: any) {
    const INBOX_ID = 38;

    let contact = await findContact(senderId);

    if (!contact) {
        console.log('Contact not found. Creating new contact...');
        contact = await createContact(senderId, profile);

        if (!contact) {
            console.error('Failed to create contact. Aborting message sending.');
            return;
        }
    }

    const contactId = contact.id;

    // 2. Cari conversation yang ada atau buat baru
    const conversation = await findOrCreateConversation(contactId, INBOX_ID);

    if (!conversation) {
        console.error('Failed to find or create conversation.');
        return;
    }

    const conversationId = conversation.id;

    // 3. kirim pesan sebagai pelanggan/customer
    const payload = {
        content: messageText,
        message_type: 'incoming', // <-- ini kuncinya
        private: false,
    };

    const messageResponse = await fetch(`${CHATWOOT_API_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api_access_token': CHATWOOT_API_ACCESS_TOKEN,
        },
        body: JSON.stringify(payload),
    });

    // Periksa respons API untuk percakapan
    if (!messageResponse.ok) {
        console.error('Failed to send message to Chatwoot:', await messageResponse.text());
        return;
    }

    const messageData = await messageResponse.json();
    console.log('Message sent to Chatwoot successfully!', messageData);
}

async function findContact(senderId: string) {

    const response = await fetch(`${CHATWOOT_API_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/search?q=${senderId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'api_access_token': CHATWOOT_API_ACCESS_TOKEN,
        },
    });

    if (!response.ok) {
        console.error('Failed to search contact:', await response.text());
        return null;
    }

    const data = await response.json();
    return data.payload?.[0] || null;
}

// Fungsi untuk membuat kontak baru
async function createContact(senderId: string, profile: any) {
    const INBOX_ID = 38;

    const payload = {
        inbox_id: INBOX_ID,
        name: profile?.name || senderId,
        identifier: senderId,
        avatar_url: profile?.profile_pic || '',
        custom_attributes: {},
    };

    const response = await fetch(`${CHATWOOT_API_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api_access_token': CHATWOOT_API_ACCESS_TOKEN,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        console.error('Failed to create contact:', await response.text());
        return null;
    }

    const data = await response.json();
    return data.payload;
}


// Helper function untuk mencari/buat conversation
async function findOrCreateConversation(contactId: number, inboxId: number) {
    const response = await fetch(
        `${CHATWOOT_API_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/search?inbox_id=${inboxId}&contact_id=${contactId}`,
        {
            headers: {
                'api_access_token': CHATWOOT_API_ACCESS_TOKEN,
            },
        }
    );

    if (response.ok) {
        const data = await response.json();
        if (data.payload.length > 0) {
            return data.payload[0]; // Return existing conversation
        }
    }

    // Buat conversation baru jika tidak ada
    const newConversation = await fetch(
        `${CHATWOOT_API_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api_access_token': CHATWOOT_API_ACCESS_TOKEN,
            },
            body: JSON.stringify({
                contact_id: contactId,
                inbox_id: inboxId,
            }),
        }
    );

    return newConversation.ok ? await newConversation.json() : null;
}
