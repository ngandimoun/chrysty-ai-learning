import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import {
  Observability,
  MastraStorageExporter,
  MastraPlatformExporter,
  SensitiveDataFilter,
} from '@mastra/observability';
import { mastraDbUrl } from './lib/db-path';
import { weatherWorkflow } from './workflows/weather-workflow';
import { sessionGenerateWorkflow } from './workflows/session-generate-workflow';
import { weatherAgent } from './agents/weather-agent';
import { tutorAgent } from './agents/tutor-agent';
import {
  learnSessionAgent,
  practiceSessionAgent,
  thinkSessionAgent,
} from './agents/session-generate-agents';
import {
  toolCallAppropriatenessScorer,
  completenessScorer,
  translationScorer,
} from './scorers/weather-scorer';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, sessionGenerateWorkflow },
  agents: {
    weatherAgent,
    tutorAgent,
    learnSessionAgent,
    practiceSessionAgent,
    thinkSessionAgent,
  },
  scorers: {
    toolCallAppropriatenessScorer,
    completenessScorer,
    translationScorer,
  },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: mastraDbUrl,
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
  }),
  backgroundTasks: {
    enabled: true,
    globalConcurrency: 10,
    perAgentConcurrency: 5,
    backpressure: 'queue',
    defaultTimeoutMs: 300_000,
  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(),
          new MastraPlatformExporter(),
        ],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
