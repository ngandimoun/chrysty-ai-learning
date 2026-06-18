'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import {
  ArrowUp,
  BookOpen,
  Brain,
  Dumbbell,
  Paperclip,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MadeInChrysty } from '@/components/brand/made-in-chrysty';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  COMPOSER_PLACEHOLDERS,
  COMPOSER_PROMPTS,
  COMPOSER_SUGGESTION_HINTS,
} from '@/constants/composer-prompts';
import { THINK_MODE_ENABLED } from '@/constants/features';
import { PracticeSetupPanel } from '@/components/practice/practice-setup-panel';
import { practicePromptForTopic } from '@/hooks/use-learner-journey';
import type { JourneyTopicSummary } from '@/lib/learning/memory/journey-summary';
import {
  buildPracticeSetupSummary,
  type PracticeSessionConfig,
} from '@/types/practice-config';
import type { SessionType } from '@/types/session';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollHintPanel } from '@/components/ui/scroll-hint-panel';

const SECTIONS: {
  type: SessionType;
  label: string;
  icon: typeof BookOpen;
  comingSoon?: boolean;
}[] = [
  { type: 'learn', label: 'Learn', icon: BookOpen },
  { type: 'practice', label: 'Practice', icon: Dumbbell },
  {
    type: 'think',
    label: 'Think',
    icon: Brain,
    comingSoon: !THINK_MODE_ENABLED,
  },
];

const SECTION_LABELS: Record<SessionType, string> = {
  learn: 'Learn',
  practice: 'Practice',
  think: 'Think',
};

export interface AttachedFile {
  id: string;
  filename: string;
}

export interface SessionComposerInterfaceProps {
  activeSection: SessionType;
  onSectionChange: (section: SessionType) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onCreate: (section: SessionType) => void | Promise<void>;
  onImprovePrompt?: () => void | Promise<void>;
  isEnhancingPrompt?: boolean;
  isCreating?: boolean;
  attachedFiles?: AttachedFile[];
  onAttachFile?: (file: File) => void | Promise<void>;
  onRemoveFile?: (fileId: string) => void;
  isUploadingFile?: boolean;
  journeyTopics?: JourneyTopicSummary[];
  onSelectJourneyTopic?: (prompt: string) => void;
  onSelectPracticeTopic?: (
    prompt: string,
    sourceLearnSessionId?: string,
  ) => void;
  practiceConfig?: PracticeSessionConfig;
  onPracticeConfigChange?: (config: PracticeSessionConfig) => void;
}

