// Server-side only — used by app/api/** route handlers to reach the FastAPI
// backend. Keeping BACKEND_URL server-side (rather than NEXT_PUBLIC_*) means
// the browser only ever talks to the Next.js origin, so CORS never enters
// the picture even though the two dev servers run on different ports.

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export class BackendUnreachableError extends Error {
  constructor(cause: unknown) {
    super(
      "Can't reach the FastAPI backend. Make sure it's running: " +
        "cd backend && uvicorn main:app --reload --port 8000",
    );
    this.cause = cause;
  }
}

export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch (err) {
    throw new BackendUnreachableError(err);
  }
}

/** Fetch + forward JSON verbatim, preserving the backend's status code. */
export async function proxyJson(path: string, init?: RequestInit) {
  const res = await backendFetch(path, init);
  const body = await res.json().catch(() => ({ error: "Backend returned a non-JSON response." }));
  return { body, status: res.status };
}
