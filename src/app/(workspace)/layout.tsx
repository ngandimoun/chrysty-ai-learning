import { AuthGuard } from '@/components/auth/auth-guard';
import { WorkspaceShell } from '@/components/layout/workspace-shell';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <WorkspaceShell>{children}</WorkspaceShell>
    </AuthGuard>
  );
}
