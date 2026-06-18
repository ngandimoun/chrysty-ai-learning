'use client';

import type { ReactNode } from 'react';
import { GraduationCap, Menu, PanelLeft, PanelRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { SessionSidebar } from '@/components/sidebar/session-sidebar';
import { SessionBootstrap } from '@/components/layout/session-bootstrap';
import { SessionComposer } from '@/components/composer/session-composer';
import { InsightsPanel } from '@/components/insights/insights-panel';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { IconBadge } from '@/components/ui/icon-badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { APP_NAME } from '@/constants/navigation';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useMounted } from '@/hooks/use-mounted';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

interface WorkspaceShellProps {
  children: ReactNode;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const mounted = useMounted();
  useKeyboardShortcuts();

  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const leftSidebarCollapsed = useUIStore((s) => s.leftSidebarCollapsed);
  const setLeftPanelOpen = useUIStore((s) => s.setLeftPanelOpen);
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen);
  const toggleLeftSidebarCollapsed = useUIStore(
    (s) => s.toggleLeftSidebarCollapsed,
  );

  const centerContent = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setLeftPanelOpen(true)}
            aria-label="Open sessions"
          >
            <Menu className="size-4" />
          </Button>
          {leftSidebarCollapsed ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden lg:inline-flex"
              onClick={toggleLeftSidebarCollapsed}
              aria-label="Open sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          ) : null}
          <div className="hidden items-center gap-2 sm:flex">
            <IconBadge
              icon={GraduationCap}
              colorClass="text-mode-learn"
              bgClass="bg-mode-learn/15"
              size="sm"
            />
            <span className="text-sm font-medium text-foreground">
              {APP_NAME}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="xl:hidden"
            onClick={() => setRightPanelOpen(true)}
            aria-label="Open insights"
          >
            <PanelRight className="size-4" />
          </Button>
          <ThemeToggle />
        </div>
      </header>
      <main className="workspace-bg flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background">
        <aside
          className={cn(
            'hidden h-full min-h-0 shrink-0 flex-col overflow-hidden panel-border-r transition-[width] duration-200 lg:flex',
            leftSidebarCollapsed
              ? 'w-0 border-r-0'
              : 'w-[var(--panel-left-width)]',
          )}
        >
          {!leftSidebarCollapsed ? (
            <SessionSidebar
              showCollapseToggle
              onToggleCollapse={toggleLeftSidebarCollapsed}
            />
          ) : null}
        </aside>

        {mounted ? (
          <motion.div
            className="flex min-w-0 flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {centerContent}
          </motion.div>
        ) : (
          <div className="flex min-w-0 flex-1">{centerContent}</div>
        )}

        <aside
          className={cn(
            'hidden h-full min-h-0 w-[var(--panel-right-width)] shrink-0 flex-col overflow-hidden panel-border-l xl:flex',
          )}
        >
          <InsightsPanel />
        </aside>
      </div>

      <Sheet open={leftPanelOpen} onOpenChange={setLeftPanelOpen}>
        <SheetContent side="left" className="w-[var(--panel-left-width)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SessionSidebar onNavigate={() => setLeftPanelOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={rightPanelOpen} onOpenChange={setRightPanelOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-[var(--panel-right-width)] flex-col p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Insights</SheetTitle>
          </SheetHeader>
          <InsightsPanel />
        </SheetContent>
      </Sheet>

      <SessionBootstrap />
      <SessionComposer />
    </>
  );
}
