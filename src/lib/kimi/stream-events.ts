export type StreamEvent =
  | { type: 'reasoning'; text: string }
  | { type: 'content'; text: string }
  | {
      type: 'tool';
      name: string;
      status: 'running' | 'done' | 'error';
      detail?: string;
    }
  | { type: 'done' }
  | { type: 'error'; message: string };
