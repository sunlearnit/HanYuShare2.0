import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2, AlertCircle } from 'lucide-react';
import type { HskLevel } from '../types/learning';

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
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, []);

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
      return [...prev, { id: `tr-${Date.now()}-${Math.random()}`, speaker, text: trimmed }];
    });
  };

  const playAudioChunk = (base64Audio: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;

    const samples = base64ToFloat32Pcm(base64Audio);
    if (samples.length === 0) return;

    const buffer = ctx.createBuffer(1, samples.length, 24000);
    buffer.getChannelData(0).set(samples);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + buffer.duration;

    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
    };
  };

  const startLiveSession = async () => {
    cleanupSession();
    setErrorMsg(null);
    setTranscripts([]);
    setMuted(false);
    mutedRef.current = false;
    setStatus('connecting');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = mediaStream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const params = new URLSearchParams({
        hskLevel: String(hskLevel),
        scenario: scenarioTitle,
        role: partnerRole,
      });
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live?${params.toString()}`);
      wsRef.current = ws;

      ws.onopen = () => {
        const source = inputCtx.createMediaStreamSource(mediaStream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (mutedRef.current) return;
          if (wsRef.current?.readyState !== WebSocket.OPEN) return;
          const channelData = event.inputBuffer.getChannelData(0);
          const base64Pcm = float32ToInt16Base64(channelData);
          wsRef.current.send(JSON.stringify({ type: 'audio', audio: base64Pcm }));
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">
            Hội thoại giọng nói trực tiếp · {partnerRole}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Nói trực tiếp qua micro bằng tiếng Trung (HSK {hskLevel}). AI sẽ lắng nghe và đáp lại bằng giọng nói thời gian thực.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === 'active' && (
            <button
              type="button"
              onClick={toggleMute}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium min-h-[40px] ${
                muted
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-red-600" />}
              <span>{muted ? 'Đang tắt micro' : 'Micro đang bật'}</span>
            </button>
          )}

          {status === 'idle' || status === 'error' ? (
            <button
              type="button"
              onClick={() => void startLiveSession()}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 min-h-[44px] whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              <span>Bắt đầu gọi luyện nói</span>
            </button>
          ) : status === 'connecting' ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 min-h-[44px]"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang kết nối micro...</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopLiveSession}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 min-h-[44px] whitespace-nowrap"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Kết thúc cuộc gọi</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-xs sm:text-sm text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="min-h-[260px] max-h-[400px] overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
        {transcripts.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-center space-y-2 px-4">
            <Mic className="w-7 h-7 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-700">
              {status === 'active'
                ? 'Cuộc gọi đã sẵn sàng — hãy bắt đầu nói tiếng Trung hoặc lắng nghe lời chào!'
                : 'Bấm "Bắt đầu gọi luyện nói" để luyện phản xạ nghe – nói trực tiếp.'}
            </p>
            <p className="text-xs text-zinc-500 max-w-md">
              Phụ đề hội thoại của bạn và AI sẽ hiển thị tại đây theo thời gian thực.
            </p>
          </div>
        ) : (
          transcripts.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  entry.speaker === 'user'
                    ? 'bg-red-600 text-white rounded-br-sm'
                    : 'bg-white border border-zinc-200 text-zinc-900 rounded-bl-sm'
                }`}
              >
                <span className="block text-[11px] opacity-75 mb-0.5">
                  {entry.speaker === 'user' ? 'Bạn' : partnerRole}
                </span>
                <p className="font-zh">{entry.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
