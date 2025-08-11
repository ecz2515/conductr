import { Redis } from "@upstash/redis";

type Store = {
  set: (key: string, value: string, opts?: { ex?: number }) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  del: (key: string) => Promise<void>;
};

function makeMemoryStore(): Store {
  const mem = new Map<string, { v: string; exp: number }>();
  return {
    async set(key, value, opts) {
      const exp = opts?.ex ? Date.now() + opts.ex * 1000 : Number.POSITIVE_INFINITY;
      mem.set(key, { v: value, exp });
    },
    async get(key) {
      const e = mem.get(key);
      if (!e) return null;
      if (e.exp < Date.now()) { mem.delete(key); return null; }
      return e.v;
    },
    async del(key) { mem.delete(key); },
  };
}

export function createStateStore(): Store {
  try {
    // Throws if UPSTASH_* envs are missing
    const redis = Redis.fromEnv();
    return {
      async set(key, value, opts) { await redis.set(key, value, opts as any); },
      async get(key) { return (await redis.get<string>(key)) ?? null; },
      async del(key) { await redis.del(key); },
    };
  } catch {
    console.warn("[stateStore] Falling back to in-memory store (no Upstash env).");
    return makeMemoryStore();
  }
}

export const stateStore = createStateStore();
