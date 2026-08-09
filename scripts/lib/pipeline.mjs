import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retryAfterMs(response) {
  const value = response.headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
}

function combinedSignal(existing, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!existing) return timeout;
  return AbortSignal.any([existing, timeout]);
}

/**
 * Fetch with bounded exponential backoff for transient HTTP, network, body-read,
 * parsing, and semantic-validation errors.
 *
 * `responseHandler` runs inside the retry boundary. This matters for upstreams
 * that sometimes return an HTTP 200 with a truncated or alternate payload.
 */
export async function fetchWithRetry(
  url,
  init = {},
  {
    attempts = 3,
    baseDelayMs = 750,
    maxDelayMs = 5_000,
    maxRetryAfterMs = 60_000,
    timeoutMs = 20_000,
    jitterRatio = 0.2,
    fetchImpl = globalThis.fetch,
    sleepImpl = delay,
    onRetry,
    responseHandler,
  } = {}
) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new TypeError("attempts must be a positive integer");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetch implementation is not available");
  }

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        ...init,
        signal: combinedSignal(init.signal, timeoutMs),
      });
      if (response.ok) {
        return responseHandler ? await responseHandler(response) : response;
      }

      const error = new Error(`HTTP ${response.status} for ${url}`);
      error.status = response.status;
      if (!RETRYABLE_STATUS.has(response.status) || attempt === attempts) {
        throw error;
      }

      lastError = error;
      const serverDelay = retryAfterMs(response);
      if (serverDelay != null && serverDelay > maxRetryAfterMs) {
        const retryError = new Error(
          `HTTP ${response.status} for ${url} requested a ${serverDelay}ms Retry-After, exceeding the ${maxRetryAfterMs}ms safety cap`
        );
        retryError.status = response.status;
        throw retryError;
      }
      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = exponential * jitterRatio * Math.random();
      const waitMs = serverDelay ?? Math.min(maxDelayMs, exponential + jitter);
      onRetry?.({ attempt, attempts, error, waitMs, url });
      await sleepImpl(waitMs);
    } catch (error) {
      if (error?.status != null) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === attempts) break;
      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = exponential * jitterRatio * Math.random();
      const waitMs = Math.min(maxDelayMs, exponential + jitter);
      onRetry?.({ attempt, attempts, error: lastError, waitMs, url });
      await sleepImpl(waitMs);
    }
  }

  throw new Error(
    `Request failed after ${attempts} attempts for ${url}: ${lastError?.message || "unknown error"}`,
    { cause: lastError }
  );
}

export async function fetchTextWithRetry(url, init, options = {}) {
  const { transform, ...retryOptions } = options;
  return fetchWithRetry(url, init, {
    ...retryOptions,
    responseHandler: async (response) => {
      const text = await response.text();
      return transform ? transform(text) : text;
    },
  });
}

export async function fetchJsonWithRetry(url, init, options = {}) {
  const { transform, ...retryOptions } = options;
  return fetchWithRetry(url, init, {
    ...retryOptions,
    responseHandler: async (response) => {
      const value = await response.json();
      return transform ? transform(value) : value;
    },
  });
}

export async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

/** Replace a JSON file only after a complete temp file is written beside it. */
export async function writeJsonAtomic(filePath, value, { space = 2 } = {}) {
  const directory = dirname(filePath);
  const tempPath = join(
    directory,
    `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
  );
  await mkdir(directory, { recursive: true });

  try {
    const payload = `${JSON.stringify(value, null, space)}\n`;
    await writeFile(tempPath, payload, { encoding: "utf8", flag: "wx" });
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

/** Validate against the last-good snapshot, then atomically replace it. */
export async function writeValidatedJsonAtomic(filePath, value, validate, options) {
  const previous = await readJsonIfExists(filePath);
  const validation = validate(value, { previous });
  await writeJsonAtomic(filePath, value, options);
  return validation;
}
