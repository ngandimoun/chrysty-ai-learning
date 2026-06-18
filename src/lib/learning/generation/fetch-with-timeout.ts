export function isFetchTimeoutError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

export function isGatewayTimeoutResponse(response: Response): boolean {
  return response.status === 504 || response.status === 502;
}

export interface FetchWithTimeoutAndRetryOptions {
  timeoutMs: number;
  retries?: number;
}

export async function fetchWithTimeoutAndRetry(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: FetchWithTimeoutAndRetryOptions,
): Promise<Response> {
  const retries = options.retries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(options.timeoutMs),
      });

      if (isGatewayTimeoutResponse(response) && attempt < retries) {
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (isFetchTimeoutError(error) && attempt < retries) {
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error('Request failed');
}
