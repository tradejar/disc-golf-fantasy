export async function sendErrorWebhook(message: string) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('No Webhook URL configured. Skipping alert:', message);
        return;
    }

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `🚨 **Disc Golf Fantasy Alert** 🚨\n${message}` // Discord format
            }),
        });
    } catch (e) {
        console.error('Failed to send webhook alert:', e);
    }
}
