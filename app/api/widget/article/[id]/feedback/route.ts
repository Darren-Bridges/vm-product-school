import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const VALID_API_KEYS = ['test-api-key-123', 'mp3-api-key', 'pos2-api-key'];

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey ? VALID_API_KEYS.includes(apiKey) : false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    const { id: articleId } = await params;
    if (!articleId) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }
    const body = await request.json();
    const { feedback, reason, source, user_id, user_email, page_path } = body;
    if (!feedback || !['yes', 'no'].includes(feedback) || !source) {
      return NextResponse.json({ error: 'Missing or invalid feedback or source' }, { status: 400 });
    }
    const { error } = await supabase.from('article_feedback').insert([
      {
        article_id: articleId,
        feedback,
        reason: feedback === 'no' ? reason || null : null,
        source,
        user_id: user_id || null,
        user_email: user_email || null,
        page_path: page_path || null,
      },
    ]);
    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 