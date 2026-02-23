import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Signal, Radio, AlertTriangle, ShieldCheck, Bus, Key, Wifi, Smartphone, Activity } from 'lucide-react';

export default function RouteMapTab() {
    // Current live tracking state (mocked)
    const [isTracking, setIsTracking] = useState(false);
    const [signalStrength, setSignalStrength] = useState(0);

    useEffect(() => {
        if (!isTracking) return;

        // Mock signal strength fluctuating for spy aesthetic
        const interval = setInterval(() => {
            setSignalStrength(Math.floor(Math.random() * 4));
        }, 1500);
        return () => clearInterval(interval);
    }, [isTracking]);

    const handleTrackToggle = () => {
        setIsTracking(!isTracking);
    };

    const routes = [
        { id: 1, time: '13:00 - 13:40', location: '일반교실 (학교)', agent: '학교', wait: '대기 중' },
        { id: 2, time: '13:45 - 15:50', location: '방과후교실', agent: '태권도', wait: 'MTA 관장님 픽업 대기' },
        { id: 3, time: '16:00 - 16:50', location: 'MTA 태권도', agent: '태권도', wait: '운동 중' },
        { id: 4, time: '17:00 - 17:50', location: '상탑학원 (영어)', agent: '엄마', wait: '엄마 픽업 후 이동' },
        { id: 5, time: '18:00 - 18:50', location: '신동음악학원', agent: '아빠', wait: '아빠 픽업 및 귀가' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-navy pb-2">
                <Navigation size={24} className="text-navy" />
                <h2 className="font-stencil text-xl flex-1 text-navy">LOCATION NETWORK</h2>
            </div>

            {/* Live GPS Tracker Unit (Future SmartTag Integration) */}
            <div className={`border-2 p-4 rounded bg-navy relative overflow-hidden transition-all duration-300 ${isTracking ? 'border-accent-green' : 'border-navy'}`}>
                {/* Radar sweep effect */}
                {isTracking && (
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 border-2 border-accent-green/20 rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping opacity-20 pointer-events-none"></div>
                )}

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <h3 className="text-white font-stencil text-lg flex items-center gap-2">
                            <Smartphone size={18} /> GALAXY SMART TAG 2
                        </h3>
                        <p className="text-xs font-mono text-white/50">TARGET: S.I.A (PRIMARY)</p>
                    </div>
                    <button
                        onClick={handleTrackToggle}
                        className={`text-xs font-bold px-3 py-1 rounded border-2 transition-colors ${isTracking ? 'bg-accent-green/20 text-accent-green border-accent-green' : 'bg-transparent text-white border-white/30 hover:bg-white/10'}`}
                    >
                        {isTracking ? 'TRACKING ACTIVE' : 'INITIATE SYNC'}
                    </button>
                </div>

                <div className="bg-black/40 rounded p-3 font-mono text-xs flex items-center gap-4 relative z-10 text-white">
                    <div className="flex-1">
                        <div className="text-white/50 mb-1">STATUS //</div>
                        {isTracking ? (
                            <div className="text-accent-green font-bold flex items-center gap-2">
                                <Activity size={12} className="animate-pulse" />
                                SECURE CHANNEL ESTABLISHED.
                            </div>
                        ) : (
                            <div className="text-amber-400 font-bold flex items-center gap-2">
                                <Wifi size={12} /> STANDBY MODE. AWAITING SIGNAL.
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-white/50 mb-1">SIGNAL</div>
                        <div className="flex gap-1 justify-end">
                            {[0, 1, 2, 3].map((bar) => (
                                <div key={bar} className={`w-1.5 h-3 rounded-full ${!isTracking ? 'bg-white/20' : signalStrength >= bar ? 'bg-accent-green' : 'bg-white/20'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-3 text-center text-white/40 text-[10px] uppercase tracking-widest font-bold">
                    [ API HOOK PREPARED FOR SECURE HARDWARE INTEGRATION ]
                </div>
            </div>

            {/* Daily Route Timeline */}
            <div className="bg-white border-2 border-navy rounded p-4 shadow-sm relative">
                <h3 className="font-stencil text-navy mb-4 flex items-baseline justify-between border-b-2 border-navy/20 pb-2">
                    <span>TODAY'S OPERATIONAL ROUTE</span>
                    <span className="text-xs text-navy/60 font-mono">D-DAY</span>
                </h3>

                <div className="relative border-l-2 border-dashed border-navy/30 ml-3 space-y-6 pb-2">
                    {routes.map((route, idx) => (
                        <div key={route.id} className="relative pl-6">
                            {/* Timeline Node */}
                            <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center
                                ${idx === 2 ? 'border-accent-green text-accent-green' : 'border-navy text-navy'}
                            `}>
                                {idx === 2 ? <div className="w-2.5 h-2.5 bg-accent-green rounded-full animate-pulse"></div> : <div className="w-1.5 h-1.5 bg-navy rounded-full opacity-50"></div>}
                            </div>

                            <div className="mb-1 flex items-center gap-2">
                                <span className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded ${idx === 2 ? 'bg-accent-green text-white' : 'bg-navy/10 text-navy'}`}>
                                    {route.time}
                                </span>
                                {idx === 2 && <span className="text-[10px] text-accent-green font-bold px-1 border border-accent-green rounded animate-pulse">CURRENT</span>}
                            </div>

                            <h4 className="font-bold text-navy text-sm flex items-center gap-1">
                                <MapPin size={14} className={idx === 2 ? 'text-accent-green' : 'text-navy/60'} />
                                {route.location}
                            </h4>

                            <div className="mt-1 flex items-center gap-2 text-[11px]">
                                <span className={`px-2 py-0.5 rounded font-bold ${route.agent === '학교' ? 'bg-gray-200 text-gray-700' :
                                        route.agent === '태권도' ? 'bg-amber-100 text-amber-700' :
                                            'bg-accent-red/10 text-accent-red'
                                    }`}>
                                    관할: {route.agent}
                                </span>
                                <span className="text-navy/60 font-bold flex items-center gap-1">
                                    <Key size={10} /> {route.wait}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contingency Protocols */}
            <div className="bg-amber-50 border-2 border-amber-500 rounded p-4 shadow-sm">
                <h3 className="font-stencil text-amber-800 mb-2 flex items-center gap-2 text-sm border-b border-amber-300 pb-1">
                    <AlertTriangle size={16} /> EVAC & CONTINGENCY PROTOCOLS
                </h3>
                <ul className="text-xs text-amber-900 font-bold space-y-2 opacity-80 pl-4 list-disc marker:text-amber-500">
                    <li>픽업 요원 지각 시: 학원 원장님께 대기 요청 콜 발송</li>
                    <li>예상 도착 시간 10분 지연 시: GALAXY SMART TAG 알림 확인</li>
                    <li>우천/폭설 코스 붕괴 시: 택시 또는 자차 즉시 투입 </li>
                </ul>
            </div>
        </div>
    );
}
