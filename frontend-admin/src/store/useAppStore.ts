import { create } from 'zustand';
import type { AppState, ToastType, AudioSettings, SessionRecord, Toast } from '@/types';
import { generateId } from '@/utils/helpers';
import { DEFAULT_AUDIO_SETTINGS, TOAST_DURATION, TOAST_EXIT_DURATION, MAX_TOASTS, LANGUAGES } from '@/utils/constants';

const STORAGE_KEY = 'subtitle-translator-session-records';

// Toast 定时器表（模块级，避免随组件重渲染重复创建）
const toastTimers: Record<string, ReturnType<typeof setTimeout>> = {};

const clearToastTimer = (id: string) => {
  const timer = toastTimers[id];
  if (timer) {
    clearTimeout(timer);
    delete toastTimers[id];
  }
};

const loadRecordsFromStorage = (): SessionRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((r: SessionRecord) => ({
        ...r,
        timestamp: new Date(r.timestamp),
      }));
    }
  } catch {
    console.error('Failed to load session records from storage');
  }
  return [];
};

const saveRecordsToStorage = (records: SessionRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    console.error('Failed to save session records to storage');
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  // 控制面板状态
  sourceLang: 'zh-CN',
  targetLang: 'en-US',
  isMicOn: false,
  isRecording: false,
  audioSettings: DEFAULT_AUDIO_SETTINGS,
  
  // 字幕状态 - 初始为空
  subtitles: [],
  currentSubtitle: '',
  
  // 翻译状态
  inputText: '',
  translationHistory: [],
  isTranslating: false,
  
  // Toast状态
  toasts: [],
  
  // 会话记录
  sessionRecords: loadRecordsFromStorage(),
  
  // Actions
  setSourceLang: (lang: string) => {
    const { sourceLang } = get();
    // 值没有真正改变时不更新状态、不弹提醒
    if (lang === sourceLang) return;
    const langName = LANGUAGES.find(l => l.code === lang)?.nativeName ?? lang;
    set({ sourceLang: lang });
    get().addToast('info', `识别语言已切换为 ${langName}`);
  },

  setTargetLang: (lang: string) => {
    const { targetLang } = get();
    // 值没有真正改变时不更新状态、不弹提醒
    if (lang === targetLang) return;
    const langName = LANGUAGES.find(l => l.code === lang)?.nativeName ?? lang;
    set({ targetLang: lang });
    get().addToast('info', `翻译语言已切换为 ${langName}`);
  },
  
  toggleMic: () => {
    const { isMicOn } = get();
    const newState = !isMicOn;
    set({ isMicOn: newState, isRecording: newState });
  },
  
  setAudioSettings: (settings: Partial<AudioSettings>) => {
    set(state => ({
      audioSettings: { ...state.audioSettings, ...settings },
    }));
  },
  
  addSubtitle: (original: string, translated: string) => {
    const { sourceLang, targetLang } = get();
    set(state => ({
      subtitles: [
        ...state.subtitles.map(s => ({ ...s, isActive: false })),
        {
          id: generateId(),
          originalText: original,
          translatedText: translated,
          timestamp: new Date(),
          isActive: true,
        },
      ],
      currentSubtitle: '',
    }));
    get().addSessionRecord({
      type: 'voice',
      sourceText: original,
      targetText: translated,
      sourceLang,
      targetLang,
    });
  },
  
  setCurrentSubtitle: (text: string) => {
    set({ currentSubtitle: text });
  },
  
  setInputText: (text: string) => {
    set({ inputText: text });
  },
  
  translate: async () => {
    const { inputText, sourceLang, targetLang, addToast, addSessionRecord } = get();
    
    if (!inputText.trim()) {
      addToast('warning', '请输入要翻译的文本');
      return;
    }
    
    set({ isTranslating: true });
    
    try {
      // 模拟翻译
      await new Promise(resolve => setTimeout(resolve, 800));
      const result = `[Translated] ${inputText}`;
      
      set(state => ({
        translationHistory: [
          {
            id: generateId(),
            sourceText: inputText,
            targetText: result,
            sourceLang,
            targetLang,
            timestamp: new Date(),
          },
          ...state.translationHistory,
        ],
        inputText: '',
        isTranslating: false,
      }));
      
      addSessionRecord({
        type: 'manual',
        sourceText: inputText,
        targetText: result,
        sourceLang,
        targetLang,
      });
      
      addToast('success', '翻译完成');
    } catch {
      set({ isTranslating: false });
      addToast('error', '翻译失败，请重试');
    }
  },
  
  addToast: (type: ToastType, message: string) => {
    const { toasts } = get();
    const duration = TOAST_DURATION;

    // 相同内容的提醒只保留一条，累加次数，并重置存活计时
    const existing = toasts.find(t => !t.leaving && t.type === type && t.message === message);
    if (existing) {
      clearToastTimer(existing.id);
      set(state => ({
        toasts: state.toasts.map(t =>
          t.id === existing.id ? { ...t, count: (t.count ?? 1) + 1 } : t
        ),
      }));
      toastTimers[existing.id] = setTimeout(() => {
        get().dismissToast(existing.id);
      }, duration);
      return;
    }

    // 新提醒入队，同屏超过上限时先直接挤掉最旧的一条（先进先出）
    const activeToasts = toasts.filter(t => !t.leaving);
    let nextToasts: Toast[];
    if (activeToasts.length >= MAX_TOASTS) {
      const oldestId = activeToasts[0].id;
      clearToastTimer(oldestId);
      nextToasts = toasts.filter(t => t.id !== oldestId);
    } else {
      nextToasts = toasts;
    }

    const id = generateId();
    set({
      toasts: [...nextToasts, { id, type, message, duration, count: 1 }],
    });

    toastTimers[id] = setTimeout(() => {
      get().dismissToast(id);
    }, duration);
  },

  // 标记为退场中，播放收敛动画后再真正移除
  dismissToast: (id: string) => {
    clearToastTimer(id);
    set(state => {
      if (!state.toasts.some(t => t.id === id)) return {};
      return {
        toasts: state.toasts.map(t => (t.id === id ? { ...t, leaving: true } : t)),
      };
    });
    setTimeout(() => {
      get().removeToast(id);
    }, TOAST_EXIT_DURATION);
  },

  removeToast: (id: string) => {
    clearToastTimer(id);
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },
  
  addSessionRecord: (record) => {
    set(state => {
      const newRecord: SessionRecord = {
        id: generateId(),
        timestamp: new Date(),
        ...record,
      };
      const newRecords = [newRecord, ...state.sessionRecords];
      saveRecordsToStorage(newRecords);
      return { sessionRecords: newRecords };
    });
  },
  
  deleteSessionRecord: (id: string) => {
    set(state => {
      const newRecords = state.sessionRecords.filter(r => r.id !== id);
      saveRecordsToStorage(newRecords);
      return { sessionRecords: newRecords };
    });
    get().addToast('success', '记录已删除');
  },
  
  clearSessionRecords: () => {
    set({ sessionRecords: [] });
    saveRecordsToStorage([]);
    get().addToast('success', '所有记录已清空');
  },
}));
