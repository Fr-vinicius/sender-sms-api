export async function withRetries(fn, retries = 3, delayMs = 500, onError) {
  let attempt = 0;
  let lastError = null;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt++;

      if (onError) {
        onError(err, attempt);
      } else {
        console.warn(
          `[withRetries] Tentativa ${attempt} falhou:`,
          err?.message || err
        );
      }

      if (attempt >= retries) {
        throw new Error(
          `[withRetries] Falhou após ${retries} tentativas: ${
            err?.message || err
          }`
        );
      }

      // Backoff exponencial
      const wait = delayMs * Math.pow(2, attempt - 1);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
}
