import React, { useState, useEffect } from 'react';
import HomeBoard from './components/HomeBoard';
import DailyTasksTab from './components/DailyTasksTab';
import PaymentTab from './components/PaymentTab';
import RouteMapTab from './components/RouteMapTab';
import SpecialOpsTab from './components/SpecialOpsTab';
import Login from './components/Login';
import InstallPrompt from './components/InstallPrompt';
import { Home, CalendarDays, CreditCard, Star, LogOut, ChevronDown, Plus, Edit2, Trash2, Download, CheckSquare } from 'lucide-react';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';

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

  const dailyTasks = useStore(state => state.dailyTasks);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const incompleteTasksCount = dailyTasks.filter(task => task.assigned_date === todayStr && !task.is_completed).length;

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
  const isGuestMode = useStore(state => state.isGuestMode);
  const setGuestMode = useStore(state => state.setGuestMode);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchDataFromDB();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session && event === 'SIGNED_IN') {
        const { currentChild, syncGuestDataToCloud } = useStore.getState();
        const guestDataStr = localStorage.getItem(`spy_guestData_${currentChild}`);
        if (guestDataStr) {
          if (window.confirm("체험 모드에서 작성된 데이터를 가족 계정으로 동기화하시겠습니까? (취소 시 기존 체험 데이터는 삭제됩니다)")) {
            await syncGuestDataToCloud();
          } else {
            localStorage.removeItem(`spy_guestData_${currentChild}`);
            fetchDataFromDB();
          }
        } else {
          fetchDataFromDB();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, fetchDataFromDB]);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-4 relative overflow-hidden">
        <div className="animate-pulse flex flex-col items-center">
          <span className="text-white/50 font-mono text-lg font-bold tracking-widest gap-2 flex items-center"><Star size={16} className="animate-spin" /> 데이터를 불러오는 중입니다...</span>
        </div>
      </div>
    );
  }

  if (!session && !isGuestMode) {
    return <Login />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col border-x-4 border-navy shadow-2xl relative bg-background">
      {!session && isGuestMode && (
        <div className="bg-accent-yellow text-navy px-4 py-3 text-[11px] font-bold flex justify-between items-center z-[100] relative border-b-2 border-navy">
          <div className="flex-1 leading-tight">
            <span className="animate-pulse mr-1">⚠️</span>
            현재 체험 모드입니다. 데이터 보존을 위해<br />
            가족과 연동하고 계정을 생성하세요.
          </div>
          <button
            onClick={() => setGuestMode(false)}
            className="bg-navy text-white px-3 py-1.5 rounded shadow-sm text-[10px] whitespace-nowrap ml-2 hover:bg-navy/90 active:scale-95 transition-transform"
          >
            가입하기
          </button>
        </div>
      )}

      {/* Header / Dossier Tab */}
      <header className="relative z-50 shrink-0 mb-2 pt-4 pb-4 px-4 text-background">
        {/* Background with clip-path */}
        <div className="absolute inset-0 bg-navy clip-paper shadow-md drop-shadow-md"></div>

        {/* Absolute Left Controls */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-[100]">
          {/* Child Profile Dropdown Manager */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-full py-1 px-3 border border-white/20 shadow-sm"
            >
              <span className="font-bold text-[11px] tracking-wide text-white truncate max-w-[60px]">
                {childProfiles[currentChild]}
              </span>
              <ChevronDown size={14} className={`text-white/70 transition-transform shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-32 bg-white rounded shadow-xl overflow-hidden border border-navy/10 origin-top-left z-[100]">
                {Array.from({ length: childCount }).map((_, idx) => {
                  const cId = `child${idx + 1}`;
                  return (
                    <div
                      key={cId}
                      className={`flex items-center justify-between px-3 py-2.5 text-[11px] font-bold cursor-pointer transition-colors ${currentChild === cId ? 'bg-navy/10 text-navy' : 'text-navy/70 hover:bg-navy/5'}`}
                      onClick={() => selectChild(cId)}
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
                        {idx === childCount - 1 && childCount > 1 && (
                          <button
                            onClick={(e) => handleRemoveChild(e, cId)}
                            className="p-1 hover:bg-accent-red/10 rounded text-accent-red/60 hover:text-accent-red transition-colors ml-1"
                            title="프로필 삭제"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {childCount < 3 && (
                  <div
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-bold text-accent-red cursor-pointer hover:bg-accent-red/5 transition-colors border-t border-navy/10"
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
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end">
          <button
            onClick={signOut}
            className="text-white/50 hover:text-accent-red transition-colors flex items-center justify-center bg-white/5 hover:bg-white/10 w-[28px] h-[28px] rounded-full border border-white/10"
            title="로그아웃"
          >
            <LogOut size={13} className="ml-0.5" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event('manualInstallPrompt'))}
            className="text-white/50 hover:text-white transition-colors flex items-center justify-center bg-white/5 hover:bg-white/10 w-[28px] h-[28px] rounded-full border border-white/10"
            title="바탕화면에 앱 설치하기"
          >
            <Download size={13} />
          </button>
        </div>

        {/* Header Title Space */}
        <div className="relative pt-6">
          <h1 className="font-sans text-2xl font-black tracking-tighter text-center flex items-center justify-center">
            <span className="tracking-tight">가족</span>
            <span className="text-accent-red text-xl mx-2 font-bold">×</span>
            <span className="tracking-tight">스케줄러</span>
          </h1>
          <p className="text-center text-[10px] uppercase font-bold pt-1 text-background/90">
            우리 가족의 소중한 일정과 자금 관리
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 flex-1 pb-16">
        {activeTab === 'home' && <HomeBoard />}
        {activeTab === 'daily' && <DailyTasksTab />}
        {activeTab === 'map' && <RouteMapTab />}
        {activeTab === 'payment' && <PaymentTab />}
        {activeTab === 'ops' && <SpecialOpsTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 w-full bg-navy text-background grid grid-cols-5 py-3 pb-safe border-t-4 border-accent-red shadow-[0_-10px_20px_rgba(0,0,0,0.15)] z-50 mt-auto">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center pt-1 ${activeTab === 'home' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <Home size={22} />
          <span className="text-[10px] mt-1 font-bold tracking-tight">가족일정</span>
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          className={`relative flex flex-col items-center pt-1 ${activeTab === 'daily' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <div className="relative">
            <CheckSquare size={22} />
            {incompleteTasksCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-accent-red text-white text-[9px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border-2 border-navy">
                {incompleteTasksCount > 9 ? '9+' : incompleteTasksCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-bold tracking-tight">오늘할일</span>
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center pt-1 ${activeTab === 'map' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <CalendarDays size={22} />
          <span className="text-[10px] mt-1 font-bold tracking-tight">월간일정</span>
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          className={`flex flex-col items-center pt-1 ${activeTab === 'payment' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <CreditCard size={22} />
          <span className="text-[10px] mt-1 font-bold tracking-tight">결제관리</span>
        </button>
        <button
          onClick={() => setActiveTab('ops')}
          className={`flex flex-col items-center pt-1 ${activeTab === 'ops' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <Star size={22} />
          <span className="text-[10px] mt-1 font-bold tracking-tight">가족행사</span>
        </button>
      </nav>
      {/* PWA Mobile Install Prompt */}
      <InstallPrompt />
    </div>
  );
}

export default App;
