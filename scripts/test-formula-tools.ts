/**
 * Smoke test for Kimi Formula tools (web-search).
 * Run: npm run test:formula
 * Requires MOONSHOT_API_KEY in environment or .env.local (load manually)
 */
import {
  loadFormulaTools,
  callFormulaFiber,
  normalizeFormulaUri,
} from '../src/lib/kimi/formula';
import { runWithFormulaTools } from '../src/lib/kimi/tool-loop';

const FORMULA_URI = normalizeFormulaUri('moonshot/web-search:latest');

async function main() {
  if (!process.env.MOONSHOT_API_KEY) {
    console.error('Set MOONSHOT_API_KEY in your environment or .env.local');
    process.exit(1);
  }

  console.log('Loading tools from', FORMULA_URI);
  const { tools, toolToUri } = await loadFormulaTools([FORMULA_URI]);
  console.log(
    'Loaded tools:',
    tools.map((t) => (t.type === 'function' ? t.function.name : t.type)),
  );

  const webSearchName = tools.find(
    (t) => t.type === 'function',
  )?.function.name;
  if (!webSearchName) {
    console.error('No function tool found in formula');
    process.exit(1);
  }

  const uri = toolToUri.get(webSearchName)!;
  console.log(`\nDirect fiber test: ${webSearchName}`);
  const fiberResult = await callFormulaFiber(uri, webSearchName, {
    query: 'What is spaced repetition in learning?',
  });
  console.log(
    'Fiber output preview:',
    fiberResult.slice(0, 200) + (fiberResult.length > 200 ? '…' : ''),
  );

  console.log('\nFull tool loop test');
  const result = await runWithFormulaTools({
    model: 'kimi-k2.6',
    messages: [
      {
        role: 'user',
        content:
          'Search for a brief summary of what Context Caching is in LLM APIs. One paragraph only.',
      },
    ],
    formulaUris: [FORMULA_URI],
    thinking: 'disabled',
    maxRounds: 3,
    callbacks: {
      onToolStart: (name) => console.log(`  → tool start: ${name}`),
      onToolDone: (name, err) =>
        console.log(`  → tool done: ${name}${err ? ` (${err})` : ''}`),
    },
  });

  console.log('\nTool trace:', result.toolTrace);
  console.log('\nAssistant reply preview:');
  console.log(
    result.content.slice(0, 500) + (result.content.length > 500 ? '…' : ''),
  );
  console.log('\nFormula tools smoke test passed.');
}

main().catch((error) => {
  console.error('Formula tools test failed:', error);
  process.exit(1);
});
