export async function getSynesiaResponse(message: string, messages: any[] = []) {
  try {
    const response = await fetch("/api/chat/synesia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        messages
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return { response: data.response };
  } catch (error) {
    console.error("Error calling Synesia API:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
} 