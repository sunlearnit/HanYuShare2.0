import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2, AlertCircle, Sparkles, Volume2 } from 'lucide-react';
import type { HskLevel } from '../types/learning';
import { MascotSticker } from './MascotSticker';

interface LiveVoicePanelProps {
  hskLevel: HskLevel;
  scenarioTitle: string;
  partnerRole: string;
}

interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
}

function float32ToInt16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToFloat32Pcm(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 0x8000;
  }
  return float32;
}

export function LiveVoicePanel({
  hskLevel,
  scenarioTitle,
  partnerRole,
}: LiveVoicePanelProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [muted, setMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mutedRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const clearPlaybackQueue = () => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // Ignore stopped sources
      }
    }
    activeSourcesRef.current.clear();
    if (outputCtxRef.current) {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
  };

  const cleanupSession = () => {
    clearPlaybackQueue();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (inputCtxRef.current) {
      void inputCtxRef.current.close();
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      void outputCtxRef.current.close();
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore close error
      }
      wsRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, []);

  const playAudioChunk = (base64Audio: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;
    try {
      const float32 = base64ToFloat32Pcm(base64Audio);
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const start = Math.max(now, nextStartTimeRef.current);
      source.start(start);
      nextStartTimeRef.current = start + buffer.duration;

      activeSourcesRef.current.add(source);
      source.onended = () => {
        activeSourcesRef.current.delete(source);
      };
    } catch {
      // Ignore audio decode jitter
    }
  };

  const appendTranscript = (speaker: 'user' | 'assistant', text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.speaker === speaker) {
        return [
          ...prev.slice(0, -1),
          { ...last, text: `${last.text} ${trimmed}`.trim() },
        ];
      }
      return [
        ...prev,
        {
          id: `${speaker}-${Date.now()}-${Math.random()}`,
          speaker,
          text: trimmed,
        },
      ];
    });
  };

  const startLiveSession = async () => {
    setErrorMsg(null);
    setStatus('connecting');
    cleanupSession();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'init',
            scenarioTitle,
            partnerRole,
            hskLevel,
          })
        );

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (mutedRef.current) return;
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const base64 = float32ToInt16Base64(inputData);
          ws.send(JSON.stringify({ type: 'audio', data: base64 }));
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            audio?: string;
            text?: string;
            message?: string;
          };
          if (msg.type === 'ready') {
            setStatus('active');
          } else if (msg.type === 'audio' && msg.audio) {
            playAudioChunk(msg.audio);
          } else if (msg.type === 'interrupted') {
            clearPlaybackQueue();
          } else if (msg.type === 'inputTranscript' && msg.text) {
            appendTranscript('user', msg.text);
          } else if (msg.type === 'outputTranscript' && msg.text) {
            appendTranscript('assistant', msg.text);
          } else if (msg.type === 'error') {
            setErrorMsg(msg.message ?? 'Lỗi kết nối hội thoại giọng nói.');
            setStatus('error');
            cleanupSession();
          } else if (msg.type === 'closed') {
            setStatus('idle');
            cleanupSession();
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onerror = () => {
        setErrorMsg('Không thể kết nối tới kênh âm thanh thời gian thực.');
        setStatus('error');
        cleanupSession();
      };

      ws.onclose = () => {
        setStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
      };
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Bạn chưa cấp quyền sử dụng micro trên trình duyệt.'
          : 'Không thể khởi tạo micro hoặc kết nối âm thanh.';
      setErrorMsg(msg);
      setStatus('error');
      cleanupSession();
    }
  };

  const stopLiveSession = () => {
    cleanupSession();
    setStatus('idle');
  };

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
  };

  return (
    <div className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-7 space-y-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFE7DE] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              Hội thoại giọng nói trực tiếp · {partnerRole}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-200">
              Gemini Live API
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Nói trực tiếp bằng tiếng Trung (HSK {hskLevel}). AI sẽ phản xạ và trò chuyện với bạn như một người bạn bản xứ.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {status === 'active' && (
            <button
              type="button"
              onClick={toggleMute}
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all min-h-[44px] ${
                muted
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-red-800" />}
              <span>{muted ? 'Đã tắt micro' : 'Micro đang bật'}</span>
            </button>
          )}

          {status === 'idle' || status === 'error' ? (
            <button
              type="button"
              onClick={() => void startLiveSession()}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-800 via-red-850 to-red-900 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-950/20 hover:from-red-700 hover:to-red-800 min-h-[44px] whitespace-nowrap card-lift"
            >
              <Phone className="w-4 h-4 text-amber-300" />
              <span>Bắt đầu gọi luyện nói</span>
            </button>
          ) : status === 'connecting' ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-2xl bg-stone-100 px-5 py-2.5 text-sm font-bold text-stone-500 min-h-[44px]"
            >
              <Loader2 className="w-4 h-4 animate-spin text-red-800" />
              <span>Đang kết nối micro...</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopLiveSession}
              className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 min-h-[44px] whitespace-nowrap shadow-sm card-lift"
            >
              <PhoneOff className="w-4 h-4 text-red-400" />
              <span>Kết thúc cuộc gọi</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-xs sm:text-sm text-red-900 shadow-xs"
        >
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Voice Status Indicator */}
      {status === 'active' && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-red-50 to-amber-50/50 border border-red-200/80 animate-pop">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute" />
              <span className="w-3 h-3 rounded-full bg-emerald-600 relative" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-950">Đang trong cuộc gọi thoại thời gian thực</p>
              <p className="text-[11px] text-stone-500">Hãy nói một câu tiếng Trung vào micro của bạn</p>
            </div>
          </div>
          <div className="flex items-end gap-1 h-6">
            <span className="w-1 bg-red-800 h-3 animate-[soundwave-bar_0.6s_ease-in-out_infinite]" />
            <span className="w-1 bg-red-800 h-5 animate-[soundwave-bar_0.8s_ease-in-out_infinite_0.15s]" />
            <span className="w-1 bg-red-800 h-4 animate-[soundwave-bar_0.5s_ease-in-out_infinite_0.3s]" />
            <span className="w-1 bg-red-800 h-6 animate-[soundwave-bar_0.7s_ease-in-out_infinite_0.45s]" />
          </div>
        </div>
      )}

      {/* Transcripts Stream */}
      <div className="min-h-[280px] max-h-[420px] overflow-y-auto rounded-2xl border border-[#EFE7DE] bg-[#FAF7F2] p-4 sm:p-5 space-y-3">
        {transcripts.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-center space-y-3 px-4">
            <div className="p-2.5 rounded-2xl bg-white shadow-xs border border-stone-200/80">
              <MascotSticker name="01_reading" size="sm" animate="float-gentle" />
            </div>
            <p className="text-sm font-bold text-stone-800">
              {status === 'active'
                ? 'Cuộc gọi đã sẵn sàng — hãy bắt đầu nói tiếng Trung hoặc lắng nghe đối tác!'
                : 'Bấm "Bắt đầu gọi luyện nói" để bật micro và trò chuyện trực tiếp 2 chiều.'}
            </p>
            <p className="text-xs text-stone-500 max-w-md leading-relaxed">
              Phụ đề hội thoại chữ Hán sẽ hiển thị trực tiếp tại đây để bạn vừa nghe vừa đối chiếu chữ.
            </p>
          </div>
        ) : (
          transcripts.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'} animate-pop`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-5 py-3 text-sm leading-relaxed ${
                  entry.speaker === 'user'
                    ? 'bg-gradient-to-r from-red-800 to-red-900 text-white rounded-br-md shadow-sm'
                    : 'bg-white border border-[#EFE7DE] text-stone-900 rounded-tl-md shadow-xs'
                }`}
              >
                <span className="block text-[11px] font-bold opacity-75 mb-1">
                  {entry.speaker === 'user' ? 'Bạn' : partnerRole}
                </span>
                <p className="font-zh text-base">{entry.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
