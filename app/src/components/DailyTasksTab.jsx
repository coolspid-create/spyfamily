import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Plus, Trash2, CalendarCheck, History, ChevronDown, ChevronUp } from 'lucide-react';

export default function DailyTasksTab() {
    const dailyTasks = useStore(state => state.dailyTasks);
    const addDailyTask = useStore(state => state.addDailyTask);
    const toggleDailyTask = useStore(state => state.toggleDailyTask);
    const removeDailyTask = useStore(state => state.removeDailyTask);

    const [newTaskText, setNewTaskText] = useState('');
    const [expandedPastDate, setExpandedPastDate] = useState(null);

    const handleAddTask = (e) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            addDailyTask(newTaskText.trim());
            setNewTaskText('');
        }
    };

    const today = new Date();
    const formattedDate = `${today.getMonth() + 1}월 ${today.getDate()}일`;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const todayTasks = dailyTasks.filter(t => t.assigned_date === todayStr);
    const pastTasks = dailyTasks.filter(t => t.assigned_date !== todayStr);

    const completedCount = todayTasks.filter(t => t.is_completed).length;
    const totalCount = todayTasks.length;
    const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    const groupedPastTasks = pastTasks.reduce((acc, task) => {
        if (!acc[task.assigned_date]) acc[task.assigned_date] = [];
        acc[task.assigned_date].push(task);
        return acc;
    }, {});
    const sortedPastDates = Object.keys(groupedPastTasks).sort((a, b) => new Date(b) - new Date(a));

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Header and Progress */}
            <div className="bg-navy p-4 rounded-xl shadow-lg border-2 border-accent-red relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-white font-bold text-xl flex items-center gap-2">
                            <CalendarCheck className="text-accent-red" size={24} />
                            오늘 할 일
                        </h2>
                        <p className="text-white/60 text-xs font-mono mt-1">{formattedDate}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-accent-red font-black text-2xl font-mono">{progressPercent}%</span>
                        <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Completed</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative z-10 w-full h-2 bg-black/40 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ type: "spring", stiffness: 50 }}
                        className="h-full bg-accent-red"
                    />
                </div>

                {/* Decorative background */}
                <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                    <CheckCircle2 size={120} />
                </div>
            </div>

            {/* Add Task Input */}
            <form onSubmit={handleAddTask} className="relative">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="오늘 끝내야 할 일 추가하기..."
                    className="w-full bg-white border-2 border-navy rounded-lg py-3 pl-4 pr-12 text-sm font-bold text-navy placeholder:text-navy/40 focus:outline-none focus:border-accent-red transition-colors shadow-sm"
                />
                <button
                    type="submit"
                    disabled={!newTaskText.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-navy text-white p-2 rounded-md disabled:bg-gray-300 transition-colors"
                >
                    <Plus size={18} />
                </button>
            </form>

            {/* Task List */}
            <div className="space-y-2">
                <AnimatePresence>
                    {todayTasks.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-10 bg-white/50 border-2 border-dashed border-navy/20 rounded-xl"
                        >
                            <p className="text-navy/50 font-bold text-sm">등록된 할 일이 없습니다.</p>
                            <p className="text-navy/30 text-xs mt-1">새로운 할 일을 추가해보세요!</p>
                        </motion.div>
                    ) : (
                        todayTasks.map(task => (
                            <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors shadow-sm ${task.is_completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-navy'
                                    }`}
                            >
                                <div
                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                    onClick={() => toggleDailyTask(task.id)}
                                >
                                    <button className={`shrink-0 transition-colors ${task.is_completed ? 'text-accent-green' : 'text-navy/30 hover:text-navy/50'}`}>
                                        {task.is_completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                    </button>
                                    <span className={`font-bold text-sm transition-all ${task.is_completed ? 'text-gray-400 line-through decoration-2' : 'text-navy'}`}>
                                        {task.task_name}
                                    </span>
                                </div>
                                <button
                                    onClick={() => removeDailyTask(task.id)}
                                    className="text-navy/20 hover:text-accent-red p-2 shrink-0 transition-colors ml-2"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Past Tasks Accordion */}
            {sortedPastDates.length > 0 && (
                <div className="mt-8 pt-6 border-t border-navy/20 pb-20">
                    <div className="flex items-center gap-2 mb-4">
                        <History className="text-navy/50" size={20} />
                        <h3 className="font-stencil text-lg font-bold tracking-widest text-navy/70">지난 할 일</h3>
                    </div>

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
                                            <span className="font-bold text-navy font-mono text-sm">{yyyy}년 {parseInt(mm, 10)}월 {parseInt(dd, 10)}일</span>
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
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-3 bg-white/50 space-y-2 border-t border-navy/10">
                                                    {tasksForDate.map(task => (
                                                        <div key={task.id} className="flex justify-between items-center bg-white p-2 border border-navy/10 rounded-lg shadow-sm">
                                                            <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleDailyTask(task.id)}>
                                                                {task.is_completed ? <CheckCircle2 size={16} className="text-accent-green shrink-0" /> : <Circle size={16} className="text-navy/30 shrink-0" />}
                                                                <span className={`text-sm font-bold truncate ${task.is_completed ? 'line-through text-gray-400' : 'text-navy'}`}>{task.task_name}</span>
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
                </div>
            )}

        </motion.div>
    );
}
