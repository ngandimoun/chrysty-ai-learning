'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fireConfettiPreset,
  type ConfettiPreset,
} from '@/lib/celebration/confetti';
import { cn } from '@/lib/utils';

interface CelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confettiPreset: ConfettiPreset;
  children?: React.ReactNode;
  className?: string;
}

export function CelebrationModal({
  open,
  onOpenChange,
  title,
  description,
  confettiPreset,
  children,
  className,
}: CelebrationModalProps) {
  useEffect(() => {
    if (!open) return;
    void fireConfettiPreset(confettiPreset);
  }, [open, confettiPreset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('overflow-hidden sm:max-w-md', className)}
        showCloseButton
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-sm leading-relaxed">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {children ? (
            <div className="mt-4 flex flex-col gap-2">{children}</div>
          ) : null}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
