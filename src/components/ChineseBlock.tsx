import { useState } from 'react';
import { Volume2, Square, Eye, EyeOff } from 'lucide-react';
import { isSpeechSupported, speakMandarin, stopMandarinSpeech } from '../utils/speech';

interface SpeakButtonProps {
  text: string;
  label?: string;
  size?: 'sm' | 'md';
}

export function SpeakButton({ text, label = 'Nghe phát âm', size = 'sm' }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const supported = isSpeechSupported();

  const handleToggle = () => {
    setErrorMsg(null);
    if (speaking) {
      stopMandarinSpeech();
      setSpeaking(false);
      return;
    }
    speakMandarin(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: (msg) => {
        setSpeaking(false);
        setErrorMsg(msg);
      },
    });
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleToggle}
        disabled={!supported}
        title={supported ? label : 'Trình duyệt không hỗ trợ phát âm'}
        aria-label={label}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs min-h-[32px]' : 'px-3 py-2 text-xs min-h-[40px]'
        } ${
          !supported
            ? 'border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed'
            : speaking
              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
        }`}
      >
        {speaking ? (
          <>
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Dừng</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 text-red-600" />
            <span>Nghe</span>
          </>
        )}
      </button>
      {errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
    </span>
  );
}

interface ChineseBlockProps {
  hanzi: string;
  pinyin?: string;
  vietnamese?: string;
  showPinyin: boolean;
  allowLocalPeek?: boolean;
  large?: boolean;
}

export function ChineseBlock({
  hanzi,
  pinyin,
  vietnamese,
  showPinyin,
  allowLocalPeek = false,
  large = false,
}: ChineseBlockProps) {
  const [localPeek, setLocalPeek] = useState(false);
  const effectiveShowPinyin = showPinyin || localPeek;

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p
            className={`font-zh font-medium text-zinc-900 leading-relaxed break-words ${
              large ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
            }`}
          >
            {hanzi}
          </p>
          {pinyin && effectiveShowPinyin && (
            <p className="text-sm text-zinc-500 font-normal leading-snug">{pinyin}</p>
          )}
          {vietnamese && (
            <p className="text-sm text-zinc-700 leading-snug pt-0.5">{vietnamese}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {allowLocalPeek && !showPinyin && pinyin && (
            <button
              type="button"
              onClick={() => setLocalPeek((prev) => !prev)}
              aria-label={localPeek ? 'Ẩn Pinyin' : 'Xem Pinyin'}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 whitespace-nowrap shrink-0"
            >
              {localPeek ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{localPeek ? 'Ẩn' : 'Pinyin'}</span>
            </button>
          )}
          <SpeakButton text={hanzi} />
        </div>
      </div>
    </div>
  );
}
