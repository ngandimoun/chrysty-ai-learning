'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  SessionComposerInterface,
  type AttachedFile,
} from '@/components/ui/ai-assistant-interface';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PathGeneratingExperience } from '@/components/learn/path-generating-experience';
import { PracticeGeneratingExperience } from '@/components/practice/practice-generating-experience';
import { sessionRoute } from '@/constants/routes';
import { THINK_MODE_ENABLED } from '@/constants/features';
import { usePathGeneration } from '@/hooks/use-path-generation';
import { usePracticeGeneration } from '@/hooks/use-practice-generation';
import {
  deletePracticeSessionClient,
  fetchPracticeSessionForResume,
  isResumablePracticeGenerationError,
} from '@/lib/learning/generate-practice-client';
import {
  fetchLearnSessionForResume,
  isResumableLearnGenerationError,
} from '@/lib/learning/generate-path-client';
import { COMPOSER_ENHANCE_CLIENT_TIMEOUT_MS } from '@/lib/learning/generation/bounds';
import { fetchWithTimeoutAndRetry } from '@/lib/learning/generation/fetch-with-timeout';
import { formatValidationError } from '@/lib/kimi/format-validation-error';
import { useLearnerJourney } from '@/hooks/use-learner-journey';
import { usePracticeSetup } from '@/hooks/use-practice-setup';
import { useVoiceTranscription } from '@/hooks/use-voice-transcription';
import { useSessionStore } from '@/store/session-store';
import {
  getEffectiveQuestionTarget,
  isAiPracticeScale,
} from '@/types/practice-config';
import type { Session, SessionType } from '@/types/session';

