// Utility function to retry async operations with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 4,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      const msg = lastError.message.toLowerCase();

      // Check if it's a retryable error (network issues OR quota/rate-limit)
      const isRetryableError = 
        msg.includes('service is currently unavailable') ||
        msg.includes('unavailable') ||
        msg.includes('service unavailable') ||
        msg.includes('connection terminated unexpectedly') ||
        msg.includes('failed to fetch') ||
        msg.includes('networkerror') ||
        msg.includes('network') ||
        msg.includes('econnreset') ||
        msg.includes('timeout') ||
        msg.includes('quota exceeded') ||
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('too many requests') ||
        msg.includes('429') ||
        msg.includes('could not find endpoint');
      
      // If not a retryable error or last attempt, throw immediately
      if (!isRetryableError || attempt === maxRetries) {
        throw lastError;
      }
      
      // Quota errors need a longer cooldown (at least 5 s on first retry)
      const isQuotaError =
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('too many requests') ||
        msg.includes('429');

      const delay = isQuotaError
        ? Math.max(5000, baseDelay * Math.pow(2, attempt))
        : baseDelay * Math.pow(2, attempt);
      
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms... (${lastError.message})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/** Small helper – wait a given number of milliseconds */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
