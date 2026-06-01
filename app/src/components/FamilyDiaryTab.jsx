import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, CalendarDays, Image as ImageIcon, Lock, Home, ImagePlus, ChevronLeft, ChevronRight, MoreHorizontal, X, Camera, CalendarHeart, Video, Trash2, Edit2, MessageCircle, Heart, Smile, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NativeSafeConfirmDialog, NativeSafeDateInput, NativeSafeSelect, NativeSafeTimeInput } from './NativeSafeControls';

// Initial Mock Data
const INITIAL_RECORDS = [];

const MOODS = ['😊', '🥰', '😮', '😴', '🤒', '😭', '😠', '🥳', '🤔'];
const DIARY_RECORDS_STORAGE_KEY = 'family-diary-records-v1';
const LEGACY_DIARY_RECORDS_STORAGE_KEY = 'memory-mvp-records-v2';
const DIARY_TITLE_MAX_LENGTH = 25;
const DIARY_TEXT_MAX_LENGTH = 500;
const DIARY_COMMENT_MAX_LENGTH = 50;
const DIARY_COLLAPSE_TEXT_LENGTH = 90;
const DIARY_TEXT_COLLAPSED_HEIGHT = 68;
const VIEWER_TEXT_COLLAPSED_HEIGHT = 73;
const DIARY_TEXT_EXPAND_TRANSITION = { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] };
const DIARY_TOGGLE_LABEL_TRANSITION = { duration: 0.16, ease: 'easeOut' };
const HIDDEN_SCROLLBAR_STYLE = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none'
};

const toSafeString = (value, fallback = '') => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const getLocalDateString = (date = new Date()) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const normalizeIsoDate = (value) => {
  const raw = toSafeString(value).trim().replace(/\./g, '-');
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return getLocalDateString();
  return `${match[1]}-${String(parseInt(match[2], 10)).padStart(2, '0')}-${String(parseInt(match[3], 10)).padStart(2, '0')}`;
};

const createDateLabelFromIso = (isoDate) => {
  const [, month, day] = normalizeIsoDate(isoDate).split('-');
  return `${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
};

const createIsoDateFromLabel = (date, fallbackYear = new Date().getFullYear()) => {
  const match = toSafeString(date).trim().match(/^(\d{1,2})월\s*(\d{1,2})일/);
  if (!match) return null;
  return `${fallbackYear}-${String(parseInt(match[1], 10)).padStart(2, '0')}-${String(parseInt(match[2], 10)).padStart(2, '0')}`;
};

const getDiaryRecordIsoDate = (record) => {
  const rawIsoDate = toSafeString(record?.isoDate).trim();
  if (rawIsoDate) return normalizeIsoDate(rawIsoDate);
  return createIsoDateFromLabel(record?.date) || getLocalDateString();
};

const normalizeDiaryDateLabel = (date, isoDate) => {
  const raw = toSafeString(date).trim();
  const match = raw.match(/^(\d{1,2})월\s*(\d{1,2})일/);
  if (match) return `${parseInt(match[1], 10)}월 ${parseInt(match[2], 10)}일`;
  return createDateLabelFromIso(isoDate);
};

const normalizeDiaryTime = (value) => {
  const raw = toSafeString(value).trim();
  if (raw.includes('오전') || raw.includes('오후')) return raw;
  const match = raw.match(/^(\d{1,2}):(\d{1,2})/);
  if (!match) return '';
  let hour = Math.min(Math.max(parseInt(match[1], 10) || 0, 0), 23);
  const minute = String(Math.min(Math.max(parseInt(match[2], 10) || 0, 0), 59)).padStart(2, '0');
  const ampm = hour >= 12 ? '오후' : '오전';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${ampm} ${hour}:${minute}`;
};

const limitText = (value, maxLength) => toSafeString(value).slice(0, maxLength);

const shouldCollapseDiaryText = (value) => {
  const text = toSafeString(value).trim();
  return text.length > DIARY_COLLAPSE_TEXT_LENGTH || text.split(/\r\n|\r|\n/).length > 3;
};

const CollapsibleDiaryText = ({
  text,
  canToggle,
  isExpanded,
  collapsedHeight,
  expandedMaxViewportRatio = null
}) => {
  const contentRef = useRef(null);
  const [measuredHeight, setMeasuredHeight] = useState(collapsedHeight);
  const [viewportHeight, setViewportHeight] = useState(0);

  useLayoutEffect(() => {
    if (!canToggle) return undefined;

    const measure = () => {
      const nextHeight = contentRef.current?.scrollHeight || collapsedHeight;
      setMeasuredHeight(Math.max(collapsedHeight, Math.ceil(nextHeight)));
      if (typeof window !== 'undefined') {
        setViewportHeight(window.innerHeight);
      }
    };

    measure();

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (resizeObserver && contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }
    window.addEventListener('resize', measure);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [canToggle, collapsedHeight, text]);

  if (!canToggle) {
    return (
      <span className="block whitespace-pre-wrap break-words">
        {text}
      </span>
    );
  }

  const expandedMaxHeight = expandedMaxViewportRatio && viewportHeight
    ? Math.round(viewportHeight * expandedMaxViewportRatio)
    : null;
  const expandedHeight = expandedMaxHeight ? Math.min(measuredHeight, expandedMaxHeight) : measuredHeight;
  const targetHeight = isExpanded ? expandedHeight : collapsedHeight;
  const shouldScrollExpandedText = Boolean(isExpanded && expandedMaxHeight && measuredHeight > expandedMaxHeight);

  return (
    <motion.span
      initial={false}
      animate={{ height: targetHeight }}
      transition={DIARY_TEXT_EXPAND_TRANSITION}
      style={shouldScrollExpandedText ? HIDDEN_SCROLLBAR_STYLE : undefined}
      className={`block ${shouldScrollExpandedText ? 'overflow-y-auto [&::-webkit-scrollbar]:hidden' : 'overflow-hidden'}`}
    >
      <span ref={contentRef} className="block whitespace-pre-wrap break-words">
        {text}
      </span>
    </motion.span>
  );
};

const normalizeDiaryRecords = (records) => (
  Array.isArray(records) ? records : []
).map((record, index) => {
  const isoDate = getDiaryRecordIsoDate(record);
  const imageUrls = Array.isArray(record?.imageUrls)
    ? record.imageUrls.filter(url => typeof url === 'string' && url)
    : [];
  const imageUrl = toSafeString(record?.imageUrl || imageUrls[0] || '');
  const allImageUrls = imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);

  return {
    id: toSafeString(record?.id) || `diary-${isoDate}-${index}`,
    child: toSafeString(record?.child, '아이1') || '아이1',
    date: normalizeDiaryDateLabel(record?.date, isoDate),
    isoDate,
    time: normalizeDiaryTime(record?.time),
    mood: MOODS.includes(record?.mood) ? record.mood : '😊',
    title: toSafeString(record?.title, '다이어리'),
    text: toSafeString(record?.text),
    hasMedia: Boolean(record?.hasMedia || allImageUrls.length > 0),
    imageUrl: imageUrl || null,
    imageUrls: allImageUrls,
    linked: toSafeString(record?.linked),
    reactions: Array.isArray(record?.reactions) ? record.reactions.filter(item => typeof item === 'string') : [],
    comments: Array.isArray(record?.comments) ? record.comments.map((comment, commentIndex) => ({
      id: toSafeString(comment?.id) || `comment-${index}-${commentIndex}`,
      author: toSafeString(comment?.author, '가족') || '가족',
      text: limitText(comment?.text, DIARY_COMMENT_MAX_LENGTH),
      time: toSafeString(comment?.time)
    })) : []
  };
});

