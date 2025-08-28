import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('❌ Erreur OAuth ChatGPT:', error);
      return NextResponse.redirect(new URL(`https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback?error=${error}`, request.url));
    }

    if (!code) {
      console.error('❌ Code OAuth manquant');
      return NextResponse.redirect(new URL(`https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback?error=missing_code`, request.url));
    }

    // Échanger le code contre une session Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError || !data.session) {
      console.error('❌ Erreur échange session:', exchangeError);
      return NextResponse.redirect(new URL(`https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback?error=session_error`, request.url));
    }

    // Créer un code OAuth pour ChatGPT
    const oauthCode = await createChatGPTOAuthCode(data.session.user.id);
    
    if (!oauthCode) {
      console.error('❌ Erreur création code OAuth ChatGPT');
      return NextResponse.redirect(new URL(`https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback?error=oauth_error`, request.url));
    }

    // Rediriger vers ChatGPT avec le code OAuth
    const chatgptCallback = `https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback?code=${oauthCode}&state=success`;
    
    console.log('✅ Redirection vers ChatGPT avec le code OAuth:', oauthCode);
    return NextResponse.redirect(chatgptCallback);

  } catch (error) {
    console.error('❌ Erreur inattendue OAuth ChatGPT:', error);
          return NextResponse.redirect(new URL(`https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback?error=unexpected_error`, request.url));
  }
}

async function createChatGPTOAuthCode(userId: string): Promise<string | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/create_oauth_code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        p_client_id: 'scrivia-custom-gpt',
        p_user_id: userId,
        p_redirect_uri: 'https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback',
        p_scopes: ['notes:read', 'notes:write', 'dossiers:read', 'dossiers:write', 'classeurs:read', 'classeurs:write'],
        p_state: 'chatgpt-oauth'
      })
    });

    if (!response.ok) {
      console.error('❌ Erreur création code OAuth:', response.status);
      return null;
    }

    const { code } = await response.json();
    return code;
  } catch (error) {
    console.error('❌ Erreur création code OAuth ChatGPT:', error);
    return null;
  }
}
