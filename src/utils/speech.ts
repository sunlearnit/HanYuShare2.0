export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopMandarinSpeech(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function speakMandarin(
  text: string,
  callbacks?: {
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (reasonVi: string) => void;
  }
): void {
  const cleanText = text.trim();
  if (!cleanText) return;

  if (!isSpeechSupported()) {
    callbacks?.onError?.('Trình duyệt hiện tại không hỗ trợ phát âm tự động.');
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-CN';
    utterance.rate = callbacks?.rate ?? 0.92;

    const voices = window.speechSynthesis.getVoices();
    const zhVoice =
      voices.find((v) => v.lang.toLowerCase() === 'zh-cn') ||
      voices.find((v) => v.lang.toLowerCase().startsWith('zh'));

    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    utterance.onstart = () => callbacks?.onStart?.();
    utterance.onend = () => callbacks?.onEnd?.();
    utterance.onerror = () => {
      callbacks?.onEnd?.();
      callbacks?.onError?.('Không thể phát âm tiếng Trung trên thiết bị này.');
    };

    window.speechSynthesis.speak(utterance);
  } catch {
    callbacks?.onEnd?.();
    callbacks?.onError?.('Không thể phát âm tiếng Trung lúc này.');
  }
}
