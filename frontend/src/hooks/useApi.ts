import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiResult<T> {
  url: string;
  data: T | null;
  error: string | null;
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '') url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

export function useApi<T>(path: string, params?: Record<string, string>): ApiState<T> {
  // A string, so the effect below only re-runs when the request actually changes.
  const url = buildUrl(path, params);
  const [result, setResult] = useState<ApiResult<T> | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json() as Promise<T>;
      })
      .then((data) => {
        if (!cancelled) setResult({ url, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setResult({ url, data: null, error: message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  // A result for a previous URL means the current request is still in flight.
  const current = result?.url === url ? result : null;
  return { data: current?.data ?? null, loading: current === null, error: current?.error ?? null };
}

export async function fetchApi<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const res = await fetch(buildUrl(path, params));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}
