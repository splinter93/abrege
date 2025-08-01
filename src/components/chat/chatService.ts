"use server";

export async function getSynesiaResponse(message: string, messages: any[] = []) {
  try {
    const apiKey = process.env.SYNESIA_API_KEY;
    const projectId = process.env.SYNESIA_PROJECT_ID;
    
    if (!apiKey || !projectId) {
      return { error: "Synesia API configuration missing. Please check SYNESIA_API_KEY and SYNESIA_PROJECT_ID environment variables." };
    }

    // Préparer l'historique des messages
    const messageHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Ajouter le nouveau message
    messageHistory.push({
      role: "user",
      content: message
    });

    const response = await fetch("https://api.synesia.app/execution?wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `ApiKey ${apiKey}`,
        "X-Project-ID": projectId,
      },
      body: JSON.stringify({
        callable_id: "a62f3fb5-17ee-488c-b775-b57fc89c617e",
        args: {
          messages: messageHistory
        }
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Synesia API error:", errorText);
        return { error: `API request failed with status ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { result: data.result || data.content || data.message };
  } catch (error) {
    console.error("Error calling Synesia API:", error);
    if (error instanceof Error) {
        return { error: error.message };
    }
    return { error: "An unknown error occurred." };
  }
} 