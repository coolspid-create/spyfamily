import React, { useState, useEffect } from 'react';
import HomeBoard from './components/HomeBoard';
import PaymentTab from './components/PaymentTab';
import RouteMapTab from './components/RouteMapTab';
import SpecialOpsTab from './components/SpecialOpsTab';
import Login from './components/Login';
import { Home, CalendarDays, CreditCard, Star, LogOut, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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

  const childIndex = parseInt(currentChild.replace('child', '')) - 1;

  const handlePrevChild = () => {
    if (childIndex > 0) {
      setCurrentChild(`child${childIndex}`);
    }
  };

  const handleNextChild = () => {
    if (childIndex < childCount - 1) {
      setCurrentChild(`child${childIndex + 2}`);
    } else if (childCount < 3) {
      addChildProfile();
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchDataFromDB();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session && event === 'SIGNED_IN') {
        fetchDataFromDB();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, fetchDataFromDB]);

  if (!session) {
    return <Login />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col border-x-4 border-navy shadow-2xl relative bg-background">
      {/* Header / Dossier Tab */}
      <header className="bg-navy text-background p-4 pt-5 clip-paper mb-2 shadow-md shrink-0 relative">
        {/* Child Profile Switcher - Absolute Minimalist */}
        <div className="absolute top-2 left-2 flex items-center bg-white/5 rounded-full py-0.5 px-1 border border-white/10 shadow-inner z-10">
          <button
            onClick={handlePrevChild}
            disabled={childIndex === 0}
            className={`p-1 rounded-full transition-colors ${childIndex === 0 ? 'text-white/20' : 'text-white/70 hover:text-white hover:bg-white/20'}`}
          >
            <ChevronLeft size={16} />
          </button>

          <div className="w-10 flex justify-center items-center font-bold text-[10px] tracking-wide text-white/90 select-none">
            대상 {childIndex + 1}
          </div>

          <button
            onClick={handleNextChild}
            disabled={childIndex === 2 && childCount === 3}
            className={`p-1 rounded-full transition-colors ${(childIndex === 2 && childCount === 3)
              ? 'text-white/20 bg-transparent'
              : 'text-white/70 hover:text-white hover:bg-white/20'
              }`}
          >
            {childIndex < childCount - 1 ? <ChevronRight size={16} /> : <Plus size={16} />}
          </button>
        </div>

        <button
          onClick={signOut}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          title="기밀 보안 해제 (로그아웃)"
        >
          <LogOut size={18} />
        </button>

        <h1 className="font-sans text-3xl font-black tracking-tighter text-center flex items-center justify-center">
          <span className="tracking-tight">SPY</span>
          <span className="text-accent-red text-xl mx-2 font-bold rotate-12">×</span>
          <span className="tracking-tight">FAMILY</span>
        </h1>
        <p className="text-center text-[9px] uppercase tracking-widest mt-1 font-bold pt-1 text-background/70">
          Top Secret <span className="text-accent-red font-black text-[11px] opacity-100">S</span>chedule & <span className="text-accent-red font-black text-[11px] opacity-100">P</span>ayment & <span className="text-accent-red font-black text-[11px] opacity-100">Y</span>outh
        </p>
      </header>

      {/* Main Content Area */}
      <main className="p-4 flex-1 pb-16">
        {activeTab === 'home' && <HomeBoard />}
        {activeTab === 'map' && <RouteMapTab />}
        {activeTab === 'payment' && <PaymentTab />}
        {activeTab === 'ops' && <SpecialOpsTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 w-full bg-navy text-background grid grid-cols-4 py-3 pb-safe border-t-4 border-accent-red shadow-[0_-10px_20px_rgba(0,0,0,0.15)] z-50 mt-auto">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center pt-1 ${activeTab === 'home' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <Home size={22} />
          <span className="text-[10px] mt-1 font-bold tracking-tight">작전본부</span>
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center pt-1 ${activeTab === 'map' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <CalendarDays size={22} />
          <span className="text-[10px] mt-1 font-bold tracking-tight">작전계획</span>
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          className={`flex flex-col items-center pt-1 ${activeTab === 'payment' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <CreditCard size={22} />
          <span className="text-[10px] mt-1 font-bold tracking-tight">결제미션</span>
        </button>
        <button
          onClick={() => setActiveTab('ops')}
          className={`flex flex-col items-center pt-1 ${activeTab === 'ops' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <Star size={22} />
          <span className="text-[10px] mt-1 font-bold tracking-tight">특수임무</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
