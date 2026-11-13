import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { ChatMessage, HskLevel, VocabularyItem } from '../types/learning';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned || `id-${Date.now()}`;
}

export async function loadUserPreferences(uid: string): Promise<{
  preferredHskLevel: HskLevel;
  showPinyin: boolean;
} | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    const lvl = Number(data.preferredHskLevel);
    return {
      preferredHskLevel: lvl >= 1 && lvl <= 6 ? (lvl as HskLevel) : 2,
      showPinyin: typeof data.showPinyin === 'boolean' ? data.showPinyin : true,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncUserPreferences(params: {
  uid: string;
  displayName?: string | null;
  preferredHskLevel: HskLevel;
  showPinyin: boolean;
}): Promise<void> {
  const path = `users/${params.uid}`;
  const ref = doc(db, 'users', params.uid);
  try {
    const existingSnap = await getDoc(ref);
    const safeName = (params.displayName ?? '').slice(0, 120);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        uid: params.uid,
        displayName: safeName,
        preferredHskLevel: params.preferredHskLevel,
        showPinyin: params.showPinyin,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: safeName,
        preferredHskLevel: params.preferredHskLevel,
        showPinyin: params.showPinyin,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveChatMessageToFirestore(
  uid: string,
  msg: ChatMessage
): Promise<void> {
  const docId = sanitizeId(msg.id);
  const path = `users/${uid}/chatMessages/${docId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'chatMessages', docId), {
      ownerUid: uid,
      role: msg.role,
      textVi: msg.textVi.slice(0, 4000),
      chineseSegments: (msg.chineseSegments ?? []).slice(0, 10),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeChatMessages(
  uid: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}/chatMessages`;
  const q = query(
    collection(db, 'users', uid, 'chatMessages'),
    where('ownerUid', '==', uid),
    orderBy('createdAt', 'asc'),
    limit(60)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ChatMessage[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          role: data.role === 'user' ? 'user' : 'assistant',
          textVi: String(data.textVi ?? ''),
          chineseSegments: Array.isArray(data.chineseSegments)
            ? data.chineseSegments
            : [],
          createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function clearChatMessagesInFirestore(uid: string): Promise<void> {
  const path = `users/${uid}/chatMessages`;
  try {
    const q = query(
      collection(db, 'users', uid, 'chatMessages'),
      where('ownerUid', '==', uid),
      limit(100)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveVocabCardToFirestore(
  uid: string,
  item: VocabularyItem
): Promise<string> {
  const docId = sanitizeId(item.id);
  const path = `users/${uid}/savedVocab/${docId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'savedVocab', docId), {
      ownerUid: uid,
      hanzi: item.hanzi.slice(0, 80),
      pinyin: item.pinyin.slice(0, 160),
      partOfSpeechVi: item.partOfSpeechVi.slice(0, 60),
      meaningVi: item.meaningVi.slice(0, 240),
      exampleHanzi: item.exampleHanzi.slice(0, 240),
      examplePinyin: item.examplePinyin.slice(0, 400),
      exampleVi: item.exampleVi.slice(0, 400),
      usageNoteVi: (item.usageNoteVi ?? '').slice(0, 400),
      hskLevel: item.hskLevel,
      createdAt: serverTimestamp(),
    });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeVocabCardFromFirestore(
  uid: string,
  vocabId: string
): Promise<void> {
  const docId = sanitizeId(vocabId);
  const path = `users/${uid}/savedVocab/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'savedVocab', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeSavedVocab(
  uid: string,
  onData: (items: VocabularyItem[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}/savedVocab`;
  const q = query(
    collection(db, 'users', uid, 'savedVocab'),
    where('ownerUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: VocabularyItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        const lvl = Number(data.hskLevel);
        return {
          id: d.id,
          hanzi: String(data.hanzi ?? ''),
          pinyin: String(data.pinyin ?? ''),
          partOfSpeechVi: String(data.partOfSpeechVi ?? ''),
          meaningVi: String(data.meaningVi ?? ''),
          exampleHanzi: String(data.exampleHanzi ?? ''),
          examplePinyin: String(data.examplePinyin ?? ''),
          exampleVi: String(data.exampleVi ?? ''),
          usageNoteVi: String(data.usageNoteVi ?? ''),
          hskLevel: lvl >= 1 && lvl <= 6 ? (lvl as HskLevel) : 2,
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}
