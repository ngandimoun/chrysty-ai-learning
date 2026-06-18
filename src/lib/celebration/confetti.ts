import type { Options as ConfettiOptions } from 'canvas-confetti';

export type ConfettiPreset = 'missionStep' | 'pathComplete' | 'practiceComplete';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function getConfetti() {
  const mod = await import('canvas-confetti');
  return mod.default;
}

function burst(
  confetti: (options?: ConfettiOptions) => void,
  options: ConfettiOptions,
) {
  confetti({
    disableForReducedMotion: true,
    ...options,
  });
}

export async function fireConfettiPreset(preset: ConfettiPreset): Promise<void> {
  if (prefersReducedMotion()) return;

  const confetti = await getConfetti();

  switch (preset) {
    case 'missionStep':
      burst(confetti, {
        particleCount: 80,
        spread: 65,
        startVelocity: 32,
        origin: { y: 0.62 },
        colors: ['#2dd4bf', '#14b8a6', '#0d9488', '#5eead4', '#99f6e4'],
        ticks: 180,
      });
      break;

    case 'pathComplete': {
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        burst(confetti, {
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: ['#2dd4bf', '#fbbf24', '#f59e0b', '#14b8a6', '#fcd34d'],
        });
        burst(confetti, {
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: ['#2dd4bf', '#fbbf24', '#f59e0b', '#14b8a6', '#fcd34d'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      burst(confetti, {
        particleCount: 120,
        spread: 100,
        startVelocity: 42,
        origin: { y: 0.55 },
        colors: ['#2dd4bf', '#fbbf24', '#f59e0b', '#14b8a6', '#fcd34d', '#5eead4'],
      });
      frame();
      break;
    }

    case 'practiceComplete':
      burst(confetti, {
        particleCount: 100,
        spread: 80,
        startVelocity: 36,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#fb923c', '#fdba74', '#fcd34d'],
        ticks: 220,
      });
      burst(confetti, {
        particleCount: 40,
        spread: 120,
        startVelocity: 24,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#ea580c', '#fbbf24'],
        ticks: 160,
      });
      break;
  }
}
