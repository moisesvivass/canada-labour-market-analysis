/// <reference types="vite/client" />

// Build-time settings. VITE_ values are public (bundled into the site), so never put secrets here.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** "true" shows the "Summarize with AI" buttons. */
  readonly VITE_ENABLE_AI_INSIGHTS?: string;
}
