import React, { lazy, Suspense, useMemo, useState, useEffect } from 'react';
import HomeBoard from './components/HomeBoard';
import DailyTasksTab from './components/DailyTasksTab';
import PaymentTab from './components/PaymentTab';
import RouteMapTab from './components/RouteMapTab';
import SpecialOpsTab from './components/SpecialOpsTab';
import { Home, CalendarDays, CreditCard, Star, LogOut, ChevronDown, Plus, Edit2, CheckSquare, Coffee, Users, HardDrive, CircleHelp } from 'lucide-react';
import { useStore } from './store/useStore';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { DATA_DELETE_URL, PRIVACY_POLICY_URL, openExternalPolicyPage } from './lib/policyLinks';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';

const FAMILY_SHARING_ENABLED = import.meta.env.VITE_ENABLE_FAMILY_SHARING === 'true';
const MAIN_TAB_TRANSITION = { duration: 0.15 };
const MAIN_TAB_MOTION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: MAIN_TAB_TRANSITION,
};

const Login = lazy(() => import('./components/Login'));
const SupportModal = lazy(() => import('./components/SupportModal'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const session = useStore(state => state.session);
  const setSession = useStore(state => state.setSession);
  const signOut = useStore(state => state.signOut);
  const fetchDataFromDB = useStore(state => state.fetchDataFromDB);
  const currentChild = useStore(state => state.currentChild);
  const setCurrentChild = useStore(state => state.setCurrentChild);
  const childCount = useStore(state => state.childCount);
  const addChildProfile = useStore(state => state.addChildProfile);
  const removeChildProfile = useStore(state => state.removeChildProfile);

  const childProfiles = useStore(state => state.childProfiles);
  const updateChildName = useStore(state => state.updateChildName);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [tourReplayKey, setTourReplayKey] = useState(0);
  const [isTourReady, setIsTourReady] = useState(false);
  const isSupportEnabled = import.meta.env.VITE_ENABLE_SUPPORT === 'true';

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
    if (window.confirm(`${childProfiles[childId]} 프로필을 삭제하시겠습니까?\n(삭제 후 복구할 수 없습니다)`)) {
      removeChildProfile();
      setIsDropdownOpen(false);
    }
  };

  const handleRenameChild = (e, childId) => {
    e.stopPropagation();
    const currentName = childProfiles[childId];
    const newName = prompt('대상 이름을 입력하세요:', currentName);
    if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
      updateChildName(childId, newName.trim());
    }
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchDataFromDB();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session && event === 'SIGNED_IN') {
        const { currentChild, syncGuestDataToCloud } = useStore.getState();
        const guestDataStr = localStorage.getItem(`spy_guestData_${currentChild}`);
        const lastSyncedGuestData = localStorage.getItem(`spy_guestDataLastSynced_${currentChild}`);
        if (guestDataStr && guestDataStr !== lastSyncedGuestData) {
          if (window.confirm("이 기기에 저장된 데이터를 가족 공유 계정으로 동기화하시겠습니까?")) {
            await syncGuestDataToCloud();
          } else {
            fetchDataFromDB();
          }
        } else {
          fetchDataFromDB();
        }
        setIsShareAuthOpen(false);
      } else if (!session) {
        fetchDataFromDB();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, fetchDataFromDB]);

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
          <p className="mt-3 whitespace-nowrap text-sm font-bold text-background/80">
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
    <div className="app-shell max-w-[420px] mx-auto h-[100dvh] min-h-[100dvh] flex flex-col overflow-hidden border-x-[3px] border-navy shadow-2xl relative bg-background">
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
              <p className="text-sm font-bold">새로운 버전이 준비되었습니다!</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateServiceWorker(true)}
                className="flex-1 bg-accent-red text-white py-2 rounded-lg font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                지금 업데이트 적용
              </button>
              <button
                onClick={() => setNeedRefresh(false)}
                className="px-4 py-2 bg-white/10 text-white/70 rounded-lg font-bold text-xs hover:bg-white/20 transition-all"
              >
                나중에
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header / Dossier Tab */}
      <header className="relative z-50 shrink-0 mb-1 bg-navy pt-1.5 pb-3 px-3.5 text-background">
        {/* Background with clip-path */}
        <div className="absolute -left-px -right-px bottom-0 top-0 bg-navy clip-paper shadow-md drop-shadow-md"></div>

        {/* Absolute Left Controls */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-[100]">
          {/* Child Profile Dropdown Manager */}
          <div className="relative">
            <button
              data-tour="child-selector"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex h-[28px] items-center gap-1 bg-white/10 hover:bg-white/20 transition-colors rounded-full px-2.5 border border-white/20 shadow-sm"
            >
              <span className="font-bold text-[10px] tracking-wide text-white truncate max-w-[46px]">
                {childProfiles[currentChild]}
              </span>
              <ChevronDown size={12} className={`text-white/70 transition-transform shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-28 bg-white rounded shadow-xl overflow-hidden border border-navy/10 origin-top-left z-[100]">
                {Array.from({ length: childCount }).map((_, idx) => {
                  const cId = `child${idx + 1}`;
                  return (
                    <div
                      key={cId}
                      className={`flex items-center justify-between px-2.5 py-2 text-[10px] font-bold cursor-pointer transition-colors ${currentChild === cId ? 'bg-navy/10 text-navy' : 'text-navy/70 hover:bg-navy/5'}`}
                      onClick={() => { selectChild(cId); setIsDropdownOpen(false); }}
                    >
                      <span className="truncate flex-1 text-navy">{childProfiles[cId]}</span>
                      <div className="flex items-center shrink-0">
                        <button
                          onClick={(e) => handleRenameChild(e, cId)}
                          className="p-1 hover:bg-navy/10 rounded text-navy/40 hover:text-navy transition-colors ml-1"
                          title="이름 수정"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {childCount < 3 && (
                  <div
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-[10px] font-bold text-accent-red cursor-pointer hover:bg-accent-red/5 transition-colors border-t border-navy/10"
                    onClick={handleAddChild}
                  >
                    <Plus size={12} /> 추가
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Absolute Right Control */}
        <div className="absolute top-2.5 right-2.5 z-[100] flex items-center gap-1.5">
          {FAMILY_SHARING_ENABLED && session ? (
            <span
              data-tour="local-status"
              className="inline-flex h-[26px] items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 text-[10px] font-bold text-white/55"
              title="가족 공유 중"
            >
              <Users size={10} />
              공유
            </span>
          ) : (
            <span
              data-tour="local-status"
              className="inline-flex h-[26px] items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 text-[10px] font-bold text-white/55"
              title="이 기기에 저장 중"
            >
              <HardDrive size={10} />
              로컬
            </span>
          )}
          {FAMILY_SHARING_ENABLED && (
            <div className="flex flex-row gap-1.5 items-center">
              {session ? (
              <button
                onClick={signOut}
                className="text-white/50 hover:text-accent-red transition-colors flex items-center justify-center bg-white/5 hover:bg-white/10 w-[26px] h-[26px] rounded-full border border-white/10 transition-transform active:scale-95"
                title="가족 공유 해제"
              >
                <LogOut size={12} className="ml-0.5" />
              </button>
            ) : (
              <button
                onClick={openShareAuth}
                className="text-white/50 hover:text-white transition-colors flex items-center justify-center bg-white/5 hover:bg-white/10 w-[26px] h-[26px] rounded-full border border-white/10 transition-transform active:scale-95"
                title="다른 보호자와 공유하기"
              >
                <Users size={12} />
              </button>
              )}
            </div>
          )}
          {isSupportEnabled && (
            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="text-amber-200/70 hover:text-amber-400 transition-colors flex items-center justify-center bg-white/5 hover:bg-white/10 w-[26px] h-[26px] rounded-full border border-white/10"
              title="후원하기"
            >
              <Coffee size={12} />
            </button>
          )}
          <button
            type="button"
            data-tour="tour-help"
            onClick={() => setTourReplayKey(key => key + 1)}
            className="text-white/50 hover:text-white transition-colors flex items-center justify-center bg-white/5 hover:bg-white/10 w-[26px] h-[26px] rounded-full border border-white/10 transition-transform active:scale-95"
            title="빠른 가이드 다시 보기"
            aria-label="빠른 가이드 다시 보기"
          >
            <CircleHelp size={12} />
          </button>
        </div>

        {/* Header Title Space */}
        <div className="relative pt-1.5">
          <h1 className="font-sans text-[20px] font-black tracking-tighter text-center flex items-center justify-center">
            <span data-tour="app-title" className="inline-flex items-center justify-center">
              <span className="tracking-tight">가족</span>
              <span className="text-accent-red text-lg mx-1.5 font-bold">×</span>
              <span className="tracking-tight">스케줄러</span>
            </span>
          </h1>
          <p className="text-center text-[9px] uppercase font-bold pt-0.5 text-background/90">
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
          </motion.div>
        </AnimatePresence>
      </main>

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
      <nav className="absolute bottom-0 left-0 right-0 bg-white/95 text-navy grid grid-cols-5 py-2 pb-safe border-t border-navy/10 shadow-[0_-10px_20px_rgba(0,0,0,0.12)] backdrop-blur-md z-50">
        <button
          data-tour="nav-home"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center pt-1 transition-colors ${activeTab === 'home' ? 'text-accent-red' : 'text-[#a2a8cc]'}`}
        >
          <Home size={20} />
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">주간일정</span>
        </button>
        <button
          data-tour="nav-daily"
          onClick={() => setActiveTab('daily')}
          className={`relative flex flex-col items-center pt-1 transition-colors ${activeTab === 'daily' ? 'text-accent-red' : 'text-[#a2a8cc]'}`}
        >
          <div className="relative">
            <CheckSquare size={20} />
            {incompleteTasksCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-accent-red text-white text-[9px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border-2 border-white">
                {incompleteTasksCount > 9 ? '9+' : incompleteTasksCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">오늘할일</span>
        </button>
        <button
          data-tour="nav-map"
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center pt-1 transition-colors ${activeTab === 'map' ? 'text-accent-red' : 'text-[#a2a8cc]'}`}
        >
          <CalendarDays size={20} />
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">월간일정</span>
        </button>
        <button
          data-tour="nav-payment"
          onClick={() => setActiveTab('payment')}
          className={`flex flex-col items-center pt-1 transition-colors ${activeTab === 'payment' ? 'text-accent-red' : 'text-[#a2a8cc]'}`}
        >
          <CreditCard size={20} />
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">결제관리</span>
        </button>
        <button
          data-tour="nav-ops"
          onClick={() => setActiveTab('ops')}
          className={`flex flex-col items-center pt-1 transition-colors ${activeTab === 'ops' ? 'text-accent-red' : 'text-[#a2a8cc]'}`}
        >
          <Star size={20} />
          <span className="text-[10px] mt-0.5 font-bold tracking-tight">가족일정</span>
        </button>
      </nav>
      <AnimatePresence>
        {FAMILY_SHARING_ENABLED && isShareAuthOpen && !session && (
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
            onTabChange={setActiveTab}
            replayKey={tourReplayKey}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
