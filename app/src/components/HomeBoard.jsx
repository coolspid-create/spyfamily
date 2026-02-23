import React, { useState } from 'react';
import { User, Baby, Car, ShieldAlert, CalendarDays, CalendarRange, Clock, Edit2, Save, Bus, CheckSquare, Settings, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { INITIAL_MISSIONS } from './PaymentTab';


const INITIAL_WEEKLY = {
    '월': [
        { id: 'M1_mon', time: '09:00', title: '1~4교시 정규수업', agent: '학교', location: '일반교실', isEarly: false },
        { id: 'M2_mon', time: '12:10', title: '점심시간', agent: '학교', location: '급식실', isEarly: false },
        { id: 'M3_mon', time: '13:00', title: '5교시 수업', agent: '학교', location: '일반교실', isEarly: false },
        { id: 'S1', time: '14:10', title: '로봇과학 (방과후)', agent: '태권도', location: '방과후교실', isEarly: false },
        { id: 'S2', time: '16:00', title: '태권도 학원', agent: '태권도', location: 'MTA 태권도', isUrgent: true },
        { id: 'S3', time: '17:00', title: '영어 학원(셀레나)', agent: '엄마', location: '상탑학원', isUrgent: false },
        { id: 'S4', time: '18:00', title: '음악 학원', agent: '아빠', location: '신동음악학원', isUrgent: false }
    ],
    '화': [
        { id: 'M1_tue', time: '09:00', title: '1~4교시 정규수업', agent: '학교', location: '일반교실', isEarly: false },
        { id: 'M2_tue', time: '12:10', title: '점심시간', agent: '학교', location: '급식실', isEarly: false },
        { id: 'M3_tue', time: '13:00', title: '5교시 수업', agent: '학교', location: '일반교실', isEarly: false },
        { id: 'S5', time: '13:45', title: '배드민턴 또는 미술', agent: '태권도', location: '학교/미술학원', isEarly: false },
        { id: 'S6', time: '16:00', title: '한마음 수영장', agent: '엄마', location: '한마음복지관', isUrgent: false },
        { id: 'S7', time: '17:00', title: '미술 학원', agent: '엄마', location: '아트&가베', isUrgent: false }
    ],
    '수': [
        { id: 'M1_wed', time: '09:00', title: '1~4교시 정규수업', agent: '학교', location: '일반교실', isEarly: false },
        { id: 'M2_wed', time: '12:10', title: '점심시간', agent: '학교', location: '급식실', isEarly: false },
        { id: 'S8', time: '13:00', title: '독서 논술 또는 한자', agent: '아빠', location: '학교', isEarly: true, isUrgent: true },
        { id: 'S9', time: '16:00', title: '태권도 학원', agent: '태권도', location: 'MTA 태권도', isUrgent: false },
        { id: 'S10', time: '17:00', title: '영어 학원(셀레나)', agent: '엄마', location: '상탑학원', isUrgent: false },
        { id: 'S11', time: '18:00', title: '음악 학원', agent: '아빠', location: '신동음악학원', isUrgent: false }
    ],
    '목': [
        { id: 'M1_thu', time: '09:00', title: '1~4교시 정규수업', agent: '학교', location: '일반교실', isEarly: false },
        { id: 'M2_thu', time: '12:10', title: '점심시간', agent: '학교', location: '급식실', isEarly: false },
        { id: 'M3_thu', time: '13:00', title: '5교시 수업', agent: '학교', location: '일반교실', isEarly: false },
        { id: 'S12', time: '13:45', title: '쿠킹&베이킹 또는 주산', agent: '태권도', location: '방과후교실', isEarly: false },
        { id: 'S13', time: '16:00', title: '한마음 수영장', agent: '엄마', location: '한마음복지관', isUrgent: false },
        { id: 'S14', time: '17:00', title: '미술 학원', agent: '엄마', location: '아트&가베', isUrgent: false }
    ],
    '금': [
        { id: 'M1_fri', time: '09:00', title: '1~4교시 정규수업', agent: '학교', location: '일반교실', isEarly: false },
        { id: 'M2_fri', time: '12:10', title: '점심시간', agent: '학교', location: '급식실', isEarly: false },
        { id: 'S15', time: '13:00', title: '컴퓨터 또는 방송댄스', agent: '아빠', location: '방과후교실', isEarly: true, isUrgent: true },
        { id: 'S16', time: '16:00', title: '태권도 학원', agent: '태권도', location: 'MTA 태권도', isUrgent: false },
        { id: 'S17', time: '17:00', title: '영어 학원(셀레나)', agent: '엄마', location: '상탑학원', isUrgent: false },
        { id: 'S18', time: '18:00', title: '음악 학원', agent: '아빠', location: '신동음악학원', isUrgent: false }
    ],
    '토': [
        { id: 'S19', time: '10:00', title: '돌핀수영', agent: '자율', location: '돌핀수영', isEarly: false },
        { id: 'S20', time: '11:40', title: 'AK 아이체스', agent: '자율', location: 'AK백화점', isEarly: false }
    ]
};

const getAgentIcon = (agent) => {
    if (agent.includes('엄마')) return <Baby className="w-5 h-5" />;
    if (agent.includes('아빠')) return <User className="w-5 h-5 text-navy border-2 border-navy rounded-full" />;
    if (agent.includes('태권도')) return <Bus className="w-5 h-5 text-accent-green" />;
    return <User className="w-5 h-5" />;
};

const MapPin = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
);

