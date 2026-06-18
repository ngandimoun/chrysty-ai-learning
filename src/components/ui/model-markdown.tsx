'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils';

interface ModelMarkdownProps {
  content: string;
  className?: string;
}

export function ModelMarkdown({ content, className }: ModelMarkdownProps) {
  if (!content.trim()) return null;

  return (
    <div className={cn('model-markdown text-reading', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
