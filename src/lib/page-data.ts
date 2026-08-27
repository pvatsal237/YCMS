import { logServerError } from "@/lib/errors";

export async function loadPageData<T>(context: string, load: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    logServerError(context, error);
    return { ok: false };
  }
}
