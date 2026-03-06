import React, { useState } from 'react';
import { CalendarDays, Plus, Save, Trash2, Edit2, ChevronLeft, ChevronRight, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function RouteMapTab() {
    // Zustand
    const missionsData = useStore(state => state.missionsData);
    const addMission = useStore(state => state.addMission);
    const updateMission = useStore(state => state.updateMission);
    const removeMission = useStore(state => state.removeMission);

    const [manageMissionForm, setManageMissionForm] = useState({ id: '', type: 'fund', day: 1, title: '' });
    const [editingMissionId, setEditingMissionId] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [isFundsExpanded, setIsFundsExpanded] = useState(false);
    const [isEventsExpanded, setIsEventsExpanded] = useState(false);

    const fundMissions = missionsData.filter(m => m.type === 'fund');
    const eventMissions = missionsData.filter(m => m.type === 'event');

    const openManageMissionForm = (mission = null) => {
        if (mission) {
            setManageMissionForm(mission);
            setEditingMissionId(mission.id);
        } else {
            const newId = Date.now().toString();
            const today = new Date();
            setManageMissionForm({ id: newId, type: 'fund', day: 1, year: today.getFullYear(), month: today.getMonth() + 1, title: '' });
            setEditingMissionId(newId);
        }
    };

    const saveManageMissionData = () => {
        if (!manageMissionForm.title.trim()) return;
        const exists = missionsData.find(m => m.id === manageMissionForm.id);
        if (exists) {
            updateMission(manageMissionForm);
        } else {
            addMission(manageMissionForm);
        }
        setEditingMissionId(null);
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const generateCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const daysInMonth = getDaysInMonth(year, month);
        const firstDayIdx = getFirstDayOfMonth(year, month);
        const prevMonthDays = getDaysInMonth(year, month - 1);

        const cells = [];

        // Prev month padding
        for (let i = 0; i < firstDayIdx; i++) {
            cells.push({ type: 'prev', day: prevMonthDays - firstDayIdx + i + 1, currentMonthDay: null, missions: [] });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const hasMissions = missionsData.filter(m => {
                if (m.type === 'fund') return m.day === i;
                if (m.type === 'event') return m.day === i && m.month === (month + 1) && m.year === year;
                return false;
            });
            cells.push({ type: 'current', day: i, currentMonthDay: i, missions: hasMissions });
        }

        // Next month padding
        const remaining = (7 - (cells.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            cells.push({ type: 'next', day: i, currentMonthDay: null, missions: [] });
        }

        return cells;
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const scrollToDay = (day) => {
        const wasCollapsed = !isFundsExpanded || !isEventsExpanded;
        setIsFundsExpanded(true);
        setIsEventsExpanded(true);

        const doScroll = () => {
            // select elements using data-day instead of id to avoid html validation/query issues with duplicates
            const elements = document.querySelectorAll(`[data-day="${day}"]`);
            if (elements.length > 0) {
                elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                elements.forEach(element => {
                    const card = element.querySelector('.bg-white') || element;
                    card.classList.add('ring-4', 'ring-accent-red', 'transition-all');
                    setTimeout(() => card.classList.remove('ring-4', 'ring-accent-red'), 2000);
                });
            }
        };

        // If menus were folded, wait for framer-motion animation to complete (approx 300-400ms)
        if (wasCollapsed) {
            setTimeout(doScroll, 500);
        } else {
            // Wait slightly for any React re-renders to settle just in case
            setTimeout(doScroll, 50);
        }
    };

    const renderManageForm = () => {
        return (
            <motion.div
                key="manage-form"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-amber-50 border-2 border-navy p-4 rounded shadow-md overflow-hidden mt-2"
            >
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
                                <option value="event">가족행사</option>
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
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 pb-20"
        >
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
                    {generateCalendar().map((cell, idx) => {
                        const isToday = cell.type === 'current' &&
                            cell.day === new Date().getDate() &&
                            currentDate.getMonth() === new Date().getMonth() &&
                            currentDate.getFullYear() === new Date().getFullYear();

                        if (cell.type !== 'current') {
                            return <div key={`padding-${idx}`} className="p-2 opacity-30 text-xs mt-1">{cell.day}</div>;
                        }

                        return (
                            <div
                                key={`day-${cell.day}`}
                                onClick={() => cell.missions.length > 0 && scrollToDay(cell.day)}
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
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-accent-green border-2 border-white drop-shadow-sm"></div> 가족행사</div>
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

                <AnimatePresence>
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
                        <AnimatePresence>
                            {isFundsExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-2 space-y-2 pb-3 bg-navy/5">
                                        {fundMissions.map((item, idx) => (
                                            <motion.div
                                                layout
                                                key={item.id}
                                                data-day={item.day}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ delay: idx * 0.05 }}
                                            >
                                                <div className="bg-white border-2 border-navy rounded p-3 flex justify-between items-center group shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono font-bold text-white px-2 py-1 rounded min-w-[3rem] shrink-0 whitespace-nowrap text-center bg-accent-red">
                                                            {item.day}일
                                                        </span>
                                                        <div>
                                                            <h4 className="font-bold text-sm">{item.title}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => openManageMissionForm(item)} className="p-2 hover:bg-navy/10 rounded text-navy transition-colors">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => removeMission(item.id)} className="p-2 hover:bg-accent-red/10 rounded text-accent-red transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <AnimatePresence>
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
                                    가족행사 ({eventMissions.length})
                                </h4>
                                {isEventsExpanded ? <ChevronUp size={16} className="text-navy/50" /> : <ChevronDown size={16} className="text-navy/50" />}
                            </div>
                        </div>
                        <AnimatePresence>
                            {isEventsExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-2 space-y-2 pb-3 bg-navy/5">
                                        {eventMissions.map((item, idx) => (
                                            <motion.div
                                                layout
                                                key={item.id}
                                                data-day={item.day}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ delay: idx * 0.05 }}
                                            >
                                                <div className="bg-white border-2 border-navy rounded p-3 flex justify-between items-center group shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono font-bold text-white px-2 py-1 rounded min-w-[3rem] shrink-0 whitespace-nowrap text-center bg-accent-green">
                                                            {item.month}/{item.day}
                                                        </span>
                                                        <div>
                                                            <h4 className="font-bold text-sm">{item.title}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => openManageMissionForm(item)} className="p-2 hover:bg-navy/10 rounded text-navy transition-colors">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => removeMission(item.id)} className="p-2 hover:bg-accent-red/10 rounded text-accent-red transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <AnimatePresence>
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
        </motion.div>
    );
}
