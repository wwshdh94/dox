import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { handleOcrExtract } from './server/ocrExtractHandler';

const SERVER_ENV_KEYS = ['OPENAI_API_KEY', 'OPENAI_OCR_MODEL', 'GOOGLE_CLOUD_VISION_API_KEY'] as const;

/** Dev-only API route for cloud OCR — keys stay server-side. */
export function ocrApiPlugin(): Plugin {
  return {
    name: 'prevault-ocr-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, '');
      for (const key of SERVER_ENV_KEYS) {
        if (env[key]) process.env[key] = env[key];
      }

      server.middlewares.use('/api/ocr/extract', (req, res) => {
        void handleOcrExtract(req, res);
      });
    },
  };
}
