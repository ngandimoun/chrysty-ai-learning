'use client';

import { useEffect } from 'react';
import {
  ChevronRight,
  PanelLeftClose,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MadeInChrysty } from '@/components/brand/made-in-chrysty';
import { getSessionsByType } from '@/lib/sessions';
import { sessionRoute } from '@/constants/routes';
import { useSessionStore } from '@/store/session-store';
import { useUIStore } from '@/store/ui-store';
import type { SessionType } from '@/types/session';
import { cn } from '@/lib/utils';

import { MODE_THEME } from '@/constants/theme';
import { THINK_MODE_ENABLED } from '@/constants/features';
import { Badge } from '@/components/ui/badge';

const SESSION_TYPES = ['learn', 'practice', 'think'] as const satisfies readonly SessionType[];

interface SessionSidebarProps {
  onNavigate?: () => void;
  showCollapseToggle?: boolean;
  onToggleCollapse?: () => void;
}

export function SessionSidebar({
  onNavigate,
  showCollapseToggle = false,
  onToggleCollapse,
}: SessionSidebarProps) {
  const pathname = usePathname();
  const sessions = useSessionStore((s) => s.sessions);
  const openComposer = useSessionStore((s) => s.openComposer);
  const sidebarSectionsOpen = useUIStore((s) => s.sidebarSectionsOpen);
  const toggleSidebarSection = useUIStore((s) => s.toggleSidebarSection);
  const setSidebarSectionOpen = useUIStore((s) => s.setSidebarSectionOpen);

  useEffect(() => {
    const activeSection = SESSION_TYPES.find((type) =>
      pathname.startsWith(`/${type}/`),
    );

    if (activeSection) {
      setSidebarSectionOpen(activeSection, true);
    }
  }, [pathname, setSidebarSectionOpen]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar">
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <span className="text-overline text-muted-foreground">Sessions</span>
        {showCollapseToggle ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggleCollapse}
            aria-label="Close sidebar"
            className="text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4 px-2 pb-4">
          {SESSION_TYPES.map((type) => {
            const section = { type, ...MODE_THEME[type] };
            const Icon = section.icon;
            const sectionSessions =
              section.type === 'practice'
                ? getSessionsByType(sessions, 'practice').filter(
                    (s) => s.generationStatus !== 'failed',
                  )
                : getSessionsByType(sessions, section.type);
            const isOpen = sidebarSectionsOpen[section.type];

            const isThinkComingSoon =
              section.type === 'think' && !THINK_MODE_ENABLED;

            return (
              <div key={section.type}>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => toggleSidebarSection(section.type)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 text-left transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <ChevronRight
                      className={cn(
                        'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                        isOpen && 'rotate-90',
                      )}
                    />
                    <Icon className={cn('size-3.5 shrink-0', section.colorClass)} />
                    <span className="truncate text-xs font-medium text-foreground">
                      {section.label}
                    </span>
                    {isThinkComingSoon ? (
                      <Badge variant="outline" className="h-4 px-1 py-0 text-[9px]">
                        Soon
                      </Badge>
                    ) : null}
                    <span className="text-[10px] text-muted-foreground">
                      {sectionSessions.length}
                    </span>
                  </button>
                  {!isThinkComingSoon ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => openComposer(section.type)}
                      aria-label={`New ${section.label} session`}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  ) : null}
                </div>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      key={`${section.type}-content`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      {sectionSessions.length === 0 ? (
                        isThinkComingSoon ? (
                          <p className="mx-2 mb-1 px-3 py-2 text-xs text-muted-foreground">
                            Coming soon — new debates are not available yet.
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openComposer(section.type)}
                            className="mx-2 mb-1 w-[calc(100%-1rem)] rounded-md border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-accent/50 hover:text-foreground"
                          >
                            No sessions yet — create one
                          </button>
                        )
                      ) : (
                        <ul className="space-y-0.5 pb-1">
                          {sectionSessions.map((session, index) => {
                            const href = sessionRoute(session.type, session.id);
                            const isActive = pathname === href;

                            return (
                              <motion.li
                                key={session.id}
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                              >
                                <Link
                                  href={href}
                                  onClick={onNavigate}
                                  className={cn(
                                    'group block rounded-md px-2 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                    isActive
                                      ? cn(
                                          'border-l-2 bg-sidebar-accent text-sidebar-accent-foreground',
                                          section.type === 'learn' &&
                                            'border-l-mode-learn',
                                          section.type === 'practice' &&
                                            'border-l-mode-practice',
                                          section.type === 'think' &&
                                            'border-l-mode-think',
                                        )
                                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                                  )}
                                >
                                  <div className="truncate text-sm font-medium">
                                    {session.title}
                                    {session.type === 'learn' &&
                                    session.journeyDepth &&
                                    session.journeyDepth > 0
                                      ? ` · Part ${session.journeyDepth + 1}`
                                      : ''}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2">
                                    {session.type === 'practice' &&
                                    session.generationStatus === 'generating' ? (
                                      <span className="text-[10px] text-mode-practice">
                                        Generating…
                                      </span>
                                    ) : session.type === 'practice' &&
                                      (session.questionCount ?? 0) === 0 ? (
                                      <span className="text-[10px] text-muted-foreground">
                                        Incomplete
                                      </span>
                                    ) : (
                                      <>
                                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                                          <div
                                            className="h-full rounded-full bg-primary/60 transition-all"
                                            style={{
                                              width: `${session.progress}%`,
                                            }}
                                          />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                          {session.progress}%
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </Link>
                              </motion.li>
                            );
                          })}
                        </ul>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
        <MadeInChrysty />
      </div>
    </div>
  );
}
