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
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border transition-all whitespace-nowrap shrink-0 card-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs min-h-[34px]' : 'px-3.5 py-2 text-xs font-semibold min-h-[42px]'
        } ${
          !supported
            ? 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
            : speaking
              ? 'border-red-300 bg-red-50 text-red-800 ring-2 ring-red-800/20'
              : 'border-stone-200 bg-white text-stone-700 hover:border-red-300 hover:text-red-900 shadow-xs'
        }`}
      >
        {speaking ? (
          <>
            <span className="flex items-end gap-0.5 h-3 px-0.5" aria-hidden="true">
              <span className="w-0.5 bg-red-700 h-2 animate-[soundwave-bar_0.6s_ease-in-out_infinite]" />
              <span className="w-0.5 bg-red-700 h-3 animate-[soundwave-bar_0.8s_ease-in-out_infinite_0.15s]" />
              <span className="w-0.5 bg-red-700 h-1.5 animate-[soundwave-bar_0.7s_ease-in-out_infinite_0.3s]" />
            </span>
            <Square className="w-3 h-3 fill-current ml-0.5" />
            <span>Dừng</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 text-red-800" />
            <span>Phát âm</span>
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
        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={`font-zh font-bold text-stone-900 leading-relaxed break-words tracking-wide ${
              large ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'
            }`}
          >
            {hanzi}
          </p>
          {pinyin && effectiveShowPinyin && (
            <p className="text-xs sm:text-sm text-red-900 font-mono font-medium leading-snug">
              {pinyin}
            </p>
          )}
          {vietnamese && (
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed pt-0.5 font-normal">
              {vietnamese}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {allowLocalPeek && !showPinyin && pinyin && (
            <button
              type="button"
              onClick={() => setLocalPeek((prev) => !prev)}
              aria-label={localPeek ? 'Ẩn Pinyin' : 'Xem Pinyin'}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:border-red-300 hover:text-red-900 whitespace-nowrap shrink-0 shadow-xs transition-colors"
            >
              {localPeek ? <EyeOff className="w-3.5 h-3.5 text-red-800" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{localPeek ? 'Ẩn' : 'Pinyin'}</span>
            </button>
          )}
          <SpeakButton text={hanzi} />
        </div>
      </div>
    </div>
  );
}
