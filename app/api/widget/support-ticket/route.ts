import { NextRequest, NextResponse } from 'next/server';

const ZENDESK_DOMAIN = 'vm-testing.zendesk.com';
const ZENDESK_EMAIL = process.env.ZENDESK_EMAIL; // e.g. 'your-email@domain.com/token'
const ZENDESK_TOKEN = process.env.ZENDESK_TOKEN; // API token only, do not hardcode

async function uploadAttachment(base64: string, filename: string, type: string): Promise<string> {
  // Remove data URL prefix if present
  const base64Data = base64.split(',')[1];
  const buffer = Buffer.from(base64Data, 'base64');
  const res = await fetch(`https://${ZENDESK_DOMAIN}/api/v2/uploads.json?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${ZENDESK_EMAIL}:${ZENDESK_TOKEN}`).toString('base64'),
      'Content-Type': type,
    },
    body: buffer,
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Zendesk upload error:', errText);
    throw new Error('Failed to upload attachment: ' + errText);
  }
  const data = await res.json();
  return data.upload.token;
}

interface ZendeskTicketPayload {
  ticket: {
    subject: string;
    comment: {
      body: string;
      uploads?: string[];
    };
    requester: {
      name: string;
      email: string;
    };
    priority?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, file, screenshot, console: logs, network, video, localStorage: localStorageAttachment, priority } = body;
    const uploadTokens: string[] = [];

    // Upload file if present
    if (file && file.base64 && file.name && file.type) {
      try {
        const token = await uploadAttachment(file.base64, file.name, file.type);
        uploadTokens.push(token);
      } catch {
        // Continue without file if upload fails
      }
    }
    // Upload video if present
    if (video && video.base64 && video.name && video.type) {
      try {
        const token = await uploadAttachment(video.base64, video.name, video.type);
        uploadTokens.push(token);
      } catch {
        // Continue without video if upload fails
      }
    }
    // Upload localStorage if present
    if (localStorageAttachment && localStorageAttachment.base64 && localStorageAttachment.name && localStorageAttachment.type) {
      try {
        const token = await uploadAttachment(localStorageAttachment.base64, localStorageAttachment.name, localStorageAttachment.type);
        uploadTokens.push(token);
      } catch {
        // Continue without localStorage if upload fails
      }
    }
    // Upload screenshot if present
    if (screenshot) {
      try {
        const token = await uploadAttachment(screenshot, 'screenshot.png', 'image/png');
        uploadTokens.push(token);
      } catch {
        // Continue without screenshot if upload fails
      }
    }
    // Upload console logs as text file if present
    if (logs && Array.isArray(logs) && logs.length > 0) {
      try {
        const logsText = logs.map((l: { ts: string; type: string; args: unknown[] }) => `[${l.ts}] [${l.type}] ${l.args.map((a: unknown) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`).join('');
        const logsBase64 = Buffer.from(logsText, 'utf-8').toString('base64');
        const token = await uploadAttachment('data:text/plain;base64,' + logsBase64, 'console-logs.txt', 'text/plain');
        uploadTokens.push(token);
      } catch {
        // Continue without logs if upload fails
      }
    }
    // Upload network activity as text file if present
    if (network && Array.isArray(network) && network.length > 0) {
      try {
        const networkText = JSON.stringify(network, null, 2);
        const networkBase64 = Buffer.from(networkText, 'utf-8').toString('base64');
        const token = await uploadAttachment('data:text/plain;base64,' + networkBase64, 'network-activity.txt', 'text/plain');
        uploadTokens.push(token);
      } catch {
        // Continue without network if upload fails
      }
    }

    // Compose ticket payload
    const payload: ZendeskTicketPayload = {
      ticket: {
        subject: `Support request from ${name}`,
        comment: {
          body: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
        },
        requester: { name, email },
      },
    };
    if (priority) {
      payload.ticket.priority = priority;
    }
    if (uploadTokens.length > 0) {
      payload.ticket.comment.uploads = uploadTokens;
    }

    // Create ticket
    const resZendesk = await fetch(`https://${ZENDESK_DOMAIN}/api/v2/tickets.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${ZENDESK_EMAIL}:${ZENDESK_TOKEN}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!resZendesk.ok) {
      const error = await resZendesk.text();
      return NextResponse.json({ error }, { status: 500 });
    }
    const data = await resZendesk.json();
    return NextResponse.json({ ticket: data.ticket });
  } catch (err: unknown) {
    console.error('Support ticket error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
} 