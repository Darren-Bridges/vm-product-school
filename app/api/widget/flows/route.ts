import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    // Get API key from headers
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401, headers: corsHeaders });
    }

    // Fetch all flows from the database, prioritizing the default flow
    const { data: flows, error } = await supabase
      .from('web_widget_flows')
      .select('id, name, slug, flow_data, is_default, updated_at')
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching flows:', error);
      return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({
      flows: flows || [],
      success: true
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in flows API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
} 