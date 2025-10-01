/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  // adicione mais variáveis de ambiente conforme necessário
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}