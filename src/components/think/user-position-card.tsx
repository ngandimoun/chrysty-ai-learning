'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface UserPositionCardProps {
  initialPosition: string;
  onSave?: (position: string) => void | Promise<void>;
  disabled?: boolean;
}

export function UserPositionCard({
  initialPosition,
  onSave,
  disabled = false,
}: UserPositionCardProps) {
  const [position, setPosition] = useState(initialPosition);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!position.trim() || disabled || saving) return;
    setSaving(true);
    try {
      await onSave?.(position);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-overline text-muted-foreground">
          Your Position
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={position}
          onChange={(e) => {
            setPosition(e.target.value);
            setSaved(false);
          }}
          disabled={disabled || saving}
          className="min-h-28 resize-none"
        />
      </CardContent>
      <CardFooter>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleSave()}
          disabled={disabled || saving || !position.trim()}
        >
          {saving ? 'Thinking…' : saved ? 'Saved' : 'Save Position'}
        </Button>
      </CardFooter>
    </Card>
  );
}
