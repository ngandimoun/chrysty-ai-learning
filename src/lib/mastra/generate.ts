import { getMastraClient } from './client';
import { buildWorkflowInput, toAppSession } from './session';
import type { SessionType } from '@/types/session';

const SESSION_WORKFLOW_ID = 'session-generate-workflow';

interface GenerateSessionParams {
  sessionId: string;
  type: SessionType;
  prompt: string;
  fileContext?: string;
  userId?: string;
  learnerMemoryContext?: string;
  practicePlan?: string;
}

export async function generateSessionViaMastra(params: GenerateSessionParams) {
  const client = getMastraClient();
  const workflow = client.getWorkflow(SESSION_WORKFLOW_ID);
  const run = await workflow.createRun({ resourceId: params.userId ?? params.sessionId });

  const result = await run.startAsync({
    inputData: buildWorkflowInput(params),
  });

  if (result.status !== 'success' || !result.result) {
    const message =
      result.status === 'failed'
        ? result.error.message
        : `Workflow failed with status: ${result.status}`;
    throw new Error(message);
  }

  return toAppSession(params.sessionId, params.type, result.result);
}
