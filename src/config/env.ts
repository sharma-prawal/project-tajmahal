export const env = {
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  enableDebugTools: import.meta.env.VITE_ENABLE_DEBUG_TOOLS === 'true',
} as const;
