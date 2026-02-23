import React, { useState } from 'react';
import { Star, FileSignature, CheckSquare, Settings, AlertCircle, RefreshCw, Hand, Users, Target, Plus, Save, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [expandedOpId, setExpandedOpId] = useState(INITIAL_OPS.length > 0 ? INITIAL_OPS[0].id : null);
    const [showForm, setShowForm] = useState(false);
    const [newOp, setNewOp] = useState({ title: '', date: '', description: '', priority: 'MEDIUM' });
    const [newTaskInputs, setNewTaskInputs] = useState({});

    const handleDeleteOp = (opsId) => {
        setOps(ops.filter(op => op.id !== opsId));
        if (expandedOpId === opsId) setExpandedOpId(null);
    };

    const handleAddOp = () => {
        if (!newOp.title.trim() || !newOp.date) return;
        const operation = {
            id: `ops-${Date.now()}`,
            title: newOp.title,
            date: newOp.date,
            description: newOp.description,
            priority: newOp.priority,
            status: 'PENDING',
            participants: { mom: false, dad: false },
            checklist: []
        };
        setOps([...ops, operation]);
        setShowForm(false);
        setNewOp({ title: '', date: '', description: '', priority: 'MEDIUM' });
    };

    const handleAddTask = (opsId) => {
        const taskText = newTaskInputs[opsId];
        if (!taskText || !taskText.trim()) return;
        setOps(ops.map(op => {
            if (op.id !== opsId) return op;
            return {
                ...op,
                checklist: [...op.checklist, { id: `c-${Date.now()}`, task: taskText.trim(), checked: false }]
            };
        }));
        setNewTaskInputs({ ...newTaskInputs, [opsId]: '' });
    };

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
                <h2 className="font-stencil text-xl flex-1 text-navy">SPECIAL OPERATIONS</h2>
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
                    const progress = op.checklist.length === 0 ? 0 : Math.round((op.checklist.filter(c => c.checked).length / op.checklist.length) * 100);
                    const isExpanded = expandedOpId === op.id;

                    return (
                        <div key={op.id} className="bg-white border-2 border-navy rounded p-4 relative shadow-sm">
                            {/* File Tab Style Header */}
                            <div
                                className="absolute top-[-10px] left-4 bg-navy text-white text-[10px] font-bold px-2 py-0.5 rounded-t tracking-widest cursor-pointer hover:bg-navy/80 hover:h-[22px] transition-all flex items-center gap-1"
                                onClick={() => setExpandedOpId(isExpanded ? null : op.id)}
                            >
                                OP CODE: {op.id.toUpperCase()}
                            </div>

                            <div
                                className="mt-2 flex justify-between items-start mb-3 cursor-pointer group"
                                onClick={() => setExpandedOpId(isExpanded ? null : op.id)}
                            >
                                <div>
                                    <h4 className="font-bold text-lg text-navy flex items-center gap-1 group-hover:text-accent-red transition-colors">
                                        {isExpanded ? <ChevronUp size={20} className="text-navy/50" /> : <ChevronDown size={20} className="text-navy/50" />}
                                        {op.title}
                                        {op.priority === 'HIGH' && <span className="text-[10px] bg-accent-red text-white px-1.5 py-0.5 rounded font-bold ml-1">HIGH TARGET</span>}
                                    </h4>
                                    <p className="text-xs font-mono text-navy/60 font-bold tracking-tight pl-6">EXECUTION DATE: {op.date}</p>
                                </div>
                                <div className="flex flex-col gap-2 items-end shrink-0">
                                    <div className={`font-stencil text-xs px-2 py-1 rounded border-2 ${progress === 100 ? 'border-accent-green text-accent-green bg-green-50' : 'border-amber-500 text-amber-600 bg-amber-50'}`}>
                                        {progress === 100 ? 'CLEARED' : `${progress}%`}
                                    </div>
                                    {progress === 100 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteOp(op.id); }}
                                            className="text-white bg-accent-red hover:bg-red-700 p-1 rounded-sm shadow-sm transition-colors animate-pulse"
                                            title="완료된 작전 파기"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm font-bold opacity-80 mb-2 bg-gray-100 p-2 rounded border-l-4 border-navy cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => setExpandedOpId(isExpanded ? null : op.id)}>
                                {op.description}
                            </p>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden pt-2"
                                    >
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
                                                        <div className="w-4 h-4 rounded border-2 border-navy flex items-center justify-center shrink-0 mt-0.5">
                                                            {item.checked && <div className="w-2 h-2 bg-accent-red rounded-sm"></div>}
                                                        </div>
                                                        <span className={`flex-1 ${item.checked ? 'line-through opacity-50' : 'group-hover:opacity-100'}`}>
                                                            {item.task}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {/* Add Task Input */}
                                            <div className="mt-3 flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    placeholder="새로운 체크리스트 추가..."
                                                    value={newTaskInputs[op.id] || ''}
                                                    onChange={(e) => setNewTaskInputs({ ...newTaskInputs, [op.id]: e.target.value })}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask(op.id)}
                                                    className="flex-1 border-b-2 border-navy/20 bg-transparent text-sm font-bold outline-none px-1 py-1 focus:border-navy"
                                                />
                                                <button onClick={() => handleAddTask(op.id)} className="text-navy bg-navy/5 hover:bg-navy/10 rounded transition-colors p-1.5 border border-navy/20">
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Add New Operation Form / Button */}
            <AnimatePresence>
                {showForm ? (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-amber-50 border-2 border-navy rounded p-4 shadow-md overflow-hidden"
                    >
                        <h3 className="font-stencil text-navy flex items-center justify-between mb-4 border-b-2 border-navy pb-2">
                            <span>DRAFT NEW OPERATION</span>
                            <button onClick={() => setShowForm(false)} className="text-navy/50 hover:text-accent-red transition-colors"><X size={18} /></button>
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold opacity-70 block mb-1">작전명 (Title)</label>
                                <input
                                    type="text"
                                    value={newOp.title}
                                    onChange={(e) => setNewOp({ ...newOp, title: e.target.value })}
                                    className="w-full border-2 border-navy rounded p-2 text-sm font-bold outline-none bg-white"
                                    placeholder="ex. 가족 여행 준비"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold opacity-70 block mb-1">실행일 (Date)</label>
                                    <input
                                        type="date"
                                        value={newOp.date}
                                        onChange={(e) => setNewOp({ ...newOp, date: e.target.value })}
                                        className="w-full border-2 border-navy rounded p-2 text-sm font-bold outline-none font-mono bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold opacity-70 block mb-1">중요도 (Priority)</label>
                                    <select
                                        value={newOp.priority}
                                        onChange={(e) => setNewOp({ ...newOp, priority: e.target.value })}
                                        className="w-full border-2 border-navy rounded p-2 text-sm font-bold outline-none cursor-pointer bg-white"
                                    >
                                        <option value="NORMAL">NORMAL</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HIGH">HIGH TARGET</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold opacity-70 block mb-1">상세 내용 (Description)</label>
                                <textarea
                                    value={newOp.description}
                                    onChange={(e) => setNewOp({ ...newOp, description: e.target.value })}
                                    className="w-full border-2 border-navy rounded p-2 text-sm font-bold outline-none resize-none h-20 bg-white"
                                    placeholder="작전 세부 지시사항..."
                                ></textarea>
                            </div>
                            <button
                                onClick={handleAddOp}
                                className="w-full bg-navy text-white font-bold py-3 rounded border-2 border-navy shadow-md hover:bg-white hover:text-navy transition-colors flex items-center justify-center gap-2 mt-2"
                            >
                                <Save size={18} /> CONFIRM & INITIATE
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full bg-navy text-white font-bold py-3 rounded border-2 border-navy shadow-md hover:bg-white hover:text-navy transition-colors flex items-center justify-center gap-2"
                    >
                        <FileSignature size={18} /> INITIATE NEW OPERATION
                    </button>
                )}
            </AnimatePresence>
        </div>
    );
}
