"use server";

export async function getSynesiaResponse(message: string) {
  try {
    const response = await fetch("https://api.synesia.app/execution?wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": `${process.env.SYNESIA_API_KEY}`,
      },
      body: JSON.stringify({
        reference: {
          id: "a62f3fb5-17ee-488c-b775-b57fc89c617e",
        },
        args: message,
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Synesia API error:", errorText);
        return { error: `API request failed with status ${response.status}` };
    }

    const data = await response.json();
    return { result: data.result };
  } catch (error) {
    console.error("Error calling Synesia API:", error);
    if (error instanceof Error) {
        return { error: error.message };
    }
    return { error: "An unknown error occurred." };
  }
} 