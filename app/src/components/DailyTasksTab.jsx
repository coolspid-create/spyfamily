import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Plus, Trash2, CalendarCheck, History, ChevronDown, ChevronUp } from 'lucide-react';

const TAB_LIKE_TRANSITION = { duration: 0.15 };
const TAB_LIKE_MOTION = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: TAB_LIKE_TRANSITION,
};
const DAILY_TASK_MAX_LENGTH = 50;

export default function DailyTasksTab() {
    const dailyTasks = useStore(state => state.dailyTasks);
    const addDailyTask = useStore(state => state.addDailyTask);
    const toggleDailyTask = useStore(state => state.toggleDailyTask);
    const removeDailyTask = useStore(state => state.removeDailyTask);

    const [newTaskText, setNewTaskText] = useState('');
    const [expandedPastDate, setExpandedPastDate] = useState(null);
    const [showIncompletePast, setShowIncompletePast] = useState(false);
    const [showFullPastHistory, setShowFullPastHistory] = useState(false);

    const handleAddTask = (e) => {
        e.preventDefault();
        const taskText = newTaskText.trim().slice(0, DAILY_TASK_MAX_LENGTH);
        if (taskText) {
            addDailyTask(taskText);
            setNewTaskText('');
        }
    };

    const { formattedDate, todayStr } = useMemo(() => {
        const today = new Date();
        return {
            formattedDate: `${today.getMonth() + 1}월 ${today.getDate()}일`,
            todayStr: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        };
    }, []);

    const { todayTasks, pastTasks } = useMemo(() => {
        const todayList = [];
        const pastList = [];

        dailyTasks.forEach(task => {
            if (task.assigned_date === todayStr) {
                todayList.push(task);
            } else {
                pastList.push(task);
            }
        });

        return { todayTasks: todayList, pastTasks: pastList };
    }, [dailyTasks, todayStr]);

    const completedCount = useMemo(() => todayTasks.filter(t => t.is_completed).length, [todayTasks]);
    const totalCount = todayTasks.length;
    const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    const groupedPastTasks = useMemo(() => pastTasks.reduce((acc, task) => {
        if (!acc[task.assigned_date]) acc[task.assigned_date] = [];
        acc[task.assigned_date].push(task);
        return acc;
    }, {}), [pastTasks]);
    const sortedPastDates = useMemo(
        () => Object.keys(groupedPastTasks).sort((a, b) => new Date(b) - new Date(a)),
        [groupedPastTasks]
    );
    const incompletePastTasks = useMemo(() => pastTasks.filter(t => !t.is_completed), [pastTasks]);
    const groupedIncompletePast = useMemo(() => incompletePastTasks.reduce((acc, task) => {
        if (!acc[task.assigned_date]) acc[task.assigned_date] = [];
        acc[task.assigned_date].push(task);
        return acc;
    }, {}), [incompletePastTasks]);
    const sortedIncompleteDates = useMemo(
        () => Object.keys(groupedIncompletePast).sort((a, b) => new Date(b) - new Date(a)),
        [groupedIncompletePast]
    );

    return (
        <div className="space-y-6">
            {/* Header and Progress */}
            <div className="bg-gradient-to-br from-accent-blue via-accent-blue/95 to-accent-blue/90 p-4.5 rounded-2xl shadow-sm relative overflow-hidden border border-white/5">
                <h3 className="font-bold text-[13px] text-white border-b border-white/10 pb-1.5 mb-2 flex items-center gap-2 relative z-10">
                    <CalendarCheck className="text-accent-red stroke-[2.5px]" size={14} />
                    오늘 할 일
                </h3>
                <div className="relative z-10 flex justify-between items-end mb-2">
                    <p className="text-white/60 text-[10px] font-semibold tracking-wider uppercase leading-none pb-0.5">{formattedDate}</p>
                    <div className="text-right">
                        <span className="text-white font-black text-[15px] leading-none font-mono tracking-tight">{progressPercent}%</span>
                        <p className="text-white/45 text-[9px] uppercase font-black tracking-widest mt-0.5 leading-none">Completed</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative z-10 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={false}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-accent-red to-rose-400"
                    />
                </div>

                {/* Decorative background */}
                <div className="absolute right-2 bottom-2 opacity-[0.03] pointer-events-none text-white">
                    <CheckCircle2 size={120} />
                </div>
            </div>

            {/* Add Task Input */}
            <form onSubmit={handleAddTask} className="relative">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value.slice(0, DAILY_TASK_MAX_LENGTH))}
                    maxLength={DAILY_TASK_MAX_LENGTH}
                    placeholder="오늘 끝내야 할 일 추가하기..."
                    className="w-full bg-white border border-navy/5 rounded-2xl py-3 pl-4 pr-12 text-[15px] font-bold text-navy placeholder:text-navy/30 focus:outline-none focus:border-accent-red/20 focus:ring-4 focus:ring-accent-red/5 transition-all shadow-md"
                />
                <button
                    type="submit"
                    aria-label="할 일 추가"
                    disabled={!newTaskText.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-navy hover:bg-navy/90 text-white p-2 rounded-xl disabled:bg-gray-100 disabled:text-navy/20 transition-all cursor-pointer"
                >
                    <Plus size={18} />
                </button>
            </form>

            {/* Task List */}
            <div className="space-y-2.5">
                <AnimatePresence initial={false} mode="popLayout">
                    {todayTasks.length === 0 ? (
                        <motion.div
                            key="empty-today-tasks"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={TAB_LIKE_TRANSITION}
                            className="text-center py-12 bg-white/50 border border-dashed border-navy/10 rounded-2xl shadow-inner"
                        >
                            <p className="text-navy/50 font-bold text-[15px]">등록된 할 일이 없습니다.</p>
                            <p className="text-navy/30 text-[13px] mt-1 font-medium">새로운 할 일을 추가해보세요!</p>
                        </motion.div>
                    ) : (
                        todayTasks.map(task => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={TAB_LIKE_TRANSITION}
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${task.is_completed ? 'bg-gray-50/50 border-gray-200/50 shadow-sm opacity-60' : 'bg-white border-navy/5 shadow-md hover:border-navy/10 hover:shadow-lg'}`}
                            >
                                <div
                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                    onClick={() => toggleDailyTask(task.id)}
                                >
                                    <button
                                        type="button"
                                        aria-label={task.is_completed ? `${task.task_name} 미완료로 변경` : `${task.task_name} 완료로 변경`}
                                        className={`shrink-0 transition-colors cursor-pointer ${task.is_completed ? 'text-accent-green' : 'text-navy/30 hover:text-navy/50'}`}
                                    >
                                        {task.is_completed ? <CheckCircle2 size={24} className="stroke-[2.5px]" /> : <Circle size={24} />}
                                    </button>
                                    <span className={`font-bold text-[15px] transition-all ${task.is_completed ? 'text-navy/40 line-through decoration-2' : 'text-navy'}`}>
                                        {task.task_name}
                                    </span>
                                </div>
                                <button
                                    onClick={() => removeDailyTask(task.id)}
                                    aria-label={`${task.task_name} 삭제`}
                                    className="text-navy/20 hover:text-accent-red p-2 shrink-0 transition-colors ml-2 cursor-pointer"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Incomplete Past Tasks Accordion */}
            {sortedIncompleteDates.length > 0 && (
                <div className="mt-6 pb-4">
                    <div
                        className="flex items-center justify-between gap-2 mb-3 cursor-pointer group"
                        onClick={() => setShowIncompletePast(!showIncompletePast)}
                    >
                        <div className="flex items-center gap-2">
                            <History className="text-accent-red" size={20} />
                            <h3 className="font-bold text-base text-navy">지난할일 <span className="text-accent-red">(미완료 {incompletePastTasks.length}건)</span></h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">체크 필요</span>
                            {showIncompletePast ? <ChevronUp size={18} className="text-navy/50" /> : <ChevronDown size={18} className="text-navy/50" />}
                        </div>
                    </div>

                    <AnimatePresence>
                        {showIncompletePast && (
                            <motion.div
                                {...TAB_LIKE_MOTION}
                                className="overflow-hidden"
                            >
                                <div className="space-y-3">
                                    {sortedIncompleteDates.map(date => {
                                        const [, mm, dd] = date.split('-');
                                        const tasksForDate = groupedIncompletePast[date];

                                        return (
                                            <div key={date} className="bg-white border-2 border-amber-200 rounded-xl overflow-hidden shadow-sm">
                                                <div className="bg-amber-50 px-3 py-2 border-b border-amber-200">
                                                    <span className="font-bold text-navy font-mono text-[13px]">{parseInt(mm, 10)}월 {parseInt(dd, 10)}일 · 미완료 {tasksForDate.length}건</span>
                                                </div>
                                                <div className="p-2 space-y-1.5">
                                                    {tasksForDate.map(task => (
                                                        <div key={task.id} className="flex justify-between items-center bg-amber-50/50 p-2.5 border border-amber-100 rounded-lg">
                                                            <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleDailyTask(task.id)}>
                                                                <Circle size={18} className="text-amber-400 shrink-0" />
                                                                <span className="text-[15px] font-bold text-navy">{task.task_name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                                                <button
                                                                    onClick={() => toggleDailyTask(task.id)}
                                                                    className="text-[10px] font-bold bg-navy text-white px-2 py-1 rounded hover:bg-accent-red transition-colors"
                                                                >
                                                                    완료하기
                                                                </button>
                                                                <button
                                                                    onClick={() => removeDailyTask(task.id)}
                                                                    className="text-navy/30 hover:text-accent-red p-1 shrink-0 transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Full Past Tasks History Accordion */}
            {sortedPastDates.length > 0 && (
                <div className="pt-4 border-t border-navy/10 pb-20">
                    <div
                        className="flex items-center justify-between gap-2 mb-3 cursor-pointer group"
                        onClick={() => setShowFullPastHistory(!showFullPastHistory)}
                    >
                        <div className="flex items-center gap-2">
                            <History className="text-navy/40" size={18} />
                            <h3 className="font-bold text-[15px] text-navy/60">전체 지난 할 일</h3>
                        </div>
                        {showFullPastHistory ? <ChevronUp size={16} className="text-navy/40" /> : <ChevronDown size={16} className="text-navy/40" />}
                    </div>

                    <AnimatePresence>
                        {showFullPastHistory && (
                            <motion.div
                                {...TAB_LIKE_MOTION}
                                className="overflow-hidden"
                            >
                                <div className="space-y-3">
                                    {sortedPastDates.map(date => {
                                        const [yyyy, mm, dd] = date.split('-');
                                        const isExpanded = expandedPastDate === date;
                                        const tasksForDate = groupedPastTasks[date];
                                        const completedForDate = tasksForDate.filter(t => t.is_completed).length;
                                        const progressForDate = tasksForDate.length === 0 ? 0 : Math.round((completedForDate / tasksForDate.length) * 100);

                                        return (
                                            <div key={date} className="bg-white border-2 border-navy/20 rounded-xl overflow-hidden shadow-sm">
                                                <div
                                                    className="bg-navy/5 p-3 flex justify-between items-center cursor-pointer hover:bg-navy/10 transition-colors"
                                                    onClick={() => setExpandedPastDate(isExpanded ? null : date)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? <ChevronUp size={16} className="text-navy/50" /> : <ChevronDown size={16} className="text-navy/50" />}
                                                        <span className="font-bold text-navy font-mono text-[15px]">{yyyy}년 {parseInt(mm, 10)}월 {parseInt(dd, 10)}일</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block shrink-0 ${progressForDate === 100 ? 'border-accent-green text-accent-green bg-green-50' : 'border-amber-500 text-amber-600 bg-amber-50'}`}>
                                                            {progressForDate === 100 ? '완료' : `진행률: ${progressForDate}%`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            {...TAB_LIKE_MOTION}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-3 bg-white/50 space-y-2 border-t border-navy/10">
                                                                {tasksForDate.map(task => (
                                                                    <div key={task.id} className="flex justify-between items-center bg-white p-2 border border-navy/10 rounded-lg shadow-sm">
                                                                        <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleDailyTask(task.id)}>
                                                                            {task.is_completed ? <CheckCircle2 size={16} className="text-accent-green shrink-0" /> : <Circle size={16} className="text-navy/30 shrink-0" />}
                                                                            <span className={`text-[15px] font-bold truncate ${task.is_completed ? 'line-through text-gray-400' : 'text-navy'}`}>{task.task_name}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                                                            <button
                                                                                onClick={() => toggleDailyTask(task.id)}
                                                                                className={`text-[10px] font-bold border border-navy/20 px-2 py-1 rounded hover:opacity-80 transition-colors ${task.is_completed ? 'bg-gray-100 text-gray-600' : 'bg-navy text-white'}`}
                                                                            >
                                                                                {task.is_completed ? '취소' : '완료하기'}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => removeDailyTask(task.id)}
                                                                                className="text-navy/30 hover:text-accent-red p-1 shrink-0 transition-colors bg-gray-50 border border-navy/10 rounded"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

        </div>
    );
}
