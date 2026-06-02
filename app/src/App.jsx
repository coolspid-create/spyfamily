import React, { lazy, Suspense, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import HomeBoard from './components/HomeBoard';
import DailyTasksTab from './components/DailyTasksTab';
import PaymentTab from './components/PaymentTab';
import RouteMapTab from './components/RouteMapTab';
import SpecialOpsTab from './components/SpecialOpsTab';
import FamilyDiaryTab from './components/FamilyDiaryTab';
import { Home, CalendarDays, CreditCard, Star, LogOut, ChevronDown, Plus, Edit2, CheckSquare, Coffee, Users, HardDrive, CircleHelp, BookOpen, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { useStore } from './store/useStore';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { DATA_DELETE_URL, PRIVACY_POLICY_URL, openExternalPolicyPage } from './lib/policyLinks';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';
import { NativeSafeConfirmDialog, NativeSafeTextDialog } from './components/NativeSafeControls';

const FAMILY_SHARING_ENABLED = import.meta.env.VITE_ENABLE_FAMILY_SHARING === 'true';
const MAIN_TAB_TRANSITION = { duration: 0.15 };
const MAIN_TAB_MOTION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: MAIN_TAB_TRANSITION,
};
const DIARY_FLOATING_PANEL_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12 },
};
const TAB_PATHS = {
  home: '/',
  daily: '/daily',
  map: '/monthly',
  payment: '/payment',
  ops: '/family',
  diary: '/diary',
};
const PATH_TABS = {
  '/': 'home',
  '/daily': 'daily',
  '/today': 'daily',
  '/monthly': 'map',
  '/calendar': 'map',
  '/payment': 'payment',
  '/payments': 'payment',
  '/family': 'ops',
  '/family-events': 'ops',
  '/diary': 'diary',
  '/custom-memory': 'diary',
  '/memory-mvp.html': 'diary',
};

const getTabFromPath = () => {
  if (typeof window === 'undefined') return 'home';
  return PATH_TABS[window.location.pathname] || 'home';
};

