import type {
  ChatMessage,
  HskExerciseSet,
  HskLevel,
  VocabularyItem,
  WritingEvaluation,
} from '../types/learning';

export interface LearningUser {
  uid: string;
  isAnonymous: boolean;
  displayName?: string;
}

/**
 * AuthAdapter interface designed so Firebase Authentication
 * can drop in without altering UI components.
 */
export interface AuthAdapter {
  getCurrentUser(): LearningUser;
}

/**
 * SessionPersistenceAdapter interface designed so Firestore
 * can replace the in-memory session store when persistence is added.
 */
export interface SessionPersistenceAdapter {
  getHskLevel(): HskLevel;
  setHskLevel(level: HskLevel): void;
  getShowPinyin(): boolean;
  setShowPinyin(show: boolean): void;
  getChatHistory(): ChatMessage[];
  setChatHistory(messages: ChatMessage[]): void;
  getLastWritingEvaluation(): WritingEvaluation | null;
  setLastWritingEvaluation(evaluation: WritingEvaluation | null): void;
  getLastVocabularySet(): VocabularyItem[];
  setLastVocabularySet(items: VocabularyItem[]): void;
  getLastHskSet(): HskExerciseSet | null;
  setLastHskSet(set: HskExerciseSet | null): void;
}

export const anonymousAuthAdapter: AuthAdapter = {
  getCurrentUser() {
    return {
      uid: 'session-guest',
      isAnonymous: true,
    };
  },
};

class InMemorySessionStore implements SessionPersistenceAdapter {
  private hskLevel: HskLevel = 2;
  private showPinyin = true;
  private chatHistory: ChatMessage[] = [];
  private lastWritingEvaluation: WritingEvaluation | null = null;
  private lastVocabularySet: VocabularyItem[] = [];
  private lastHskSet: HskExerciseSet | null = null;

  getHskLevel(): HskLevel {
    return this.hskLevel;
  }
  setHskLevel(level: HskLevel): void {
    this.hskLevel = level;
  }
  getShowPinyin(): boolean {
    return this.showPinyin;
  }
  setShowPinyin(show: boolean): void {
    this.showPinyin = show;
  }
  getChatHistory(): ChatMessage[] {
    return this.chatHistory;
  }
  setChatHistory(messages: ChatMessage[]): void {
    this.chatHistory = messages;
  }
  getLastWritingEvaluation(): WritingEvaluation | null {
    return this.lastWritingEvaluation;
  }
  setLastWritingEvaluation(evaluation: WritingEvaluation | null): void {
    this.lastWritingEvaluation = evaluation;
  }
  getLastVocabularySet(): VocabularyItem[] {
    return this.lastVocabularySet;
  }
  setLastVocabularySet(items: VocabularyItem[]): void {
    this.lastVocabularySet = items;
  }
  getLastHskSet(): HskExerciseSet | null {
    return this.lastHskSet;
  }
  setLastHskSet(set: HskExerciseSet | null): void {
    this.lastHskSet = set;
  }
}

export const sessionStore: SessionPersistenceAdapter = new InMemorySessionStore();
