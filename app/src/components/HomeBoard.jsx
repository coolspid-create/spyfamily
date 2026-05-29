import React, { useMemo, useState } from 'react';
import { User, Baby, ShieldAlert, Clock, CheckSquare, Plus, Trash2, Edit2, Save, Bus, MapPin, School, Rocket, Phone, Copy, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

const getAgentIcon = (agent) => {
    if (agent.includes('엄마')) return <Baby className="w-4 h-4 text-rose-500" />;
    if (agent.includes('아빠')) return <User className="w-4 h-4 text-navy border border-navy rounded-full p-[0.5px]" />;
    if (agent.includes('태권도')) return <Bus className="w-4 h-4 text-emerald-500" />;
    if (agent.includes('학교')) return <School className="w-4 h-4 text-blue-500" />;
    if (agent.includes('자율')) return <Rocket className="w-4 h-4 text-amber-500" />;
    return <User className="w-3.5 h-3.5 text-gray-500 border border-gray-400 rounded-full p-[0.5px]" />;
};

const getTimeValue = (time) => {
    const [hour, minute] = time.split(':').map(Number);
    return (hour * 60) + minute;
};

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const CALENDAR_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TAB_LIKE_TRANSITION = { duration: 0.2, ease: "easeOut" };
const TAB_LIKE_MOTION = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: TAB_LIKE_TRANSITION,
};
const PAST_ITEM_MOTION = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 0.5, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: TAB_LIKE_TRANSITION,
};
const STAMP_OUTER_POINTS = Array.from({ length: 80 })
    .map((_, i) => `${130 + (i % 2 === 0 ? 122 : 112) * Math.cos(i * 4.5 * Math.PI / 180)},${130 + (i % 2 === 0 ? 122 : 112) * Math.sin(i * 4.5 * Math.PI / 180)}`)
    .join(' ');

const getDateStampKey = (prefix, date) => (
    `${prefix}_${date.getFullYear()}_${date.getMonth()}_${date.getDate()}`
);

