import { NextResponse } from "next/server";

export const noStoreHeaders = { "Cache-Control": "no-store" } as const;

export function jsonNoStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...noStoreHeaders, ...(init?.headers ?? {}) },
  });
}
