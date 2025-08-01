import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, messages } = await request.json();
    
    console.log("[Synesia API] 🚀 Début de la requête");
    console.log("[Synesia API] 📦 Body reçu:", { message, messages });

    const apiKey = process.env.SYNESIA_API_KEY;
    const projectId = process.env.SYNESIA_PROJECT_ID;

    if (!apiKey || !projectId) {
      console.log("[Synesia API] ❌ Configuration manquante");
      return NextResponse.json(
        { error: "Synesia API configuration missing. Please check SYNESIA_API_KEY and SYNESIA_PROJECT_ID environment variables." },
        { status: 500 }
      );
    }
    
    console.log("[Synesia API] 🔑 API Key:", apiKey ? "✅ Présent" : "❌ Manquant");
    console.log("[Synesia API] 🆔 Project ID:", projectId ? "✅ Présent" : "❌ Manquant");

    // Prepare message history - only last 10 messages
    const recentMessages = messages.slice(-10);
    const messageHistory = recentMessages.map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content
    }));

    // Add the new message
    messageHistory.push({
      role: "user",
      content: message
    });

    const payload = {
      callable_id: "a62f3fb5-17ee-488c-b775-b57fc89c617e",
      args: message,
      settings: {
        history_messages: messageHistory
      }
    };
    
    console.log("[Synesia API] 📤 Payload envoyé:", payload);
    
    const response = await fetch("https://api.synesia.app/execution?wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `ApiKey ${apiKey}`,
        "X-Project-ID": projectId,
      },
      body: JSON.stringify(payload),
    });

    console.log("[Synesia API] 📡 Status de la réponse:", response.status);
    console.log("[Synesia API] 📡 Headers de la réponse:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log("[Synesia API] ❌ Erreur API:", errorData);
      return NextResponse.json(
        { error: `API request failed with status ${response.status}: ${JSON.stringify(errorData)}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ response: data.result });

  } catch (error) {
    console.error("Error calling Synesia API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
} 