import { Buffer } from "buffer";

const runtime = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
  process?: {
    browser?: boolean;
    env?: Record<string, string>;
    nextTick?: (callback: () => void) => void;
  };
};

runtime.Buffer ??= Buffer;
runtime.global ??= globalThis;
runtime.process ??= {
  browser: true,
  env: {},
  nextTick: (callback: () => void) => queueMicrotask(callback),
};
runtime.process.env ??= {};
