import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mastraDir = path.dirname(fileURLToPath(import.meta.url));

/** Absolute LibSQL URL shared when Next.js and Mastra run as separate processes. */
export const mastraDbUrl = `file:${path.join(mastraDir, '..', '..', 'mastra.db')}`;