export function SessionComposerInterface({
  activeSection,
  onSectionChange,
  inputValue,
  onInputChange,
  onCreate,
  onImprovePrompt,
  isEnhancingPrompt = false,
  isCreating = false,
  attachedFiles = [],
  onAttachFile,
  onRemoveFile,
  isUploadingFile = false,
  journeyTopics = [],
  onSelectJourneyTopic,
  onSelectPracticeTopic,
  practiceConfig,
  onPracticeConfigChange,
}: SessionComposerInterfaceProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSection]);

  const suggestions = COMPOSER_PROMPTS[activeSection];

  const handleCommandSelect = (command: string) => {
    onInputChange(command);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && inputValue.trim()) {
      e.preventDefault();
      onCreate(activeSection);
    }
  };

  return (
    <div className="flex flex-col bg-background p-6 sm:p-8">
      <div className="mx-auto flex w-full max-w-full flex-1 flex-col items-center">
        <ComposerLogo />

        <div className="mb-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <h2 className="mb-1 text-2xl font-semibold text-foreground">
              {isCreating
                ? 'Generating your session…'
                : `Start a ${SECTION_LABELS[activeSection]} session`}
            </h2>
            <p className="max-w-xl text-base text-muted-foreground">
              {isCreating
                ? 'Chrysty is building your session. This may take a moment.'
                : 'Describe what you want to study, practice, or explore.'}
            </p>
          </motion.div>
        </div>

        <div className="mb-4 w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="p-5">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={COMPOSER_PLACEHOLDERS[activeSection]}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCreating}
              className="field-sizing-content max-h-[min(16rem,40vh)] min-h-[1.75rem] w-full resize-none overflow-y-auto bg-transparent text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60 sm:text-lg"
            />
            {activeSection === 'learn' && attachedFiles.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {attachedFiles.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground"
                  >
                    <span className="max-w-[12rem] truncate">{file.filename}</span>
                    {onRemoveFile ? (
                      <button
                        type="button"
                        onClick={() => onRemoveFile(file.id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${file.filename}`}
                      >
                        <X className="size-3" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {activeSection === 'practice' && practiceConfig ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Setup: {buildPracticeSetupSummary(practiceConfig)}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="flex items-center gap-1">
              {activeSection === 'learn' && onAttachFile ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onAttachFile(file);
                      e.target.value = '';
                    }}
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={isCreating || isUploadingFile}
                          onClick={() => fileInputRef.current?.click()}
                          aria-label="Attach document or image"
                          className="text-muted-foreground hover:text-foreground"
                        />
                      }
                    >
                      <Paperclip className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Attach PDF, doc, image, or video (Learn)
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : null}
              {onImprovePrompt ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void onImprovePrompt()}
                      disabled={
                        isCreating || isEnhancingPrompt || !inputValue.trim()
                      }
                      aria-label="Enhance prompt"
                      className="text-muted-foreground hover:text-foreground"
                    />
                  }
                >
                  {isEnhancingPrompt ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {isEnhancingPrompt ? 'Enhancing…' : 'Enhance'}
                </TooltipContent>
              </Tooltip>
            ) : null}
            </div>
            <button
              type="button"
              onClick={() => void onCreate(activeSection)}
              disabled={!inputValue.trim() || isCreating}
              className={cn(
                'flex size-8 items-center justify-center rounded-full transition-colors',
                inputValue.trim() && !isCreating
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground',
              )}
              aria-label="Create session"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>

        <div className="mb-4 grid w-full grid-cols-3 gap-3">
          {SECTIONS.map(({ type, label, icon: Icon, comingSoon }) => (
            <CommandButton
              key={type}
              icon={<Icon className="size-5" />}
              label={label}
              isActive={activeSection === type}
              disabled={comingSoon}
              comingSoon={comingSoon}
              onClick={() => onSectionChange(type)}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full overflow-hidden"
          >
            {activeSection === 'learn' && journeyTopics.length > 0 ? (
              <ScrollHintPanel
                title="Continue your journey"
                subtitle="Chrysty remembers what you have already explored"
              >
                {journeyTopics.map((topic, index) => (
                  <motion.li
                    key={topic.subject}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onSelectJourneyTopic?.(
                          `Continue my ${topic.subjectLabel.toLowerCase()} learning — go deeper`,
                        )
                      }
                      className="flex w-full cursor-pointer flex-col gap-0.5 p-4 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="text-base text-foreground">
                        Continue your {topic.subjectLabel} journey
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Depth {topic.depthLevel + 1} ·{' '}
                        {topic.completedMissionCount}{' '}
                        {topic.completedMissionCount === 1
                          ? 'mission'
                          : 'missions'}{' '}
                        learned
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ScrollHintPanel>
            ) : null}

            {activeSection === 'practice' &&
            practiceConfig &&
            onPracticeConfigChange ? (
              <div className="mb-4">
                <PracticeSetupPanel
                  config={practiceConfig}
                  onChange={onPracticeConfigChange}
                  disabled={isCreating}
                />
              </div>
            ) : null}

            {activeSection === 'practice' && journeyTopics.length > 0 ? (
              <ScrollHintPanel
                title="Practice what you've learned"
                subtitle="Sessions use your learn history and weak areas"
              >
                {journeyTopics.map((topic, index) => {
                  const sourceId = topic.priorPaths[0]?.sessionId;
                  return (
                    <motion.li
                      key={topic.subject}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onSelectPracticeTopic?.(
                            practicePromptForTopic(topic),
                            sourceId,
                          )
                        }
                        className="flex w-full cursor-pointer flex-col gap-0.5 p-4 text-left transition-colors hover:bg-muted/60"
                      >
                        <span className="text-base text-foreground">
                          Practice {topic.subjectLabel}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {topic.completedMissionCount}{' '}
                          {topic.completedMissionCount === 1
                            ? 'mission'
                            : 'missions'}{' '}
                          learned · depth {topic.depthLevel + 1}
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </ScrollHintPanel>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-4">
                <h3 className="text-base font-medium text-foreground">
                  {SECTION_LABELS[activeSection]} suggestions
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {COMPOSER_SUGGESTION_HINTS[activeSection]}
                </p>
              </div>
              <ul className="divide-y divide-border">
                {suggestions.map((suggestion, index) => {
                  const Icon =
                    SECTIONS.find((s) => s.type === activeSection)?.icon ??
                    BookOpen;
                  return (
                    <motion.li
                      key={suggestion}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <button
                        type="button"
                        onClick={() => handleCommandSelect(suggestion)}
                        className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors hover:bg-muted/60"
                      >
                        <Icon className="size-4 shrink-0 text-primary" />
                        <span className="line-clamp-2 text-sm text-foreground">
                          {suggestion}
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-6 shrink-0 border-t border-border pt-4">
        <MadeInChrysty className="block text-center" />
      </div>
    </div>
  );
}

function ComposerLogo() {
  return (
    <div
      className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground"
      aria-hidden
    >
      C
    </div>
  );
}

interface CommandButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  onClick: () => void;
}

function CommandButton({
  icon,
  label,
  isActive,
  disabled = false,
  comingSoon = false,
  onClick,
}: CommandButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-xl border p-5 transition-all',
        disabled
          ? 'cursor-not-allowed border-border bg-muted/30 opacity-60'
          : isActive
            ? 'border-primary/30 bg-primary/5 shadow-sm'
            : 'border-border bg-card hover:border-foreground/15',
      )}
    >
      {comingSoon ? (
        <Badge
          variant="outline"
          className="absolute -top-2 right-1 px-1.5 py-0 text-[10px]"
        >
          Coming soon
        </Badge>
      ) : null}
      <div
        className={
          disabled
            ? 'text-muted-foreground'
            : isActive
              ? 'text-primary'
              : 'text-muted-foreground'
        }
      >
        {icon}
      </div>
      <span
        className={cn(
          'text-sm font-medium',
          disabled || !isActive ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}

/** @deprecated Use SessionComposerInterface */
export const AIAssistantInterface = SessionComposerInterface;
