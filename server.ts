import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GeminiApiError,
  generateHskPracticeSet,
  generateRoleplayTurn,
  generateTeacherChatReply,
  generateVocabularySet,
  gradeChineseWriting,
} from './server/gemini.ts';
import { attachLiveWebSocketServer } from './server/live.ts';
import { rateLimitMiddleware } from './server/rateLimit.ts';
import { requireAuth } from './src/middleware/auth.ts';
import type { AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  listHskAttempts,
  listWritingSubmissions,
  saveHskAttempt,
  saveWritingSubmission,
  updateUserPreferredHsk,
} from './src/db/repository.ts';
import type { HskLevel, HskSkillFocus, WritingEvaluation } from './src/types/learning.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function parseHskLevel(raw: unknown): HskLevel {
  const num = Number(raw);
  if (num >= 1 && num <= 6 && Number.isInteger(num)) {
    return num as HskLevel;
  }
  return 2;
}

function sanitizeText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, maxLen);
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '128kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'HanYu Share' });
  });

  // Apply per-IP rate limiting to all AI endpoints
  app.use('/api/ai', rateLimitMiddleware);

  app.post('/api/ai/chat', async (req, res) => {
    try {
      const message = sanitizeText(req.body?.message, 1500);
      if (!message) {
        res.status(400).json({ error: 'Vui lòng nhập nội dung tin nhắn trước khi gửi.' });
        return;
      }
      const hskLevel = parseHskLevel(req.body?.hskLevel);
      const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
      const history = rawHistory
        .slice(-14)
        .filter(
          (item: unknown): item is { role: 'user' | 'assistant'; text: string } =>
            Boolean(item) &&
            typeof item === 'object' &&
            ((item as { role?: string }).role === 'user' ||
              (item as { role?: string }).role === 'assistant') &&
            typeof (item as { text?: unknown }).text === 'string'
        )
        .map((item: { role: 'user' | 'assistant'; text: string }) => ({
          role: item.role,
          text: item.text.slice(0, 1500),
        }));

      const reply = await generateTeacherChatReply({ message, history, hskLevel });
      res.json(reply);
    } catch (err) {
      const status = err instanceof GeminiApiError ? err.status : 500;
      const msg =
        err instanceof Error ? err.message : 'Không thể xử lý yêu cầu trò chuyện.';
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/ai/grade', async (req, res) => {
    try {
      const essay = sanitizeText(req.body?.essay, 4000);
      if (essay.length < 5) {
        res.status(400).json({
          error:
            'Bài viết quá ngắn (tối thiểu 5 ký tự). Vui lòng nhập bài viết tiếng Trung để chấm.',
        });
        return;
      }
      if (!/[\u4e00-\u9fff]/.test(essay)) {
        res.status(400).json({
          error: 'Bài viết cần chứa chữ Hán để hệ thống đánh giá chính xác.',
        });
        return;
      }
      const assignmentPrompt = sanitizeText(req.body?.assignmentPrompt, 800);
      const hskLevel = parseHskLevel(req.body?.hskLevel);

      const result = await gradeChineseWriting({
        essay,
        assignmentPrompt: assignmentPrompt || undefined,
        hskLevel,
      });
      res.json(result);
    } catch (err) {
      const status = err instanceof GeminiApiError ? err.status : 500;
      const msg =
        err instanceof Error ? err.message : 'Không thể chấm bài viết lúc này.';
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/ai/vocabulary', async (req, res) => {
    try {
      const hskLevel = parseHskLevel(req.body?.hskLevel);
      const topic = sanitizeText(req.body?.topic, 120) || 'Giao tiếp hằng ngày';
      const items = await generateVocabularySet({ hskLevel, topic });
      res.json({ items });
    } catch (err) {
      const status = err instanceof GeminiApiError ? err.status : 500;
      const msg =
        err instanceof Error ? err.message : 'Không thể tạo bộ từ vựng lúc này.';
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/ai/hsk', async (req, res) => {
    try {
      const hskLevel = parseHskLevel(req.body?.hskLevel);
      const rawFocus = req.body?.skillFocus;
      const skillFocus: HskSkillFocus =
        rawFocus === 'grammar_vocab' || rawFocus === 'reading_order'
          ? rawFocus
          : 'mixed';
      const topic = sanitizeText(req.body?.topic, 120);

      const exerciseSet = await generateHskPracticeSet({
        hskLevel,
        skillFocus,
        topic: topic || undefined,
      });
      res.json(exerciseSet);
    } catch (err) {
      const status = err instanceof GeminiApiError ? err.status : 500;
      const msg =
        err instanceof Error ? err.message : 'Không thể tạo đề luyện thi HSK.';
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/ai/roleplay', async (req, res) => {
    try {
      const scenarioTitle = sanitizeText(req.body?.scenarioTitle, 160);
      const partnerRole = sanitizeText(req.body?.partnerRole, 160);
      const userMessage = sanitizeText(req.body?.userMessage, 1000);

      if (!scenarioTitle || !partnerRole || !userMessage) {
        res.status(400).json({
          error: 'Vui lòng chọn tình huống và nhập lời thoại trước khi gửi.',
        });
        return;
      }

      const hskLevel = parseHskLevel(req.body?.hskLevel);
      const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
      const history = rawHistory
        .slice(-14)
        .filter(
          (item: unknown): item is { role: 'user' | 'assistant'; text: string } =>
            Boolean(item) &&
            typeof item === 'object' &&
            ((item as { role?: string }).role === 'user' ||
              (item as { role?: string }).role === 'assistant') &&
            typeof (item as { text?: unknown }).text === 'string'
        )
        .map((item: { role: 'user' | 'assistant'; text: string }) => ({
          role: item.role,
          text: item.text.slice(0, 1000),
        }));

      const reply = await generateRoleplayTurn({
        scenarioTitle,
        partnerRole,
        userMessage,
        history,
        hskLevel,
      });
      res.json(reply);
    } catch (err) {
      const status = err instanceof GeminiApiError ? err.status : 500;
      const msg =
        err instanceof Error ? err.message : 'Không thể phản hồi hội thoại lúc này.';
      res.status(status).json({ error: msg });
    }
  });

  // Cloud SQL PostgreSQL routes protected by Firebase Auth
  app.get('/api/db/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email ?? '';
      if (!uid) {
        res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
        return;
      }
      const userRow = await getOrCreateUser(uid, email, req.user?.name);
      res.json({ user: userRow });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi máy chủ cơ sở dữ liệu.';
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/db/preferences', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
        return;
      }
      await getOrCreateUser(uid, req.user?.email ?? '', req.user?.name);
      const hskLevel = parseHskLevel(req.body?.preferredHskLevel);
      const updated = await updateUserPreferredHsk(uid, hskLevel);
      res.json({ user: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật tùy chọn.';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/db/writing', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
        return;
      }
      const userRow = await getOrCreateUser(uid, req.user?.email ?? '', req.user?.name);
      const submissions = await listWritingSubmissions(userRow.id);
      res.json({ submissions });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử chấm bài.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/db/writing', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
        return;
      }
      const essay = sanitizeText(req.body?.essay, 4000);
      const assignmentPrompt = sanitizeText(req.body?.assignmentPrompt, 800);
      const hskLevel = parseHskLevel(req.body?.hskLevel);
      const evaluation = req.body?.evaluation as WritingEvaluation | undefined;

      if (!essay || !evaluation || typeof evaluation.totalScore !== 'number') {
        res.status(400).json({ error: 'Dữ liệu bài viết cần lưu không hợp lệ.' });
        return;
      }

      const userRow = await getOrCreateUser(uid, req.user?.email ?? '', req.user?.name);
      const saved = await saveWritingSubmission({
        userId: userRow.id,
        hskLevel,
        assignmentPrompt: assignmentPrompt || undefined,
        essay,
        evaluation,
      });
      res.status(201).json({ submission: saved });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu bài viết.';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/db/hsk', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
        return;
      }
      const userRow = await getOrCreateUser(uid, req.user?.email ?? '', req.user?.name);
      const attempts = await listHskAttempts(userRow.id);
      res.json({ attempts });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử luyện thi HSK.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/db/hsk', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
        return;
      }
      const hskLevel = parseHskLevel(req.body?.hskLevel);
      const skillFocus = sanitizeText(req.body?.skillFocus, 60) || 'mixed';
      const titleVi = sanitizeText(req.body?.titleVi, 200) || `Luyện thi HSK ${hskLevel}`;
      const correctCount = Math.max(0, Math.min(100, Number(req.body?.correctCount) || 0));
      const totalCount = Math.max(1, Math.min(100, Number(req.body?.totalCount) || 5));

      const userRow = await getOrCreateUser(uid, req.user?.email ?? '', req.user?.name);
      const saved = await saveHskAttempt({
        userId: userRow.id,
        hskLevel,
        skillFocus,
        titleVi,
        correctCount,
        totalCount,
      });
      res.status(201).json({ attempt: saved });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu kết quả HSK.';
      res.status(500).json({ error: msg });
    }
  });

  if (IS_PROD) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const httpServer = http.createServer(app);
  attachLiveWebSocketServer(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`HanYu Share server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
