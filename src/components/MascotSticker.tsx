import React from 'react';

export type StickerName =
  | '01_reading'
  | '02_cheer'
  | '03_celebrate'
  | '04_curious'
  | '05_writing'
  | '06_sleeping'
  | '07_love'
  | '08_peek_side'
  | '09_determined'
  | '10_back'
  | '11_perfect_100'
  | '12_cozy';

export const STICKER_SRC: Record<StickerName, string> = {
  '01_reading': '/stickers/sticker_01.png',
  '02_cheer': '/stickers/sticker_02.png',
  '03_celebrate': '/stickers/sticker_03.png',
  '04_curious': '/stickers/sticker_04.png',
  '05_writing': '/stickers/sticker_05.png',
  '06_sleeping': '/stickers/sticker_06.png',
  '07_love': '/stickers/sticker_07.png',
  '08_peek_side': '/stickers/sticker_08.png',
  '09_determined': '/stickers/sticker_09.png',
  '10_back': '/stickers/sticker_10.png',
  '11_perfect_100': '/stickers/sticker_11.png',
  '12_cozy': '/stickers/sticker_12.png',
};

const SIZE_MAP = {
  xs: 'w-6 h-6',
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
  '2xl': 'w-44 h-44',
};

interface MascotStickerProps {
  name: StickerName;
  size?: keyof typeof SIZE_MAP;
  animate?: 'float' | 'float-gentle' | 'wiggle' | 'pop' | 'none';
  className?: string;
  alt?: string;
}

export function MascotSticker({
  name,
  size = 'md',
  animate = 'none',
  className = '',
  alt = 'HanYu Mascot Xiao Yu',
}: MascotStickerProps) {
  const animClass =
    animate === 'float'
      ? 'animate-float'
      : animate === 'float-gentle'
      ? 'animate-float-gentle'
      : animate === 'wiggle'
      ? 'animate-wiggle'
      : animate === 'pop'
      ? 'animate-pop'
      : '';

  return (
    <img
      src={STICKER_SRC[name]}
      alt={alt}
      loading="lazy"
      className={`inline-block object-contain select-none pointer-events-none drop-shadow-sm ${SIZE_MAP[size]} ${animClass} ${className}`}
    />
  );
}
