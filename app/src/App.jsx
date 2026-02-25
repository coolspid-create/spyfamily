import React, { useState, useEffect } from 'react';
import HomeBoard from './components/HomeBoard';
import PaymentTab from './components/PaymentTab';
import RouteMapTab from './components/RouteMapTab';
import SpecialOpsTab from './components/SpecialOpsTab';
import Login from './components/Login';
import { Home, CalendarDays, CreditCard, Star, LogOut } from 'lucide-react';
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
      <header className="bg-navy text-background p-4 pt-5 clip-paper mb-2 shadow-md shrink-0 relative flex flex-col items-center">
        {/* Child Profile Switcher */}
        <div className="absolute top-4 left-4 flex bg-white/10 rounded-full p-1 border border-white/20 shadow-inner">
          {['child1', 'child2', 'child3'].map((childId, idx) => (
            <button
              key={childId}
              onClick={() => setCurrentChild(childId)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentChild === childId
                  ? 'bg-accent-red text-white shadow-md scale-110 z-10'
                  : 'text-white/50 hover:text-white hover:bg-white/20'
                }`}
              title={`대상 ${idx + 1}`}
            >
              {['👦', '👧', '👶'][idx]}
            </button>
          ))}
        </div>

        <button
          onClick={signOut}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          title="기밀 보안 해제 (로그아웃)"
        >
          <LogOut size={18} />
        </button>

        <h1 className="font-sans text-3xl font-black tracking-tighter text-center flex items-center justify-center mt-6">
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
