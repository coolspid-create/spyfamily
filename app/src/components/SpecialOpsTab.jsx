import React, { useMemo, useState } from 'react';
import { Star, FileSignature, Users, Target, Plus, Save, Trash2, Edit2, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { NativeSafeConfirmDialog, NativeSafeDateInput } from './NativeSafeControls';

const TAB_LIKE_TRANSITION = { duration: 0.2, ease: "easeOut" };
const TAB_LIKE_MOTION = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: TAB_LIKE_TRANSITION,
};
const EXPAND_COLLAPSE_TRANSITION = { duration: 0.22, ease: "easeOut" };
const EXPAND_COLLAPSE_MOTION = {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 },
    transition: EXPAND_COLLAPSE_TRANSITION,
};
const CHECKLIST_TASK_MAX_LENGTH = 30;
const PRIORITY_OPTIONS = [
    { value: 'NORMAL', label: '보통' },
    { value: 'MEDIUM', label: '중간' },
    { value: 'HIGH', label: '중요' },
];

function PriorityPicker({ value, onChange }) {
    return (
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-navy/10 bg-navy/5 p-1">
            {PRIORITY_OPTIONS.map(option => {
                const selected = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        aria-pressed={selected}
                        className={`h-9 rounded-lg text-[12px] font-black transition-all duration-200 ${selected
                            ? 'bg-navy text-white shadow-sm shadow-navy/10'
                            : 'text-navy/55 hover:bg-white/70 hover:text-navy'
                            }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

export default function SpecialOpsTab() {
    const ops = useStore(state => state.opsData);
    const addOp = useStore(state => state.addOp);
    const removeOp = useStore(state => state.removeOp);
    const updateOp = useStore(state => state.updateOp);

    // Default expanded tab logic based on incoming data
    const [expandedOpId, setExpandedOpId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingOpId, setEditingOpId] = useState(null);
    const [newOp, setNewOp] = useState({ title: '', date: '', description: '', priority: 'MEDIUM' });
    const [newTaskInputs, setNewTaskInputs] = useState({});
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const sortedOps = useMemo(
        () => [...ops].sort((a, b) => new Date(b.date.replace(/\./g, '/')) - new Date(a.date.replace(/\./g, '/'))),
        [ops]
    );

    const handleEditOp = (op) => {
        setNewOp({
            ...op,
            date: op.date.replace(/\./g, '-')
        });
        setEditingOpId(op.id);
        setShowForm(false);
    };

    const handleDeleteOp = (opsId) => {
        setDeleteTargetId(opsId);
    };

    const confirmDeleteOp = () => {
        if (!deleteTargetId) return;
        removeOp(deleteTargetId);
        if (expandedOpId === deleteTargetId) setExpandedOpId(null);
        setDeleteTargetId(null);
    };

    const handleAddOp = () => {
        if (!newOp.title.trim()) {
            alert('가족일정 제목을 입력해주세요.');
            return;
        }
        if (!newOp.date) {
            alert('기한/실행일을 선택해주세요.');
            return;
        }

        if (newOp.id) {
            updateOp({
                ...newOp,
                date: newOp.date.replace(/-/g, '.')
            });
        } else {
            const operation = {
                id: `ops-${Date.now()}`,
                title: newOp.title,
                date: newOp.date.replace(/-/g, '.'),
                description: newOp.description,
                priority: newOp.priority,
                status: 'PENDING',
                participants: { mom: false, dad: false },
                checklist: []
            };
            addOp(operation);
        }
        setShowForm(false);
        setEditingOpId(null);
        setNewOp({ title: '', date: '', description: '', priority: 'MEDIUM' });
    };

    const handleAddTask = (opsId) => {
        const taskText = newTaskInputs[opsId]?.trim().slice(0, CHECKLIST_TASK_MAX_LENGTH);
        if (!taskText || !taskText.trim()) return;
        const op = ops.find(o => o.id === opsId);
        if (op) {
            updateOp({
                ...op,
                checklist: [...op.checklist, { id: `c-${Date.now()}`, task: taskText, checked: false }]
            });
        }
        setNewTaskInputs({ ...newTaskInputs, [opsId]: '' });
    };

    const toggleChecklist = (opsId, checklistId) => {
        const op = ops.find(o => o.id === opsId);
        if (op) {
            updateOp({
                ...op,
                checklist: op.checklist.map(item =>
                    item.id === checklistId ? { ...item, checked: !item.checked } : item
                )
            });
        }
    };

    const handleDeleteTask = (opsId, checklistId) => {
        const op = ops.find(o => o.id === opsId);
        if (op) {
            updateOp({
                ...op,
                checklist: op.checklist.filter(item => item.id !== checklistId)
            });
        }
    };

    const toggleParticipant = (opsId, person) => {
        const op = ops.find(o => o.id === opsId);
        if (op) {
            updateOp({
                ...op,
                participants: {
                    ...op.participants,
                    [person]: !op.participants[person]
                }
            });
        }
    };

    return (
        <div className="space-y-6">


            {/* Mission Critical Briefing */}
            <div className="bg-gradient-to-br from-accent-blue via-accent-blue/95 to-accent-blue/90 p-5 rounded-2xl shadow-sm relative overflow-hidden border border-white/5">
                <div className="absolute top-2 right-2 opacity-[0.03] rotate-12 text-white">
                    <Star size={120} />
                </div>
                <h3 className="font-bold text-[13px] text-white border-b border-white/10 pb-2 mb-2 flex items-center gap-2 relative z-10">
                    <Star size={14} className="text-fuchsia-200" />
                    중요 일정 및 할 일
                </h3>
                <p className="text-[10px] text-white/60 leading-relaxed font-semibold relative z-10">
                    가족들과 함께 일정과 준비물을 함께 관리하세요.<br />
                    중요 일정 및 할일은 월간일정과 연동이 됩니다.
                </p>
            </div>

            {/* Ops List */}
            <div className="space-y-3.5">
                {sortedOps.map((op) => {
                    const isExpanded = expandedOpId === op.id;
                    const totalTasks = op.checklist.length;
                    const checkedTasks = op.checklist.filter(c => c.checked).length;
                    const progress = totalTasks === 0 ? 0 : Math.round((checkedTasks / totalTasks) * 100);

                    return (
                        <React.Fragment key={op.id}>
                            <div className="bg-white border border-navy/5 rounded-2xl p-4.5 relative shadow-md hover:shadow-lg transition-all duration-300">
                                <div
                                    className="flex justify-between items-start cursor-pointer group"
                                    onClick={() => setExpandedOpId(isExpanded ? null : op.id)}
                                >
                                    <div className="flex-1 pr-2 flex items-center min-w-0">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            {isExpanded ? (
                                                <ChevronUp size={18} className="text-navy/40 shrink-0 mt-0.5" />
                                            ) : (
                                                <ChevronDown size={18} className="text-navy/40 shrink-0 mt-0.5" />
                                            )}
                                            <div className="space-y-1 min-w-0">
                                                <h4 className="font-sans font-black text-[15px] text-navy group-hover:text-rose-500 transition-colors flex flex-wrap items-center gap-2 leading-tight">
                                                    <span className="truncate">{op.title}</span>
                                                    {op.priority === 'HIGH' && (
                                                        <span className="text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black tracking-wider inline-block shrink-0">
                                                            중요
                                                        </span>
                                                    )}
                                                    {op.priority === 'MEDIUM' && (
                                                        <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-black tracking-wider inline-block shrink-0">
                                                            중간
                                                        </span>
                                                    )}
                                                </h4>
                                                {totalTasks > 0 && (
                                                    <div className="flex items-center gap-2 text-[10px] text-navy/40 font-bold">
                                                        <span>체크리스트 {checkedTasks}/{totalTasks}</span>
                                                        <span className="text-navy/20">•</span>
                                                        <span>{progress}% 완료</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 gap-2" onClick={e => e.stopPropagation()}>
                                        <span className="text-[10px] font-mono text-navy/40 font-bold tracking-tight">
                                            {op.date}
                                        </span>
                                        <div className="flex bg-navy/5 rounded-full p-0.5 shadow-sm gap-0.5">
                                            <button
                                                onClick={() => handleEditOp(op)}
                                                aria-label={`${op.title} 수정`}
                                                className="p-1 rounded-full transition-all text-navy/40 hover:text-navy hover:bg-white cursor-pointer"
                                                title="할 일 수정"
                                            >
                                                <Edit2 size={11} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteOp(op.id)}
                                                aria-label={`${op.title} 삭제`}
                                                className="p-1 rounded-full transition-all text-navy/40 hover:text-rose-500 hover:bg-white cursor-pointer"
                                                title="할 일 삭제"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            {...EXPAND_COLLAPSE_MOTION}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-4 border-t border-dashed border-navy/10 mt-3.5 space-y-4">
                                                {op.description && (
                                                    <p className="text-[13px] font-semibold leading-relaxed text-navy/70 bg-navy/5 p-3 rounded-xl border border-navy/10">
                                                        {op.description}
                                                    </p>
                                                )}

                                                {/* Resource Allocation */}
                                                <div className="bg-navy/5 p-3.5 rounded-xl border border-navy/10">
                                                    <h5 className="font-black text-[10px] text-navy/50 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                                                        <Users size={12} className="stroke-[2.5px]" /> 담당자 배정
                                                    </h5>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => toggleParticipant(op.id, 'mom')}
                                                            className={`flex-1 py-2 text-[13px] font-bold rounded-xl border transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                op.participants?.mom
                                                                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200'
                                                                    : 'bg-white text-navy/60 border-navy/10 hover:bg-navy/5'
                                                            }`}
                                                        >
                                                            <Star size={11} className={op.participants?.mom ? 'fill-current' : ''} />
                                                            엄마 담당
                                                        </button>
                                                        <button
                                                            onClick={() => toggleParticipant(op.id, 'dad')}
                                                            className={`flex-1 py-2 text-[13px] font-bold rounded-xl border transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                op.participants?.dad
                                                                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-200'
                                                                    : 'bg-white text-navy/60 border-navy/10 hover:bg-navy/5'
                                                            }`}
                                                        >
                                                            <Star size={11} className={op.participants?.dad ? 'fill-current' : ''} />
                                                            아빠 담당
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Checklist */}
                                                <div className="space-y-2">
                                                    <h5 className="font-black text-[10px] text-navy/50 border-b border-navy/10 pb-1.5 flex justify-between items-end uppercase tracking-wider">
                                                        <span className="flex items-center gap-1">세부 체크리스트</span>
                                                        <span className="text-[9px] opacity-60 font-mono tracking-tighter">할 일 확인</span>
                                                    </h5>
                                                    <ul className="space-y-1.5">
                                                        {op.checklist.map((item) => (
                                                            <li
                                                                key={item.id}
                                                                className="flex items-center gap-2.5 text-[13px] font-bold text-navy/80 group py-1.5 px-2 rounded-lg hover:bg-navy/5 transition-colors"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleChecklist(op.id, item.id)}
                                                                    aria-label={item.checked ? `${item.task} 미완료로 변경` : `${item.task} 완료로 변경`}
                                                                    className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
                                                                        item.checked
                                                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                            : 'border-navy/20 bg-white group-hover:border-navy/40'
                                                                    }`}
                                                                >
                                                                    {item.checked && <Check size={11} className="stroke-[3px]" />}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleChecklist(op.id, item.id)}
                                                                    className={`min-w-0 flex-1 text-left leading-tight cursor-pointer ${item.checked ? 'line-through opacity-40 text-navy' : 'group-hover:text-rose-500'}`}
                                                                >
                                                                    {item.task}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteTask(op.id, item.id)}
                                                                    aria-label={`${item.task} 삭제`}
                                                                    title="체크리스트 삭제"
                                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-navy/25 transition-all hover:bg-white hover:text-rose-500 cursor-pointer"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    {/* Add Task Input */}
                                                    <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl border border-navy/10 bg-navy/5 p-1 focus-within:border-navy/20 focus-within:bg-white transition-all">
                                                        <input
                                                            type="text"
                                                            placeholder="새로운 체크리스트 추가..."
                                                            value={newTaskInputs[op.id] || ''}
                                                            onChange={(e) => setNewTaskInputs({ ...newTaskInputs, [op.id]: e.target.value.slice(0, CHECKLIST_TASK_MAX_LENGTH) })}
                                                            maxLength={CHECKLIST_TASK_MAX_LENGTH}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask(op.id)}
                                                            className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-[13px] font-bold text-navy outline-none placeholder:opacity-50"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddTask(op.id)}
                                                            className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg border border-navy/20 bg-white text-navy shadow-sm transition-colors hover:bg-navy hover:text-white cursor-pointer"
                                                            aria-label="체크리스트 추가"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            {/* Inline Edit Form */}
                            <AnimatePresence initial={false}>
                                {editingOpId === op.id && (
                                    <motion.div
                                        {...TAB_LIKE_MOTION}
                                        className="bg-white/95 backdrop-blur-md border border-navy/15 rounded-2xl p-5 shadow-lg shadow-navy/5 space-y-4 mt-2"
                                    >
                                        <h3 className="font-sans font-black text-[15px] text-navy flex items-center justify-between border-b border-navy/10 pb-2.5">
                                            <span>가족일정 수정</span>
                                            <button
                                                onClick={() => { setEditingOpId(null); setNewOp({ title: '', date: '', description: '', priority: 'MEDIUM' }); }}
                                                aria-label="가족일정 수정 닫기"
                                                title="닫기"
                                                className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white transition-opacity hover:opacity-90 cursor-pointer"
                                            >
                                                <X size={13} />
                                            </button>
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">할 일 제목</label>
                                                <input
                                                    type="text"
                                                    value={newOp.title}
                                                    onChange={(e) => setNewOp({ ...newOp, title: e.target.value })}
                                                    className="w-full border border-navy/15 rounded-xl p-2.5 text-[13px] font-semibold outline-none bg-white focus:border-navy focus:ring-2 focus:ring-navy/5 transition-all"
                                                    placeholder="예: 가족 여행 준비"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">기한/실행일</label>
                                                    <NativeSafeDateInput
                                                        value={newOp.date}
                                                        onChange={(date) => setNewOp({ ...newOp, date })}
                                                        pickerMode="popup"
                                                        popupAlign="left"
                                                        buttonClassName="border border-navy/15 rounded-xl p-2.5 text-[13px] font-semibold font-mono bg-white text-navy"
                                                        placeholder="날짜 선택"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">중요도</label>
                                                    <PriorityPicker
                                                        value={newOp.priority}
                                                        onChange={(priority) => setNewOp({ ...newOp, priority })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">상세 내용</label>
                                                <textarea
                                                    value={newOp.description}
                                                    onChange={(e) => setNewOp({ ...newOp, description: e.target.value })}
                                                    className="w-full border border-navy/15 rounded-xl p-2.5 text-[13px] font-semibold outline-none resize-none h-20 bg-white focus:border-navy focus:ring-2 focus:ring-navy/5 transition-all"
                                                    placeholder="할 일 상세 내용..."
                                                ></textarea>
                                            </div>
                                            <button
                                                onClick={() => { handleAddOp(); setEditingOpId(null); }}
                                                className="w-full bg-gradient-to-r from-accent-blue via-accent-blue/95 to-accent-blue/90 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer text-[13px]"
                                            >
                                                <Save size={14} /> 수정 완료
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Add New Operation Form / Button */}
            <AnimatePresence initial={false} mode="wait">
                {showForm ? (
                    <motion.div
                        key="special-ops-form"
                        {...TAB_LIKE_MOTION}
                        className="bg-white border border-navy/10 rounded-2xl p-5 shadow-md space-y-4"
                    >
                        <h3 className="font-sans font-black text-[15px] text-navy flex items-center justify-between border-b border-navy/10 pb-2.5">
                            <span>새 가족일정 작성</span>
                            <button
                                onClick={() => { setShowForm(false); setNewOp({ title: '', date: '', description: '', priority: 'MEDIUM' }); }}
                                aria-label="새 가족일정 작성 닫기"
                                title="닫기"
                                className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white transition-opacity hover:opacity-90 cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">할 일 제목</label>
                                <input
                                    type="text"
                                    value={newOp.title}
                                    onChange={(e) => setNewOp({ ...newOp, title: e.target.value })}
                                    className="w-full border border-navy/15 rounded-xl p-2.5 text-[13px] font-semibold outline-none bg-white focus:border-navy focus:ring-2 focus:ring-navy/5 transition-all"
                                    placeholder="예: 가족 여행 준비"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">기한/실행일</label>
                                    <NativeSafeDateInput
                                        value={newOp.date}
                                        onChange={(date) => setNewOp({ ...newOp, date })}
                                        pickerMode="popup"
                                        popupAlign="left"
                                        buttonClassName="border border-navy/15 rounded-xl p-2.5 text-[13px] font-semibold font-mono bg-white text-navy"
                                        placeholder="날짜 선택"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">중요도</label>
                                    <PriorityPicker
                                        value={newOp.priority}
                                        onChange={(priority) => setNewOp({ ...newOp, priority })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">상세 내용</label>
                                <textarea
                                    value={newOp.description}
                                    onChange={(e) => setNewOp({ ...newOp, description: e.target.value })}
                                    className="w-full border border-navy/15 rounded-xl p-2.5 text-[13px] font-semibold outline-none resize-none h-20 bg-white focus:border-navy focus:ring-2 focus:ring-navy/5 transition-all"
                                    placeholder="할 일 상세 내용..."
                                ></textarea>
                            </div>
                            <button
                                onClick={handleAddOp}
                                className="w-full bg-gradient-to-r from-accent-blue via-accent-blue/95 to-accent-blue/90 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer text-[13px]"
                            >
                                <Save size={14} /> 작성 완료
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.button
                        key="special-ops-add-button"
                        {...TAB_LIKE_MOTION}
                        onClick={() => { setShowForm(true); setEditingOpId(null); setNewOp({ title: '', date: '', description: '', priority: 'MEDIUM' }); }}
                        className="w-full bg-navy/5 text-navy font-black py-3.5 rounded-xl border border-navy/10 shadow-md hover:bg-navy/10 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-[13px]"
                    >
                        <FileSignature size={14} /> 새 가족일정 추가
                    </motion.button>
                )}
            </AnimatePresence>
            <NativeSafeConfirmDialog
                open={Boolean(deleteTargetId)}
                title="가족일정 삭제"
                message="이 할 일을 완전히 삭제하시겠습니까?"
                confirmLabel="삭제"
                destructive
                onConfirm={confirmDeleteOp}
                onCancel={() => setDeleteTargetId(null)}
            />
        </div>
    );
}
