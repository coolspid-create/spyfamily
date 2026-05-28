import React, { useMemo, useState } from 'react';
import { CalendarDays, Plus, Save, Trash2, Edit2, ChevronLeft, ChevronRight, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

const TAB_LIKE_TRANSITION = { duration: 0.15 };
const TAB_LIKE_MOTION = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: TAB_LIKE_TRANSITION,
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const createMissionId = (mission, missionsData) => {
    const titleSlug = mission.title.trim().replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '') || 'new';
    const baseId = [
        'mission',
        mission.type,
        mission.year || 'monthly',
        mission.month || 'every',
        mission.day || 'day',
        titleSlug,
    ].join('-');

    let candidate = baseId;
    let suffix = 2;

    while (missionsData.some(item => item.id === candidate)) {
        candidate = `${baseId}-${suffix}`;
        suffix += 1;
    }

    return candidate;
};

export default function RouteMapTab() {
    // Zustand
    const missionsData = useStore(state => state.missionsData);
    const addMission = useStore(state => state.addMission);
    const updateMission = useStore(state => state.updateMission);
    const removeMission = useStore(state => state.removeMission);

    const [manageMissionForm, setManageMissionForm] = useState({ id: '', type: 'fund', day: 1, title: '' });
    const [editingMissionId, setEditingMissionId] = useState(null);
    const [currentDate, setCurrentDate] = useState(() => new Date());

    const [isFundsExpanded, setIsFundsExpanded] = useState(false);
    const [isEventsExpanded, setIsEventsExpanded] = useState(false);

    const fundMissions = useMemo(() => missionsData.filter(m => m.type === 'fund'), [missionsData]);
    const eventMissions = useMemo(() => missionsData.filter(m => m.type === 'event'), [missionsData]);
    const todayMarker = useMemo(() => {
        const today = new Date();
        return {
            day: today.getDate(),
            month: today.getMonth(),
            year: today.getFullYear(),
        };
    }, []);

    const openManageMissionForm = (mission = null) => {
        if (mission) {
            setManageMissionForm(mission);
            setEditingMissionId(mission.id);
        } else {
            setManageMissionForm({
                id: 'draft-mission',
                type: 'fund',
                day: 1,
                year: currentDate.getFullYear(),
                month: currentDate.getMonth() + 1,
                title: '',
            });
            setEditingMissionId('draft-mission');
        }
    };

    const saveManageMissionData = () => {
        if (!manageMissionForm.title.trim()) return;
        const exists = missionsData.find(m => m.id === manageMissionForm.id);
        if (exists) {
            updateMission(manageMissionForm);
        } else {
            addMission({
                ...manageMissionForm,
                id: createMissionId(manageMissionForm, missionsData),
            });
        }
        setEditingMissionId(null);
    };

    const calendarCells = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const daysInMonth = getDaysInMonth(year, month);
        const firstDayIdx = getFirstDayOfMonth(year, month);
        const prevMonthDays = getDaysInMonth(year, month - 1);
        const missionsByDay = new Map();

        missionsData.forEach(mission => {
            const matchesFund = mission.type === 'fund';
            const matchesEvent = mission.type === 'event' && mission.month === (month + 1) && mission.year === year;

            if (!matchesFund && !matchesEvent) {
                return;
            }

            const dayMissions = missionsByDay.get(mission.day) || [];
            dayMissions.push(mission);
            missionsByDay.set(mission.day, dayMissions);
        });

        const cells = [];

        // Prev month padding
        for (let i = 0; i < firstDayIdx; i++) {
            cells.push({ type: 'prev', day: prevMonthDays - firstDayIdx + i + 1, currentMonthDay: null, missions: [] });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push({ type: 'current', day: i, currentMonthDay: i, missions: missionsByDay.get(i) || [] });
        }

        // Next month padding
        const remaining = (7 - (cells.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            cells.push({ type: 'next', day: i, currentMonthDay: null, missions: [] });
        }

        return cells;
    }, [currentDate, missionsData]);

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const scrollToDay = (day, year, month) => {
        const wasCollapsed = !isFundsExpanded || !isEventsExpanded;
        setIsFundsExpanded(true);
        setIsEventsExpanded(true);

        const doScroll = () => {
            // Collect matching elements: fund missions match by day, event missions match by full date
            const fundElements = document.querySelectorAll(`[data-day="${day}"][data-type="fund"]`);
            const eventElements = document.querySelectorAll(`[data-day="${day}"][data-year="${year}"][data-month="${month}"]`);
            const allElements = [...fundElements, ...eventElements];
            if (allElements.length > 0) {
                allElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                allElements.forEach(element => {
                    const card = element.querySelector('.bg-white') || element;
                    card.classList.add('ring-4', 'ring-accent-red', 'transition-all');
                    setTimeout(() => card.classList.remove('ring-4', 'ring-accent-red'), 2000);
                });
            }
        };

        if (wasCollapsed) {
            setTimeout(doScroll, 220);
        } else {
            setTimeout(doScroll, 60);
        }
    };

    const renderManageForm = () => {
        return (
            <motion.div key="manage-form" {...TAB_LIKE_MOTION} className="bg-amber-50 border-2 border-navy p-4 rounded shadow-md overflow-hidden mt-2">
                <h3 className="font-stencil text-navy mb-3 border-b-2 border-navy pb-1">일정 정보 수정</h3>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold opacity-70 block">종류</label>
                            <select value={manageMissionForm.type} onChange={e => {
                                const today = new Date();
                                setManageMissionForm({
                                    ...manageMissionForm,
                                    type: e.target.value,
                                    year: manageMissionForm.year || today.getFullYear(),
                                    month: manageMissionForm.month || (today.getMonth() + 1)
                                });
                            }} className="w-full border-2 border-navy rounded p-2 font-bold cursor-pointer bg-white outline-none">
                                <option value="fund">결제관리</option>
                                <option value="event">가족일정</option>
                            </select>
                        </div>
                        {manageMissionForm.type === 'fund' ? (
                            <div>
                                <label className="text-xs font-bold opacity-70 block">매월 결제일 (1~31)</label>
                                <input type="number" min="1" max="31" value={manageMissionForm.day || ''} onChange={e => setManageMissionForm({ ...manageMissionForm, day: Number(e.target.value) })} className="w-full border-2 border-navy rounded p-2 font-mono font-bold bg-white outline-none" />
                            </div>
                        ) : (
                            <div>
                                <label className="text-xs font-bold opacity-70 block">날짜</label>
                                <input type="date" value={manageMissionForm.year && manageMissionForm.month ? `${manageMissionForm.year}-${String(manageMissionForm.month).padStart(2, '0')}-${String(manageMissionForm.day).padStart(2, '0')}` : ''} onChange={e => {
                                    if (e.target.value) {
                                        const [y, m, d] = e.target.value.split('-');
                                        setManageMissionForm({ ...manageMissionForm, year: Number(y), month: Number(m), day: Number(d) });
                                    }
                                }} className="w-full border-2 border-navy rounded p-2 font-mono font-bold bg-white outline-none" />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-70 block">일정명</label>
                        <input type="text" value={manageMissionForm.title} onChange={e => setManageMissionForm({ ...manageMissionForm, title: e.target.value })} className="w-full border-2 border-navy rounded p-2 font-bold bg-white outline-none" placeholder="ex. 아파트 관리비 결제" />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={saveManageMissionData} className="flex-1 bg-navy text-white font-bold py-2 rounded flex justify-center items-center gap-1 border-2 border-navy hover:bg-white hover:text-navy transition-colors">
                            <Save size={16} /> 저장하기
                        </button>
                        <button onClick={() => setEditingMissionId(null)} className="flex-1 bg-gray-200 text-navy font-bold py-2 rounded border-2 border-gray-400 hover:bg-white transition-colors">
                            취소
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="space-y-6 w-full max-w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b-2 border-navy pb-2">
                <CalendarDays size={24} className="text-navy" />
                <h2 className="font-stencil text-xl flex-1 text-navy">월간 일정표</h2>
            </div>

            {/* Mini Calendar View */}
            <div className="bg-white border-2 border-navy rounded p-4 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={prevMonth} className="p-1 hover:bg-navy/10 rounded transition-colors"><ChevronLeft size={20} /></button>
                    <h3 className="font-stencil text-lg text-navy tracking-widest">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h3>
                    <button onClick={nextMonth} className="p-1 hover:bg-navy/10 rounded transition-colors"><ChevronRight size={20} /></button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs mb-2 text-navy/60 border-b-2 border-navy/20 pb-2">
                    <div className="text-accent-red">SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div className="text-blue-600">SAT</div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center font-mono">
                    {calendarCells.map((cell, idx) => {
                        const isToday = cell.type === 'current' &&
                            cell.day === todayMarker.day &&
                            currentDate.getMonth() === todayMarker.month &&
                            currentDate.getFullYear() === todayMarker.year;

                        if (cell.type !== 'current') {
                            return <div key={`padding-${idx}`} className="p-2 opacity-30 text-xs mt-1">{cell.day}</div>;
                        }

                        return (
                            <div
                                key={`day-${cell.day}`}
                                onClick={() => cell.missions.length > 0 && scrollToDay(cell.day, currentDate.getFullYear(), currentDate.getMonth() + 1)}
                                className={`relative p-2 border border-navy/10 rounded-sm transition-colors ${isToday ? 'bg-navy/10 border-navy/50 shadow-inner' : ''} ${cell.missions.length > 0 ? 'cursor-pointer hover:bg-navy/10 active:bg-navy/20' : ''}`}
                            >
                                <span className={`text-sm font-bold ${isToday ? 'text-accent-red font-black underline decoration-2 underline-offset-2' : 'text-navy'}`}>{cell.day}</span>
                                <div className="flex justify-center gap-1 mt-1 flex-wrap h-3 overflow-hidden">
                                    {cell.missions.map(m => (
                                        <div key={m.id} className={`w-2 h-2 rounded-full ${m.type === 'fund' ? 'bg-accent-red' : 'bg-accent-green'}`} title={m.title}></div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex gap-4 mt-6 justify-center text-xs font-bold text-navy/70 border-t border-navy/10 pt-3">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-accent-red border-2 border-white drop-shadow-sm"></div> 결제관리</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-accent-green border-2 border-white drop-shadow-sm"></div> 가족일정</div>
                </div>
            </div>

            {/* Calendar Data Manager */}
            <div className="bg-navy/5 p-4 rounded border-2 border-navy/20 space-y-4">
                <h3 className="font-stencil text-navy mb-1 flex items-center gap-2 border-b-2 border-navy/20 pb-2">
                    <Database size={20} className="text-navy" /> 데이터 관리
                </h3>
                {/* 
                // [NOTE] 결제미션 및 특수임무 탭과 데이터가 연동되므로 임시 가림 처리
                <button onClick={() => openManageMissionForm()} className="w-full bg-navy text-background font-bold text-sm py-3 rounded border-2 border-navy flex justify-center items-center gap-2 hover:bg-white hover:text-navy transition-colors">
                    <Plus size={16} /> 새로운 일정/결제일 추가
                </button>
                */}

                <AnimatePresence initial={false}>
                    {editingMissionId && !missionsData.find(m => m.id === editingMissionId) && renderManageForm()}
                </AnimatePresence>

                <div className="space-y-4 mt-4">
                    {/* Funds Accordion */}
                    <div className="bg-white border-2 border-navy/20 rounded-md shadow-sm overflow-hidden">
                        <div
                            onClick={() => setIsFundsExpanded(!isFundsExpanded)}
                            className="bg-navy/5 p-3 flex justify-between items-center border-b-2 border-navy/20 cursor-pointer hover:bg-navy/10 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-navy font-mono flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-accent-red border-2 border-white drop-shadow-sm"></div>
                                    결제관리 ({fundMissions.length})
                                </h4>
                                {isFundsExpanded ? <ChevronUp size={16} className="text-navy/50" /> : <ChevronDown size={16} className="text-navy/50" />}
                            </div>
                        </div>
                        <AnimatePresence initial={false}>
                            {isFundsExpanded && (
                                <motion.div
                                    {...TAB_LIKE_MOTION}
                                    className="overflow-hidden"
                                >
                                    <div className="p-2 space-y-2 pb-3 bg-navy/5">
                                        {fundMissions.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                data-day={item.day}
                                                data-type="fund"
                                                {...TAB_LIKE_MOTION}
                                            >
                                                <div className="bg-white border-2 border-navy rounded p-2.5 flex min-w-0 items-center gap-2 overflow-hidden group shadow-sm">
                                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                                        <span className="font-mono font-bold text-white px-2 py-1 rounded w-14 shrink-0 whitespace-nowrap text-center bg-accent-red">
                                                            {item.day}일
                                                        </span>
                                                        <h4 className="min-w-0 flex-1 truncate font-bold text-sm leading-tight">{item.title}</h4>
                                                    </div>
                                                    <div className="flex shrink-0 gap-1">
                                                        <button onClick={() => openManageMissionForm(item)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-navy transition-colors hover:bg-navy/10">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => removeMission(item.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-accent-red transition-colors hover:bg-accent-red/10">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <AnimatePresence initial={false}>
                                                    {editingMissionId === item.id && renderManageForm()}
                                                </AnimatePresence>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Events Accordion */}
                    <div className="bg-white border-2 border-navy/20 rounded-md shadow-sm overflow-hidden">
                        <div
                            onClick={() => setIsEventsExpanded(!isEventsExpanded)}
                            className="bg-navy/5 p-3 flex justify-between items-center border-b-2 border-navy/20 cursor-pointer hover:bg-navy/10 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-navy font-mono flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-accent-green border-2 border-white drop-shadow-sm"></div>
                                    가족일정 ({eventMissions.length})
                                </h4>
                                {isEventsExpanded ? <ChevronUp size={16} className="text-navy/50" /> : <ChevronDown size={16} className="text-navy/50" />}
                            </div>
                        </div>
                        <AnimatePresence initial={false}>
                            {isEventsExpanded && (
                                <motion.div
                                    {...TAB_LIKE_MOTION}
                                    className="overflow-hidden"
                                >
                                    <div className="p-2 space-y-2 pb-3 bg-navy/5">
                                        {eventMissions.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                data-day={item.day}
                                                data-year={item.year}
                                                data-month={item.month}
                                                {...TAB_LIKE_MOTION}
                                            >
                                                <div className="bg-white border-2 border-navy rounded p-2.5 flex min-w-0 items-center gap-2 overflow-hidden group shadow-sm">
                                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                                        <span className="font-mono font-bold text-white px-2 py-1 rounded w-14 shrink-0 whitespace-nowrap text-center bg-accent-green">
                                                            {item.month}/{item.day}
                                                        </span>
                                                        <h4 className="min-w-0 flex-1 truncate font-bold text-sm leading-tight">{item.title}</h4>
                                                    </div>
                                                    <div className="flex shrink-0 gap-1">
                                                        <button onClick={() => openManageMissionForm(item)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-navy transition-colors hover:bg-navy/10">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => removeMission(item.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-accent-red transition-colors hover:bg-accent-red/10">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <AnimatePresence initial={false}>
                                                    {editingMissionId === item.id && renderManageForm()}
                                                </AnimatePresence>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
