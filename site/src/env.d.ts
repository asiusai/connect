/// <reference types="astro/client" />

declare module 'astro:content' {
  export const defineCollection: (config: {
    loader: ReturnType<typeof import('astro/loaders').glob>
    schema: import('zod').ZodObject<Record<string, import('zod').ZodType>>
  }) => unknown

  export const z: typeof import('zod').z
}