const DiaryFloatingTabButton = ({ active, label, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-[11px] font-black transition-all hover:bg-white/20 active:scale-95 ${
      active
        ? 'text-accent-red'
        : 'text-navy/55 hover:text-navy'
    }`}
  >
    {React.createElement(icon, { size: 15, className: active ? 'stroke-[2.7px]' : 'stroke-2' })}
    <span className="truncate">{label}</span>
  </button>
);

const DiaryFloatingTabs = ({ activeTab, onTabChange }) => (
  <motion.div
    data-diary-floating-tabs="true"
    className="fixed left-1/2 z-40 w-[min(360px,calc(100vw-28px))] -translate-x-1/2 rounded-full border border-white/45 bg-white/30 p-1.5 shadow-[0_12px_28px_rgba(18,27,97,0.12)] backdrop-blur-md will-change-opacity"
    style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 78px)' }}
    {...DIARY_FLOATING_PANEL_MOTION}
  >
    <div className="flex items-center gap-1">
      <DiaryFloatingTabButton active={activeTab === 'home'} label="타임라인" icon={Home} onClick={() => onTabChange('home')} />
      <DiaryFloatingTabButton active={activeTab === 'calendar'} label="기록달력" icon={CalendarDays} onClick={() => onTabChange('calendar')} />
      <DiaryFloatingTabButton active={activeTab === 'gallery'} label="사진모음" icon={ImageIcon} onClick={() => onTabChange('gallery')} />
    </div>
  </motion.div>
);

const Login = lazy(() => import('./components/Login'));
const SupportModal = lazy(() => import('./components/SupportModal'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));

function App() {
  const [activeTab, setActiveTab] = useState(getTabFromPath);
  const [diarySectionTab, setDiarySectionTab] = useState('home');
  const session = useStore(state => state.session);
  const setSession = useStore(state => state.setSession);
  const signOut = useStore(state => state.signOut);
  const fetchDataFromDB = useStore(state => state.fetchDataFromDB);
  const fetchFamilyContext = useStore(state => state.fetchFamilyContext);
  const fetchDiariesFromDB = useStore(state => state.fetchDiariesFromDB);
  const hasUnsyncedLocalData = useStore(state => state.hasUnsyncedLocalData);
  const currentFamilyId = useStore(state => state.currentFamilyId);
  const currentChild = useStore(state => state.currentChild);
  const setCurrentChild = useStore(state => state.setCurrentChild);
  const childCount = useStore(state => state.childCount);
  const addChildProfile = useStore(state => state.addChildProfile);
  const removeChildProfile = useStore(state => state.removeChildProfile);

  const childProfiles = useStore(state => state.childProfiles);
  const updateChildName = useStore(state => state.updateChildName);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLocalTooltip, setShowLocalTooltip] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [tourReplayKey, setTourReplayKey] = useState(0);
  const [isTourReady, setIsTourReady] = useState(false);
  const [childDeleteTargetId, setChildDeleteTargetId] = useState(null);
  const [renameChildTargetId, setRenameChildTargetId] = useState(null);
  const [renameChildValue, setRenameChildValue] = useState('');
  const [cloudSyncPromptOpen, setCloudSyncPromptOpen] = useState(false);
  const isSupportEnabled = import.meta.env.VITE_ENABLE_SUPPORT === 'true';

  const localTooltipRef = useRef(null);

  const switchTab = useCallback((tab) => {
    setActiveTab(tab);

    const nextPath = TAB_PATHS[tab] || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ tab }, '', nextPath);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (localTooltipRef.current && !localTooltipRef.current.contains(event.target)) {
        setShowLocalTooltip(false);
      }
    }
    if (showLocalTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLocalTooltip]);

  useEffect(() => {
    const handlePopState = () => setActiveTab(getTabFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const isTextControl = (target) => (
      target instanceof HTMLElement &&
      Boolean(target.closest('input, textarea'))
    );
    const preventNativeTextMenu = (event) => {
      if (isTextControl(event.target)) {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventNativeTextMenu, true);
    document.addEventListener('selectstart', preventNativeTextMenu, true);
    return () => {
      document.removeEventListener('contextmenu', preventNativeTextMenu, true);
      document.removeEventListener('selectstart', preventNativeTextMenu, true);
    };
  }, []);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const dailyTasks = useStore(state => state.dailyTasks);
  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);
  const incompleteTasksCount = useMemo(
    () => dailyTasks.filter(task => task.assigned_date === todayStr && !task.is_completed).length,
    [dailyTasks, todayStr]
  );

  const handleRemoveChild = (e, childId) => {
    e.stopPropagation();
    setChildDeleteTargetId(childId);
  };

  const confirmRemoveChild = () => {
    if (!childDeleteTargetId) return;
    removeChildProfile();
    setChildDeleteTargetId(null);
    setIsDropdownOpen(false);
  };

  const handleRenameChild = (e, childId) => {
    e.stopPropagation();
    setRenameChildTargetId(childId);
    setRenameChildValue(childProfiles[childId] || '');
  };

  const confirmRenameChild = () => {
    if (!renameChildTargetId) return;
    const currentName = childProfiles[renameChildTargetId];
    const nextName = renameChildValue.trim();
    if (nextName && nextName !== currentName) {
      updateChildName(renameChildTargetId, nextName);
    }
    setRenameChildTargetId(null);
    setRenameChildValue('');
  };

  const handleAddChild = () => {
    if (childCount < 3) {
      addChildProfile();
      setIsDropdownOpen(false);
    }
  };

  const selectChild = (childId) => {
    setCurrentChild(childId);
    setIsDropdownOpen(false);
  };

  const isAuthChecking = useStore(state => state.isAuthChecking);
  const [isShareAuthOpen, setIsShareAuthOpen] = useState(false);

  const openShareAuth = () => {
    if (!FAMILY_SHARING_ENABLED) {
      return;
    }
    if (!isSupabaseConfigured) {
      alert('가족 공유는 서버 설정 후 사용할 수 있습니다. 현재 데이터는 이 기기에 저장됩니다.');
      return;
    }
    setIsShareAuthOpen(true);
  };

  useEffect(() => {
    if (!FAMILY_SHARING_ENABLED || !isSupabaseConfigured || !supabase) {
      setSession(null);
      fetchDataFromDB();
      return undefined;
    }

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn('Supabase session restore failed, falling back to local mode:', error);
        setSession(null);
        fetchDataFromDB();
        return;
      }

      setSession(session);
      if (session) {
        const familyId = await fetchFamilyContext();
        await fetchDataFromDB();
        if (familyId) {
          await fetchDiariesFromDB();
        } else {
          setIsShareAuthOpen(true);
        }
        return;
      }
      fetchDataFromDB();
    }).catch((error) => {
      console.warn('Supabase session restore failed, falling back to local mode:', error);
      setSession(null);
      fetchDataFromDB();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session && event === 'SIGNED_IN') {
        const familyId = await useStore.getState().fetchFamilyContext();
        if (familyId && useStore.getState().hasUnsyncedLocalData()) {
          setCloudSyncPromptOpen(true);
        } else {
          await fetchDataFromDB();
          if (familyId) await fetchDiariesFromDB();
        }
        setIsShareAuthOpen(!familyId);
      } else if (!session) {
        fetchDataFromDB();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, fetchFamilyContext, fetchDataFromDB, fetchDiariesFromDB, hasUnsyncedLocalData]);

  useEffect(() => {
    if (!FAMILY_SHARING_ENABLED || !isSupabaseConfigured || !supabase || !session || !currentFamilyId) {
      return undefined;
    }

    const channel = supabase
      .channel(`family-context-${currentFamilyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'diary', filter: `family_id=eq.${currentFamilyId}` },
        () => fetchDiariesFromDB()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule', filter: `family_id=eq.${currentFamilyId}` },
        () => fetchDataFromDB()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dailytasks', filter: `family_id=eq.${currentFamilyId}` },
        () => fetchDataFromDB()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, currentFamilyId, fetchDataFromDB, fetchDiariesFromDB]);

  const confirmGuestCloudSync = async () => {
    const { syncGuestDataToCloud, fetchDiariesFromDB } = useStore.getState();
    const result = await syncGuestDataToCloud();
    if (!result?.ok) return;
    await fetchDiariesFromDB();
    setCloudSyncPromptOpen(false);
    setIsShareAuthOpen(false);
  };

  const cancelGuestCloudSync = () => {
    fetchDataFromDB();
    setCloudSyncPromptOpen(false);
    setIsShareAuthOpen(false);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsTourReady(true), 300);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (isAuthChecking) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy px-6 text-background">
        <div className="flex w-full max-w-xs flex-col items-center text-center">
          <img
            src="/app-icon-192.png"
            alt=""
            className="h-20 w-20 rounded-[22px] shadow-2xl ring-1 ring-white/20"
          />
          <h1 className="mt-5 whitespace-nowrap font-stencil text-3xl font-bold text-background">
            가족 × 스케줄러
          </h1>
          <p className="mt-3 whitespace-nowrap text-[15px] font-bold text-background/80">
            우리 가족의 일정을 준비하고 있어요
          </p>
          <div className="mt-6 flex items-center gap-2" aria-label="로딩 중">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent-red" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-background/70 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-background/50 [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell mx-auto flex h-[100dvh] min-h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden bg-background shadow-[0_16px_46px_rgba(26,35,126,0.12)] relative">
      {/* PWA Update Notification */}
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 bg-navy text-white p-4 rounded-xl shadow-2xl z-[101] border-2 border-accent-red flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent-red rounded-full animate-pulse" />
              <p className="text-[15px] font-bold">새로운 버전이 준비되었습니다!</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateServiceWorker(true)}
                className="flex-1 bg-accent-red text-white py-2 rounded-lg font-bold text-[13px] shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                지금 업데이트 적용
              </button>
              <button
                onClick={() => setNeedRefresh(false)}
                className="px-4 py-2 bg-white/10 text-white/70 rounded-lg font-bold text-[13px] hover:bg-white/20 transition-all"
              >
                나중에
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header / Dossier Tab */}
      <header className="relative z-50 shrink-0 bg-white/80 backdrop-blur-md pt-2.5 pb-4 px-4 border-b border-navy/5 text-navy shadow-sm">
        {/* Absolute Left Controls */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-[100]">
          {/* Child Profile Dropdown Manager */}
          <div className="relative">
            <button
              data-tour="child-selector"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex h-[28px] items-center gap-1.5 bg-navy/5 hover:bg-navy/10 active:scale-95 transition-all rounded-full px-3 border border-navy/10 shadow-sm cursor-pointer text-navy"
            >
              <span className="font-sans font-black text-[10px] tracking-wide text-navy truncate max-w-[46px]">
                {childProfiles[currentChild]}
              </span>
              <ChevronDown size={11} className={`text-navy/50 transition-transform duration-200 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-28 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-navy/5 origin-top-left z-[100] p-1">
                {Array.from({ length: childCount }).map((_, idx) => {
                  const cId = `child${idx + 1}`;
                  return (
                    <div
                      key={cId}
                      className={`flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold cursor-pointer transition-all rounded-lg ${currentChild === cId ? 'bg-navy/10 text-navy' : 'text-navy/70 hover:bg-navy/5'}`}
                      onClick={() => { selectChild(cId); setIsDropdownOpen(false); }}
                    >
                      <span className="truncate flex-1 text-navy">{childProfiles[cId]}</span>
                      <div className="flex items-center shrink-0">
                        <button
                          onClick={(e) => handleRenameChild(e, cId)}
                          className="p-1 hover:bg-navy/10 rounded-md text-navy/40 hover:text-navy transition-colors ml-1"
                          title="이름 수정"
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {childCount < 3 && (
                  <div
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-accent-red cursor-pointer hover:bg-accent-red/5 rounded-lg transition-colors border-t border-navy/5 mt-1"
                    onClick={handleAddChild}
                  >
                    <Plus size={11} /> 추가
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Absolute Right Control */}
        <div className="absolute top-2.5 right-2.5 z-[100] flex flex-col items-end gap-1.5">
          {FAMILY_SHARING_ENABLED && session ? (
            <button
              type="button"
              data-tour="local-status"
              onClick={openShareAuth}
              className={`inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-[9px] font-black shadow-sm transition-colors active:scale-95 ${
                currentFamilyId
                  ? 'border-emerald-200/50 bg-emerald-50 text-emerald-600'
                  : 'border-amber-200/60 bg-amber-50 text-amber-600'
              }`}
              title={currentFamilyId ? '가족 공유 설정' : '가족 그룹 설정 필요'}
            >
              <Users size={10} className="stroke-[2.5px]" />
              {currentFamilyId ? '공유' : '설정'}
            </button>
          ) : (
            FAMILY_SHARING_ENABLED ? (
              <button
                type="button"
                onClick={openShareAuth}
                className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-navy/10 bg-white px-2.5 text-[9px] font-black text-navy shadow-sm transition-all hover:bg-navy hover:text-white active:scale-95"
                title="계정 연결로 일정과 다이어리 안전 보관"
              >
                <ShieldCheck size={10} className="stroke-[2.6px]" />
                계정 연결
              </button>
            ) : null
          )}
          
          <div className="flex items-center gap-1.5">
            {FAMILY_SHARING_ENABLED && (
              <div className="flex flex-row gap-1.5 items-center">
                {session ? (
                  <button
                    onClick={signOut}
                    className="text-navy/40 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center bg-navy/5 w-[26px] h-[26px] rounded-full border border-navy/10 transition-transform active:scale-95 cursor-pointer"
                    title="가족 공유 해제"
                  >
                    <LogOut size={11} className="ml-0.5" />
                  </button>
                ) : (
                  null
                )}
              </div>
            )}
            {isSupportEnabled && (
              <button
                onClick={() => setIsSupportModalOpen(true)}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all flex items-center justify-center bg-navy/5 w-[26px] h-[26px] rounded-full border border-navy/10 cursor-pointer"
                title="후원하기"
              >
                <Coffee size={11} />
              </button>
            )}
            {!session && (
              <div className="relative" ref={localTooltipRef}>
                <button
                  type="button"
                  data-tour="local-status"
                  onClick={() => setShowLocalTooltip(!showLocalTooltip)}
                  className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border border-navy/10 bg-navy/5 text-navy/40 shadow-sm transition-colors hover:bg-navy/10 cursor-pointer"
                  title="로컬 저장 안내 보기"
                  aria-label="로컬 저장 안내 보기"
                >
                  <HardDrive size={10} />
                </button>

                <AnimatePresence>
                  {showLocalTooltip && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-white/95 backdrop-blur-md border border-navy/10 rounded-xl p-2.5 shadow-xl z-50 text-[9px] text-navy/70 leading-relaxed font-semibold"
                    >
                      <div className="absolute -top-1 right-5 w-2 h-2 bg-white border-t border-l border-navy/10 rotate-45" />
                      <p className="text-[10px] font-black text-navy mb-1 flex items-center gap-1">
                        <HardDrive size={11} className="text-navy" /> 이 기기에 저장 중
                      </p>
                      현재 등록하는 일정 및 정보는 <span className="text-rose-500 font-bold">이 기기에만</span> 안전하게 임시 저장됩니다. 가족 공유 로그인을 하기 전까지는 기기를 변경하면 일정이 연동되지 않습니다.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button
              type="button"
              data-tour="tour-help"
              onClick={() => setTourReplayKey(key => key + 1)}
              className="text-navy/40 hover:text-navy hover:bg-navy/10 transition-all flex items-center justify-center bg-navy/5 w-[26px] h-[26px] rounded-full border border-navy/10 transition-transform active:scale-95 cursor-pointer"
              title="빠른 가이드 다시 보기"
              aria-label="빠른 가이드 다시 보기"
            >
              <CircleHelp size={11} />
            </button>
          </div>
        </div>

        {/* Header Title Space */}
        <div className="relative min-h-[52px] pt-2.5 pb-1.5 px-[84px] text-center flex flex-col items-center justify-center">
          <h1 data-tour="app-title" className="font-serif font-black italic text-[17px] text-navy flex max-w-full items-center justify-center leading-[1.15] whitespace-nowrap overflow-visible px-1 py-0.5">
            Family <span className="text-rose-500 font-sans not-italic mx-0.5 text-[13px] font-black">×</span> Scheduler
          </h1>
          <p className="text-center text-[11px] font-bold text-navy/40 mt-1.5 w-full whitespace-nowrap overflow-hidden text-ellipsis">
            우리 가족의 소중한 일정 관리
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-scroll-area p-3 flex-1 overflow-x-hidden overflow-y-auto pb-24">
        <AnimatePresence initial={false} mode="wait">
          <motion.div key={activeTab} className="min-h-full" {...MAIN_TAB_MOTION}>
            {activeTab === 'home' && <HomeBoard />}
            {activeTab === 'daily' && <DailyTasksTab />}
            {activeTab === 'map' && <RouteMapTab />}
            {activeTab === 'payment' && <PaymentTab />}
            {activeTab === 'ops' && <SpecialOpsTab />}
            {activeTab === 'diary' && (
              <FamilyDiaryTab
                isEmbedded={true}
                embeddedActiveTab={diarySectionTab}
                onEmbeddedTabChange={setDiarySectionTab}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence initial={false}>
        {activeTab === 'diary' && (
          <DiaryFloatingTabs activeTab={diarySectionTab} onTabChange={setDiarySectionTab} />
        )}
      </AnimatePresence>

      <footer className="px-3 pb-2 text-center text-[10px] font-bold text-navy/35">
        <a
          href={PRIVACY_POLICY_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            event.preventDefault();
            openExternalPolicyPage(PRIVACY_POLICY_URL);
          }}
          className="hover:text-navy underline underline-offset-2"
        >
          개인정보처리방침
        </a>
        <span className="mx-2 text-navy/20">|</span>
        <a
          href={DATA_DELETE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            event.preventDefault();
            openExternalPolicyPage(DATA_DELETE_URL);
          }}
          className="hover:text-navy underline underline-offset-2"
        >
          데이터 삭제 안내
        </a>
      </footer>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 glass-nav text-navy grid grid-cols-6 py-2 pb-safe shadow-[0_-12px_30px_rgba(26,35,126,0.06)] backdrop-blur-lg z-50">
        <button
          data-tour="nav-home"
          onClick={() => switchTab('home')}
          className={`flex flex-col items-center pt-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === 'home' ? 'text-accent-red' : 'text-navy/40 hover:text-navy/70'}`}
        >
          <Home size={20} className={activeTab === 'home' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">주간일정</span>
        </button>
        <button
          data-tour="nav-daily"
          onClick={() => switchTab('daily')}
          className={`relative flex flex-col items-center pt-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === 'daily' ? 'text-accent-red' : 'text-navy/40 hover:text-navy/70'}`}
        >
          <div className="relative">
            <CheckSquare size={20} className={activeTab === 'daily' ? 'stroke-[2.5px]' : 'stroke-2'} />
            {incompleteTasksCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-accent-red text-white text-[9px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                {incompleteTasksCount > 9 ? '9+' : incompleteTasksCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">오늘할일</span>
        </button>
        <button
          data-tour="nav-map"
          onClick={() => switchTab('map')}
          className={`flex flex-col items-center pt-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === 'map' ? 'text-accent-red' : 'text-navy/40 hover:text-navy/70'}`}
        >
          <CalendarDays size={20} className={activeTab === 'map' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">월간일정</span>
        </button>
        <button
          data-tour="nav-payment"
          onClick={() => switchTab('payment')}
          className={`flex flex-col items-center pt-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === 'payment' ? 'text-accent-red' : 'text-navy/40 hover:text-navy/70'}`}
        >
          <CreditCard size={20} className={activeTab === 'payment' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">결제관리</span>
        </button>
        <button
          data-tour="nav-ops"
          onClick={() => switchTab('ops')}
          className={`flex flex-col items-center pt-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === 'ops' ? 'text-accent-red' : 'text-navy/40 hover:text-navy/70'}`}
        >
          <Star size={20} className={activeTab === 'ops' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">가족일정</span>
        </button>
        <button
          data-tour="nav-diary"
          onClick={() => switchTab('diary')}
          className={`flex flex-col items-center pt-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === 'diary' ? 'text-accent-red' : 'text-navy/40 hover:text-navy/70'}`}
        >
          <BookOpen size={20} className={activeTab === 'diary' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">다이어리</span>
        </button>
      </nav>
      <AnimatePresence>
        {FAMILY_SHARING_ENABLED && isShareAuthOpen && (
          <Suspense fallback={null}>
            <Login onClose={() => setIsShareAuthOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>
      {isSupportEnabled && (
        <Suspense fallback={null}>
          <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
        </Suspense>
      )}
      {isTourReady && (
        <Suspense fallback={null}>
          <OnboardingTour
            activeTab={activeTab}
            onTabChange={switchTab}
            replayKey={tourReplayKey}
          />
        </Suspense>
      )}
      <NativeSafeConfirmDialog
        open={Boolean(childDeleteTargetId)}
        title="프로필 삭제"
        message={`${childProfiles[childDeleteTargetId] || '선택한'} 프로필을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.`}
        confirmLabel="삭제"
        destructive
        onConfirm={confirmRemoveChild}
        onCancel={() => setChildDeleteTargetId(null)}
      />
      <NativeSafeTextDialog
        open={Boolean(renameChildTargetId)}
        title="대상 이름 수정"
        value={renameChildValue}
        maxLength={12}
        placeholder="이름"
        onChange={setRenameChildValue}
        onConfirm={confirmRenameChild}
        onCancel={() => {
          setRenameChildTargetId(null);
          setRenameChildValue('');
        }}
      />
      <NativeSafeConfirmDialog
        open={cloudSyncPromptOpen}
        title="가족 공유 동기화"
        message="이 기기에 저장된 데이터를 가족 공유 계정으로 동기화하시겠습니까?"
        confirmLabel="동기화"
        onConfirm={confirmGuestCloudSync}
        onCancel={cancelGuestCloudSync}
      />
    </div>
  );
}

export default App;
