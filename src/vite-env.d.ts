/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string;
  readonly VITE_ENABLE_DEBUG_TOOLS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
