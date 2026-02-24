import React, { useState } from 'react';
import { User, Baby, Car, ShieldAlert, Clock, CheckSquare, Plus, Trash2, Edit2, Save, Bus, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

const getAgentIcon = (agent) => {
    if (agent.includes('엄마')) return <Baby className="w-5 h-5 text-accent-red" />;
    if (agent.includes('아빠')) return <User className="w-5 h-5 text-navy border-2 border-navy rounded-full" />;
    if (agent.includes('태권도')) return <Bus className="w-5 h-5 text-accent-green" />;
    return <User className="w-5 h-5" />;
};

export default function HomeBoard() {
    // Zustand Store
    const weeklyData = useStore(state => state.weeklyData);
    const addSchedule = useStore(state => state.addSchedule);
    const updateScheduleItem = useStore(state => state.updateScheduleItem);
    const removeScheduleItem = useStore(state => state.removeScheduleItem);
    const notices = useStore(state => state.notices);
    const addNotice = useStore(state => state.addNotice);
    const updateNotice = useStore(state => state.updateNotice);
    const removeNotice = useStore(state => state.removeNotice);

    // Local UI State
    const todayStr = ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()];
    const [selectedDay, setSelectedDay] = useState(todayStr === '일' ? '월' : todayStr);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [newNotice, setNewNotice] = useState('');
    const [showPast, setShowPast] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSchedule, setNewSchedule] = useState({ title: '', time: '09:00', agent: '자율', location: '' });

    const schedule = weeklyData[selectedDay] || [];

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const saveEdit = async () => {
        await updateScheduleItem(editForm);
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('일정을 삭제하시겠습니까?')) {
            await removeScheduleItem(id);
        }
    };

    const handleAddSchedule = async () => {
        if (!newSchedule.title.trim()) return;
        await addSchedule(selectedDay, newSchedule);
        setShowAddForm(false);
        setNewSchedule({ title: '', time: '09:00', agent: '자율', location: '' });
    };

    const handleAddNotice = () => {
        if (newNotice.trim()) {
            addNotice({ id: Date.now(), text: newNotice.trim(), checked: false });
            setNewNotice('');
        }
    };

    // Calculate Past vs Active/Future
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isCurrentDay = selectedDay === todayStr;

    let activeIndex = 0;
    let isAllCompleted = false;

    if (isCurrentDay && schedule.length > 0) {
        const lastItem = schedule[schedule.length - 1];
        const [lastHour, lastMin] = lastItem.time.split(':').map(Number);
        const lastTimeValue = lastHour * 60 + lastMin;
        const [currHour, currMin] = currentTimeStr.split(':').map(Number);
        const currTimeValue = currHour * 60 + currMin;

        // 마감 판정: 마지막 일정 시간으로부터 1시간(60분)이 지나면 당일 모든 일정 완료로 간주
        if (currTimeValue >= lastTimeValue + 60) {
            activeIndex = schedule.length;
            isAllCompleted = true;
        } else {
            for (let i = schedule.length - 1; i >= 0; i--) {
                if (schedule[i].time <= currentTimeStr) {
                    activeIndex = i;
                    break;
                }
            }
        }
    }

    const pastSchedule = schedule.slice(0, activeIndex);
    const activeAndFutureSchedule = schedule.slice(activeIndex);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Top Fixed Notice Checklist */}
            <div className="bg-white border-2 border-navy p-3 rounded-md shadow-sm">
                <h3 className="font-stencil text-lg border-b-2 border-navy mb-2 flex items-center gap-2">
                    <CheckSquare size={18} /> TOP SECRET NOTICES
                </h3>
                <ul className="space-y-2 text-sm font-bold opacity-80 mb-3">
                    <AnimatePresence>
                        {notices.map(notice => (
                            <motion.li
                                key={notice.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-between group overflow-hidden"
                            >
                                <label className="flex items-center gap-2 cursor-pointer flex-1 py-1">
                                    <input
                                        type="checkbox"
                                        checked={notice.checked}
                                        onChange={() => updateNotice(notice.id)}
                                        className="w-4 h-4 accent-accent-red cursor-pointer"
                                    />
                                    <span className={notice.checked ? 'line-through opacity-50' : ''}>{notice.text}</span>
                                </label>
                                <button onClick={() => removeNotice(notice.id)} className="opacity-0 group-hover:opacity-100 text-accent-red p-1 transition-opacity">
                                    <Trash2 size={14} />
                                </button>
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>
                <div className="flex items-center gap-2 border-t border-navy/10 pt-2 mt-1">
                    <input
                        type="text"
                        value={newNotice}
                        onChange={(e) => setNewNotice(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddNotice()}
                        placeholder="신규 지시사항 입력..."
                        className="flex-1 border-b-2 border-navy/30 bg-transparent px-1 text-sm outline-none focus:border-navy"
                    />
                    <button onClick={handleAddNotice} className="text-navy hover:text-accent-red transition-colors">
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* Title & Day Selector */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 border-b-2 border-navy pb-2">
                    <Clock size={24} className="text-navy" />
                    <h2 className="font-stencil text-xl flex-1 text-navy">TODAY'S ITINERARY</h2>
                </div>
                <div className="flex justify-between items-center bg-navy p-1 rounded-md shadow-sm">
                    {['월', '화', '수', '목', '금', '토'].map(d => (
                        <button
                            key={d}
                            onClick={() => setSelectedDay(d)}
                            className={`flex-1 py-1 text-center font-bold text-sm rounded transition-colors ${selectedDay === d ? 'bg-background text-navy shadow-sm' : 'text-background hover:bg-white/20'}`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            {/* Daily Schedule Timeline */}
            <div className={`relative border-l-2 border-navy/30 ml-4 space-y-6 pb-20 pt-2 ${isAllCompleted ? 'min-h-[250px]' : ''}`}>

                {/* Past Missions Toggle */}
                {pastSchedule.length > 0 && (
                    <div className="relative pl-6">
                        <div className="absolute -left-[9px] top-3 w-4 h-4 rounded-full border-2 border-background bg-gray-300"></div>
                        <button
                            onClick={() => setShowPast(!showPast)}
                            className="w-full bg-navy/5 text-navy/70 font-bold text-xs py-2 rounded-md border border-navy/20 flex items-center justify-center gap-2 hover:bg-navy/10 transition-colors"
                        >
                            <Clock size={14} />
                            {showPast ? '완료된 작전 숨기기' : `완료된 작전 (${pastSchedule.length}개) 보기`}
                        </button>
                    </div>
                )}

                <AnimatePresence>
                    {isAllCompleted && !showPast && (
                        <motion.div
                            initial={{ scale: 3, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.95 }}
                            transition={{ type: "spring", stiffness: 350, damping: 20, delay: 0.1 }}
                            className="absolute inset-x-0 top-16 -ml-4 flex justify-center items-center z-30 pointer-events-none mix-blend-multiply"
                        >
                            <svg width="250" height="250" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <mask id="scratches">
                                        <rect width="100%" height="100%" fill="white" />
                                        {/* Horizontal and angled scratch lines */}
                                        <path d="M 10 30 Q 130 50 250 20 M -10 60 Q 150 40 270 80 M 0 110 Q 120 100 250 120 M 20 150 Q 140 170 260 140 M 10 200 L 250 190 M -20 230 Q 120 240 260 210" stroke="black" strokeWidth="2" strokeDasharray="5 15" opacity="0.6" />
                                        <path d="M 0 0 L 260 260 M 260 0 L 0 260" stroke="black" strokeWidth="3" strokeDasharray="2 15" opacity="0.8" />
                                        <circle cx="130" cy="130" r="120" fill="none" stroke="black" strokeWidth="15" strokeDasharray="2 8" opacity="0.4" />
                                        <circle cx="130" cy="130" r="80" fill="none" stroke="black" strokeWidth="25" strokeDasharray="1 10" opacity="0.5" />
                                        {/* Speckles */}
                                        <path d="M 30 130 A 1 1 0 0 1 30 131 M 60 80 A 1 1 0 0 1 60 81 M 200 150 A 1 1 0 0 1 200 151 M 150 210 A 1 1 0 0 1 150 211 M 90 200 A 1 1 0 0 1 90 201 M 110 50 A 1 1 0 0 1 110 51" stroke="black" strokeWidth="8" strokeLinecap="round" strokeDasharray="1 30" opacity="0.7" />
                                    </mask>
                                    {/* Perfect radii so text perfectly bisects the rings */}
                                    <path id="curveTop" d="M 63.5,130 A 66.5,66.5 0 0,1 196.5,130" fill="transparent" />
                                    <path id="curveBottom" d="M 43.5,130 A 86.5,86.5 0 0,0 216.5,130" fill="transparent" />
                                </defs>
                                <g transform="rotate(-28, 130, 130)" mask="url(#scratches)">
                                    {/* Scalloped Red Outer Border */}
                                    <polygon points={Array.from({ length: 80 }).map((_, i) => `${130 + (i % 2 === 0 ? 122 : 112) * Math.cos(i * 4.5 * Math.PI / 180)},${130 + (i % 2 === 0 ? 122 : 112) * Math.sin(i * 4.5 * Math.PI / 180)}`).join(' ')} fill="#c21a1a" />

                                    {/* Inner White Plate */}
                                    <circle cx="130" cy="130" r="102" fill="white" />

                                    {/* Inner Red Rings */}
                                    <circle cx="130" cy="130" r="95" fill="none" stroke="#c21a1a" strokeWidth="4" />
                                    <circle cx="130" cy="130" r="58" fill="none" stroke="#c21a1a" strokeWidth="2" />

                                    {/* Curved Text MISSION */}
                                    <text fontFamily="Georgia, 'Times New Roman', serif" fontSize="26" fontWeight="900" fill="#c21a1a" letterSpacing="4">
                                        <textPath href="#curveTop" startOffset="50%" textAnchor="middle">MISSION</textPath>
                                    </text>
                                    <text fontFamily="Georgia, 'Times New Roman', serif" fontSize="26" fontWeight="900" fill="#c21a1a" letterSpacing="8">
                                        <textPath href="#curveBottom" startOffset="50%" textAnchor="middle">MISSION</textPath>
                                    </text>

                                    {/* Center Stars (Top & Bottom) inside the text */}
                                    <g fill="#c21a1a">
                                        {/* Top stars */}
                                        <text x="105" y="90" fontSize="14" textAnchor="middle">★</text>
                                        <text x="130" y="93" fontSize="20" textAnchor="middle">★</text>
                                        <text x="155" y="90" fontSize="14" textAnchor="middle">★</text>

                                        {/* Bottom stars */}
                                        <text x="105" y="176" fontSize="14" textAnchor="middle">★</text>
                                        <text x="130" y="179" fontSize="20" textAnchor="middle">★</text>
                                        <text x="155" y="176" fontSize="14" textAnchor="middle">★</text>
                                    </g>

                                    {/* Angled Banner */}
                                    <g>
                                        <path d="M -15,95 L 275,95 L 255,130 L 275,165 L -15,165 L 5,130 Z" fill="#c21a1a" />
                                        <path d="M 5,100 L 255,100 M 5,160 L 255,160" stroke="white" strokeWidth="2" fill="none" />
                                        {/* COMPLETE Text */}
                                        <g transform="translate(130, 143) scale(0.9, 1.25)">
                                            <text x="0" y="0" fontFamily="Impact, 'Arial Black', sans-serif" fontSize="40" fontWeight="bold" fill="white" textAnchor="middle">COMPLETE</text>
                                        </g>
                                    </g>
                                </g>
                            </svg>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showPast && pastSchedule.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 0.5 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="relative pl-6 grayscale overflow-hidden"
                        >
                            <div className="py-2">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 border-background bg-gray-400"></div>

                                {/* Time */}
                                <div className="font-mono text-sm font-bold flex items-center gap-2 mb-1 text-gray-500">
                                    <span>{item.time}</span>
                                </div>

                                {/* Card */}
                                <div className="bg-gray-100 border-2 p-2 rounded shadow-sm border-gray-300">
                                    <div className="flex justify-between items-center pr-2">
                                        <h3 className="font-bold text-gray-600 line-through">{item.title}</h3>
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1 rounded">{item.agent}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                <AnimatePresence>
                    {activeAndFutureSchedule.map((item, index) => {
                        const isCurrentActive = isCurrentDay && index === 0 && item.time <= currentTimeStr;

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="relative pl-6"
                            >
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${isCurrentActive ? 'bg-accent-green animate-pulse z-10' : item.isUrgent ? 'bg-accent-red animate-pulse' : 'bg-navy'}`}></div>

                                {/* Time */}
                                <div className="font-mono text-sm font-bold flex items-center gap-2 mb-1">
                                    <span className={item.isEarly ? "text-accent-red" : "text-navy"}>
                                        {item.time}
                                    </span>
                                    {item.isEarly && <span className="bg-accent-red text-white text-[10px] px-1 rounded">EARLY (4교시)</span>}
                                    {isCurrentActive && <span className="bg-accent-green text-white text-[10px] px-1 rounded animate-pulse">CURRENT</span>}
                                </div>

                                {/* Card */}
                                <div className={`bg-white border-2 p-3 rounded shadow-sm relative overflow-hidden group ${isCurrentActive ? 'border-accent-green shadow-green-100 ring-4 ring-accent-green/20' : item.isEarly ? 'border-accent-red shadow-red-200' : 'border-navy'}`}>
                                    {editingId === item.id ? (
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="space-y-3 mt-1"
                                        >
                                            <div className="flex items-center gap-2 border-b border-navy/30 pb-1">
                                                <span className="text-xs font-bold w-12 text-navy/70 shrink-0">일정명</span>
                                                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full font-bold text-lg outline-none bg-transparent" placeholder="일정명" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 border-b border-navy/30 pb-1">
                                                    <span className="text-xs font-bold w-12 text-navy/70 shrink-0">담당자</span>
                                                    <select value={editForm.agent} onChange={(e) => setEditForm({ ...editForm, agent: e.target.value })} className="w-full font-bold outline-none bg-transparent cursor-pointer">
                                                        <option>엄마</option>
                                                        <option>아빠</option>
                                                        <option>태권도</option>
                                                        <option>학교</option>
                                                        <option>자율</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2 border-b border-navy/30 pb-1">
                                                    <span className="text-xs font-bold w-12 text-navy/70 shrink-0">시간</span>
                                                    <input type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="w-full font-bold outline-none bg-transparent" />
                                                </div>
                                                <div className="flex items-center gap-2 border-b border-navy/30 pb-1">
                                                    <span className="text-xs font-bold w-12 text-navy/70 shrink-0">장소</span>
                                                    <input type="text" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full font-bold outline-none bg-transparent" placeholder="장소" />
                                                </div>
                                            </div>
                                            <button onClick={saveEdit} className="bg-navy text-white font-bold text-xs px-3 py-2 mt-2 rounded w-full flex items-center justify-center gap-1 border-2 border-navy hover:bg-white hover:text-navy transition-colors">
                                                <Save size={14} /> SAVE & SORT
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <>
                                            <div className="absolute top-2 right-2 flex bg-white/50 rounded-bl-md border-b border-l border-navy/10 overflow-hidden">
                                                <button onClick={() => startEdit(item)} className="text-navy/30 hover:text-navy transition-colors p-1 border-r border-navy/10">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="text-navy/30 hover:text-accent-red transition-colors p-1">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-start mb-2 pr-6">
                                                <h3 className={`font-bold text-lg ${item.isEarly ? 'text-accent-red' : ''}`}>{item.title}</h3>
                                                <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-sm border border-navy/20 shrink-0">
                                                    {getAgentIcon(item.agent)}
                                                    <span className="text-xs font-bold">{item.agent}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 flex items-center gap-1">
                                                <MapPin size={14} /> {item.location}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>

                {/* Add Schedule Form */}
                <AnimatePresence>
                    {showAddForm && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="relative pl-6 overflow-hidden mt-4"
                        >
                            <div className="bg-white border-2 border-dashed border-navy/50 p-3 rounded shadow-sm relative">
                                <h3 className="font-bold text-navy mb-3 flex items-center gap-1"><Plus size={16} /> 신규 투입 일정 작성</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b border-navy/30 pb-1">
                                        <span className="text-xs font-bold w-12 text-navy/70 shrink-0">일정명</span>
                                        <input type="text" value={newSchedule.title} onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })} className="w-full font-bold outline-none bg-transparent" placeholder="예) 피아노 학원" />
                                    </div>
                                    <div className="flex items-center gap-2 border-b border-navy/30 pb-1">
                                        <span className="text-xs font-bold w-12 text-navy/70 shrink-0">시간</span>
                                        <input type="time" value={newSchedule.time} onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })} className="w-full font-bold outline-none bg-transparent" />
                                    </div>
                                    <div className="flex items-center gap-2 border-b border-navy/30 pb-1">
                                        <span className="text-xs font-bold w-12 text-navy/70 shrink-0">담당자</span>
                                        <select value={newSchedule.agent} onChange={(e) => setNewSchedule({ ...newSchedule, agent: e.target.value })} className="w-full font-bold outline-none bg-transparent cursor-pointer">
                                            <option>엄마</option>
                                            <option>아빠</option>
                                            <option>태권도</option>
                                            <option>학교</option>
                                            <option>자율</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 border-b border-navy/30 pb-1">
                                        <span className="text-xs font-bold w-12 text-navy/70 shrink-0">장소</span>
                                        <input type="text" value={newSchedule.location} onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })} className="w-full font-bold outline-none bg-transparent" placeholder="장소 입력 (선택)" />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => setShowAddForm(false)} className="flex-1 bg-gray-200 text-gray-700 font-bold text-xs px-3 py-2 rounded transition-colors hover:bg-gray-300">
                                        취소
                                    </button>
                                    <button onClick={handleAddSchedule} className="flex-1 bg-navy text-white font-bold text-xs px-3 py-2 rounded flex items-center justify-center gap-1 hover:bg-navy/90 transition-colors">
                                        <Save size={14} /> 작성 완료
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!showAddForm && (
                    <div className="relative pl-6 mt-4">
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full bg-transparent border-2 border-dashed border-navy/30 text-navy/60 font-bold text-sm py-3 rounded-md flex items-center justify-center gap-2 hover:bg-navy hover:text-white hover:border-navy transition-colors"
                        >
                            <Plus size={18} /> 새 일정 추가
                        </button>
                    </div>
                )}
            </div>

            {/* Floating Action Button for Emergency */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="hidden fixed bottom-20 right-4 bg-accent-red text-white p-4 rounded-full shadow-xl border-2 border-white flex items-center justify-center animate-bounce z-40"
            >
                <ShieldAlert size={24} />
            </motion.button>
        </motion.div>
    );
}
