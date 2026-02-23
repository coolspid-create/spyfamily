import React, { useState } from 'react';
import HomeBoard from './components/HomeBoard';
import PaymentTab from './components/PaymentTab';
import RouteMapTab from './components/RouteMapTab';
import SpecialOpsTab from './components/SpecialOpsTab';
import { Home, Map, CreditCard, Star } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="max-w-md mx-auto min-h-screen border-x-4 border-navy shadow-2xl relative bg-background">
      {/* Header / Dossier Tab */}
      <header className="bg-navy text-background p-4 clip-paper mb-2 shadow-md">
        <h1 className="font-stencil text-2xl tracking-widest text-center">OPERATION: SPYxFAMILY</h1>
        <p className="text-center text-xs opacity-70 uppercase tracking-widest mt-1">Top Secret Schedule & Funding</p>
      </header>

      {/* Main Content Area */}
      <main className="p-4 pb-24">
        {activeTab === 'home' && <HomeBoard />}
        {activeTab === 'map' && <RouteMapTab />}
        {activeTab === 'payment' && <PaymentTab />}
        {activeTab === 'ops' && <SpecialOpsTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md bg-navy text-background flex justify-around p-3 pb-safe border-t-4 border-accent-red z-50">
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
          <Map size={24} />
          <span className="text-[10px] mt-1 font-bold">ROUTE</span>
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
          className={`flex flex-col items-center flex-col ${activeTab === 'ops' ? 'text-accent-red' : 'text-background/70'}`}
        >
          <Star size={24} />
          <span className="text-[10px] mt-1 font-bold">OPS</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
