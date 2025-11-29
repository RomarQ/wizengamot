import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';
import o200k_base from 'js-tiktoken/ranks/o200k_base';

// Reuse encoder instances to avoid reloading rank data on every keystroke
const encoders = {
  o200k_base: new Tiktoken(o200k_base),
  cl100k_base: new Tiktoken(cl100k_base),
};

const DEFAULT_ENCODING = 'o200k_base';

const getEncoder = (name) => encoders[name] || encoders[DEFAULT_ENCODING];

export const inferEncoding = (model = '') => {
  const normalized = model.toLowerCase();

  // gpt-4o family and OpenAI o-series use the newer o200k tokenizer
  if (
    normalized.includes('gpt-4o') ||
    normalized.includes('gpt-4.1') ||
    normalized.includes('o1-') ||
    normalized.includes('o200k')
  ) {
    return 'o200k_base';
  }

  // Fall back to cl100k_base which matches most chat models (gpt-3.5/4, Claude, etc.)
  return 'cl100k_base';
};

export const countTokens = (text = '', encodingName = DEFAULT_ENCODING) => {
  if (!text || typeof text !== 'string') return 0;
  const encoder = getEncoder(encodingName);
  return encoder.encode(text).length;
};

export const buildHighlightsText = (comments = []) => {
  if (!comments.length) return '';

  const parts = ['The user has highlighted and commented on specific parts of previous responses:\n'];

  comments.forEach((comment) => {
    const stage = comment?.stage ?? '?';
    const model = comment?.model ?? 'model';
    const selection = comment?.selection ?? '';
    const content = comment?.content ?? '';

    parts.push(`\nStage ${stage} response from ${model}:`);
    parts.push(`Selected text: "${selection}"`);
    parts.push(`User comment: ${content}\n`);
  });

  return parts.join('\n').trim();
};

export const buildContextStackText = (segments = []) => {
  if (!segments.length) return '';

  const parts = ['The user also pinned larger context segments for your reference:\n'];

  segments.forEach((segment) => {
    const stage = segment?.stage ?? '?';
    const model = segment?.model ?? 'context';
    const label = segment?.label || 'Selected segment';
    const content = segment?.content || '';

    parts.push(`\n${label} (Stage ${stage} • ${model}):\n${content.trim()}\n`);
  });

  return parts.join('\n').trim();
};

export const computeTokenBreakdown = ({
  question = '',
  comments = [],
  segments = [],
  model = '',
} = {}) => {
  const encodingName = inferEncoding(model);
  const highlightsText = buildHighlightsText(comments);
  const contextStackText = buildContextStackText(segments);

  const promptTokens = countTokens(question, encodingName);
  const highlightTokens = countTokens(highlightsText, encodingName);
  const stackTokens = countTokens(contextStackText, encodingName);

  return {
    encodingName,
    promptTokens,
    highlightTokens,
    stackTokens,
    total: promptTokens + highlightTokens + stackTokens,
  };
};