export default function HomeBoard() {
    // Zustand Store
    const weeklyData = useStore(state => state.weeklyData);
    const addSchedule = useStore(state => state.addSchedule);
    const copyScheduleToDays = useStore(state => state.copyScheduleToDays);
    const updateScheduleItem = useStore(state => state.updateScheduleItem);
    const removeScheduleItem = useStore(state => state.removeScheduleItem);
    const notices = useStore(state => state.notices);
    const addNotice = useStore(state => state.addNotice);
    const updateNotice = useStore(state => state.updateNotice);
    const removeNotice = useStore(state => state.removeNotice);

    // Local UI State
    const todayStr = useMemo(() => CALENDAR_DAYS[new Date().getDay()], []);
    const [selectedDay, setSelectedDay] = useState(todayStr);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [newNotice, setNewNotice] = useState('');
    const [showPast, setShowPast] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSchedule, setNewSchedule] = useState({ title: '', time: '09:00', agent: '자율', location: '', contactName: '', contactPhone: '' });
    const [isCustomAgentAdd, setIsCustomAgentAdd] = useState(false);
    const [isCustomAgentEdit, setIsCustomAgentEdit] = useState(false);
    const [activeContactPopup, setActiveContactPopup] = useState(null);
    const [showCopyPanel, setShowCopyPanel] = useState(false);
    const [copyTargets, setCopyTargets] = useState([]);
    const [copyMessage, setCopyMessage] = useState('');

    const presetAgents = ['엄마', '아빠', '태권도', '학교', '자율'];

    const schedule = weeklyData[selectedDay] || [];
    const copyTargetDays = useMemo(() => WEEK_DAYS.filter(day => day !== selectedDay), [selectedDay]);

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ ...item });
        setIsCustomAgentEdit(!presetAgents.includes(item.agent));
    };

    const saveEdit = async () => {
        const finalForm = { ...editForm, agent: editForm.agent.trim() || '자율' };
        await updateScheduleItem(finalForm);
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('일정을 삭제하시겠습니까?')) {
            await removeScheduleItem(id);
        }
    };

    const handleAddSchedule = async () => {
        if (!newSchedule.title.trim()) return;
        const finalSchedule = { ...newSchedule, agent: newSchedule.agent.trim() || '자율' };
        await addSchedule(selectedDay, finalSchedule);
        setShowAddForm(false);
        setNewSchedule({ title: '', time: '09:00', agent: '자율', location: '', contactName: '', contactPhone: '' });
        setIsCustomAgentAdd(false);
    };

    const handleAddNotice = () => {
        if (newNotice.trim()) {
            addNotice({ id: Date.now(), text: newNotice.trim(), checked: false });
            setNewNotice('');
        }
    };

    const resetCopyPanel = () => {
        setShowCopyPanel(false);
        setCopyTargets([]);
        setCopyMessage('');
    };

    const handleSelectDay = (day) => {
        setSelectedDay(day);
        setShowPast(false);
        setShowAddForm(false);
        setEditingId(null);
        setActiveContactPopup(null);
        resetCopyPanel();
    };

    const toggleCopyTarget = (day) => {
        setCopyMessage('');
        setCopyTargets(prev => (
            prev.includes(day)
                ? prev.filter(target => target !== day)
                : [...prev, day]
        ));
    };

    const selectWeekdayTargets = () => {
        setCopyMessage('');
        setCopyTargets(['월', '화', '수', '목', '금'].filter(day => day !== selectedDay));
    };

    const handleCopySchedule = async () => {
        if (copyTargets.length === 0 || schedule.length === 0) return;

        const result = await copyScheduleToDays(selectedDay, copyTargets);
        if (result.added > 0) {
            setCopyMessage(`${selectedDay}요일 일정 ${result.added}개를 복사했습니다.`);
        } else {
            setCopyMessage('이미 같은 일정이 있어서 추가하지 않았습니다.');
        }
        setCopyTargets([]);
    };

    // Only today's schedule can be treated as completed by the clock.
    const now = new Date();
    const currentTimeValue = (now.getHours() * 60) + now.getMinutes();
    const isCurrentDay = selectedDay === todayStr;

    let activeIndex = 0;
    let isAllCompleted = false;

    if (schedule.length > 0 && isCurrentDay) {
        for (let i = 0; i < schedule.length; i++) {
            const startValue = getTimeValue(schedule[i].time);
            const nextItem = schedule[i + 1];
            const endValue = nextItem ? getTimeValue(nextItem.time) : startValue + 10;

            if (currentTimeValue >= endValue) {
                activeIndex = i + 1;
            } else {
                break;
            }
        }

        isAllCompleted = activeIndex >= schedule.length;
    }

    // Past and future weekdays should always show the full list.
    if (!isCurrentDay) {
        activeIndex = 0;
        isAllCompleted = false;
    }

    const pastSchedule = schedule.slice(0, activeIndex);
    const activeAndFutureSchedule = schedule.slice(activeIndex);

    // 도장 애니메이션은 하루에 한 번만 쾅 찍히도록
    const animationCacheKey = getDateStampKey('scheduleStampAnimatedDate', now);
    const hasAnimated = localStorage.getItem(animationCacheKey) === 'true';
    const onStampAnimationComplete = () => {
        if (!hasAnimated) {
            localStorage.setItem(animationCacheKey, 'true');
        }
    };

    return (
        <div className="space-y-5">
            {/* Top Fixed Notice Checklist */}
            <div className="bg-gradient-to-br from-accent-blue via-accent-blue/95 to-accent-blue/90 p-4.5 rounded-2xl shadow-sm relative overflow-hidden border border-white/5 space-y-3.5">
                <h3 className="font-sans font-black text-[13px] text-white border-b border-white/10 pb-2 flex items-center gap-2 relative z-10">
                    <CheckSquare size={15} className="stroke-[2.5px] text-white" /> 가족 알림장
                </h3>
                <ul className="space-y-2 text-[13px] font-bold text-white/80 relative z-10">
                    <AnimatePresence>
                        {notices.map(notice => (
                            <motion.li
                                key={notice.id}
                                {...TAB_LIKE_MOTION}
                                className="flex items-center justify-between group py-0.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <label className="flex items-center gap-2.5 cursor-pointer flex-1 py-1 px-1.5">
                                    <div
                                        onClick={() => updateNotice(notice.id)}
                                        className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 ${
                                            notice.checked
                                                ? 'bg-rose-500 border-rose-500 text-white'
                                                : 'border-white/30 bg-white/15 group-hover:border-white/50'
                                        }`}
                                    >
                                        {notice.checked && <Check size={11} className="stroke-[3px]" />}
                                    </div>
                                    <span className={`leading-tight transition-all ${notice.checked ? 'line-through opacity-40 text-white' : 'group-hover:text-rose-300'}`}>
                                        {notice.text}
                                    </span>
                                </label>
                                <button
                                    onClick={() => removeNotice(notice.id)}
                                    className="opacity-0 group-hover:opacity-100 text-rose-300 p-1.5 transition-opacity cursor-pointer hover:bg-white/20 rounded-full mr-1.5 shadow-sm"
                                    title="알림 삭제"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>
                <div className="flex min-w-0 items-center gap-2 pt-1.5 mt-1.5 relative z-10">
                    <input
                        type="text"
                        value={newNotice}
                        onChange={(e) => setNewNotice(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNotice()}
                        placeholder="새로운 알림이나 메모 남기기..."
                        className="min-w-0 flex-1 bg-transparent px-2 py-1 text-[13px] font-semibold text-white outline-none placeholder:text-white/40"
                    />
                    <button
                        type="button"
                        onClick={handleAddNotice}
                        className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white shadow-sm transition-colors hover:bg-white hover:text-accent-blue cursor-pointer"
                        aria-label="알림 추가"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* Title & Day Selector */}
            <div className="space-y-4">
                <div className="flex items-center gap-2.5 border-b border-navy/5 pb-2">
                    <Clock size={18} className="text-navy stroke-[2.5px]" />
                    <h2 className="font-sans font-black text-[15px] flex-1 text-navy">오늘의 일정표</h2>
                    <button
                        type="button"
                        onClick={() => {
                            setShowCopyPanel(prev => !prev);
                            setCopyMessage('');
                            setCopyTargets([]);
                        }}
                        disabled={schedule.length === 0}
                        className="flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-navy/15 bg-white px-2.5 text-[10px] font-black uppercase tracking-wider text-navy transition-all hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-navy cursor-pointer"
                        aria-label={`${selectedDay}요일 일정 복사`}
                    >
                        <Copy size={12} />
                        <span>복사</span>
                    </button>
                </div>
                
                {/* Day selector capsule */}
                <div className="flex justify-between items-center bg-navy/5 border border-navy/5 p-1 rounded-2xl shadow-inner gap-1">
                    {WEEK_DAYS.map(d => (
                        <button
                            key={d}
                            onClick={() => handleSelectDay(d)}
                            className={`flex-1 py-1.5 text-center font-black text-[13px] rounded-xl transition-all duration-200 cursor-pointer ${
                                selectedDay === d
                                    ? 'bg-navy text-white shadow-sm'
                                    : 'text-navy/50 hover:bg-navy/5 hover:text-navy'
                            }`}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                <AnimatePresence>
                    {showCopyPanel && (
                        <motion.div
                            {...TAB_LIKE_MOTION}
                            className="overflow-hidden"
                        >
                            <div className="rounded-2xl border border-navy/10 bg-white p-4 shadow-lg shadow-navy/5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-sans font-black text-[13px] text-navy">{selectedDay}요일 일정 복사</p>
                                        <p className="mt-1 text-[10px] font-semibold leading-relaxed text-navy/40">
                                            선택한 요일에 추가하고, 같은 일정은 자동으로 건너뜁니다.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={resetCopyPanel}
                                        className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-navy/40 hover:bg-navy/5 hover:text-navy cursor-pointer"
                                        aria-label="복사 메뉴 닫기"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {copyTargetDays.map(day => {
                                        const selected = copyTargets.includes(day);
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => toggleCopyTarget(day)}
                                                className={`rounded-xl border px-2 py-2 text-[13px] font-bold transition-all cursor-pointer ${
                                                    selected
                                                        ? 'border-navy bg-navy text-white shadow-sm'
                                                        : 'border-navy/10 bg-navy/5 text-navy/60 hover:border-navy/20 hover:bg-navy/10'
                                                }`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={selectWeekdayTargets}
                                        className="flex-1 rounded-xl border border-navy/15 bg-white px-3 py-2 text-[10px] font-bold text-navy hover:bg-navy/5 cursor-pointer"
                                    >
                                        평일 선택
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCopySchedule}
                                        disabled={copyTargets.length === 0}
                                        className="flex-1 rounded-xl bg-navy px-3 py-2 text-[10px] font-bold text-white transition-colors hover:bg-navy/95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                                    >
                                        복사하기
                                    </button>
                                </div>
                                {copyMessage && (
                                    <p className="mt-2 rounded-xl bg-navy/5 px-3.5 py-2 text-[10px] font-semibold text-navy border border-navy/5">
                                        {copyMessage}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Daily Schedule Timeline */}
            <div className={`relative border-l border-navy/10 ml-4 space-y-4 pt-1.5 ${isAllCompleted ? 'min-h-[196px]' : ''}`}>

                {/* Past Missions Toggle */}
                {pastSchedule.length > 0 && (
                    <div className="relative pl-6">
                        <div className="absolute -left-[4.5px] top-3.5 w-2 h-2 rounded-full border border-background bg-navy/20"></div>
                        <button
                            onClick={() => setShowPast(!showPast)}
                            className="w-full bg-navy/5 text-navy/70 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl border border-navy/5 flex items-center justify-center gap-1.5 hover:bg-navy/10 transition-colors cursor-pointer"
                        >
                            <Clock size={12} className="stroke-[2.5px]" />
                            {showPast ? '완료된 일정 숨기기' : `완료된 일정 (${pastSchedule.length}개) 보기`}
                        </button>
                    </div>
                )}

                <AnimatePresence>
                    {isAllCompleted && isCurrentDay && !showPast && (
                        <motion.div
                            initial={hasAnimated ? false : { scale: 3.6, opacity: 0, y: -70, rotate: -35 }}
                            animate={hasAnimated
                                ? { scale: 1, opacity: 0.95, y: 0, rotate: -12 }
                                : { scale: [3.6, 0.82, 1.08, 1], opacity: [0, 1, 1, 0.95], y: [-70, 8, -3, 0], rotate: [-35, -5, -14, -12] }
                            }
                            transition={hasAnimated
                                ? { duration: 0 }
                                : { duration: 0.46, times: [0, 0.58, 0.78, 1], ease: 'easeOut', delay: 0.05 }
                            }
                            onAnimationComplete={onStampAnimationComplete}
                            style={{ transformOrigin: 'center center', willChange: 'transform, opacity' }}
                            className="absolute inset-x-0 top-12 -ml-4 flex justify-center items-center z-30 pointer-events-none mix-blend-multiply"
                        >
                            <svg width="165" height="165" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <mask id="scratches">
                                        <rect width="100%" height="100%" fill="white" />
                                        {/* Organic high-fidelity stamp ink dry scratches */}
                                        <path d="M 10,40 Q 130,55 250,30" stroke="black" strokeWidth="1.5" strokeDasharray="3 12" opacity="0.7" />
                                        <path d="M -10,80 Q 140,65 270,95" stroke="black" strokeWidth="1.5" strokeDasharray="6 8" opacity="0.6" />
                                        <path d="M 5,115 Q 125,105 255,125" stroke="black" strokeWidth="2" strokeDasharray="1 15" opacity="0.8" />
                                        <path d="M 15,145 Q 135,160 255,135" stroke="black" strokeWidth="1.5" strokeDasharray="4 10" opacity="0.7" />
                                        <path d="M -5,185 L 265,175" stroke="black" strokeWidth="1.5" strokeDasharray="2 12" opacity="0.6" />
                                        <path d="M 20,220 Q 140,210 260,230" stroke="black" strokeWidth="2" strokeDasharray="5 15" opacity="0.7" />
                                        <path d="M 30,10 L 230,250" stroke="black" strokeWidth="1" strokeDasharray="2 18" opacity="0.5" />
                                        <path d="M 230,10 L 30,250" stroke="black" strokeWidth="1.2" strokeDasharray="3 15" opacity="0.5" />
                                    </mask>
                                    <path id="curveTop" d="M 53,130 A 77,77 0 0,1 207,130" fill="transparent" />
                                    <path id="curveBottom" d="M 53,130 A 77,77 0 0,0 207,130" fill="transparent" />
                                </defs>
                                <g mask="url(#scratches)">
                                    <polygon points={STAMP_OUTER_POINTS} fill="#c21a1a" />
                                    <circle cx="130" cy="130" r="102" fill="white" />
                                    <circle cx="130" cy="130" r="95" fill="none" stroke="#c21a1a" strokeWidth="4" />
                                    <circle cx="130" cy="130" r="58" fill="none" stroke="#c21a1a" strokeWidth="2" />
                                    <text fontFamily="Georgia, 'Times New Roman', serif" fontSize="23" fontWeight="900" fill="#c21a1a" letterSpacing="4">
                                        <textPath href="#curveTop" startOffset="50%" textAnchor="middle">SCHEDULE</textPath>
                                    </text>
                                    <text fontFamily="Georgia, 'Times New Roman', serif" fontSize="23" fontWeight="900" fill="#c21a1a" letterSpacing="4">
                                        <textPath href="#curveBottom" startOffset="50%" textAnchor="middle">SCHEDULE</textPath>
                                    </text>
                                    <g fill="#c21a1a">
                                        <text x="105" y="90" fontSize="14" textAnchor="middle">★</text>
                                        <text x="130" y="93" fontSize="20" textAnchor="middle">★</text>
                                        <text x="155" y="90" fontSize="14" textAnchor="middle">★</text>
                                        <text x="105" y="176" fontSize="14" textAnchor="middle">★</text>
                                        <text x="130" y="179" fontSize="20" textAnchor="middle">★</text>
                                        <text x="155" y="176" fontSize="14" textAnchor="middle">★</text>
                                    </g>
                                    <g>
                                        <path d="M -15,95 L 275,95 L 255,130 L 275,165 L -15,165 L 5,130 Z" fill="#c21a1a" />
                                        <path d="M 5,100 L 255,100 M 5,160 L 255,160" stroke="white" strokeWidth="2" fill="none" />
                                        <g transform="translate(130, 143) scale(0.9, 1.25)">
                                            <text x="0" y="0" fontFamily="Impact, 'Arial Black', sans-serif" fontSize="40" fontWeight="bold" fill="white" textAnchor="middle">COMPLETE</text>
                                        </g>
                                    </g>
                                </g>
                            </svg>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Past Schedule Cards */}
                <AnimatePresence initial={false}>
                    {showPast && pastSchedule.map((item) => (
                        <motion.div
                            key={item.id}
                            {...PAST_ITEM_MOTION}
                            className="relative pl-6 grayscale"
                        >
                            <div className="py-1">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[4.5px] top-4 w-2 h-2 rounded-full border border-background bg-gray-400"></div>

                                {/* Time */}
                                <div className="font-mono text-[10px] font-bold flex items-center gap-2 mb-1 text-gray-500">
                                    <span>{item.time}</span>
                                </div>

                                {/* Card */}
                                <div className={`bg-gray-50 border border-gray-200/50 p-4.5 rounded-2xl shadow-sm relative group transition-all duration-300 hover:grayscale-0 hover:bg-white hover:shadow-md ${item.contactPhone ? 'min-h-[100px]' : ''}`}>
                                    {editingId === item.id ? (
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="space-y-3 mt-1"
                                        >
                                            <div className="flex items-center gap-2 border-b border-gray-200 pb-1.5">
                                                <span className="text-[10px] font-black w-12 text-gray-500 uppercase tracking-wider shrink-0">일정명</span>
                                                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full font-sans font-black text-[15px] outline-none bg-transparent text-gray-800" placeholder="일정명" />
                                            </div>
                                            <div className="flex flex-col gap-2.5">
                                                <div className="flex flex-col gap-2 border-b border-gray-200 pb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black w-12 text-gray-500 uppercase tracking-wider shrink-0">담당자</span>
                                                        <select
                                                            value={isCustomAgentEdit ? '직접입력' : editForm.agent}
                                                            onChange={(e) => {
                                                                if (e.target.value === '직접입력') {
                                                                    setIsCustomAgentEdit(true);
                                                                    setEditForm({ ...editForm, agent: '' });
                                                                } else {
                                                                    setIsCustomAgentEdit(false);
                                                                    setEditForm({ ...editForm, agent: e.target.value });
                                                                }
                                                            }}
                                                            className="w-full text-[13px] font-semibold outline-none bg-transparent cursor-pointer text-gray-800"
                                                        >
                                                            {presetAgents.map(agent => <option key={agent} value={agent}>{agent}</option>)}
                                                            <option value="직접입력">직접입력...</option>
                                                        </select>
                                                    </div>
                                                    {isCustomAgentEdit && (
                                                        <div className="flex items-center gap-2 pl-14">
                                                            <input
                                                                type="text"
                                                                value={editForm.agent}
                                                                onChange={(e) => setEditForm({ ...editForm, agent: e.target.value })}
                                                                placeholder="추가 담당자 입력"
                                                                className="w-full font-bold outline-none bg-transparent border-b border-gray-200 text-rose-500 text-[13px]"
                                                                autoFocus
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 border-b border-gray-200 pb-1.5">
                                                    <span className="text-[10px] font-black w-12 text-gray-500 uppercase tracking-wider shrink-0">시간</span>
                                                    <input type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent text-gray-800" />
                                                </div>
                                                <div className="flex items-center gap-2 border-b border-gray-200 pb-1.5">
                                                    <span className="text-[10px] font-black w-12 text-gray-500 uppercase tracking-wider shrink-0">장소</span>
                                                    <input type="text" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent text-gray-800" placeholder="장소" />
                                                </div>
                                                <div className="flex items-center gap-2 border-b border-gray-200 pb-1.5">
                                                    <span className="text-[10px] font-black w-12 text-gray-500 uppercase tracking-wider shrink-0">이름</span>
                                                    <input type="text" value={editForm.contactName || ''} onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent text-gray-800" placeholder="예) 학원 선생님" />
                                                </div>
                                                <div className="flex items-center gap-2 border-b border-gray-200 pb-1.5">
                                                    <span className="text-[10px] font-black w-12 text-gray-500 uppercase tracking-wider shrink-0">전화번호</span>
                                                    <input type="text" value={editForm.contactPhone || ''} onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent text-gray-800" placeholder="010-0000-0000" />
                                                </div>
                                            </div>
                                            <button onClick={saveEdit} className="bg-gray-500 text-white font-bold text-[13px] px-3 py-2.5 mt-2 rounded-xl w-full flex items-center justify-center gap-1 hover:bg-gray-600 transition-colors cursor-pointer">
                                                <Save size={13} /> 저장 완료
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start w-full gap-2">
                                                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                                    <h3 className="font-sans font-black text-[15px] text-gray-600 truncate">{item.title}</h3>
                                                    {item.location && (
                                                        <p className="text-[13px] text-gray-400 flex items-center gap-1 truncate w-full font-semibold">
                                                            <MapPin size={12} className="shrink-0" /> <span className="truncate">{item.location}</span>
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0 relative z-10">
                                                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 w-fit shrink-0">
                                                        {getAgentIcon(item.agent)}
                                                        <span className="text-[9px] font-bold text-gray-500 whitespace-nowrap">{item.agent}</span>
                                                    </div>
                                                    <div className="flex bg-navy/5 rounded-full overflow-hidden border border-navy/5 p-0.5 shadow-inner">
                                                        <button onClick={() => startEdit(item)} className="text-navy/40 hover:text-navy hover:bg-white rounded-full transition-all w-6 h-6 flex items-center justify-center bg-transparent cursor-pointer">
                                                            <Edit2 size={11} />
                                                        </button>
                                                        <button onClick={() => handleDelete(item.id)} className="text-navy/40 hover:text-rose-500 hover:bg-white rounded-full transition-all w-6 h-6 flex items-center justify-center bg-transparent cursor-pointer">
                                                            <Trash2 size={11} />
                                                        </button>
                                                        {item.contactPhone && (
                                                            <button onClick={() => setActiveContactPopup(activeContactPopup === item.id ? null : item.id)} className="text-navy/60 hover:text-blue-600 hover:bg-white rounded-full transition-all w-6 h-6 flex items-center justify-center bg-transparent cursor-pointer">
                                                                <Phone size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <AnimatePresence>
                                                {activeContactPopup === item.id && item.contactPhone && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setActiveContactPopup(null)} />
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9, x: 20 }}
                                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                                            exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                                            className="absolute top-10 right-2 bg-white/95 backdrop-blur-md border border-navy/5 rounded-xl p-2.5 shadow-xl z-50 min-w-[140px]"
                                                        >
                                                            <div className="text-[10px] font-black text-navy/40 uppercase tracking-wider border-b border-navy/5 pb-1 mb-1">{item.contactName || '연락처'}</div>
                                                            <a href={`tel:${item.contactPhone}`} className="text-[13px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                                                <Phone size={11} /> {item.contactPhone}
                                                            </a>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Active and Future Schedule Cards */}
                <AnimatePresence initial={false} mode="popLayout">
                    {activeAndFutureSchedule.map((item, index) => {
                        const originalIndex = activeIndex + index;
                        const itemStartValue = getTimeValue(item.time);
                        const nextItem = schedule[originalIndex + 1];
                        const itemEndValue = nextItem ? getTimeValue(nextItem.time) : itemStartValue + 10;
                        const isCurrentActive = isCurrentDay && index === 0 && currentTimeValue >= itemStartValue && currentTimeValue < itemEndValue;

                        return (
                            <motion.div
                                key={item.id}
                                {...TAB_LIKE_MOTION}
                                className="relative pl-6"
                            >
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[4.5px] top-2 w-2 h-2 rounded-full border border-background transition-all duration-300 ${
                                    isCurrentActive
                                        ? 'bg-emerald-500 ring-4 ring-emerald-500/30 z-10'
                                        : item.isUrgent
                                            ? 'bg-rose-500 ring-4 ring-rose-500/30'
                                            : 'bg-navy/70'
                                }`}></div>

                                {/* Time */}
                                <div className="font-mono text-[10px] font-bold flex items-center gap-2 mb-1">
                                    <span className="text-navy">
                                        {item.time}
                                    </span>
                                    {isCurrentActive && (
                                        <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase animate-pulse">
                                            CURRENT
                                        </span>
                                    )}
                                </div>

                                {/* Card */}
                                <div className={`bg-white border p-4.5 rounded-2xl shadow-sm relative group transition-all duration-300 hover:shadow-md hover:border-navy/10 ${
                                    item.contactPhone ? 'min-h-[100px]' : ''
                                } ${
                                    isCurrentActive
                                        ? 'border-emerald-500/30 shadow-emerald-500/5 ring-4 ring-emerald-500/10'
                                        : 'border-navy/5'
                                }`}>
                                    {editingId === item.id ? (
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="space-y-3 mt-1"
                                        >
                                            <div className="flex items-center gap-2 border-b border-navy/10 pb-1.5">
                                                <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">일정명</span>
                                                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full font-sans font-black text-[15px] outline-none bg-transparent" placeholder="일정명" />
                                            </div>
                                            <div className="flex flex-col gap-2.5">
                                                <div className="flex flex-col gap-2 border-b border-navy/10 pb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">담당자</span>
                                                        <select
                                                            value={isCustomAgentEdit ? '직접입력' : editForm.agent}
                                                            onChange={(e) => {
                                                                if (e.target.value === '직접입력') {
                                                                    setIsCustomAgentEdit(true);
                                                                    setEditForm({ ...editForm, agent: '' });
                                                                } else {
                                                                    setIsCustomAgentEdit(false);
                                                                    setEditForm({ ...editForm, agent: e.target.value });
                                                                }
                                                            }}
                                                            className="w-full text-[13px] font-semibold outline-none bg-transparent cursor-pointer text-navy"
                                                        >
                                                            {presetAgents.map(agent => <option key={agent} value={agent}>{agent}</option>)}
                                                            <option value="직접입력">직접입력...</option>
                                                        </select>
                                                    </div>
                                                    {isCustomAgentEdit && (
                                                        <div className="flex items-center gap-2 pl-14">
                                                            <input
                                                                type="text"
                                                                value={editForm.agent}
                                                                onChange={(e) => setEditForm({ ...editForm, agent: e.target.value })}
                                                                placeholder="추가 담당자 입력"
                                                                className="w-full font-bold outline-none bg-transparent border-b border-navy/10 text-rose-500 text-[13px]"
                                                                autoFocus
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 border-b border-navy/10 pb-1.5">
                                                    <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">시간</span>
                                                    <input type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent text-navy" />
                                                </div>
                                                <div className="flex items-center gap-2 border-b border-navy/10 pb-1.5">
                                                    <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">장소</span>
                                                    <input type="text" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent text-navy" placeholder="장소" />
                                                </div>
                                                <div className="flex items-center gap-2 border-b border-navy/10 pb-1.5">
                                                    <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">이름</span>
                                                    <input type="text" value={editForm.contactName || ''} onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent text-navy" placeholder="예) 학원 선생님" />
                                                </div>
                                                <div className="flex items-center gap-2 border-b border-navy/10 pb-1.5">
                                                    <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">전화번호</span>
                                                    <input type="text" value={editForm.contactPhone || ''} onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent text-navy" placeholder="010-0000-0000" />
                                                </div>
                                            </div>
                                            <button onClick={saveEdit} className="bg-navy text-white font-bold text-[13px] px-3 py-2.5 mt-2 rounded-xl w-full flex items-center justify-center gap-1 border border-navy hover:bg-white hover:text-navy transition-colors cursor-pointer">
                                                <Save size={13} /> 저장 완료
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start w-full gap-2">
                                                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                                    <h3 className="font-sans font-black text-[15px] text-navy truncate">{item.title}</h3>
                                                    {item.location && (
                                                        <p className="text-[13px] text-navy/60 flex items-center gap-1 truncate w-full font-semibold">
                                                            <MapPin size={12} className="shrink-0" /> <span className="truncate">{item.location}</span>
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0 relative z-10">
                                                    <div className="flex items-center gap-1 bg-navy/5 px-2.5 py-0.5 rounded-full border border-navy/5 w-fit shrink-0">
                                                        {getAgentIcon(item.agent)}
                                                        <span className="text-[9px] font-bold text-navy whitespace-nowrap">{item.agent}</span>
                                                    </div>
                                                    <div className="flex bg-navy/5 rounded-full overflow-hidden border border-navy/5 p-0.5 shadow-inner">
                                                        <button onClick={() => startEdit(item)} className="text-navy/40 hover:text-navy hover:bg-white rounded-full transition-all w-6 h-6 flex items-center justify-center bg-transparent cursor-pointer">
                                                            <Edit2 size={11} />
                                                        </button>
                                                        <button onClick={() => handleDelete(item.id)} className="text-navy/40 hover:text-rose-500 hover:bg-white rounded-full transition-all w-6 h-6 flex items-center justify-center bg-transparent cursor-pointer">
                                                            <Trash2 size={11} />
                                                        </button>
                                                        {item.contactPhone && (
                                                            <button onClick={() => setActiveContactPopup(activeContactPopup === item.id ? null : item.id)} className="text-navy/60 hover:text-blue-600 hover:bg-white rounded-full transition-all w-6 h-6 flex items-center justify-center bg-transparent cursor-pointer">
                                                                <Phone size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <AnimatePresence>
                                                {activeContactPopup === item.id && item.contactPhone && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setActiveContactPopup(null)} />
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9, x: 20 }}
                                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                                            exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                                            className="absolute top-10 right-2 bg-white/95 backdrop-blur-md border border-navy/5 rounded-xl p-2.5 shadow-xl z-50 min-w-[140px]"
                                                        >
                                                            <div className="text-[10px] font-black text-navy/40 uppercase tracking-wider border-b border-navy/5 pb-1 mb-1">{item.contactName || '연락처'}</div>
                                                            <a href={`tel:${item.contactPhone}`} className="text-[13px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                                                <Phone size={11} /> {item.contactPhone}
                                                            </a>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Add Schedule Form - outside timeline to avoid extending the left border line */}
            <div className="ml-4 pb-20">
                <AnimatePresence>
                    {showAddForm && (
                        <motion.div
                            {...TAB_LIKE_MOTION}
                            className={`relative pl-6 overflow-hidden ${isAllCompleted ? 'mt-0' : 'mt-4'}`}
                        >
                            <div className="bg-white border border-dashed border-navy/20 p-4.5 rounded-2xl shadow-sm space-y-4">
                                <div className="space-y-3.5">
                                    <div className="flex items-center gap-2 border-b border-navy/10 pb-1.5">
                                        <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">일정명</span>
                                        <input type="text" value={newSchedule.title} onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })} className="w-full font-sans font-black text-[15px] outline-none bg-transparent" placeholder="예) 피아노 학원" />
                                    </div>
                                    <div className="flex items-center gap-2 border-b border-navy/10 pb-1.5">
                                        <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">시간</span>
                                        <input type="time" value={newSchedule.time} onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent" />
                                    </div>
                                    <div className="flex flex-col gap-2 border-b border-navy/10 pb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">담당자</span>
                                            <select
                                                value={isCustomAgentAdd ? '직접입력' : newSchedule.agent}
                                                onChange={(e) => {
                                                    if (e.target.value === '직접입력') {
                                                        setIsCustomAgentAdd(true);
                                                        setNewSchedule({ ...newSchedule, agent: '' });
                                                    } else {
                                                        setIsCustomAgentAdd(false);
                                                        setNewSchedule({ ...newSchedule, agent: e.target.value });
                                                    }
                                                }}
                                                className="w-full text-[13px] font-semibold outline-none bg-transparent cursor-pointer text-navy"
                                            >
                                                {presetAgents.map(agent => <option key={agent} value={agent}>{agent}</option>)}
                                                <option value="직접입력">직접입력...</option>
                                            </select>
                                        </div>
                                        {isCustomAgentAdd && (
                                            <div className="flex items-center gap-2 pl-14">
                                                <input
                                                    type="text"
                                                    value={newSchedule.agent}
                                                    onChange={(e) => setNewSchedule({ ...newSchedule, agent: e.target.value })}
                                                    placeholder="추가 담당자 입력"
                                                    className="w-full font-bold outline-none bg-transparent border-b border-navy/10 text-rose-500 text-[13px]"
                                                    autoFocus
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 border-b border-navy/10 pb-1.5">
                                        <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">장소</span>
                                        <input type="text" value={newSchedule.location} onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent" placeholder="장소 입력 (선택)" />
                                    </div>
                                    <div className="flex items-center gap-2 border-b border-navy/10 pb-1.5">
                                        <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">이름</span>
                                        <input type="text" value={newSchedule.contactName || ''} onChange={(e) => setNewSchedule({ ...newSchedule, contactName: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent" placeholder="예) 학원 원장님 (선택)" />
                                    </div>
                                    <div className="flex items-center gap-2 border-b border-navy/10 pb-1.5">
                                        <span className="text-[10px] font-black w-12 text-navy/40 uppercase tracking-wider shrink-0">전화번호</span>
                                        <input type="text" value={newSchedule.contactPhone || ''} onChange={(e) => setNewSchedule({ ...newSchedule, contactPhone: e.target.value })} className="w-full text-[13px] font-semibold outline-none bg-transparent" placeholder="010-0000-0000 (선택)" />
                                    </div>
                                </div>
                                <div className="flex gap-2.5 pt-2">
                                    <button onClick={() => { setShowAddForm(false); setIsCustomAgentAdd(false); }} className="flex-1 bg-navy/5 text-navy/60 font-bold text-[13px] py-2.5 rounded-xl border border-navy/5 hover:bg-navy/10 transition-colors cursor-pointer">
                                        취소
                                    </button>
                                    <button onClick={handleAddSchedule} className="flex-1 bg-navy text-white font-bold text-[13px] py-2.5 rounded-xl flex items-center justify-center gap-1 border border-navy hover:bg-navy/95 transition-all shadow-md shadow-navy/5 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">
                                        <Save size={13} /> 작성 완료
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!showAddForm && (
                    <div className={`relative pl-6 ${isAllCompleted ? 'mt-0' : 'mt-3'}`}>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full bg-transparent border border-dashed border-navy/35 text-navy/70 font-black text-[13px] py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-navy hover:text-white hover:border-navy transition-all hover:-translate-y-0.5 cursor-pointer shadow-sm"
                        >
                            <span data-tour="add-schedule" className="inline-flex items-center justify-center gap-2">
                                <Plus size={14} /> 새 일정 추가
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Floating Action Button for Emergency */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="hidden fixed bottom-20 right-4 bg-rose-500 text-white p-4 rounded-full shadow-xl border-2 border-white flex items-center justify-center animate-bounce z-40"
            >
                <ShieldAlert size={24} />
            </motion.button>
        </div>
    );
}