const BottomTab = ({ active, label, icon, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center pt-1 transition-colors
      ${active ? 'text-accent-red' : 'text-navy/40'}
    `}
  >
    {React.createElement(icon, { size: 20, className: active ? 'stroke-[2.5px]' : 'stroke-2' })}
    <span className="text-[10px] mt-0.5 font-bold tracking-tight">{label}</span>
  </button>
);

export default function FamilyDiaryTab({ isEmbedded = false, embeddedActiveTab, onEmbeddedTabChange }) {
  const [internalActiveTab, setInternalActiveTab] = useState('home');
  const activeTab = isEmbedded && embeddedActiveTab ? embeddedActiveTab : internalActiveTab;
  const setActiveTab = useCallback((nextTab) => {
    if (isEmbedded && onEmbeddedTabChange) {
      onEmbeddedTabChange(nextTab);
      return;
    }

    setInternalActiveTab(nextTab);
  }, [isEmbedded, onEmbeddedTabChange]);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallMode, setPaywallMode] = useState('default');
  const [isPremium, setIsPremium] = useState(false);
  const didHydrateRecordsRef = useRef(false);
  
  // CRUD States
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(DIARY_RECORDS_STORAGE_KEY) || localStorage.getItem(LEGACY_DIARY_RECORDS_STORAGE_KEY);
      if (saved) return normalizeDiaryRecords(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to parse records from localStorage', e);
    }
    return INITIAL_RECORDS;
  });

  useEffect(() => {
    if (!didHydrateRecordsRef.current) {
      didHydrateRecordsRef.current = true;
      return;
    }

    try {
      localStorage.setItem(DIARY_RECORDS_STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Storage quota exceeded', error);
      alert('브라우저 저장 공간이 부족합니다. 이미지가 너무 많습니다. 불필요한 기록을 삭제해주세요.');
    }
  }, [records]);
  const [searchDate, setSearchDate] = useState('');
  
  // Composer States
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [titleInput, setTitleInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [expandedTextIds, setExpandedTextIds] = useState(() => new Set());
  const [selectedMood, setSelectedMood] = useState('😊');
  
  // New States for Date/Time
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  
  // Photo Viewer State
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [isViewerTextExpanded, setIsViewerTextExpanded] = useState(false);
  
  // Action Menu States
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  const [commentInputs, setCommentInputs] = useState({});
  const [commentAuthors, setCommentAuthors] = useState({});
  const [customAuthors, setCustomAuthors] = useState({});
  const [deleteRecordTargetId, setDeleteRecordTargetId] = useState(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState(null);

  // Photo Upload State
  const [selectedImages, setSelectedImages] = useState([]);
  const fileInputRef = useRef(null);

  // Calendar Page States
  const [selectedDate, setSelectedDate] = useState(null);

  // Gallery Page States
  const [visibleMonth, setVisibleMonth] = useState('');
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const observer = useRef(null);

  // PDF Export States
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('spring');
  const [exportStartDate, setExportStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [exportEndDate, setExportEndDate] = useState(() => getLocalDateString());

  const openPaywall = useCallback((mode = 'default') => {
    setPaywallMode(mode);
    setPaywallOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallOpen(false);
    setPaywallMode('default');
  }, []);

  // Gallery Scroll Observer & Indicator Logic
  useEffect(() => {
    if (activeTab === 'gallery') {
      const timeoutId = setTimeout(() => {
        observer.current = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setVisibleMonth(entry.target.getAttribute('data-month'));
            }
          });
        }, { root: document.querySelector('main'), rootMargin: "-10px 0px -50% 0px" });

        document.querySelectorAll('.gallery-month-header').forEach(el => observer.current.observe(el));
      }, 100);
      
      const handleWindowScroll = () => {
        setShowScrollIndicator(window.scrollY > 50);
      };
      window.addEventListener('scroll', handleWindowScroll, { passive: true });
      
      return () => {
        clearTimeout(timeoutId);
        observer.current?.disconnect();
        window.removeEventListener('scroll', handleWindowScroll);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    setIsViewerTextExpanded(false);
  }, [viewingPhoto?.photoId]);

  // Helper to parse YYYY-MM-DD to "X월 Y일"
  const getFormattedDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
    }
    return null;
  };
  
  const getFormattedTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':');
    let hour = parseInt(h);
    const ampm = hour >= 12 ? '오후' : '오전';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${ampm} ${hour}:${m}`;
  };

  // --- Handlers ---
  const handleOpenComposer = (record = null) => {
    if (record) {
      setEditingRecordId(record.id);
      setTitleInput(limitText(record.title, DIARY_TITLE_MAX_LENGTH));
      setTextInput(limitText(record.text, DIARY_TEXT_MAX_LENGTH));
      setSelectedMood(record.mood);
      
      // Parse "5월 27일" back to "YYYY-MM-DD"
      try {
        const month = record.date.split('월')[0].trim().padStart(2, '0');
        const day = record.date.split('월')[1].replace('일', '').trim().padStart(2, '0');
        setDateInput(`2026-${month}-${day}`);
      } catch {
        setDateInput('2026-05-01');
      }

      // Parse "오후 1:30" back to "HH:MM"
      try {
        let [ampm, hm] = record.time.split(' ');
        let [h, m] = hm.split(':');
        let hour = parseInt(h);
        if (ampm === '오후' && hour < 12) hour += 12;
        if (ampm === '오전' && hour === 12) hour = 0;
        setTimeInput(`${hour.toString().padStart(2, '0')}:${m}`);
      } catch {
        setTimeInput('12:00');
      }
    } else {
      const now = new Date();
      setEditingRecordId(null);
      setTitleInput('');
      setTextInput('');
      setSelectedMood('😊');
      setDateInput(now.toISOString().split('T')[0]);
      setTimeInput(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }
    setSelectedImages(record?.imageUrls || (record?.imageUrl ? [record.imageUrl] : []));
    setComposerOpen(true);
    setActiveMenuId(null);
  };

  const handleTitleInputChange = (event) => {
    setTitleInput(limitText(event.target.value, DIARY_TITLE_MAX_LENGTH));
  };

  const handleTextInputChange = (event) => {
    setTextInput(limitText(event.target.value, DIARY_TEXT_MAX_LENGTH));
  };

  const toggleRecordText = (recordId) => {
    setExpandedTextIds(prev => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const maxPhotos = isPremium ? 20 : 3;
    
    if (selectedImages.length + files.length > maxPhotos) {
      if (!isPremium) {
        openPaywall();
      } else {
        alert(`사진은 최대 ${maxPhotos}장까지 첨부할 수 있습니다.`);
      }
      return;
    }

    const processFile = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 1000;
            if (width > height && width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    };

    Promise.all(files.map(processFile)).then(dataUrls => {
      setSelectedImages(prev => [...prev, ...dataUrls].slice(0, maxPhotos));
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveRecord = () => {
    const safeTitle = limitText(titleInput, DIARY_TITLE_MAX_LENGTH).trim();
    const safeText = limitText(textInput, DIARY_TEXT_MAX_LENGTH);

    if (!safeTitle) return alert('제목을 입력해주세요.');
    
    const displayDate = dateInput ? getFormattedDate(dateInput) : '날짜 미상';
    const displayTime = timeInput ? getFormattedTime(timeInput) : '';

    if (editingRecordId) {
      // Update
      setRecords(prev => prev.map(r => r.id === editingRecordId ? {
        ...r,
        title: safeTitle,
        text: safeText,
        mood: selectedMood,
        date: displayDate,
        isoDate: dateInput,
        time: displayTime,
        hasMedia: selectedImages.length > 0,
        imageUrl: selectedImages.length > 0 ? selectedImages[0] : null,
        imageUrls: selectedImages
      } : r));
    } else {
      const newRecord = {
        id: Date.now().toString(),
        child: '아이1',
        date: displayDate,
        isoDate: dateInput,
        time: displayTime,
        mood: selectedMood,
        title: safeTitle,
        text: safeText,
        hasMedia: selectedImages.length > 0,
        imageUrl: selectedImages.length > 0 ? selectedImages[0] : null,
        imageUrls: selectedImages,
        linked: '',
        reactions: [],
        comments: []
      };
      setRecords(prev => [newRecord, ...prev]);
    }
    setComposerOpen(false);
  };

  const handleDeleteRecord = (id) => {
    setDeleteRecordTargetId(id);
    setActiveMenuId(null);
  };

  const confirmDeleteRecord = () => {
    if (!deleteRecordTargetId) return;
    setRecords(prev => prev.filter(r => r.id !== deleteRecordTargetId));
    setDeleteRecordTargetId(null);
  };

  const handleAddReaction = (recordId, emoji) => {
    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        const existing = r.reactions || [];
        return { ...r, reactions: [...existing, emoji] };
      }
      return r;
    }));
    setActiveReactionMenu(null);
  };

  const handleAddComment = (recordId) => {
    const text = limitText(commentInputs[recordId], DIARY_COMMENT_MAX_LENGTH).trim();
    if (!text) return;
    
    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        const existing = r.comments || [];
        let authorName = commentAuthors[recordId] || '아빠';
        if (authorName === '직접입력') {
          authorName = customAuthors[recordId]?.trim() || '익명';
        }

        const now = new Date();
        const mm = now.getMonth() + 1;
        const dd = now.getDate();
        const hh = now.getHours().toString().padStart(2, '0');
        const min = now.getMinutes().toString().padStart(2, '0');
        const timeStr = getFormattedTime(`${hh}:${min}`);

        const newComment = {
          id: Date.now().toString(),
          author: authorName,
          text,
          time: `${mm}월 ${dd}일 ${timeStr}`
        };
        return { ...r, comments: [...existing, newComment] };
      }
      return r;
    }));
    
    setCommentInputs(prev => ({ ...prev, [recordId]: '' }));
  };

  const handleCommentInputChange = (recordId, value) => {
    setCommentInputs(prev => ({
      ...prev,
      [recordId]: limitText(value, DIARY_COMMENT_MAX_LENGTH)
    }));
  };

  const handleSearchDateChange = (valueOrEvent) => {
    const nextValue = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value;
    setSearchDate(nextValue ? normalizeIsoDate(nextValue) : '');
  };

  // --- Pages ---
  const renderHomePage = () => {
    const formattedSearchDate = getFormattedDate(searchDate);
    const displayedRecords = formattedSearchDate 
      ? records.filter(r => normalizeIsoDate(r.isoDate) === searchDate || r.date === formattedSearchDate)
      : records;

    return (
      <div className="flex flex-col gap-4 pb-6 w-full">
        {isEmbedded && (
          <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-navy/5 shadow-md">
            <div className="flex items-center gap-2">
              <NativeSafeDateInput
                value={searchDate}
                onChange={handleSearchDateChange}
                compact
                pickerMode="popup"
                popupAlign="left"
                placeholder="날짜 검색"
                className="min-w-[118px]"
                buttonClassName="bg-navy/5 border border-navy/10 text-navy font-bold text-[11px] px-3.5 py-2 rounded-full hover:bg-navy/10 active:scale-95 transition-all"
              />
            </div>
            
            <button
              onClick={() => handleOpenComposer()}
              className="flex items-center gap-1.5 bg-accent-red text-white text-[11px] font-black px-4 py-2 rounded-full shadow-md shadow-accent-red/10 hover:brightness-110 active:scale-95 transition-all"
            >
              <Plus size={14} strokeWidth={2.5} />
              새 다이어리
            </button>
          </div>
        )}
        <AnimatePresence>
          {formattedSearchDate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-accent-red/10 border border-accent-red/20 text-accent-red text-[13px] font-bold p-3 rounded-lg flex justify-between items-center">
                <span>✨ {formattedSearchDate} 검색 결과 ({displayedRecords.length}건)</span>
                <button onClick={() => setSearchDate('')} className="bg-white/50 px-2 py-1 rounded text-[11px]">초기화</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {displayedRecords.length === 0 ? (
            <motion.div key="empty" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="py-12 flex flex-col items-center justify-center text-navy/40">
              <CalendarHeart size={48} strokeWidth={1} className="mb-4" />
              <p className="font-bold text-[14px]">기록된 내용이 없습니다.</p>
            </motion.div>
          ) : (
            displayedRecords.map(record => {
              const displayTitle = limitText(record.title, DIARY_TITLE_MAX_LENGTH);
              const displayText = limitText(record.text, DIARY_TEXT_MAX_LENGTH);
              const canToggleText = shouldCollapseDiaryText(displayText);
              const isTextExpanded = expandedTextIds.has(record.id);

              return (
              <motion.div layout key={record.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="bg-white p-4 rounded-2xl border border-navy/5 shadow-md relative">
                <div className="flex items-center justify-between mb-3 border-b border-navy/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-navy/5 border border-navy/10 text-navy text-[10px] font-bold px-2 py-0.5 rounded-full">{record.child}</span>
                    <span className="text-[11px] font-bold text-navy/60">{record.date} · {record.time}</span>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === record.id ? null : record.id)}
                      aria-label={`${displayTitle} 메뉴 열기`}
                      className="text-navy/30 hover:text-navy/70 p-1"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    
                    {activeMenuId === record.id && (
                      <div className="absolute right-0 top-6 bg-white border border-navy/5 rounded-lg shadow-[4px_4px_0_0_rgba(26,35,126,1)] w-28 z-20 overflow-hidden">
                        <button onClick={() => handleOpenComposer(record)} className="w-full px-3 py-2 text-[12px] font-bold text-navy flex items-center gap-2 hover:bg-navy/5 text-left border-b border-navy/10">
                          <Edit2 size={14} /> 수정하기
                        </button>
                        <button onClick={() => handleDeleteRecord(record.id)} className="w-full px-3 py-2 text-[12px] font-bold text-accent-red flex items-center gap-2 hover:bg-accent-red/5 text-left">
                          <Trash2 size={14} /> 삭제하기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="font-bold text-navy text-[17px] leading-tight flex items-center gap-2 mb-2">
                  <span className="text-xl">{record.mood}</span>
                  {displayTitle}
                </h3>
                {displayText && (
                  <button
                    type="button"
                    onClick={() => canToggleText && toggleRecordText(record.id)}
                    aria-expanded={canToggleText ? isTextExpanded : undefined}
                    className={`mb-4 block w-full rounded-md text-left text-navy/80 text-[14px] leading-relaxed font-medium focus:outline-none ${canToggleText ? 'cursor-pointer focus:ring-2 focus:ring-navy/10' : 'cursor-default'}`}
                  >
                    <CollapsibleDiaryText
                      text={displayText}
                      canToggle={canToggleText}
                      isExpanded={isTextExpanded}
                      collapsedHeight={DIARY_TEXT_COLLAPSED_HEIGHT}
                    />
                    {canToggleText && (
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isTextExpanded ? 'collapse' : 'more'}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={DIARY_TOGGLE_LABEL_TRANSITION}
                          className="mt-1.5 block text-[11px] font-bold text-navy/45"
                        >
                          {isTextExpanded ? '접기' : '더보기'}
                        </motion.span>
                      </AnimatePresence>
                    )}
                  </button>
                )}
                
                {record.hasMedia && (
                  record.imageUrls && record.imageUrls.length > 0 ? (
                    <div className={`mb-4 flex ${record.imageUrls.length === 1 ? '' : 'overflow-x-auto gap-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden'}`} style={{ scrollbarWidth: 'none' }}>
                      {record.imageUrls.map((imgUrl, idx) => (
                        <img key={idx} src={imgUrl} alt={`Attached ${idx+1}`} loading="lazy" decoding="async" onClick={() => setViewingPhoto({ ...record, title: displayTitle, text: displayText, imageUrl: imgUrl, photoId: `${record.id}-${idx}` })} className={`cursor-pointer ${record.imageUrls.length === 1 ? 'w-full' : 'w-[85%] shrink-0 snap-center'} h-[220px] object-cover rounded-lg border border-slate-300/60 bg-navy/5`} />
                      ))}
                    </div>
                  ) : record.imageUrl ? (
                    <img src={record.imageUrl} alt="Attached" loading="lazy" decoding="async" onClick={() => setViewingPhoto({ ...record, title: displayTitle, text: displayText, photoId: record.id })} className="cursor-pointer mb-4 w-full h-[220px] object-cover rounded-lg border border-slate-300/60 bg-navy/5" />
                  ) : (
                    <div className="mb-4 aspect-video bg-navy/5 border-2 border-dashed border-navy/20 rounded-lg flex items-center justify-center text-navy/30">
                      <Camera size={32} strokeWidth={1.5} />
                    </div>
                  )
                )}

                {/* Reactions & Comments Section */}
                <div className="mt-2 pt-3 border-t border-navy/5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative">
                      <button
                        onClick={() => setActiveReactionMenu(activeReactionMenu === record.id ? null : record.id)}
                        aria-label={`${displayTitle} 반응 추가`}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-navy/5 text-navy/60 hover:bg-navy/10 hover:text-navy transition-colors"
                      >
                        <Smile size={16} />
                      </button>
                      <AnimatePresence>
                        {activeReactionMenu === record.id && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-10 left-0 bg-white border border-navy/10 shadow-lg rounded-full px-2.5 py-1.5 flex gap-1.5 z-20 w-max">
                            {['❤️', '👍', '😂', '😢', '👏', '🎉', '😡', '😮', '🥺'].map(emoji => (
                              <button key={emoji} onClick={() => handleAddReaction(record.id, emoji)} className="text-lg hover:scale-125 transition-transform active:scale-95 shrink-0 px-0.5">{emoji}</button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {record.reactions?.map((emoji, idx) => (
                        <span key={idx} className="bg-navy/5 text-[12px] px-2 py-0.5 rounded-full border border-navy/5">{emoji}</span>
                      ))}
                    </div>
                  </div>

                  {record.comments?.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {record.comments.map(c => (
                        <div key={c.id} className="bg-navy/5 rounded-xl px-3 py-2 text-[12px]">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-navy">{c.author}</span>
                            <span className="text-[10px] text-navy/40 font-medium">{c.time}</span>
                          </div>
                          <p className="text-navy/80">{limitText(c.text, DIARY_COMMENT_MAX_LENGTH)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <NativeSafeSelect
                      value={commentAuthors[record.id] || '아빠'}
                      options={[
                        { value: '아빠', label: '아빠' },
                        { value: '엄마', label: '엄마' },
                        { value: '직접입력', label: '직접작성' },
                      ]}
                      onChange={(author) => setCommentAuthors(prev => ({ ...prev, [record.id]: author }))}
                      className="shrink-0 min-w-[82px]"
                      buttonClassName="bg-navy/5 border border-navy/10 rounded-full px-2.5 py-2 text-[11px] text-navy font-bold outline-none focus:border-navy/20 focus:bg-white transition-all"
                    />
                    
                    {commentAuthors[record.id] === '직접입력' && (
                      <input 
                        type="text" 
                        placeholder="이름" 
                        value={customAuthors[record.id] || ''}
                        onChange={(e) => setCustomAuthors(prev => ({ ...prev, [record.id]: e.target.value }))}
                        className="w-[60px] shrink-0 bg-navy/5 border border-navy/10 rounded-full px-3 py-2 text-[12px] text-navy outline-none focus:border-navy/20 focus:bg-white transition-all"
                      />
                    )}

                    <input 
                      type="text" 
                      placeholder="댓글을 남겨보세요..." 
                      value={commentInputs[record.id] || ''}
                      maxLength={DIARY_COMMENT_MAX_LENGTH}
                      onChange={(e) => handleCommentInputChange(record.id, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(record.id)}
                      className="flex-1 min-w-0 bg-navy/5 border border-navy/10 rounded-full px-4 py-2 text-[12px] text-navy outline-none focus:border-navy/20 focus:bg-white transition-all"
                    />
                    <button
                      onClick={() => handleAddComment(record.id)}
                      disabled={!commentInputs[record.id]?.trim()}
                      aria-label={`${displayTitle} 댓글 등록`}
                      className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-navy text-white disabled:bg-navy/20 disabled:text-navy/40 transition-colors"
                    >
                      <Send size={14} className="-ml-0.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderCalendarPage = () => {
    const selectedRecords = selectedDate ? records.filter(r => r.date === `5월 ${selectedDate}일`) : [];

    return (
      <div className="flex flex-col gap-4 pb-6 w-full">
        {/* Calendar View */}
        <div className="bg-white p-4 rounded-2xl border border-navy/5 shadow-md">
          <div className="flex items-center justify-center mb-5 border-b border-navy/5 pb-3">
            <h3 className="font-bold text-navy text-lg">2026년 5월 다이어리</h3>
          </div>
          <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center text-[11px] font-bold text-navy/50 mb-2">
            {['일','월','화','수','목','금','토'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center text-[13px] font-bold text-navy">
            {/* May 2026 starts on Friday (index 5: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5) */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({length: 31}, (_, i) => {
              const day = i + 1;
              const dayRecords = records.filter(r => r.date === `5월 ${day}일`);
              const hasRecord = dayRecords.length > 0;
              const isSelected = selectedDate === day;
              
              return (
                <button 
                  key={day} 
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className="flex justify-center relative py-1 focus:outline-none"
                >
                  <span className={`flex items-center justify-center w-7 h-7 rounded-full z-10 transition-colors ${
                    isSelected ? 'bg-navy text-white ring-2 ring-navy ring-offset-2' :
                    hasRecord ? 'bg-navy/10 text-navy' : 'text-navy'
                  }`}>
                    {day}
                  </span>
                  {hasRecord && !isSelected && (
                    <div className="absolute -bottom-1 w-full flex justify-center gap-0.5">
                      {dayRecords.slice(0, 3).map((_, idx) => (
                        <div key={idx} className="w-1.5 h-1.5 bg-accent-red rounded-full" />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Preview */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={selectedDate}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2, ease: 'easeInOut' } },
                visible: { 
                  opacity: 1, 
                  height: 'auto',
                  marginBottom: 16,
                  transition: { 
                    height: { duration: 0.3, ease: 'easeOut' },
                    opacity: { duration: 0.3 },
                    marginBottom: { duration: 0.3, ease: 'easeOut' },
                    staggerChildren: 0.1
                  }
                }
              }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-1 pb-1">
              {selectedRecords.length > 0 ? (
                selectedRecords.map((selectedRecord) => (
                  <motion.div 
                    key={selectedRecord.id}
                    variants={{
                      hidden: { opacity: 0, y: -20 },
                      visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                    }}
                    className="bg-white p-4 rounded-2xl border border-navy/5 shadow-md"
                  >
                    <div className="mb-2 flex justify-end">
                      <span className="shrink-0 bg-navy text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        {selectedRecord.date}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="shrink-0 text-2xl leading-none">{selectedRecord.mood}</span>
                      <h4 className="min-w-0 flex-1 break-words font-bold text-navy text-[15px] leading-snug">
                        {limitText(selectedRecord.title, DIARY_TITLE_MAX_LENGTH)}
                      </h4>
                    </div>
                    <p className="text-navy/70 text-[13px] font-medium leading-relaxed mb-3 line-clamp-2">
                      {limitText(selectedRecord.text, DIARY_TEXT_MAX_LENGTH)}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-navy/50">{selectedRecord.child} · {selectedRecord.time}</span>
                      {selectedRecord.hasMedia && <Camera size={14} className="text-navy/40" />}
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: -20 },
                    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                  }}
                  className="bg-white/50 p-4 rounded-2xl border-2 border-dashed border-navy/20 flex flex-col items-center justify-center py-6"
                >
                  <p className="text-[13px] font-bold text-navy/40">5월 {selectedDate}일의 기록이 없습니다.</p>
                </motion.div>
              )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF Book CSS Preview & Export Action */}
        <div className="bg-white p-5 rounded-2xl border border-navy/5 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-navy/5/10">
            <h4 className="font-black text-navy text-[15px] flex items-center gap-1.5">
              <Lock size={16} className="text-accent-red" /> 이달의 다이어리 만들기</h4>
            <span className="text-[10px] font-black text-accent-red bg-accent-red/10 border border-accent-red/20 px-2 py-0.5 rounded-full">
              PREMIUM
            </span>
          </div>
          
          {/* Real PDF Thumbnails Preview */}
          <div className="flex bg-navy/5 border border-navy/5 rounded-lg p-3 gap-2 mb-5 relative overflow-hidden h-44 justify-center items-center">
            {/* Cover Thumbnail */}
            <div className="h-full flex-1 min-w-0 flex justify-center transform hover:scale-105 transition-transform duration-300">
              <img src="/book_cover.jpg" alt="Book Cover" loading="lazy" decoding="async" className="w-full h-full object-contain drop-shadow-md rounded-sm" />
            </div>
            {/* First Page Thumbnail */}
            <div className="h-full flex-1 min-w-0 flex justify-center transform hover:scale-105 transition-transform duration-300">
              <img src="/book_page1.jpg" alt="First Page" loading="lazy" decoding="async" className="w-full h-full object-contain drop-shadow-md rounded-sm" />
            </div>
            {/* Second Page Thumbnail */}
            <div className="h-full flex-1 min-w-0 flex justify-center transform hover:scale-105 transition-transform duration-300">
              <img src="/book_page2.jpg" alt="Second Page" loading="lazy" decoding="async" className="w-full h-full object-contain drop-shadow-md rounded-sm" />
            </div>
          </div>

          <button 
            onClick={() => setPdfExportOpen(true)}
            className="w-full bg-navy text-white text-[13px] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2"
          >
            시작하기
          </button>
        </div>

      </div>
    );
  };

  const galleryData = useMemo(() => {
    const mediaRecords = records.filter(r => r.hasMedia && (r.imageUrls?.length > 0 || r.imageUrl)).sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
    const grouped = {};
    mediaRecords.forEach(record => {
      const d = new Date(record.isoDate);
      const monthStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
      if (!grouped[monthStr]) grouped[monthStr] = [];
      
      if (record.imageUrls && record.imageUrls.length > 0) {
        record.imageUrls.forEach((url, idx) => {
          grouped[monthStr].push({ ...record, imageUrl: url, photoId: `${record.id}-${idx}` });
        });
      } else if (record.imageUrl) {
        grouped[monthStr].push({ ...record, photoId: record.id });
      }
    });
    return Object.keys(grouped).map(k => ({ month: k, photos: grouped[k] }));
  }, [records]);

  const renderGalleryPage = () => {
    const activeVisibleMonth = visibleMonth || galleryData[0]?.month || '';

    return (
      <div className="relative flex flex-col gap-6 pb-6 w-full">
        {/* Floating Scroll Indicator */}
        <AnimatePresence>
          {showScrollIndicator && activeVisibleMonth && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed right-3 top-1/3 z-50 pointer-events-none">
              <div className="bg-navy/50 backdrop-blur-md text-white text-[11px] font-bold px-2 py-4 rounded-full flex items-center justify-center shadow-md">
                <span style={{ writingMode: 'vertical-rl' }} className="tracking-widest opacity-90">{activeVisibleMonth}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {galleryData.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-navy/40">
            <ImageIcon size={48} strokeWidth={1} className="mb-4" />
            <p className="font-bold text-[14px]">첨부된 사진이 없습니다.</p>
          </div>
        ) : (
          galleryData.map(group => {
            const isSinglePhoto = group.photos.length === 1;

            return (
              <div key={group.month}>
                <h3 data-month={group.month} className="gallery-month-header font-bold text-navy text-[15px] mb-3 sticky top-0 bg-background/90 backdrop-blur-sm py-2 z-10 border-b border-navy/5">
                  {group.month}
                </h3>
                <div className={isSinglePhoto ? 'inline-flex bg-white border border-navy/5 p-1.5 rounded-2xl shadow-md' : 'grid grid-cols-3 gap-1.5 bg-white border border-navy/5 p-1.5 rounded-2xl shadow-md'}>
                  {group.photos.map((photo) => (
                    <div
                      key={photo.photoId}
                      onClick={() => setViewingPhoto({ ...photo, viewerSource: 'gallery' })}
                      className={`${isSinglePhoto ? 'h-40 w-40' : 'aspect-square'} bg-background border border-navy/10 rounded-xl flex items-center justify-center relative group overflow-hidden cursor-pointer`}
                    >
                      <img src={photo.imageUrl} alt={photo.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      
                      {/* Hover/Tap Info */}
                      <div className="absolute inset-0 bg-navy/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-center">
                         <span className="text-white text-[11px] font-bold">{photo.date.split(' ')[1]}</span>
                         <span className="text-white/90 text-[9px] mt-1 line-clamp-2 leading-tight">{photo.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  // --- Modals ---
  const renderPhotoModal = () => {
    if (!viewingPhoto) return null;

    const mediaPhotos = galleryData.flatMap(g => g.photos);
    const currentIndex = mediaPhotos.findIndex(p => p.photoId === viewingPhoto.photoId);
    const isGalleryPhotoViewer = viewingPhoto.viewerSource === 'gallery';
    const viewerTitle = limitText(viewingPhoto.title, DIARY_TITLE_MAX_LENGTH);
    const viewerText = limitText(viewingPhoto.text, DIARY_TEXT_MAX_LENGTH);
    const canToggleViewerText = shouldCollapseDiaryText(viewerText);
    const viewerTextExpanded = !canToggleViewerText || isViewerTextExpanded;
    const photoCardShadowClass = isGalleryPhotoViewer
      ? 'shadow-[0_10px_20px_rgba(18,27,97,0.14)]'
      : 'shadow-2xl';

    const handlePrev = (e) => {
      e.stopPropagation();
      if (currentIndex > 0) {
        setViewingPhoto({ ...mediaPhotos[currentIndex - 1], viewerSource: viewingPhoto.viewerSource });
      }
    };

    const handleNext = (e) => {
      e.stopPropagation();
      if (currentIndex < mediaPhotos.length - 1) {
        setViewingPhoto({ ...mediaPhotos[currentIndex + 1], viewerSource: viewingPhoto.viewerSource });
      }
    };

    return (
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 max-w-[420px] mx-auto left-0 right-0 z-[200] bg-slate-200/85 backdrop-blur-md flex flex-col items-center justify-center p-4 border-x-[3px] border-navy shadow-2xl">
          <div className="absolute top-4 right-4 z-[210]">
            <button onClick={() => setViewingPhoto(null)} aria-label="사진 보기 닫기" className="p-3 text-navy/60 hover:text-navy bg-white/50 rounded-full border border-navy/10 transition-all"><X size={28} /></button>
          </div>
          
          {currentIndex > 0 && (
            <button onClick={handlePrev} aria-label="이전 사진" className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-navy/60 hover:text-navy bg-white/50 rounded-full border border-navy/10 z-[210] transition-transform active:scale-95">
              <ChevronLeft size={32} />
            </button>
          )}
          
          {currentIndex < mediaPhotos.length - 1 && (
            <button onClick={handleNext} aria-label="다음 사진" className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-navy/60 hover:text-navy bg-white/50 rounded-full border border-navy/10 z-[210] transition-transform active:scale-95">
              <ChevronRight size={32} />
            </button>
          )}

          <motion.div key={viewingPhoto.photoId} initial={{ opacity: 0, scale: 0.95, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95, x: -20 }} transition={{ duration: 0.2 }} style={HIDDEN_SCROLLBAR_STYLE} className="w-full max-w-[340px] max-h-[92vh] overflow-y-auto [&::-webkit-scrollbar]:hidden px-1 py-2 flex flex-col items-center gap-4 relative z-[205]">
            <div className={`w-full bg-white p-3 rounded-2xl border-[3px] border-white relative ${photoCardShadowClass}`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-white/90 backdrop-blur-md shadow-md -rotate-2 rounded-[2px]"></div>
              <img src={viewingPhoto.imageUrl} alt={viewerTitle || '첨부 사진'} className="w-full max-h-[45vh] object-contain rounded-md bg-gray-50" />
            </div>
            {isGalleryPhotoViewer ? (
              <p className="relative z-[206] text-accent-red font-black text-[17px] leading-none tracking-tight">{viewingPhoto.date}</p>
            ) : (
              <div className="text-center w-full max-w-[90%] flex flex-col items-center">
                <span className="text-[40px] mb-2 filter drop-shadow-md">{viewingPhoto.mood}</span>
                <h3 className="text-navy font-black text-[22px] mb-1.5">{viewerTitle}</h3>
                <p className="text-accent-red font-bold text-[13px] mb-3">{viewingPhoto.date}</p>
                {viewerText && (
                  <button
                    type="button"
                    onClick={() => canToggleViewerText && setIsViewerTextExpanded(prev => !prev)}
                    aria-expanded={canToggleViewerText ? isViewerTextExpanded : undefined}
                    className={`w-full rounded-md text-center text-navy/80 text-[15px] font-medium leading-relaxed focus:outline-none ${canToggleViewerText ? 'cursor-pointer focus:ring-2 focus:ring-navy/10' : 'cursor-default'}`}
                  >
                    <CollapsibleDiaryText
                      text={viewerText}
                      canToggle={canToggleViewerText}
                      isExpanded={viewerTextExpanded}
                      collapsedHeight={VIEWER_TEXT_COLLAPSED_HEIGHT}
                      expandedMaxViewportRatio={0.28}
                    />
                    {canToggleViewerText && (
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isViewerTextExpanded ? 'collapse' : 'more'}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={DIARY_TOGGLE_LABEL_TRANSITION}
                          className="mt-1.5 block text-[11px] font-bold text-navy/45"
                        >
                          {isViewerTextExpanded ? '접기' : '더보기'}
                        </motion.span>
                      </AnimatePresence>
                    )}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderComposerModal = () => (
    <AnimatePresence>
      {composerOpen && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 max-w-[420px] mx-auto left-0 right-0 z-[100] bg-background flex flex-col border-x-[3px] border-navy shadow-2xl">
          <div className="bg-navy px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
            <button onClick={() => setComposerOpen(false)} aria-label="다이어리 작성 닫기" className="p-2 -ml-2 text-white/70 hover:text-white"><X size={20} /></button>
            <h2 className="font-bold text-[16px] text-white">{editingRecordId ? '다이어리 수정하기' : '다이어리 남기기'}</h2>
            <button onClick={handleSaveRecord} className="text-[13px] font-bold text-navy px-3 py-1.5 bg-white rounded-md hover:bg-gray-100 transition-colors">저장</button>
          </div>

          <div style={HIDDEN_SCROLLBAR_STYLE} className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar [&::-webkit-scrollbar]:hidden">
            <div className="bg-white p-4 rounded-2xl border border-navy/5 shadow-md">
              <p className="text-[12px] font-bold text-navy/60 mb-3 border-b border-navy/10 pb-2">오늘의 기분은?</p>
              <div className="grid grid-cols-9 gap-0.5 px-0">
                {MOODS.map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedMood(m)}
                    className={`flex h-8 min-w-0 items-center justify-center text-[22px] leading-none transition-transform ${selectedMood === m ? 'scale-110 drop-shadow-md' : 'opacity-40 grayscale'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <NativeSafeDateInput
                value={dateInput}
                onChange={setDateInput}
                label="날짜"
                labelClassName="text-[11px] font-bold text-navy/60"
                stacked
                pickerMode="popup"
                compact
                className="bg-white p-3 rounded-2xl border border-navy/5 shadow-md"
                buttonClassName="w-full bg-transparent font-bold text-[14px] text-navy outline-none"
              />
              <NativeSafeTimeInput
                value={timeInput}
                onChange={setTimeInput}
                label="시간"
                labelClassName="text-[11px] font-bold text-navy/60"
                stacked
                pickerMode="popup"
                className="bg-white p-3 rounded-2xl border border-navy/5 shadow-md"
                inputClassName="font-bold text-[14px] text-navy"
              />
            </div>

            <div className="space-y-3 bg-white p-4 rounded-2xl border border-navy/5 shadow-md">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={titleInput}
                  maxLength={DIARY_TITLE_MAX_LENGTH}
                  onChange={handleTitleInputChange}
                  placeholder="제목을 입력하세요"
                  className="min-w-0 flex-1 bg-transparent font-bold text-[18px] text-navy outline-none placeholder:text-navy/30"
                />
                <span className="shrink-0 text-[10px] font-bold text-navy/35">
                  {titleInput.length}/{DIARY_TITLE_MAX_LENGTH}
                </span>
              </div>
              <div className="h-0.5 bg-navy/10 w-full" />
              <textarea
                rows={6}
                value={textInput}
                maxLength={DIARY_TEXT_MAX_LENGTH}
                onChange={handleTextInputChange}
                placeholder="오늘 있었던 일, 기억하고 싶은 순간, 혹은 아이에게 하고 싶은 말을 자유롭게 남겨주세요"
                className="w-full bg-transparent text-[15px] font-medium text-navy/80 outline-none placeholder:text-navy/30 resize-none leading-relaxed"
              />
              <div className="flex justify-end text-[10px] font-bold text-navy/35">
                {textInput.length}/{DIARY_TEXT_MAX_LENGTH}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-navy/5 shadow-md p-4">
              <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
              {selectedImages.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex overflow-x-auto gap-2 pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative w-32 h-32 shrink-0 rounded-lg overflow-hidden border border-navy/5">
                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        <button onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))} aria-label={`첨부 사진 ${idx + 1} 삭제`} className="absolute top-1 right-1 bg-navy/80 text-white p-1 rounded-full hover:bg-navy shadow-md">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {selectedImages.length < (isPremium ? 20 : 3) && (
                      <button onClick={() => fileInputRef.current?.click()} className="w-32 h-32 shrink-0 border-2 border-dashed border-navy/20 bg-background/50 rounded-lg flex flex-col items-center justify-center gap-1 text-navy/40 hover:bg-background transition-colors">
                        <Plus size={24} />
                        <span className="text-[11px] font-bold">{selectedImages.length}/{isPremium ? 20 : 3}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-navy/20 bg-background/50 rounded-lg py-6 flex flex-col items-center justify-center gap-2 text-navy/40 hover:bg-background transition-colors">
                  <ImagePlus size={28} strokeWidth={1.5} className="text-navy/50" />
                  <div className="text-center">
                    <p className="text-[13px] font-bold text-navy/70">사진 첨부하기</p>
                    <p className="text-[11px] font-bold text-navy/40 mt-1">최대 {isPremium ? 20 : 3}장</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderPdfExportModal = () => {
    const THEMES = [
      { id: 'spring', name: '🌸 봄 벚꽃', bg: '#ffebee', border: '#ef9a9a' },
      { id: 'summer', name: '🌿 여름 숲', bg: '#e8f5e9', border: '#a5d6a7' },
      { id: 'autumn', name: '🍁 가을 단풍', bg: '#fff8e1', border: '#ffe082' },
      { id: 'winter', name: '❄️ 겨울 눈', bg: '#e8eaf6', border: '#9fa8da' },
      { id: 'cloud', name: '☁️ 하늘 구름', bg: '#e1f5fe', border: '#81d4fa' },
      { id: 'plain', name: '📝 무지 (기본)', bg: '#ffffff', border: '#e0e0e0' }
    ];

    const handleExport = async () => {
      setIsExporting(true);

      // Give browser a moment to ensure fonts are rendered in the DOM before capturing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = document.getElementById('pdf-export-content');
      
      const opt = {
        margin:       0,
        filename:     `우리가족_기록책_${selectedTheme}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };

      try {
        const { default: html2pdf } = await import('html2pdf.js');
        await html2pdf().set(opt).from(element).save();
      } catch (err) {
        console.error("PDF Export failed", err);
        alert('PDF 내보내기 중 오류가 발생했습니다.');
      } finally {
        setIsExporting(false);
        setPdfExportOpen(false);
      }
    };

    return (
      <>
        <AnimatePresence>
          {pdfExportOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 max-w-[420px] mx-auto left-0 right-0 z-[100] bg-navy/80 flex items-center justify-center p-4 border-x-[3px] border-navy shadow-2xl">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-[340px] rounded-2xl border border-navy/5 overflow-hidden">
              <div className="bg-navy px-4 py-3 flex items-center justify-between">
                <h2 className="font-bold text-[15px] text-white">기록책 제작</h2>
                <button onClick={() => !isExporting && setPdfExportOpen(false)} aria-label="기록책 제작 닫기" className="text-white/70 hover:text-white"><X size={20} /></button>
              </div>
              
              <div className="p-5 space-y-5">
                <div className="flex gap-3">
                  <div className="space-y-2 flex-1">
                    <label className="text-[12px] font-bold text-navy/70">시작 날짜</label>
                    <NativeSafeDateInput
                      value={exportStartDate}
                      onChange={setExportStartDate}
                      disabled={isExporting}
                      compact
                      pickerMode="popup"
                      popupAlign="left"
                      buttonClassName="w-full border border-navy/5 rounded-lg p-2 text-[13px] font-bold text-navy outline-none focus:border-accent-red"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-[12px] font-bold text-navy/70">종료 날짜</label>
                    <NativeSafeDateInput
                      value={exportEndDate}
                      onChange={setExportEndDate}
                      disabled={isExporting}
                      compact
                      pickerMode="popup"
                      popupAlign="right"
                      buttonClassName="w-full border border-navy/5 rounded-lg p-2 text-[13px] font-bold text-navy outline-none focus:border-accent-red"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-navy/70">배경 테마 선택</label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEMES.map(theme => (
                      <button 
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        disabled={isExporting}
                        className={`p-2 rounded-lg border-2 text-[13px] font-bold transition-all ${
                          selectedTheme === theme.id 
                            ? 'border-accent-red bg-accent-red/10 text-accent-red' 
                            : 'border-navy/20 text-navy/60 hover:border-navy/40 hover:bg-background'
                        }`}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button 
                  onClick={() => openPaywall('book')}
                  disabled={isExporting}
                  className="w-full bg-accent-red text-white font-bold py-3.5 rounded-2xl border border-navy/5 flex justify-center items-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : '제작하기'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
      </>
    );
  };

  // Hidden area for PDF generation
  const renderHiddenPdfContent = () => {
    // Custom SVG patterns for a premium aesthetic look
    const leafPattern = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0c0 10-10 10-10 20s10 10 10 20c0-10 10-10 10-20S20 10 20 0z' fill='%23dcedc8' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`;
    const heartPattern = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 12c-4-4-10-4-10 2 0 6 10 14 10 14s10-8 10-14c0-6-6-6-10-2z' fill='%23ffcdd2' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`;
    const dotPattern = `radial-gradient(#ffe082 2px, transparent 2px)`;

    const themesMap = {
      spring: { bg: '#f9fbe7', pattern: leafPattern },
      summer: { bg: '#e8f5e9', pattern: leafPattern },
      autumn: { bg: '#fff8e1', pattern: dotPattern },
      winter: { bg: '#e8eaf6', pattern: dotPattern },
      cloud: { bg: '#e1f5fe', pattern: dotPattern },
      plain: { bg: '#ffffff', pattern: 'none' }
    };
    const currentTheme = themesMap[selectedTheme] || themesMap.plain;

    // Get filtered records for export
    const startObj = exportStartDate || '2026-05-01';
    const endObj = exportEndDate || getLocalDateString();
    const filteredRecords = records.filter(r => r.isoDate >= startObj && r.isoDate <= endObj).sort((a,b) => new Date(a.isoDate) - new Date(b.isoDate));

    return (
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -1 }}>
        <div id="pdf-export-content" style={{ width: '210mm', fontFamily: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" }}>
          
          {/* Cover Page */}
          <div style={{ width: '210mm', height: '296mm', backgroundColor: currentTheme.bg, backgroundImage: currentTheme.pattern, backgroundSize: selectedTheme === 'autumn' || selectedTheme === 'winter' || selectedTheme === 'cloud' ? '20px 20px' : 'auto', padding: '15mm', boxSizing: 'border-box', pageBreakAfter: filteredRecords.length > 0 ? 'always' : 'auto' }}>
            <div style={{ backgroundColor: '#fff', width: '100%', height: '100%', padding: '5px', boxSizing: 'border-box', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ border: '1px solid #e0e0e0', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                
                {/* Top Titles */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '50px' }}>
                  <h1 style={{ fontSize: '54px', color: '#1a237e', margin: 0, letterSpacing: '4px', fontWeight: '900' }}>우리가족</h1>
                  <h1 style={{ fontSize: '64px', color: '#1a237e', margin: 0, letterSpacing: '6px', fontWeight: '900' }}>일상 기록책</h1>
                </div>

                <div style={{ width: '80px', height: '2px', backgroundColor: '#c5cae9', marginBottom: '40px' }}></div>

                {/* Subtitles */}
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: '15px', color: '#7986cb', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '30px', fontWeight: '600' }}>My Precious Memories</p>
                <h2 style={{ fontSize: '42px', color: '#1a237e', margin: '0 0 40px 0', letterSpacing: '2px', fontWeight: '800' }}>
                  {filteredRecords.length > 0 ? filteredRecords[0].child : '아이'}
                </h2>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: '18px', color: '#7986cb', letterSpacing: '6px', fontWeight: '500' }}>{startObj.replace(/-/g, '.')} - {endObj.replace(/-/g, '.')}</p>

                {/* Footer */}
                <div style={{ position: 'absolute', bottom: '40px', left: '0', right: '0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <p style={{ fontFamily: "'Jost', sans-serif", fontSize: '15px', color: '#ff7043', letterSpacing: '5px', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '600' }}>
                    VOLUME 01 / {filteredRecords.length} RECORDS
                  </p>
                  <div style={{ width: '160px', height: '2px', backgroundColor: '#ffccbc' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content Pages (One per RECORD) */}
          {filteredRecords.length === 0 ? (
            null
          ) : (
            filteredRecords.map((record, recordIndex) => {
              const dateText = record.isoDate.replace(/-/g, '.'); // 2026.05.27
              const isLast = recordIndex === filteredRecords.length - 1;

              return (
                <div key={record.id} style={{ width: '210mm', height: '296mm', backgroundColor: currentTheme.bg, backgroundImage: currentTheme.pattern, backgroundSize: selectedTheme === 'autumn' || selectedTheme === 'winter' || selectedTheme === 'cloud' ? '20px 20px' : 'auto', padding: '15mm', boxSizing: 'border-box', pageBreakAfter: isLast ? 'auto' : 'always' }}>
                  <div style={{ backgroundColor: '#fff', width: '100%', height: '100%', padding: '5px', boxSizing: 'border-box', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <div style={{ border: '1px solid #e0e0e0', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', padding: '35px 30px' }}>
                      
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <span style={{ fontSize: '38px', color: '#9fa8da', letterSpacing: '2px', fontWeight: '800' }}>{(recordIndex + 1).toString().padStart(2, '0')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{ fontSize: '28px', color: '#7986cb', letterSpacing: '2px', fontWeight: '700' }}>{dateText}</span>
                          <div style={{ width: '50px', height: '2px', backgroundColor: '#c5cae9' }}></div>
                        </div>
                      </div>

                      {/* Record Content */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 20px' }}>
                        
                        {/* Photo Polaroid */}
                        <div style={{ width: '100%', maxWidth: '160mm', backgroundColor: '#fafafa', padding: '15px 15px 35px 15px', boxShadow: '0 6px 20px rgba(0,0,0,0.08)', position: 'relative', border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
                          
                          {/* Tape */}
                          <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%) rotate(-1deg)', width: '80px', height: '25px', backgroundColor: 'rgba(245, 240, 230, 0.95)', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}></div>
                          
                          {record.imageUrl ? (
                            <img src={record.imageUrl} style={{ width: '100%', maxHeight: '120mm', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100mm', border: '2px dashed #e0e0e0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon color="#ccc" size={40} />
                              <span style={{ color: '#aaa', fontSize: '15px', marginTop: '12px', fontWeight: '500' }}>사진이 붙을 자리</span>
                            </div>
                          )}

                          {/* Mood Icon inside polaroid bottom right */}
                          <div style={{ position: 'absolute', bottom: '15px', right: '15px', fontSize: '40px', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.15))' }}>
                            {record.mood}
                          </div>
                        </div>

                        {/* Text Content */}
                        <div style={{ width: '100%', maxWidth: '160mm', padding: '0 15px', textAlign: 'center' }}>
                          <h3 style={{ fontSize: '36px', color: '#1a237e', margin: '0 0 25px 0', letterSpacing: '-1px', fontWeight: '800', lineHeight: '1.3' }}>{record.title}</h3>
                          <p style={{ fontSize: '20px', color: '#333', lineHeight: '2.0', whiteSpace: 'pre-wrap', fontWeight: '500', wordBreak: 'keep-all' }}>{record.text}</p>
                        </div>
                      </div>

                      {/* Page Number */}
                      <div style={{ position: 'absolute', bottom: '30px', left: '0', right: '0', textAlign: 'center' }}>
                        <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '15px', color: '#9fa8da', letterSpacing: '5px' }}>- {recordIndex + 1} -</span>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderPremiumPaywall = () => {
    const isBookNotice = paywallMode === 'book';

    return (
      <AnimatePresence>
        {paywallOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 max-w-[420px] mx-auto left-0 right-0 z-[300] bg-navy/80 flex items-center justify-center p-4 border-x-[3px] border-navy shadow-2xl">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-[340px] rounded-3xl border border-navy/5 overflow-hidden flex flex-col items-center p-6 relative">
              <button onClick={closePaywall} aria-label="프리미엄 안내 닫기" className="absolute top-4 right-4 text-navy/40 hover:text-navy/70 transition-colors">
                <X size={24} />
              </button>
              
              <div className="w-16 h-16 bg-accent-red/10 rounded-full flex items-center justify-center mb-4">
                <Lock size={32} className="text-accent-red" />
              </div>
              
              <h2 className="text-xl font-black text-navy mb-2 text-center">
                {isBookNotice ? '프리미엄 기능으로 준비중입니다.' : '프리미엄 기능 안내'}
              </h2>
              <p className="text-[15px] font-medium text-navy/60 text-center mb-6 break-keep">
                {isBookNotice ? (
                  <>
                    기록책 제작은 향후 업데이트에서 제공될 예정입니다.<br/>
                    지금은 다이어리 기록과 사진 모음을 먼저 이용해주세요.
                  </>
                ) : (
                  <>
                    우리 가족의 추억을 더 풍성하게 기록하세요.<br/>(무제한 사진 및 PDF 내보내기)
                  </>
                )}
              </p>
              
              {!isBookNotice && (
                <div className="w-full space-y-3 mb-6 bg-navy/5 p-4 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-accent-red flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                    <p className="text-[13px] font-bold text-navy break-keep">다이어리당 사진 최대 20장 첨부 가능</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-accent-red flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                    <p className="text-[13px] font-bold text-navy break-keep">원하는 날짜 전체 기간 PDF 무제한 내보내기</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-accent-red flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                    <p className="text-[13px] font-bold text-navy break-keep">워터마크 없는 고화질 저장 및 프리미엄 테마</p>
                  </div>
                </div>
              )}
              
              <button onClick={closePaywall} className={`w-full text-white font-black py-4 rounded-2xl shadow-lg transform transition active:scale-95 ${isBookNotice ? 'bg-navy shadow-navy/10' : 'bg-gradient-to-r from-accent-red to-[#ff5252] shadow-accent-red/20 mb-3'}`}>
                {isBookNotice ? '확인' : '월 4,900원 시작하기'}
              </button>
              {!isBookNotice && (
                <button onClick={closePaywall} className="text-[13px] font-bold text-navy/40 hover:text-navy/70 underline underline-offset-4">
                  나중에 하기
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className={isEmbedded ? "w-full bg-transparent text-navy font-sans flex flex-col relative pb-24" : "app-shell max-w-[420px] mx-auto h-screen bg-background text-navy font-sans flex flex-col relative overflow-hidden border-x-[3px] border-navy shadow-lg"}>
      {/* Header */}
      {!isEmbedded && (
        <header id="app-header" className="bg-white px-3.5 pt-1.5 pb-3 flex items-center justify-between border-b border-navy/5 sticky top-0 z-10 shrink-0 relative min-h-[58px]">
          <div className="w-10 flex justify-start z-10 mt-1">
            <a href="/" className="p-2 -ml-2 text-navy/50 hover:text-navy transition-colors"><ChevronLeft size={20} /></a>
          </div>
          
          <h1 className="font-sans text-[20px] font-black tracking-tighter text-navy flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2 w-max z-0 mt-1">
            <CalendarHeart className="text-accent-red" size={20} />
            우리가족 다이어리
          </h1>
          
          <div className="w-10 flex justify-end z-10 mt-1">
            {activeTab === 'home' && (
              <NativeSafeDateInput
                value={searchDate}
                onChange={handleSearchDateChange}
                compact
                iconOnly
                pickerMode="popup"
                popupAlign="right"
                placeholder=""
                className="w-[34px]"
                buttonClassName="h-9 w-9 justify-center rounded-full p-0 text-navy/50 hover:bg-navy/5"
              />
            )}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      {isEmbedded ? (
        <div className="w-full">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} className="w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
              {activeTab === 'home' && renderHomePage()}
              {activeTab === 'calendar' && renderCalendarPage()}
              {activeTab === 'gallery' && renderGalleryPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <main className="app-scroll-area flex-1 overflow-y-auto overflow-x-hidden pb-24 p-4 scroll-smooth" onScroll={(e) => setShowScrollIndicator(e.target.scrollTop > 50 || window.scrollY > 50)}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} className="w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
              {activeTab === 'home' && renderHomePage()}
              {activeTab === 'calendar' && renderCalendarPage()}
              {activeTab === 'gallery' && renderGalleryPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      )}

      {/* FAB */}
      {activeTab === 'home' && !isEmbedded && (
        <div
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}
          className="absolute left-5 right-5 z-40 flex h-16 items-center gap-3 rounded-full border border-navy/10 bg-white/95 p-2 shadow-[0_10px_24px_rgba(18,27,97,0.18)] backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => openPaywall()}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-full px-3 text-left text-navy transition-all hover:bg-navy/5 active:scale-[0.98]"
            aria-label="프리미엄 기능 알아보기"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-red/10">
              <Lock size={17} className="text-accent-red" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[12px] font-black">프리미엄 기능</span>
              <span className="truncate text-[10px] font-bold text-navy/50">사진/PDF 내보내기</span>
            </span>
          </button>
          <button
            onClick={() => handleOpenComposer()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-red text-white shadow-[0_6px_14px_rgba(217,45,50,0.28)] transition-all hover:brightness-110 active:scale-95"
            aria-label="새 다이어리 작성"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Bottom Nav */}
      {!isEmbedded && (
        <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md grid grid-cols-3 py-2 pb-safe z-50 border-t border-navy/5 shadow-[0_-10px_20px_rgba(0,0,0,0.15)]">
          <BottomTab active={activeTab === 'home'} label="타임라인" icon={Home} onClick={() => setActiveTab('home')} />
          <BottomTab active={activeTab === 'calendar'} label="기록달력" icon={CalendarDays} onClick={() => setActiveTab('calendar')} />
          <BottomTab active={activeTab === 'gallery'} label="사진모음" icon={ImageIcon} onClick={() => setActiveTab('gallery')} />
        </nav>
      )}

      {/* Overlays */}
      {renderComposerModal()}
      {renderPdfExportModal()}
      {renderPhotoModal()}
      {renderPremiumPaywall()}
      <NativeSafeConfirmDialog
        open={Boolean(deleteRecordTargetId)}
        title="기록 삭제"
        message="정말 이 기록을 삭제하시겠습니까?"
        confirmLabel="삭제"
        destructive
        onConfirm={confirmDeleteRecord}
        onCancel={() => setDeleteRecordTargetId(null)}
      />
      {isExporting && renderHiddenPdfContent()}
    </div>
  );
}
