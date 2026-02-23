import React, { useState } from 'react';
import HomeBoard from './components/HomeBoard';
import PaymentTab from './components/PaymentTab';
import RouteMapTab from './components/RouteMapTab';
import SpecialOpsTab from './components/SpecialOpsTab';
import { Home, CalendarDays, CreditCard, Star } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col border-x-4 border-navy shadow-2xl relative bg-background">
      {/* Header / Dossier Tab */}
      <header className="bg-navy text-background p-4 pt-5 clip-paper mb-2 shadow-md shrink-0">
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
          className={`flex flex-col items-center ${activeTab === 'home' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <Home size={24} />
          <span className="text-[10px] mt-1 font-bold">HOME</span>
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center ${activeTab === 'map' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <CalendarDays size={24} />
          <span className="text-[10px] mt-1 font-bold">PLAN</span>
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          className={`flex flex-col items-center ${activeTab === 'payment' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <CreditCard size={24} />
          <span className="text-[10px] mt-1 font-bold">FUNDS</span>
        </button>
        <button
          onClick={() => setActiveTab('ops')}
          className={`flex flex-col items-center ${activeTab === 'ops' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <Star size={24} />
          <span className="text-[10px] mt-1 font-bold">OPS</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
