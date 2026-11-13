import { useEffect, useState } from 'react';
import type {
  ChatMessage,
  HskExerciseSet,
  HskLevel,
  VocabularyItem,
  WorkspaceTab,
  WritingEvaluation,
} from './types/learning';
import { sessionStore } from './services/sessionStorage';
import { useAuth } from './contexts/AuthContext';
import {
  loadUserPreferences,
  subscribeChatMessages,
  subscribeSavedVocab,
  syncUserPreferences,
} from './services/firestoreSync';
import { updateSqlPreferredHsk } from './services/apiClient';
import { Sidebar } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { ChatWorkspace } from './components/ChatWorkspace';
import { WritingGraderWorkspace } from './components/WritingGraderWorkspace';
import { VocabularyWorkspace } from './components/VocabularyWorkspace';
import { HskPracticeWorkspace } from './components/HskPracticeWorkspace';
import { RoleplayWorkspace } from './components/RoleplayWorkspace';
import { MascotCompanion } from './components/MascotCompanion';

export default function App() {
  const { user, authReady, getIdToken } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [hskLevel, setHskLevelState] = useState<HskLevel>(() =>
    sessionStore.getHskLevel()
  );
  const [showPinyin, setShowPinyinState] = useState<boolean>(() =>
    sessionStore.getShowPinyin()
  );
  const [chatMessages, setChatMessagesState] = useState<ChatMessage[]>(() =>
    sessionStore.getChatHistory()
  );
  const [writingEval, setWritingEvalState] = useState<WritingEvaluation | null>(() =>
    sessionStore.getLastWritingEvaluation()
  );
  const [vocabItems, setVocabItemsState] = useState<VocabularyItem[]>(() =>
    sessionStore.getLastVocabularySet()
  );
  const [savedVocabItems, setSavedVocabItems] = useState<VocabularyItem[]>([]);
  const [hskSet, setHskSetState] = useState<HskExerciseSet | null>(() =>
    sessionStore.getLastHskSet()
  );

  // Sync Firestore preferences, chat history, and saved vocab when signed in
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setSavedVocabItems([]);
      return;
    }

    let cancelled = false;

    void loadUserPreferences(user.uid)
      .then((prefs) => {
        if (cancelled || !prefs) return;
        setHskLevelState(prefs.preferredHskLevel);
        sessionStore.setHskLevel(prefs.preferredHskLevel);
        setShowPinyinState(prefs.showPinyin);
        sessionStore.setShowPinyin(prefs.showPinyin);
      })
      .catch((err) => {
        console.error('Failed to load Firestore preferences:', err);
      });

    const unsubChat = subscribeChatMessages(
      user.uid,
      (remoteMsgs) => {
        setChatMessagesState(remoteMsgs);
        sessionStore.setChatHistory(remoteMsgs);
      },
      (err) => {
        console.error('Chat subscription error:', err);
      }
    );

    const unsubVocab = subscribeSavedVocab(
      user.uid,
      (remoteVocab) => {
        setSavedVocabItems(remoteVocab);
      },
      (err) => {
        console.error('Vocab subscription error:', err);
      }
    );

    return () => {
      cancelled = true;
      unsubChat();
      unsubVocab();
    };
  }, [authReady, user]);

  const handleChangeHskLevel = (level: HskLevel) => {
    setHskLevelState(level);
    sessionStore.setHskLevel(level);
    if (user) {
      void syncUserPreferences({
        uid: user.uid,
        displayName: user.displayName,
        preferredHskLevel: level,
        showPinyin,
      }).catch((err) => console.error('Pref sync error:', err));

      void getIdToken().then((token) => {
        if (token) {
          void updateSqlPreferredHsk(token, level).catch((err) =>
            console.error('SQL HSK sync error:', err)
          );
        }
      });
    }
  };

  const handleTogglePinyin = () => {
    const next = !showPinyin;
    setShowPinyinState(next);
    sessionStore.setShowPinyin(next);
    if (user) {
      void syncUserPreferences({
        uid: user.uid,
        displayName: user.displayName,
        preferredHskLevel: hskLevel,
        showPinyin: next,
      }).catch((err) => console.error('Pinyin pref sync error:', err));
    }
  };

  const handleUpdateChatMessages = (messages: ChatMessage[]) => {
    setChatMessagesState(messages);
    sessionStore.setChatHistory(messages);
  };

  const handleSaveWritingEval = (evaluation: WritingEvaluation | null) => {
    setWritingEvalState(evaluation);
    sessionStore.setLastWritingEvaluation(evaluation);
  };

  const handleSaveVocabItems = (items: VocabularyItem[]) => {
    setVocabItemsState(items);
    sessionStore.setLastVocabularySet(items);
  };

  const handleSaveHskSet = (set: HskExerciseSet | null) => {
    setHskSetState(set);
    sessionStore.setLastHskSet(set);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex selection:bg-red-800 selection:text-white relative">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderBar
          activeTab={activeTab}
          hskLevel={hskLevel}
          onChangeHskLevel={handleChangeHskLevel}
          showPinyin={showPinyin}
          onTogglePinyin={handleTogglePinyin}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
          {activeTab === 'chat' && (
            <ChatWorkspace
              hskLevel={hskLevel}
              showPinyin={showPinyin}
              messages={chatMessages}
              onUpdateMessages={handleUpdateChatMessages}
            />
          )}

          {activeTab === 'grader' && (
            <WritingGraderWorkspace
              hskLevel={hskLevel}
              showPinyin={showPinyin}
              lastEvaluation={writingEval}
              onSaveEvaluation={handleSaveWritingEval}
            />
          )}

          {activeTab === 'vocabulary' && (
            <VocabularyWorkspace
              hskLevel={hskLevel}
              showPinyin={showPinyin}
              items={vocabItems}
              savedItems={savedVocabItems}
              onSaveItems={handleSaveVocabItems}
            />
          )}

          {activeTab === 'hsk' && (
            <HskPracticeWorkspace
              hskLevel={hskLevel}
              showPinyin={showPinyin}
              exerciseSet={hskSet}
              onSaveExerciseSet={handleSaveHskSet}
            />
          )}

          {activeTab === 'roleplay' && (
            <RoleplayWorkspace hskLevel={hskLevel} showPinyin={showPinyin} />
          )}
        </main>
      </div>

      {/* Floating Interactive Mascot Companion */}
      <MascotCompanion />
    </div>
  );
}
