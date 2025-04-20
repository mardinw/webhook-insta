
import 'dotenv/config';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'your_page_access_token';

export async function replyToInstagram(senderId: string, messageText: string) {
    const url = `https://graph.facebook.com/v22.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    const payload = {
        messaging_type: 'RESPONSE',
        recipient: {
            id: senderId,
        },
        message: {
            text: messageText,
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        console.error('Failed to send reply to Instagram:', await response.text());
    } else {
        console.log('Successfully sent reply to Instagram!');
    }
}

// Fungsi untuk mengambil profile Instagram
export async function getInstagramProfile(senderId: string) {
    const response = await fetch(`https://graph.facebook.com/${senderId}?fields=id,name,profile_pic&access_token=${PAGE_ACCESS_TOKEN}`, {
        method: 'GET'
    });

    if (!response.ok) {
        console.error('Failed to fetch Instagram profile:', await response.text());
        return null;
    }

    const data = await response.json();
    return data;
}