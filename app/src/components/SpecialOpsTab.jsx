import React, { useState } from 'react';
import { Star, FileSignature, CheckSquare, Settings, AlertCircle, RefreshCw, Hand, Users, Target } from 'lucide-react';

const INITIAL_OPS = [
    {
        id: 'ops-1',
        title: '신학기 입학식',
        date: '2026.03.02',
        description: '오전 10시 본관 대강당 입학식 및 학부모 오리엔테이션',
        priority: 'HIGH',
        status: 'PENDING',
        participants: {
            mom: true,
            dad: false
        },
        checklist: [
            { id: 'c1', task: '실내화 및 가방 구매 완료', checked: true },
            { id: 'c2', task: '가족 외식 장소 예약', checked: false },
            { id: 'c3', task: '오전 반차/연차 결재 (엄마)', checked: true }
        ]
    },
    {
        id: 'ops-2',
        title: '시아 치과 정기 검진',
        date: '2026.03.15',
        description: '오후 4시 예스치과. 불소 도포 및 충치 확인',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        participants: {
            mom: false,
            dad: true
        },
        checklist: [
            { id: 'c4', task: '예약 확인 알람 설정', checked: false },
            { id: 'c5', task: '양치 잘 시키고 출발', checked: false }
        ]
    }
];

export default function SpecialOpsTab() {
    const [ops, setOps] = useState(INITIAL_OPS);

    const toggleChecklist = (opsId, checklistId) => {
        setOps(ops.map(op => {
            if (op.id !== opsId) return op;
            return {
                ...op,
                checklist: op.checklist.map(item =>
                    item.id === checklistId ? { ...item, checked: !item.checked } : item
                )
            };
        }));
    };

    const toggleParticipant = (opsId, person) => {
        setOps(ops.map(op => {
            if (op.id !== opsId) return op;
            return {
                ...op,
                participants: {
                    ...op.participants,
                    [person]: !op.participants[person]
                }
            };
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-navy pb-2">
                <Target size={24} className="text-navy" />
                <h2 className="font-stencil text-xl flex-1 text-navy">SPECIAL OPERATIONS (Y-TAB)</h2>
            </div>

            {/* Mission Critical Briefing */}
            <div className="bg-navy text-white rounded p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12">
                    <Star size={120} />
                </div>
                <h3 className="font-bold border-b border-white/20 pb-2 mb-3 flex items-center gap-2 relative z-10">
                    <AlertCircle size={16} className="text-accent-red" />
                    REQUIRE IMMEDIATE COORDINATION
                </h3>
                <p className="text-xs opacity-80 leading-relaxed font-bold relative z-10">
                    연차 조율, 병원 예약 등 정규 스케줄 외 '특수 부부 작전'을 통제합니다.
                    참여 요원 버튼을 토글하여 역할을 분담하십시오.
                </p>
            </div>

            {/* Ops List */}
            <div className="space-y-4">
                {ops.map((op) => {
                    const progress = Math.round((op.checklist.filter(c => c.checked).length / op.checklist.length) * 100);

                    return (
                        <div key={op.id} className="bg-white border-2 border-navy rounded p-4 relative shadow-sm">
                            {/* File Tab Style Header */}
                            <div className="absolute top-[-10px] left-4 bg-navy text-white text-[10px] font-bold px-2 py-0.5 rounded-t tracking-widest">
                                OP CODE: {op.id.toUpperCase()}
                            </div>

                            <div className="mt-2 flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-lg text-navy flex items-center gap-2">
                                        {op.title}
                                        {op.priority === 'HIGH' && <span className="text-[10px] bg-accent-red text-white px-1.5 py-0.5 rounded font-bold">HIGH TARGET</span>}
                                    </h4>
                                    <p className="text-xs font-mono text-navy/60 font-bold tracking-tight">EXECUTION DATE: {op.date}</p>
                                </div>
                                <div className={`font-stencil text-xs px-2 py-1 rounded border-2 ${progress === 100 ? 'border-accent-green text-accent-green' : 'border-amber-500 text-amber-600'}`}>
                                    {progress === 100 ? 'CLEARED' : `${progress}%`}
                                </div>
                            </div>

                            <p className="text-sm font-bold opacity-80 mb-4 bg-gray-100 p-2 rounded border-l-4 border-navy">
                                {op.description}
                            </p>

                            {/* Resource Allocation */}
                            <div className="mb-4 bg-navy/5 p-3 rounded border border-navy/10">
                                <h5 className="font-bold text-xs text-navy mb-2 flex items-center gap-2">
                                    <Users size={14} /> FIELD AGENT ASSIGNMENT
                                </h5>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => toggleParticipant(op.id, 'mom')}
                                        className={`flex-1 py-1 text-xs font-bold rounded border-2 transition-colors ${op.participants.mom ? 'bg-navy text-white border-navy' : 'bg-transparent text-navy/50 border-navy/30'}`}
                                    >
                                        [엄마] 요원 대기
                                    </button>
                                    <button
                                        onClick={() => toggleParticipant(op.id, 'dad')}
                                        className={`flex-1 py-1 text-xs font-bold rounded border-2 transition-colors ${op.participants.dad ? 'bg-navy text-white border-navy' : 'bg-transparent text-navy/50 border-navy/30'}`}
                                    >
                                        [아빠] 요원 대기
                                    </button>
                                </div>
                            </div>

                            {/* Checklist */}
                            <div>
                                <h5 className="font-bold text-xs text-navy mb-2 border-b-2 border-navy/20 pb-1 flex justify-between items-end">
                                    <span>OPERATIONAL CHECKLIST</span>
                                    <span className="text-[10px] opacity-50 font-mono">CONFIRM ALL TASKS</span>
                                </h5>
                                <ul className="space-y-1">
                                    {op.checklist.map((item) => (
                                        <li key={item.id} className="flex items-center gap-2 text-sm font-bold opacity-80 cursor-pointer group" onClick={() => toggleChecklist(op.id, item.id)}>
                                            <div className="w-4 h-4 rounded border-2 border-navy flex items-center justify-center shrink-0">
                                                {item.checked && <div className="w-2 h-2 bg-accent-red rounded-sm"></div>}
                                            </div>
                                            <span className={`flex-1 ${item.checked ? 'line-through opacity-50' : 'group-hover:opacity-100'}`}>
                                                {item.task}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add New Button */}
            <button className="w-full bg-navy text-white font-bold py-3 rounded border-2 border-navy shadow-md hover:bg-white hover:text-navy transition-colors flex items-center justify-center gap-2">
                <FileSignature size={18} /> INITIATE NEW OPERATION
            </button>
        </div>
    );
}
