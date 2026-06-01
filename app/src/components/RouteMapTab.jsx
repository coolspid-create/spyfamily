import React, { useMemo, useState } from 'react';
import { CalendarDays, Plus, Save, Trash2, Edit2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { NativeSafeDateInput, NativeSafeSelect } from './NativeSafeControls';

const TAB_LIKE_TRANSITION = { duration: 0.2, ease: "easeOut" };
const TAB_LIKE_MOTION = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: TAB_LIKE_TRANSITION,
};
const ACCORDION_MOTION = {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }
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
                    card.classList.add('ring-4', 'ring-rose-500', 'transition-all');
                    setTimeout(() => card.classList.remove('ring-4', 'ring-rose-500'), 2000);
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
            <motion.div key="manage-form" {...TAB_LIKE_MOTION} className="bg-white border border-navy/15 rounded-2xl p-4.5 shadow-lg shadow-navy/5 space-y-4 mt-2">
                <h3 className="font-sans font-black text-[13px] text-navy border-b border-navy/10 pb-2.5">일정 정보 수정</h3>
                <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">종류</label>
                            <NativeSafeSelect value={manageMissionForm.type} options={[
                                { value: 'fund', label: '결제관리' },
                                { value: 'event', label: '가족일정' },
                            ]} onChange={type => {
                                const today = new Date();
                                setManageMissionForm({
                                    ...manageMissionForm,
                                    type,
                                    year: manageMissionForm.year || today.getFullYear(),
                                    month: manageMissionForm.month || (today.getMonth() + 1)
                                });
                            }} buttonClassName="w-full border border-navy/15 rounded-xl p-2 text-[13px] font-semibold outline-none bg-white focus:border-navy focus:ring-2 focus:ring-navy/5 transition-all text-navy" />
                        </div>
                        {manageMissionForm.type === 'fund' ? (
                            <div>
                                <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">매월 결제일 (1~31)</label>
                                <input type="number" min="1" max="31" value={manageMissionForm.day || ''} onChange={e => setManageMissionForm({ ...manageMissionForm, day: Number(e.target.value) })} className="w-full border border-navy/15 rounded-xl p-2 text-[13px] font-semibold font-mono outline-none bg-white focus:border-navy focus:ring-2 focus:ring-navy/5 transition-all text-navy" />
                            </div>
                        ) : (
                            <div>
                                <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">날짜</label>
                                <NativeSafeDateInput value={manageMissionForm.year && manageMissionForm.month ? `${manageMissionForm.year}-${String(manageMissionForm.month).padStart(2, '0')}-${String(manageMissionForm.day).padStart(2, '0')}` : ''} onChange={dateValue => {
                                    if (dateValue) {
                                        const [y, m, d] = dateValue.split('-');
                                        setManageMissionForm({ ...manageMissionForm, year: Number(y), month: Number(m), day: Number(d) });
                                    }
                                }} compact pickerMode="popup" popupAlign="left" buttonClassName="w-full border border-navy/15 rounded-xl p-2 text-[13px] font-semibold font-mono outline-none bg-white focus:border-navy focus:ring-2 focus:ring-navy/5 transition-all text-navy" />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-navy/40 uppercase tracking-wider block mb-1">일정명</label>
                        <input type="text" value={manageMissionForm.title} onChange={e => setManageMissionForm({ ...manageMissionForm, title: e.target.value })} className="w-full border border-navy/15 rounded-xl p-2 text-[13px] font-semibold outline-none bg-white focus:border-navy focus:ring-2 focus:ring-navy/5 transition-all text-navy" placeholder="예: 아파트 관리비 결제" />
                    </div>
                    <div className="flex gap-2.5 pt-2">
                        <button onClick={saveManageMissionData} className="flex-1 bg-accent-blue text-white font-bold py-2.5 rounded-xl flex justify-center items-center gap-1 border border-accent-blue hover:bg-accent-blue/95 transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-[13px]">
                            <Save size={14} /> 저장하기
                        </button>
                        <button onClick={() => setEditingMissionId(null)} className="flex-1 bg-navy/5 text-navy/60 font-bold py-2.5 rounded-xl border border-navy/5 hover:bg-navy/10 transition-colors cursor-pointer text-[13px]">
                            취소
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="space-y-6 w-full max-w-full overflow-hidden">


            {/* Mini Calendar View */}
            <div className="bg-white border border-navy/5 rounded-2xl p-4.5 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-4.5">
                    <button
                        onClick={prevMonth}
                        aria-label="이전 달 보기"
                        title="이전 달 보기"
                        className="p-1.5 hover:bg-navy/5 rounded-full transition-all active:scale-90 cursor-pointer text-navy"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="font-sans font-black text-[15px] text-navy tracking-wider">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h3>
                    <button
                        onClick={nextMonth}
                        aria-label="다음 달 보기"
                        title="다음 달 보기"
                        className="p-1.5 hover:bg-navy/5 rounded-full transition-all active:scale-90 cursor-pointer text-navy"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-black text-[10px] mb-3 text-navy/40 border-b border-navy/5 pb-2">
                    <div className="text-rose-500">SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div className="text-blue-500">SAT</div>
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center font-mono">
                    {calendarCells.map((cell, idx) => {
                        const isToday = cell.type === 'current' &&
                            cell.day === todayMarker.day &&
                            currentDate.getMonth() === todayMarker.month &&
                            currentDate.getFullYear() === todayMarker.year;

                        if (cell.type !== 'current') {
                            return <div key={`padding-${idx}`} className="p-2 opacity-20 text-[10px] mt-1 text-navy">{cell.day}</div>;
                        }

                        return (
                            <div
                                key={`day-${cell.day}`}
                                onClick={() => cell.missions.length > 0 && scrollToDay(cell.day, currentDate.getFullYear(), currentDate.getMonth() + 1)}
                                className={`relative py-1.5 px-0.5 border border-navy/5 rounded-xl transition-all duration-200 ${
                                    isToday
                                        ? 'bg-navy/5 border-navy/20 shadow-inner'
                                        : 'bg-white'
                                } ${
                                    cell.missions.length > 0
                                        ? 'cursor-pointer hover:bg-navy/5 hover:scale-[1.05] active:scale-[0.95]'
                                        : ''
                                }`}
                            >
                                <span className={`text-[13px] font-black block ${
                                    isToday
                                        ? 'text-rose-500 font-black'
                                        : 'text-navy/80'
                                }`}>
                                    {cell.day}
                                </span>
                                <div className="flex justify-center gap-0.5 mt-1 flex-wrap h-2 overflow-hidden px-0.5">
                                    {cell.missions.map(m => (
                                        <div
                                            key={m.id}
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-sm ${
                                                m.type === 'fund'
                                                    ? 'bg-rose-500 shadow-rose-200'
                                                    : 'bg-emerald-500 shadow-emerald-200'
                                            }`}
                                            title={m.title}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex gap-4 mt-5 justify-center text-[10px] font-black text-navy/40 border-t border-navy/5 pt-3.5 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div> 결제관리</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div> 가족일정</div>
                </div>
            </div>

            {/* Calendar Data Manager */}
            <div className="bg-navy/5 p-4.5 rounded-2xl border border-navy/5 space-y-4">
                <AnimatePresence initial={false}>
                    {editingMissionId && !missionsData.find(m => m.id === editingMissionId) && renderManageForm()}
                </AnimatePresence>

                <div className="space-y-3.5 mt-2">
                    {/* Funds Accordion */}
                    <div className="bg-white border border-navy/5 rounded-2xl shadow-sm overflow-hidden">
                        <div
                            onClick={() => setIsFundsExpanded(!isFundsExpanded)}
                            className="bg-navy/5 p-3.5 flex justify-between items-center border-b border-navy/5 cursor-pointer hover:bg-navy/10 transition-colors"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
                                <h4 className="font-sans font-black text-[13px] text-navy flex items-center gap-2">
                                    결제관리 ({fundMissions.length})
                                </h4>
                            </div>
                            {isFundsExpanded ? <ChevronUp size={14} className="text-navy/45" /> : <ChevronDown size={14} className="text-navy/45" />}
                        </div>
                        <AnimatePresence initial={false}>
                            {isFundsExpanded && (
                                <motion.div
                                    {...ACCORDION_MOTION}
                                    className="overflow-hidden bg-navy/5"
                                >
                                    <div className="p-3.5 space-y-2.5 pb-4">
                                        {fundMissions.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                data-day={item.day}
                                                data-type="fund"
                                                {...TAB_LIKE_MOTION}
                                            >
                                                <div className="bg-white border border-navy/5 rounded-xl p-3.5 flex min-w-0 items-center justify-between gap-2 shadow-sm group">
                                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                                        <span className="font-mono font-bold text-white px-2 py-0.5 rounded-xl w-14 shrink-0 text-center bg-rose-500 text-[10px] tracking-tight">
                                                            {item.day}일
                                                        </span>
                                                        <h4 className="min-w-0 flex-1 truncate font-bold text-[13px] text-navy">{item.title}</h4>
                                                    </div>
                                                    <div className="flex shrink-0 gap-0.5 bg-navy/5 rounded-full p-0.5">
                                                        <button onClick={() => openManageMissionForm(item)} className="p-1 rounded-full text-navy/40 hover:text-navy hover:bg-white transition-all cursor-pointer" title="수정">
                                                            <Edit2 size={11} />
                                                        </button>
                                                        <button onClick={() => removeMission(item.id)} className="p-1 rounded-full text-navy/40 hover:text-rose-500 hover:bg-white transition-all cursor-pointer" title="삭제">
                                                            <Trash2 size={11} />
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
                    <div className="bg-white border border-navy/5 rounded-2xl shadow-sm overflow-hidden">
                        <div
                            onClick={() => setIsEventsExpanded(!isEventsExpanded)}
                            className="bg-navy/5 p-3.5 flex justify-between items-center border-b border-navy/5 cursor-pointer hover:bg-navy/10 transition-colors"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                                <h4 className="font-sans font-black text-[13px] text-navy flex items-center gap-2">
                                    가족일정 ({eventMissions.length})
                                </h4>
                            </div>
                            {isEventsExpanded ? <ChevronUp size={14} className="text-navy/45" /> : <ChevronDown size={14} className="text-navy/45" />}
                        </div>
                        <AnimatePresence initial={false}>
                            {isEventsExpanded && (
                                <motion.div
                                    {...ACCORDION_MOTION}
                                    className="overflow-hidden bg-navy/5"
                                >
                                    <div className="p-3.5 space-y-2.5 pb-4">
                                        {eventMissions.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                data-day={item.day}
                                                data-year={item.year}
                                                data-month={item.month}
                                                {...TAB_LIKE_MOTION}
                                            >
                                                <div className="bg-white border border-navy/5 rounded-xl p-3.5 flex min-w-0 items-center justify-between gap-2 shadow-sm group">
                                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                                        <span className="font-mono font-bold text-white px-2 py-0.5 rounded-xl w-14 shrink-0 text-center bg-emerald-500 text-[10px] tracking-tight">
                                                            {item.month}/{item.day}
                                                        </span>
                                                        <h4 className="min-w-0 flex-1 truncate font-bold text-[13px] text-navy">{item.title}</h4>
                                                    </div>
                                                    <div className="flex shrink-0 gap-0.5 bg-navy/5 rounded-full p-0.5">
                                                        <button onClick={() => openManageMissionForm(item)} className="p-1 rounded-full text-navy/40 hover:text-navy hover:bg-white transition-all cursor-pointer" title="수정">
                                                            <Edit2 size={11} />
                                                        </button>
                                                        <button onClick={() => removeMission(item.id)} className="p-1 rounded-full text-navy/40 hover:text-rose-500 hover:bg-white transition-all cursor-pointer" title="삭제">
                                                            <Trash2 size={11} />
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
