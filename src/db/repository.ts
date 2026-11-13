import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { hskAttempts, users, writingSubmissions } from './schema.ts';
import type { HskLevel, WritingEvaluation } from '../types/learning.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Không thể đồng bộ thông tin tài khoản.', { cause: error });
  }
}

export async function updateUserPreferredHsk(uid: string, hskLevel: HskLevel) {
  try {
    const [updated] = await db
      .update(users)
      .set({ preferredHskLevel: hskLevel, updatedAt: new Date() })
      .where(eq(users.uid, uid))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Database error in updateUserPreferredHsk:', error);
    throw new Error('Không thể cập nhật trình độ HSK.', { cause: error });
  }
}

export async function saveWritingSubmission(params: {
  userId: number;
  hskLevel: HskLevel;
  assignmentPrompt?: string;
  essay: string;
  evaluation: WritingEvaluation;
}) {
  try {
    const [row] = await db
      .insert(writingSubmissions)
      .values({
        userId: params.userId,
        hskLevel: params.hskLevel,
        assignmentPrompt: params.assignmentPrompt ?? null,
        essay: params.essay,
        mode: params.evaluation.mode,
        totalScore: params.evaluation.totalScore,
        maxPossibleScore: params.evaluation.maxPossibleScore,
        evaluationJson: params.evaluation,
      })
      .returning();
    return row;
  } catch (error) {
    console.error('Database error in saveWritingSubmission:', error);
    throw new Error('Không thể lưu bài chấm vào cơ sở dữ liệu.', { cause: error });
  }
}

export async function listWritingSubmissions(userId: number, limit = 15) {
  try {
    return await db
      .select()
      .from(writingSubmissions)
      .where(eq(writingSubmissions.userId, userId))
      .orderBy(desc(writingSubmissions.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Database error in listWritingSubmissions:', error);
    throw new Error('Không thể tải lịch sử chấm bài viết.', { cause: error });
  }
}

export async function saveHskAttempt(params: {
  userId: number;
  hskLevel: HskLevel;
  skillFocus: string;
  titleVi: string;
  correctCount: number;
  totalCount: number;
}) {
  try {
    const [row] = await db
      .insert(hskAttempts)
      .values({
        userId: params.userId,
        hskLevel: params.hskLevel,
        skillFocus: params.skillFocus,
        titleVi: params.titleVi,
        correctCount: params.correctCount,
        totalCount: params.totalCount,
      })
      .returning();
    return row;
  } catch (error) {
    console.error('Database error in saveHskAttempt:', error);
    throw new Error('Không thể lưu kết quả luyện thi HSK.', { cause: error });
  }
}

export async function listHskAttempts(userId: number, limit = 20) {
  try {
    return await db
      .select()
      .from(hskAttempts)
      .where(eq(hskAttempts.userId, userId))
      .orderBy(desc(hskAttempts.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Database error in listHskAttempts:', error);
    throw new Error('Không thể tải lịch sử luyện thi HSK.', { cause: error });
  }
}
