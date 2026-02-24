import React, { useState } from 'react';
import { CalendarDays, Plus, Save, Trash2, Edit2, ChevronLeft, ChevronRight, Database } from 'lucide-react';
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

    const openManageMissionForm = (mission = null) => {
        if (mission) {
            setManageMissionForm(mission);
            setEditingMissionId(mission.id);
        } else {
            const newId = Date.now().toString();
            setManageMissionForm({ id: newId, type: 'fund', day: 1, title: '' });
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
            const hasMissions = missionsData.filter(m => m.day === i);
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
        const element = document.getElementById(`mission-day-${day}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a brief highlight effect
            element.classList.add('ring-4', 'ring-navy/20');
            setTimeout(() => element.classList.remove('ring-4', 'ring-navy/20'), 1000);
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
                <h3 className="font-stencil text-navy mb-3 border-b-2 border-navy pb-1">EDIT MISSION DATA</h3>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold opacity-70 block">Type</label>
                            <select value={manageMissionForm.type} onChange={e => setManageMissionForm({ ...manageMissionForm, type: e.target.value })} className="w-full border-2 border-navy rounded p-2 font-bold cursor-pointer bg-white outline-none">
                                <option value="fund">결제미션</option>
                                <option value="event">특수임무</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold opacity-70 block">Day (1~31)</label>
                            <input type="number" min="1" max="31" value={manageMissionForm.day} onChange={e => setManageMissionForm({ ...manageMissionForm, day: Number(e.target.value) })} className="w-full border-2 border-navy rounded p-2 font-mono font-bold bg-white outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-70 block">Mission Title</label>
                        <input type="text" value={manageMissionForm.title} onChange={e => setManageMissionForm({ ...manageMissionForm, title: e.target.value })} className="w-full border-2 border-navy rounded p-2 font-bold bg-white outline-none" placeholder="ex. 피아노 학원비 결제" />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={saveManageMissionData} className="flex-1 bg-navy text-white font-bold py-2 rounded flex justify-center items-center gap-1 border-2 border-navy hover:bg-white hover:text-navy transition-colors">
                            <Save size={16} /> SAVE
                        </button>
                        <button onClick={() => setEditingMissionId(null)} className="flex-1 bg-gray-200 text-navy font-bold py-2 rounded border-2 border-gray-400 hover:bg-white transition-colors">
                            CANCEL
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
                <h2 className="font-stencil text-xl flex-1 text-navy">OPS & FUNDS PLANNER</h2>
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
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-accent-red border-2 border-white drop-shadow-sm"></div> 결제미션</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-accent-green border-2 border-white drop-shadow-sm"></div> 특수임무</div>
                </div>
            </div>

            {/* Calendar Data Manager */}
            <div className="bg-navy/5 p-4 rounded border-2 border-navy/20 space-y-4">
                <h3 className="font-stencil text-navy mb-1 flex items-center gap-2 border-b-2 border-navy/20 pb-2">
                    <Database size={20} className="text-navy" /> DATA MANAGER
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

                <div className="space-y-2 mt-4">
                    <AnimatePresence>
                        {missionsData.map((item, idx) => (
                            <motion.div
                                layout
                                key={item.id}
                                id={`mission-day-${item.day}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <div className="bg-white border-2 border-navy rounded p-3 flex justify-between items-center group shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-mono font-bold text-white px-2 py-1 rounded w-10 text-center ${item.type === 'fund' ? 'bg-accent-red' : 'bg-accent-green'}`}>
                                            {item.day}일
                                        </span>
                                        <div>
                                            <h4 className="font-bold text-sm">{item.title}</h4>
                                            <p className="text-xs opacity-70">{item.type === 'fund' ? '결제 미션' : '특수 임무'}</p>
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
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