export default function HomeBoard() {
    const [viewMode, setViewMode] = useState('daily'); // daily, weekly, monthly, manage
    const [selectedDay, setSelectedDay] = useState('수');
    const [weeklyData, setWeeklyData] = useState(INITIAL_WEEKLY);

    // Quick inline-edit in daily mode
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);

    // Monthly View variables
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMonthlyDay, setSelectedMonthlyDay] = useState(null);

    // Full Management Mode variables
    const [manageForm, setManageForm] = useState(null);

    // Notices state
    const [notices, setNotices] = useState([
        { id: 1, text: '시아 예방접종증명서 제출', checked: false },
        { id: 2, text: '방과후 일정 확정', checked: false }
    ]);
    const [newNotice, setNewNotice] = useState('');

    // Mission (Funds/Ops) state
    const [missionsData, setMissionsData] = useState(INITIAL_MISSIONS);


    const schedule = weeklyData[selectedDay] || [];

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm(item);
    };

    const saveEdit = () => {
        setWeeklyData({
            ...weeklyData,
            [selectedDay]: schedule.map(s => s.id === editingId ? editForm : s).sort((a, b) => a.time.localeCompare(b.time))
        });
        setEditingId(null);
    };

    const openManageForm = (item) => {
        if (!item) {
            setManageForm({ id: Date.now().toString(), time: '12:00', title: '', agent: '엄마', location: '', isUrgent: false, isEarly: false });
        } else {
            setManageForm(item);
        }
    };

    const saveManageData = () => {
        if (!manageForm) return;
        const exists = schedule.find(s => s.id === manageForm.id);
        let newSchedule;
        if (exists) {
            newSchedule = schedule.map(s => s.id === manageForm.id ? manageForm : s);
        } else {
            newSchedule = [...schedule, manageForm];
        }
        newSchedule.sort((a, b) => a.time.localeCompare(b.time));
        setWeeklyData({ ...weeklyData, [selectedDay]: newSchedule });
        setManageForm(null);
    };

    const removeManageData = (id) => {
        const newSchedule = schedule.filter(s => s.id !== id);
        setWeeklyData({ ...weeklyData, [selectedDay]: newSchedule });
    };

    return (
        <div className="space-y-6">
            {/* Top Fixed Notice Checklist */}
            <div className="bg-white border-2 border-navy p-3 rounded-md shadow-sm">
                <h3 className="font-stencil text-lg border-b-2 border-navy mb-2 flex items-center gap-2">
                    <CheckSquare size={18} /> TOP SECRET
                </h3>
                <ul className="space-y-2 text-sm font-bold opacity-80 mb-3">
                    {notices.map(notice => (
                        <li key={notice.id} className="flex items-center justify-between group">
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                    type="checkbox"
                                    checked={notice.checked}
                                    onChange={() => setNotices(notices.map(n => n.id === notice.id ? { ...n, checked: !n.checked } : n))}
                                    className="w-4 h-4 accent-accent-red cursor-pointer"
                                />
                                <span className={notice.checked ? 'line-through opacity-50' : ''}>{notice.text}</span>
                            </label>
                            <button onClick={() => setNotices(notices.filter(n => n.id !== notice.id))} className="opacity-0 group-hover:opacity-100 text-accent-red p-1 transition-opacity">
                                <Trash2 size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="flex items-center gap-2 border-t border-navy/10 pt-2 mt-1">
                    <input
                        type="text"
                        value={newNotice}
                        onChange={(e) => setNewNotice(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && newNotice.trim()) {
                                setNotices([...notices, { id: Date.now(), text: newNotice.trim(), checked: false }]);
                                setNewNotice('');
                            }
                        }}
                        placeholder="신규 지시사항 입력..."
                        className="flex-1 border-b-2 border-navy/30 bg-transparent px-1 text-sm outline-none focus:border-navy"
                    />
                    <button
                        onClick={() => {
                            if (newNotice.trim()) {
                                setNotices([...notices, { id: Date.now(), text: newNotice.trim(), checked: false }]);
                                setNewNotice('');
                            }
                        }}
                        className="text-navy hover:text-accent-red transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* D-Day Notification Banner */}
            <div className="bg-accent-red text-white p-3 rounded-md shadow-lg flex items-center justify-between border-2 border-dashed border-red-200">
                <div className="flex items-center gap-2">
                    <ShieldAlert size={20} className="animate-pulse shrink-0" />
                    <span className="font-bold text-sm">URGENT: 스쿨뱅킹 통장 잔액 확인 작전 (D-1)</span>
                </div>
                <button className="text-xs font-bold underline shrink-0">CONFIRM</button>
            </div>

            {/* View Mode Selector */}
            <div className="flex flex-col border-b-2 border-navy pb-3 gap-3">
                <h2 className="font-stencil text-xl">
                    {viewMode === 'daily' ? "TODAY'S ITINERARY" :
                        viewMode === 'weekly' ? "WEEKLY OPERATIONS" :
                            viewMode === 'monthly' ? "MONTHLY OVERVIEW" : "MANAGE SCHEDULE"}
                </h2>
                <div className="flex bg-navy p-1 rounded-md gap-1 w-full">
                    <button onClick={() => setViewMode('daily')} className={`flex-1 py-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded text-[10px] sm:text-xs font-bold transition-colors ${viewMode === 'daily' ? 'bg-background text-navy' : 'text-background/70 hover:text-background'}`}><Clock size={16} /> <span>DAILY</span></button>
                    <button onClick={() => setViewMode('weekly')} className={`flex-1 py-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded text-[10px] sm:text-xs font-bold transition-colors ${viewMode === 'weekly' ? 'bg-background text-navy' : 'text-background/70 hover:text-background'}`}><CalendarRange size={16} /> <span>WEEKLY</span></button>
                    <button onClick={() => setViewMode('monthly')} className={`flex-1 py-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded text-[10px] sm:text-xs font-bold transition-colors ${viewMode === 'monthly' ? 'bg-background text-navy' : 'text-background/70 hover:text-background'}`}><CalendarDays size={16} /> <span>MONTHLY</span></button>
                    <button onClick={() => setViewMode('manage')} className={`flex-1 py-2 flex flex-col sm:flex-row items-center justify-center gap-1 rounded text-[10px] sm:text-xs font-bold transition-colors ${viewMode === 'manage' ? 'bg-background text-navy' : 'text-background/70 hover:text-background'}`}><Settings size={16} /> <span>SCHEDULE</span></button>
                </div>
            </div>

            {/* Selected Day Toggle (shared by daily & manage) */}
            {(viewMode === 'daily' || viewMode === 'manage') && (
                <div className="flex justify-between items-center mb-4 bg-navy p-1 rounded-md">
                    {['월', '화', '수', '목', '금', '토'].map(d => (
                        <button
                            key={d}
                            onClick={() => setSelectedDay(d)}
                            className={`flex-1 py-1 text-center font-bold text-sm rounded transition-colors ${selectedDay === d ? 'bg-background text-navy' : 'text-background hover:bg-white/20'}`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            )}

            {/* Content Rendering based on mode */}
            {viewMode === 'daily' && (
                <div className="relative border-l-2 border-navy/30 ml-4 space-y-6 pb-4">
                    {schedule.map((item, index) => (
                        <div key={item.id} className="relative pl-6">
                            {/* Timeline Dot */}
                            <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${item.isUrgent ? 'bg-accent-red animate-pulse' : 'bg-navy'}`}></div>

                            {/* Time */}
                            <div className="font-mono text-sm font-bold flex items-center gap-2 mb-1">
                                <span className={item.isEarly ? "text-accent-red" : "text-navy/70"}>
                                    {item.time}
                                </span>
                                {item.isEarly && <span className="bg-accent-red text-white text-[10px] px-1 rounded">EARLY (4교시)</span>}
                            </div>

                            {/* Card */}
                            <div className={`bg-white border-2 p-3 rounded shadow-sm relative overflow-hidden group ${item.isEarly ? 'border-accent-red shadow-red-200' : 'border-navy'}`}>
                                {editingId === item.id ? (
                                    <div className="space-y-3 mt-1">
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
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={() => startEdit(item)} className="absolute top-2 right-2 text-navy/30 hover:text-navy transition-colors bg-white/50 p-1 rounded-bl-md border-b border-l border-navy/10">
                                            <Edit2 size={16} />
                                        </button>
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
                        </div>
                    ))}
                </div>
            )}

            {/* Manage Schedule Mode */}
            {viewMode === 'manage' && (
                <div className="space-y-4 pb-4">
                    <button onClick={() => openManageForm()} className="w-full bg-navy text-background font-bold text-sm py-3 rounded border-2 border-navy flex justify-center items-center gap-2 hover:bg-white hover:text-navy transition-colors">
                        <Plus size={16} /> 신규 작전(일정) 추가하기
                    </button>
                    {manageForm && (
                        <div className="bg-amber-50 border-2 border-navy p-4 rounded shadow-md">
                            <h3 className="font-stencil text-navy mb-3 border-b-2 border-navy pb-1">EDIT MISSION DATA</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold opacity-70 block">Time</label>
                                    <input type="time" value={manageForm.time} onChange={e => setManageForm({ ...manageForm, time: e.target.value })} className="w-full border-2 border-navy rounded p-2 font-mono font-bold" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold opacity-70 block">Mission Title</label>
                                    <input type="text" value={manageForm.title} onChange={e => setManageForm({ ...manageForm, title: e.target.value })} className="w-full border-2 border-navy rounded p-2 font-bold" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold opacity-70 block">Agent</label>
                                        <input type="text" value={manageForm.agent} onChange={e => setManageForm({ ...manageForm, agent: e.target.value })} className="w-full border-2 border-navy rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold opacity-70 block">Location</label>
                                        <input type="text" value={manageForm.location} onChange={e => setManageForm({ ...manageForm, location: e.target.value })} className="w-full border-2 border-navy rounded p-2" />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-1 text-sm font-bold cursor-pointer">
                                        <input type="checkbox" checked={manageForm.isEarly} onChange={e => setManageForm({ ...manageForm, isEarly: e.target.checked })} className="accent-accent-red w-4 h-4" />
                                        Early (조기하교)
                                    </label>
                                    <label className="flex items-center gap-1 text-sm font-bold cursor-pointer">
                                        <input type="checkbox" checked={manageForm.isUrgent} onChange={e => setManageForm({ ...manageForm, isUrgent: e.target.checked })} className="accent-accent-red w-4 h-4" />
                                        Urgent (긴급)
                                    </label>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={saveManageData} className="flex-1 bg-navy text-white font-bold py-2 rounded flex justify-center items-center gap-1 border-2 border-navy hover:bg-white hover:text-navy">
                                        <Save size={16} /> SAVE
                                    </button>
                                    <button onClick={() => setManageForm(null)} className="flex-1 bg-gray-200 text-navy font-bold py-2 rounded border-2 border-gray-400 hover:bg-white">
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {schedule.map(item => (
                            <div key={item.id} className="bg-white border-2 border-navy rounded p-3 flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-navy bg-navy/10 px-2 py-1 rounded">{item.time}</span>
                                    <div>
                                        <h4 className="font-bold text-sm">{item.title}</h4>
                                        <p className="text-xs opacity-70">{item.agent} • {item.location}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openManageForm(item)} className="p-2 hover:bg-navy/10 rounded text-navy transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => removeManageData(item.id)} className="p-2 hover:bg-accent-red/10 rounded text-accent-red transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === 'weekly' && (
                <div className="grid grid-cols-2 gap-3 pb-4">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                        <div key={day} className={`border-2 border-navy p-3 bg-white rounded shadow-sm ${i === 6 ? 'col-span-2' : ''}`}>
                            <h4 className="font-bold border-b-2 border-navy/20 mb-2 text-navy">{day}</h4>
                            <div className="text-xs text-navy/70 space-y-1">
                                {day === 'Mon' && <p className="flex items-center gap-1"><Clock size={12} /> 14:10 로봇과학</p>}
                                {day === 'Tue' && <p className="flex items-center gap-1"><Clock size={12} /> 13:45 배드민턴</p>}
                                {day === 'Wed' && <p className="text-accent-red font-bold flex items-center gap-1"><Clock size={12} /> 13:00 EARLY 하교</p>}
                                {day === 'Thu' && <p className="flex items-center gap-1"><Clock size={12} /> 13:45 베이킹</p>}
                                {day === 'Fri' && <p className="text-accent-red font-bold flex items-center gap-1"><Clock size={12} /> 13:00 EARLY 하교</p>}
                                {day === 'Sat' && <p className="text-accent-green font-bold flex items-center gap-1"><ShieldAlert size={12} /> 수영 / 체스</p>}
                                {day === 'Sun' && <p className="text-accent-green font-bold flex items-center gap-1"><Baby size={12} /> 휴식 (Happy Time)</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'funds' && (
                <div className="space-y-4 pb-4">
                    <button onClick={() => openManageMissionForm()} className="w-full bg-navy text-background font-bold text-sm py-3 rounded border-2 border-navy flex justify-center items-center gap-2 hover:bg-white hover:text-navy transition-colors">
                        <Plus size={16} /> 신규 결제/특수임무 추가하기
                    </button>
                    {manageMissionForm && (
                        <div className="bg-amber-50 border-2 border-navy p-4 rounded shadow-md">
                            <h3 className="font-stencil text-navy mb-3 border-b-2 border-navy pb-1">EDIT FUND/OPS DATA</h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold opacity-70 block">Type</label>
                                        <select value={manageMissionForm.type} onChange={e => setManageMissionForm({ ...manageMissionForm, type: e.target.value })} className="w-full border-2 border-navy rounded p-2 font-bold cursor-pointer">
                                            <option value="fund">결제 미션 (FUNDS)</option>
                                            <option value="event">특수 임무 (OPS)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold opacity-70 block">Day (1~31)</label>
                                        <input type="number" min="1" max="31" value={manageMissionForm.day} onChange={e => setManageMissionForm({ ...manageMissionForm, day: Number(e.target.value) })} className="w-full border-2 border-navy rounded p-2 font-mono font-bold" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold opacity-70 block">Mission Title</label>
                                    <input type="text" value={manageMissionForm.title} onChange={e => setManageMissionForm({ ...manageMissionForm, title: e.target.value })} className="w-full border-2 border-navy rounded p-2 font-bold" placeholder="ex. 피아노 학원비 결제" />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={saveManageMissionData} className="flex-1 bg-navy text-white font-bold py-2 rounded flex justify-center items-center gap-1 border-2 border-navy hover:bg-white hover:text-navy">
                                        <Save size={16} /> SAVE
                                    </button>
                                    <button onClick={() => setManageMissionForm(null)} className="flex-1 bg-gray-200 text-navy font-bold py-2 rounded border-2 border-gray-400 hover:bg-white">
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {missionsData.map(item => (
                            <div key={item.id} className="bg-white border-2 border-navy rounded p-3 flex justify-between items-center group">
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
                                    <button onClick={() => removeManageMissionData(item.id)} className="p-2 hover:bg-accent-red/10 rounded text-accent-red transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === 'monthly' && (
                (() => {
                    const currentYear = currentDate.getFullYear();
                    const currentMonth = currentDate.getMonth();
                    const monthName = currentDate.toLocaleString('en-US', { month: 'long' }).toUpperCase();

                    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                    const startOffset = firstDay; // Sunday = 0
                    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

                    // Extract payment & event days from missionsData state
                    const paymentDays = missionsData.filter(m => m.type === 'fund').map(m => m.day);
                    const eventDays = missionsData.filter(m => m.type === 'event').map(m => m.day);

                    const PAYMENT_DETAILS = missionsData.filter(m => m.type === 'fund').reduce((acc, curr) => {
                        if (!acc[curr.day]) acc[curr.day] = [];
                        acc[curr.day].push(curr.title);
                        return acc;
                    }, {});

                    const EVENT_DETAILS = missionsData.filter(m => m.type === 'event').reduce((acc, curr) => {
                        if (!acc[curr.day]) acc[curr.day] = [];
                        acc[curr.day].push(curr.title);
                        return acc;
                    }, {});

                    const actualToday = new Date();
                    const isCurrentYearMonth = actualToday.getFullYear() === currentYear && actualToday.getMonth() === currentMonth;
                    const todayNumber = isCurrentYearMonth ? actualToday.getDate() : -1;

                    const handlePrevMonth = () => {
                        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
                    };

                    const handleNextMonth = () => {
                        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
                    };

                    return (
                        <div className="space-y-4">
                            <div className="border-2 border-navy bg-white rounded shadow-sm p-3 pb-4">
                                <div className="flex justify-between items-center mb-3 border-b-2 border-navy pb-2">
                                    <h3 className="font-stencil font-bold">{monthName} {currentYear}</h3>
                                    <div className="flex items-center gap-2">
                                        <button onClick={handlePrevMonth} className="p-1 hover:bg-navy/10 rounded-full transition-colors text-navy">
                                            <ChevronLeft size={18} />
                                        </button>
                                        <div className="text-sm font-bold bg-navy text-white px-3 py-1 rounded min-w-[50px] text-center">
                                            {currentMonth + 1}월
                                        </div>
                                        <button onClick={handleNextMonth} className="p-1 hover:bg-navy/10 rounded-full transition-colors text-navy">
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs mb-2">
                                    <div className="text-accent-red">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div className="text-blue-600">토</div>
                                </div>
                                <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs">
                                    {Array.from({ length: startOffset }).map((_, i) => (
                                        <div key={`blank-${i}`} className="p-2"></div>
                                    ))}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const dayNum = i + 1;
                                        const isPayment = paymentDays.includes(dayNum);
                                        const isEvent = eventDays.includes(dayNum);
                                        const isToday = dayNum === todayNumber;
                                        const isSelected = selectedMonthlyDay === dayNum;

                                        const dayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay();
                                        let textColorClass = "text-navy";
                                        if (dayOfWeek === 0) textColorClass = "text-accent-red"; // Sunday
                                        else if (dayOfWeek === 6) textColorClass = "text-blue-600"; // Saturday

                                        return (
                                            <div
                                                key={`day-${dayNum}`}
                                                onClick={() => setSelectedMonthlyDay(dayNum)}
                                                className={`p-1 sm:p-2 border rounded font-bold relative flex flex-col items-center justify-center min-h-[40px] shadow-sm cursor-pointer transition-all
                                                ${isToday && !isSelected ? 'bg-navy/10 border-navy border-2' : ''}
                                                ${isSelected ? 'bg-navy text-white border-navy scale-110 shadow-md z-20' : `border-gray-200 ${!isToday ? textColorClass : ''} hover:bg-navy/5`}
                                            `}>
                                                <span className="z-10">{dayNum}</span>
                                                {isPayment && <div className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent-red rounded-full"></div>}
                                                {isEvent && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 sm:w-4 h-1 bg-accent-green rounded-full"></div>}
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="mt-4 pt-3 border-t border-navy/20 flex flex-wrap justify-center gap-4 text-xs font-bold">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent-red rounded-full block"></span>결제 미션</span>
                                    <span className="flex items-center gap-1"><span className="w-4 h-1 bg-accent-green rounded-full block"></span>특수 임무 (OPS)</span>
                                </div>
                            </div>

                            {/* Detail Panel for clicked date */}
                            {selectedMonthlyDay && (
                                <div className="border-2 border-navy bg-white rounded shadow-sm p-4 mt-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
                                    <h4 className="font-stencil font-bold border-b-2 border-navy pb-2 mb-3 flex items-center justify-between">
                                        <span>MISSION BRIEFING</span>
                                        <span className="text-accent-red bg-accent-red/10 px-2 py-1 rounded text-sm">{currentMonth + 1}월 {selectedMonthlyDay}일</span>
                                    </h4>

                                    {!paymentDays.includes(selectedMonthlyDay) && !eventDays.includes(selectedMonthlyDay) ? (
                                        <p className="text-sm font-bold text-navy/50 text-center py-2">예정된 주요 작전이 없습니다.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {paymentDays.includes(selectedMonthlyDay) && (
                                                <div className="border-l-4 border-accent-red pl-3 space-y-1">
                                                    <h5 className="text-xs font-bold text-accent-red mb-1">💳 FUNDS MISSION (학원비/결제)</h5>
                                                    <ul className="list-disc pl-4 text-sm font-bold text-gray-700 space-y-1">
                                                        {PAYMENT_DETAILS[selectedMonthlyDay].map((detail, idx) => (
                                                            <li key={idx}>{detail}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {eventDays.includes(selectedMonthlyDay) && (
                                                <div className="border-l-4 border-accent-green pl-3 space-y-1 mt-3">
                                                    <h5 className="text-xs font-bold text-accent-green mb-1">🌟 특수 임무 (SPECIAL OPS)</h5>
                                                    <ul className="list-disc pl-4 text-sm font-bold text-gray-700 space-y-1">
                                                        {EVENT_DETAILS[selectedMonthlyDay].map((detail, idx) => (
                                                            <li key={idx}>{detail}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()
            )}

            {/* Floating Action Button for Emergency */}
            <button className="fixed bottom-20 right-4 bg-accent-red text-white p-4 rounded-full shadow-xl border-2 border-white flex items-center justify-center animate-bounce z-40">
                <ShieldAlert size={24} />
            </button>
        </div>
    );
}