export function SessionComposer() {
  const router = useRouter();
  const composerOpen = useSessionStore((s) => s.composerOpen);
  const composerSection = useSessionStore((s) => s.composerSection);
  const composerDraft = useSessionStore((s) => s.composerDraft);
  const isGenerating = useSessionStore((s) => s.isGenerating);
  const closeComposer = useSessionStore((s) => s.closeComposer);
  const setComposerDraft = useSessionStore((s) => s.setComposerDraft);
  const setComposerSection = useSessionStore((s) => s.setComposerSection);
  const createSessionLocal = useSessionStore((s) => s.createSessionLocal);
  const setIsGenerating = useSessionStore((s) => s.setIsGenerating);
  const addSessionSummary = useSessionStore((s) => s.addSessionSummary);
  const removeSessionSummary = useSessionStore((s) => s.removeSessionSummary);
  const loadSessions = useSessionStore((s) => s.loadSessions);

  const practiceSourceLearnSessionId = useSessionStore(
    (s) => s.practiceSourceLearnSessionId,
  );
  const setPracticeSourceLearnSessionId = useSessionStore(
    (s) => s.setPracticeSourceLearnSessionId,
  );

  const { progress, isGenerating: isPathGenerating, generate } =
    usePathGeneration();

  const {
    progress: practiceProgress,
    isGenerating: isPracticeGenerating,
    generate: generatePractice,
  } = usePracticeGeneration();

  const rawSection: SessionType = composerSection ?? 'learn';
  const activeSection: SessionType =
    !THINK_MODE_ENABLED && rawSection === 'think' ? 'learn' : rawSection;

  useEffect(() => {
    if (!THINK_MODE_ENABLED && composerSection === 'think') {
      setComposerSection('learn');
    }
  }, [composerSection, setComposerSection]);

  const { topics: journeyTopics } = useLearnerJourney(
    composerOpen && (activeSection === 'learn' || activeSection === 'practice'),
  );

  const {
    config: practiceConfig,
    setConfig: setPracticeConfig,
    setSourceLearnSessionId,
    configForGenerate,
  } = usePracticeSetup();

  useEffect(() => {
    setSourceLearnSessionId(practiceSourceLearnSessionId);
  }, [practiceSourceLearnSessionId, setSourceLearnSessionId]);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [showGenerationUi, setShowGenerationUi] = useState(false);
  const [generatingSection, setGeneratingSection] =
    useState<SessionType | null>(null);

  const busy = isGenerating || isPathGenerating || isPracticeGenerating;

  const { toggleVoiceInput, isRecording, isTranscribing } =
    useVoiceTranscription({
      disabled: busy,
      onTranscript: (text) => {
        const prev = composerDraft.trim();
        setComposerDraft(prev ? `${prev} ${text}` : text);
        toast.success('Transcription added');
      },
      onError: (message) => toast.error(message),
    });

  const handleAttachFile = async (file: File) => {
    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? 'File upload failed',
        );
      }

      const { file: uploaded } = (await response.json()) as {
        file: AttachedFile;
      };

      setAttachedFiles((prev) => [...prev, uploaded]);
      toast.success(`Attached ${uploaded.filename}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'File upload failed';
      toast.error(message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleEnhancePrompt = async () => {
    const prompt = composerDraft.trim();
    if (!prompt || isEnhancingPrompt || busy) return;

    setIsEnhancingPrompt(true);
    try {
      const response = await fetchWithTimeoutAndRetry(
        '/api/composer/enhance',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: activeSection,
            prompt,
            ...(activeSection === 'practice'
              ? { practiceConfig: configForGenerate() }
              : {}),
          }),
        },
        { timeoutMs: COMPOSER_ENHANCE_CLIENT_TIMEOUT_MS, retries: 0 },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? 'Failed to enhance prompt',
        );
      }

      const { enhancedPrompt } = (await response.json()) as {
        enhancedPrompt: string;
      };
      setComposerDraft(enhancedPrompt);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to enhance prompt';
      toast.error(message);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const finishSession = async (session: Session, sessionId: string) => {
    addSessionSummary({
      id: session.id,
      title: session.title,
      type: session.type,
      progress: session.progress,
      currentTopic: session.currentTopic,
      ...(session.type === 'learn' && session.journeyMeta?.depthLevel
        ? { journeyDepth: session.journeyMeta.depthLevel }
        : {}),
      ...(session.type === 'practice'
        ? {
            generationStatus: 'ready' as const,
            questionCount: session.questions.length,
          }
        : {}),
    });
    await loadSessions();
    setAttachedFiles([]);
    closeComposer();
    setShowGenerationUi(false);
    setGeneratingSection(null);
    router.push(sessionRoute(session.type, sessionId));
  };

  const addPartialSessionSummary = (session: Session) => {
    addSessionSummary({
      id: session.id,
      title: session.title,
      type: session.type,
      progress: session.progress,
      currentTopic: session.currentTopic,
      ...(session.type === 'learn' && session.journeyMeta?.depthLevel
        ? { journeyDepth: session.journeyMeta.depthLevel }
        : {}),
      ...(session.type === 'practice'
        ? {
            generationStatus: session.generationStatus,
            questionCount: session.questions.length,
          }
        : {}),
    });
  };

  const handleGenerationFailure = async (
    section: SessionType,
    sessionId: string,
    message: string,
  ) => {
    const resumableByMessage =
      section === 'learn'
        ? isResumableLearnGenerationError(message)
        : section === 'practice'
          ? isResumablePracticeGenerationError(message)
          : false;

    if (section === 'learn' || section === 'practice') {
      const session =
        section === 'learn'
          ? await fetchLearnSessionForResume(sessionId)
          : await fetchPracticeSessionForResume(sessionId);

      const hasPartialLearn =
        session?.type === 'learn' &&
        session.generationStatus === 'generating' &&
        session.missions.length > 0;

      const hasPartialPractice =
        session?.type === 'practice' &&
        Boolean(session.blueprint) &&
        (session.generationStatus === 'generating' ||
          session.generationStatus === 'failed' ||
          (session.generatedBatchIds?.length ?? 0) > 0);

      if (resumableByMessage || hasPartialLearn || hasPartialPractice) {
        if (session) {
          addPartialSessionSummary(session);
        }
        await loadSessions();
        setAttachedFiles([]);
        setShowGenerationUi(false);
        setGeneratingSection(null);
        closeComposer();
        toast.message(message, {
          description: 'Opening your session so you can resume.',
        });
        router.push(sessionRoute(section, sessionId));
        return;
      }
    }

    if (section === 'practice') {
      await deletePracticeSessionClient(sessionId);
    }
    removeSessionSummary(sessionId);
    await loadSessions();
    setShowGenerationUi(false);
    toast.error(message);
  };

  const handleCreate = async (sectionFromUi: SessionType) => {
    const section =
      sectionFromUi ??
      useSessionStore.getState().composerSection ??
      'learn';
    const prompt = composerDraft.trim();
    if (!prompt || busy) return;

    if (!THINK_MODE_ENABLED && section === 'think') {
      toast.error('Think mode is coming soon. Use Learn or Practice for now.');
      return;
    }

    const sessionId = createSessionLocal(section, prompt);
    setGeneratingSection(section);
    setIsGenerating(true);

    try {
      if (section === 'learn') {
        setShowGenerationUi(true);
        const session = await generate({
          sessionId,
          prompt,
          fileIds:
            attachedFiles.length > 0
              ? attachedFiles.map((f) => f.id)
              : undefined,
        });
        await finishSession(session, sessionId);
        return;
      }

      if (section === 'practice') {
        const practiceCfg = configForGenerate();
        const questionTarget = getEffectiveQuestionTarget(practiceCfg);
        if (
          !isAiPracticeScale(practiceCfg.sessionScale) &&
          (questionTarget === undefined || questionTarget < 5)
        ) {
          toast.error('Question count must be between 5 and 120');
          return;
        }

        setShowGenerationUi(true);
        const session = await generatePractice({
          sessionId,
          prompt,
          practiceConfig: configForGenerate(),
        });
        await finishSession(session, sessionId);
        return;
      }

      const response = await fetch('/api/sessions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type: 'think',
          prompt,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? 'Failed to generate session',
        );
      }

      const { session } = (await response.json()) as { session: Session };
      await finishSession(session, sessionId);
    } catch (error) {
      const message = formatValidationError(error, 'Generation failed');
      await handleGenerationFailure(section, sessionId, message);
    } finally {
      setIsGenerating(false);
      setGeneratingSection(null);
    }
  };

  return (
    <Dialog
      open={composerOpen && composerSection !== null}
      onOpenChange={(open) => {
        if (!open) {
          if (!busy) {
            setAttachedFiles([]);
            setShowGenerationUi(false);
            setGeneratingSection(null);
          }
          closeComposer();
        }
      }}
    >
      <DialogContent
        className="max-h-[90vh] w-[min(92vw,48rem)] max-w-none gap-0 overflow-y-auto p-0 sm:max-w-3xl sm:rounded-xl"
        showCloseButton
      >
        {showGenerationUi && (progress || practiceProgress) ? (
          (generatingSection ?? activeSection) === 'practice' &&
          practiceProgress ? (
            <PracticeGeneratingExperience progress={practiceProgress} />
          ) : progress ? (
            <PathGeneratingExperience progress={progress} />
          ) : null
        ) : (
          <SessionComposerInterface
            activeSection={activeSection}
            onSectionChange={setComposerSection}
            inputValue={composerDraft}
            onInputChange={setComposerDraft}
            onCreate={handleCreate}
            onImprovePrompt={handleEnhancePrompt}
            isEnhancingPrompt={isEnhancingPrompt}
            onVoiceInputClick={toggleVoiceInput}
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            isCreating={busy}
            attachedFiles={attachedFiles}
            onAttachFile={handleAttachFile}
            onRemoveFile={handleRemoveFile}
            isUploadingFile={isUploadingFile}
            journeyTopics={journeyTopics}
            onSelectJourneyTopic={setComposerDraft}
            onSelectPracticeTopic={(prompt, sourceLearnSessionId) => {
              setComposerDraft(prompt);
              setPracticeSourceLearnSessionId(sourceLearnSessionId);
              setSourceLearnSessionId(sourceLearnSessionId);
            }}
            practiceConfig={practiceConfig}
            onPracticeConfigChange={setPracticeConfig}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
