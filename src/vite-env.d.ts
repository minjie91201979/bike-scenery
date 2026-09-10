/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MUSIC_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
