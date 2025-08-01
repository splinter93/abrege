export async function getSynesiaResponse(message: string, messages: any[] = []) {
  try {
    const apiKey = process.env.SYNESIA_API_KEY;
    const projectId = process.env.SYNESIA_PROJECT_ID;

    if (!apiKey || !projectId) {
      return { error: "Synesia API configuration missing. Please check SYNESIA_API_KEY and SYNESIA_PROJECT_ID environment variables." };
    }

    // Prepare message history
    const messageHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add the new message
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
      const errorData = await response.json();
      throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return { response: data.result };
  } catch (error) {
    console.error("Error calling Synesia API:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
} 