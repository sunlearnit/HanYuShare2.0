import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  velocityX: number;
  velocityY: number;
  shape: 'square' | 'circle' | 'star';
}

const FESTIVE_COLORS = ['#991B1B', '#DC2626', '#F59E0B', '#D97706', '#FDE047', '#E11D48'];

export function CelebrationBurst({ active, duration = 2800 }: { active: boolean; duration?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;

    setVisible(true);
    const count = 36;
    const items: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 4 + Math.random() * 7;
      return {
        id: i,
        x: 50,
        y: 40,
        size: 6 + Math.random() * 8,
        color: FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)],
        rotation: Math.random() * 360,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 2,
        shape: i % 3 === 0 ? 'star' : i % 2 === 0 ? 'circle' : 'square',
      };
    });

    setParticles(items);

    const timer = setTimeout(() => {
      setVisible(false);
      setParticles([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [active, duration]);

  if (!visible || particles.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute transform-gpu animate-pop"
          style={{
            left: `${p.x + p.velocityX * 3}%`,
            top: `${p.y + p.velocityY * 3}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.shape !== 'star' ? p.color : undefined,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            transition: 'all 2.4s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {p.shape === 'star' && (
            <span style={{ color: p.color, fontSize: `${p.size * 1.5}px` }}>✦</span>
          )}
        </span>
      ))}
    </div>
  );
}
