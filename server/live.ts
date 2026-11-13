import type { Server as HttpServer } from 'node:http';
import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

function createAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: 'v1beta',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function attachLiveWebSocketServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/api/live',
  });

  wss.on('connection', async (clientWs, req) => {
    let session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    let closed = false;

    const sendJson = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    try {
      const reqUrl = new URL(req.url ?? '/api/live', 'http://localhost');
      const rawLevel = Number(reqUrl.searchParams.get('hskLevel') ?? '2');
      const hskLevel =
        Number.isInteger(rawLevel) && rawLevel >= 1 && rawLevel <= 6 ? rawLevel : 2;
      const scenarioTitle =
        (reqUrl.searchParams.get('scenario') ?? 'Giao tiếp tiếng Trung hằng ngày').slice(0, 140);
      const partnerRole =
        (reqUrl.searchParams.get('role') ?? 'Bạn đồng hành bản xứ Trung Quốc').slice(0, 100);

      const ai = createAiClient();

      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          systemInstruction: `Bạn đang đóng vai ${partnerRole} trong tình huống "${scenarioTitle}" để luyện nói tiếng Trung Phổ thông (Mandarin) trực tiếp với học viên Việt Nam ở trình độ HSK ${hskLevel}.
Quy tắc hội thoại:
1. Nói tiếng Trung tự nhiên, tốc độ vừa phải, câu ngắn gọn, dùng từ vựng phù hợp trình độ HSK ${hskLevel}.
2. Nếu học viên nói sai ngữ pháp nghiêm trọng hoặc hỏi bằng tiếng Việt, hãy sửa ngắn gọn và khích lệ bằng tiếng Việt rồi tiếp tục dẫn dắt hội thoại bằng tiếng Trung.
3. Khi phiên bắt đầu, chào ngắn gọn theo đúng vai trò và đặt một câu mở đầu tự nhiên.`,
        },
        callbacks: {
          onopen: () => {
            sendJson({ type: 'ready' });
          },
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              sendJson({
                type: 'inputTranscript',
                text: content.inputTranscription.text,
              });
            }
            if (content?.outputTranscription?.text) {
              sendJson({
                type: 'outputTranscript',
                text: content.outputTranscription.text,
              });
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                sendJson({
                  type: 'audio',
                  audio: part.inlineData.data,
                });
              }
            }
            if (content?.interrupted) {
              sendJson({ type: 'interrupted' });
            }
            if (content?.turnComplete) {
              sendJson({ type: 'turnComplete' });
            }
          },
          onerror: (err: unknown) => {
            console.error('[Live API Error]', err);
            sendJson({
              type: 'error',
              message: 'Kết nối giọng nói Live API bị gián đoạn. Vui lòng thử kết nối lại.',
            });
          },
          onclose: () => {
            if (!closed) {
              sendJson({ type: 'closed' });
            }
          },
        },
      });

      // Trigger opening greeting in character
      session.sendRealtimeInput({
        text: '请用中文开始这次情景对话，先跟我打个招呼吧。',
      });
    } catch (err) {
      console.error('[Live API Connect Failed]', err);
      sendJson({
        type: 'error',
        message:
          'Không thể khởi tạo phiên hội thoại giọng nói (gemini-3.8-live). Vui lòng kiểm tra cấu hình GEMINI_API_KEY.',
      });
      clientWs.close();
      return;
    }

    clientWs.on('message', (rawData) => {
      if (!session || closed) return;
      try {
        const parsed = JSON.parse(rawData.toString()) as {
          type?: string;
          audio?: string;
          text?: string;
        };
        if (parsed.type === 'audio' && typeof parsed.audio === 'string' && parsed.audio.length > 0) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (parsed.type === 'text' && typeof parsed.text === 'string' && parsed.text.trim()) {
          session.sendRealtimeInput({
            text: parsed.text.trim().slice(0, 500),
          });
        }
      } catch {
        // Ignore malformed client frames
      }
    });

    clientWs.on('close', () => {
      closed = true;
      try {
        session?.close();
      } catch {
        // Ignore close errors
      }
      session = null;
    });
  });
}
