export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type WorkspaceTab =
  | 'chat'
  | 'grader'
  | 'vocabulary'
  | 'hsk'
  | 'roleplay';

export interface ChineseSegment {
  hanzi: string;
  pinyin: string;
  vietnamese: string;
}

export interface LanguageCorrection {
  hasError: boolean;
  original: string;
  corrected: string;
  correctedPinyin?: string;
  explanationVi: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  textVi: string;
  chineseSegments?: ChineseSegment[];
  correction?: LanguageCorrection;
  suggestionsVi?: string[];
  createdAt: number;
}

export interface WritingRubricCriterion {
  key: 'grammar' | 'vocabulary' | 'naturalness' | 'coherence' | 'relevance';
  labelVi: string;
  score: number | null;
  maxScore: number;
  commentVi: string;
}

export interface WritingMistake {
  original: string;
  corrected: string;
  correctedPinyin: string;
  categoryVi: string;
  explanationVi: string;
}

export interface StyleSuggestion {
  original: string;
  suggestion: string;
  suggestionPinyin: string;
  reasonVi: string;
}

export interface FollowUpExercise {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'rewrite';
  instructionVi: string;
  promptChinese: string;
  promptPinyin: string;
  options: string[];
  correctAnswer: string;
  explanationVi: string;
}

export interface WritingEvaluation {
  mode: 'full' | 'partial';
  totalScore: number;
  maxPossibleScore: number;
  overallFeedbackVi: string;
  missingPromptNoteVi?: string;
  criteria: WritingRubricCriterion[];
  mistakes: WritingMistake[];
  styleSuggestions: StyleSuggestion[];
  improvedVersion: {
    hanzi: string;
    pinyin: string;
    vietnameseTranslation: string;
  };
  followUpExercises: FollowUpExercise[];
  disclaimerVi: string;
}

export interface VocabularyItem {
  id: string;
  hanzi: string;
  pinyin: string;
  partOfSpeechVi: string;
  meaningVi: string;
  exampleHanzi: string;
  examplePinyin: string;
  exampleVi: string;
  usageNoteVi: string;
  hskLevel: HskLevel;
}

export type HskSkillFocus = 'mixed' | 'grammar_vocab' | 'reading_order';

export interface HskQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'sentence_order';
  instructionVi: string;
  promptChinese: string;
  promptPinyin: string;
  options: string[];
  correctAnswer: string;
  explanationVi: string;
}

export interface HskExerciseSet {
  level: HskLevel;
  skillFocus: HskSkillFocus;
  titleVi: string;
  questions: HskQuestion[];
}

export interface RoleplayScenario {
  id: string;
  titleVi: string;
  descriptionVi: string;
  partnerRoleVi: string;
  partnerRoleZh: string;
  starterHanzi: string;
  starterPinyin: string;
  starterVi: string;
}

export interface RoleplayReply {
  replyHanzi: string;
  replyPinyin: string;
  replyVi: string;
  correction: LanguageCorrection;
  suggestedUserReplies: {
    hanzi: string;
    pinyin: string;
    vi: string;
  }[];
}
