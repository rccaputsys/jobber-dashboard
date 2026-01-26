// Delay helper
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function jobberGraphQL<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(process.env.JOBBER_GRAPHQL_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-JOBBER-GRAPHQL-VERSION": "2023-11-15",
        },
        body: JSON.stringify({ query, variables }),
      });

      // Handle rate limiting (429)
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : attempt * 2000;
        console.warn(`Rate limited by Jobber. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
        await delay(waitTime);
        continue;
      }

      // Handle server errors (5xx) with retry
      if (res.status >= 500) {
        const waitTime = attempt * 1000; // Exponential backoff: 1s, 2s, 3s
        console.warn(`Jobber server error ${res.status}. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
        await delay(waitTime);
        continue;
      }

      const json = await res.json();

      if (!res.ok || json.errors) {
        throw new Error(`GraphQL error: ${JSON.stringify(json.errors ?? json)}`);
      }

      return json.data as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Don't retry on non-retryable errors (like auth failures)
      if (lastError.message.includes("GraphQL error")) {
        throw lastError;
      }

      // Retry on network errors
      if (attempt < maxRetries) {
        const waitTime = attempt * 1000;
        console.warn(`Network error. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}:`, lastError.message);
        await delay(waitTime);
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}
