import type {
  ChineseSegment,
  HskExerciseSet,
  HskLevel,
  HskSkillFocus,
  LanguageCorrection,
  RoleplayReply,
  VocabularyItem,
  WritingEvaluation,
} from '../types/learning';

async function requestJson<T>(
  url: string,
  options: { method?: string; body?: unknown; token?: string | null }
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'POST',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(
      'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.'
    );
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON fallback
  }

  if (!response.ok) {
    const serverError =
      typeof data.error === 'string' && data.error.trim().length > 0
        ? data.error
        : `Yêu cầu thất bại (mã ${response.status}). Vui lòng thử lại.`;
    throw new Error(serverError);
  }

  return data as T;
}

export interface ChatTurnDto {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatApiResult {
  textVi: string;
  chineseSegments: ChineseSegment[];
  correction?: LanguageCorrection;
  suggestionsVi: string[];
}

export async function sendTeacherChat(params: {
  message: string;
  history: ChatTurnDto[];
  hskLevel: HskLevel;
}): Promise<ChatApiResult> {
  return requestJson<ChatApiResult>('/api/ai/chat', { body: params });
}

export async function gradeWritingEssay(params: {
  essay: string;
  assignmentPrompt?: string;
  hskLevel: HskLevel;
}): Promise<WritingEvaluation> {
  return requestJson<WritingEvaluation>('/api/ai/grade', { body: params });
}

export async function fetchVocabularySet(params: {
  hskLevel: HskLevel;
  topic: string;
}): Promise<VocabularyItem[]> {
  const res = await requestJson<{ items: VocabularyItem[] }>('/api/ai/vocabulary', {
    body: params,
  });
  return res.items ?? [];
}

export async function fetchHskPracticeSet(params: {
  hskLevel: HskLevel;
  skillFocus: HskSkillFocus;
  topic?: string;
}): Promise<HskExerciseSet> {
  return requestJson<HskExerciseSet>('/api/ai/hsk', { body: params });
}

export async function sendRoleplayTurn(params: {
  scenarioTitle: string;
  partnerRole: string;
  userMessage: string;
  history: ChatTurnDto[];
  hskLevel: HskLevel;
}): Promise<RoleplayReply> {
  return requestJson<RoleplayReply>('/api/ai/roleplay', { body: params });
}

// Authenticated Cloud SQL persistence endpoints
export interface SavedWritingRecord {
  id: number;
  hskLevel: number;
  assignmentPrompt: string | null;
  essay: string;
  mode: string;
  totalScore: number;
  maxPossibleScore: number;
  evaluationJson: WritingEvaluation;
  createdAt: string;
}

export interface SavedHskAttemptRecord {
  id: number;
  hskLevel: number;
  skillFocus: string;
  titleVi: string;
  correctCount: number;
  totalCount: number;
  createdAt: string;
}

export async function syncUserWithSql(token: string): Promise<void> {
  await requestJson('/api/db/me', { method: 'GET', token });
}

export async function updateSqlPreferredHsk(
  token: string,
  preferredHskLevel: HskLevel
): Promise<void> {
  await requestJson('/api/db/preferences', {
    method: 'PUT',
    token,
    body: { preferredHskLevel },
  });
}

export async function fetchWritingHistory(
  token: string
): Promise<SavedWritingRecord[]> {
  const res = await requestJson<{ submissions: SavedWritingRecord[] }>(
    '/api/db/writing',
    { method: 'GET', token }
  );
  return res.submissions ?? [];
}

export async function saveWritingHistory(
  token: string,
  payload: {
    hskLevel: HskLevel;
    assignmentPrompt?: string;
    essay: string;
    evaluation: WritingEvaluation;
  }
): Promise<SavedWritingRecord> {
  const res = await requestJson<{ submission: SavedWritingRecord }>(
    '/api/db/writing',
    { method: 'POST', token, body: payload }
  );
  return res.submission;
}

export async function fetchHskHistory(
  token: string
): Promise<SavedHskAttemptRecord[]> {
  const res = await requestJson<{ attempts: SavedHskAttemptRecord[] }>(
    '/api/db/hsk',
    { method: 'GET', token }
  );
  return res.attempts ?? [];
}

export async function saveHskHistory(
  token: string,
  payload: {
    hskLevel: HskLevel;
    skillFocus: string;
    titleVi: string;
    correctCount: number;
    totalCount: number;
  }
): Promise<SavedHskAttemptRecord> {
  const res = await requestJson<{ attempt: SavedHskAttemptRecord }>(
    '/api/db/hsk',
    { method: 'POST', token, body: payload }
  );
  return res.attempt;
}
