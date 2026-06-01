import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Plus, Save, Trash2, Edit2, CreditCard, RotateCcw, History, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { NativeSafeConfirmDialog, NativeSafeDateInput, NativeSafeSelect } from './NativeSafeControls';

const TAB_LIKE_TRANSITION = { duration: 0.15 };
const TAB_LIKE_MOTION = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: TAB_LIKE_TRANSITION,
};

const PAYMENT_CARD_TRANSITION = TAB_LIKE_TRANSITION;

const ACCORDION_MOTION = {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }
};

const PAYMENT_METHOD_OPTIONS = ['지역사랑상품권', '아동수당', '신용카드', '지역사랑 + 카드', '스쿨뱅킹'];

const getPaymentDayNumber = (value) => {
    const parsed = parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(Math.max(parsed, 1), 31);
};

const getPaymentDayDateInput = (value) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(getPaymentDayNumber(value), lastDay);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const createPaymentDayLabel = (dateValue) => {
    const day = getPaymentDayNumber(dateValue.split('-')[2]);
    return `${day}일`;
};


export default function PaymentTab() {
    // Zustand
    const payments = useStore(state => state.payments);
    const processPayment = useStore(state => state.processPayment);
    const undoPayment = useStore(state => state.undoPayment);
    const transactionHistory = useStore(state => state.transactionHistory);
    const updatePayment = useStore(state => state.updatePayment);
    const addPayment = useStore(state => state.addPayment);
    const removePayment = useStore(state => state.removePayment);
    const addTransactionHistory = useStore(state => state.addTransactionHistory);
    const updateTransactionHistory = useStore(state => state.updateTransactionHistory);
    const removeTransactionHistory = useStore(state => state.removeTransactionHistory);

    // Editing States
    const [editingPaymentId, setEditingPaymentId] = useState(null);
    const [paymentForm, setPaymentForm] = useState(null);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newPaymentForm, setNewPaymentForm] = useState({ source: '', amount: 0, method: '신용카드', day: '1일', discount: '' });

    const [expandedArchiveMonth, setExpandedArchiveMonth] = useState(null);
    const [showAddHistoryForm, setShowAddHistoryForm] = useState(false);
    const [newHistoryForm, setNewHistoryForm] = useState({ fullDate: '', source: '', amount: 0, method: '신용카드' });
    const [editingHistoryId, setEditingHistoryId] = useState(null);
    const [historyForm, setHistoryForm] = useState({ fullDate: '', month: '', date_formatted: '', source: '', amount: 0, method: '신용카드' });

    const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(true);
    const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
    const [deletePaymentId, setDeletePaymentId] = useState(null);
    const [deleteHistoryId, setDeleteHistoryId] = useState(null);


    const handleSavePayment = () => {
        updatePayment(paymentForm);
        setEditingPaymentId(null);
    };

    const handleDeletePayment = (id) => {
        setDeletePaymentId(id);
    };

    const confirmDeletePayment = () => {
        if (!deletePaymentId) return;
        removePayment(deletePaymentId);
        setDeletePaymentId(null);
    };

    const toggleAddPaymentForm = () => {
        setEditingPaymentId(null);
        setShowAddForm(prev => {
            const nextVal = !prev;
            if (nextVal) {
                setIsUpcomingExpanded(true);
            }
            return nextVal;
        });
    };


    const handleAddPayment = () => {
        if (!newPaymentForm.source || newPaymentForm.amount <= 0) return;
        addPayment({
            id: `P-${Date.now()}`,
            source: newPaymentForm.source,
            amount: newPaymentForm.amount,
            method: newPaymentForm.method,
            day: newPaymentForm.day,
            discount: newPaymentForm.discount,
            isCompleted: false
        });
        setShowAddForm(false);
        setNewPaymentForm({ source: '', amount: 0, method: '신용카드', day: '1일', discount: '' });
    };

    const handleAddHistory = () => {
        if (!newHistoryForm.source || newHistoryForm.amount <= 0 || !newHistoryForm.fullDate) return;
        const [yyyy, mm, dd] = newHistoryForm.fullDate.split('-');
        addTransactionHistory({
            month: `${yyyy}-${mm}`,
            date_formatted: `${mm}.${dd}`,
            source: newHistoryForm.source,
            amount: newHistoryForm.amount,
            method: newHistoryForm.method
        });
        setShowAddHistoryForm(false);
        setNewHistoryForm({ fullDate: '', source: '', amount: 0, method: '신용카드' });
    };

    const handleSaveHistory = () => {
        if (!historyForm.fullDate) return;
        const [yyyy, mm, dd] = historyForm.fullDate.split('-');
        updateTransactionHistory({
            ...historyForm,
            id: editingHistoryId,
            month: `${yyyy}-${mm}`,
            date_formatted: `${mm}.${dd}`
        });
        setEditingHistoryId(null);
    };

    const handleDeleteHistory = (id) => {
        setDeleteHistoryId(id);
    };

    const confirmDeleteHistory = () => {
        if (!deleteHistoryId) return;
        removeTransactionHistory(deleteHistoryId);
        setDeleteHistoryId(null);
    };

    const toggleAddHistoryForm = () => {
        setEditingHistoryId(null);
        setShowAddHistoryForm(prev => {
            const nextVal = !prev;
            if (nextVal) {
                setIsArchiveExpanded(true);
            }
            return nextVal;
        });
    };

    const methodTotals = useMemo(() => payments.reduce((acc, p) => {
        const method = p.method;
        acc[method] = (acc[method] || 0) + p.amount;
        acc.TOTAL = (acc.TOTAL || 0) + p.amount;
        return acc;
    }, { TOTAL: 0 }), [payments]);

    const sortedPayments = useMemo(() => [...payments].sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return a.day.localeCompare(b.day);
    }), [payments]);

    const historyByMonth = useMemo(() => transactionHistory.reduce((acc, curr) => {
        if (!acc[curr.month]) acc[curr.month] = [];
        acc[curr.month].push(curr);
        return acc;
    }, {}), [transactionHistory]);
    const sortedMonths = useMemo(() => Object.keys(historyByMonth).sort((a, b) => b.localeCompare(a)), [historyByMonth]);

    const calculateDDay = (targetDayStr) => {
        const targetDay = parseInt(String(targetDayStr).replace(/[^0-9]/g, ''), 10);
        if (isNaN(targetDay)) return targetDayStr;

        const today = new Date();
        // Today at midnight for accurate day diff
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();

        let targetDate = new Date(currentYear, currentMonth, targetDay);

        if (currentDate > targetDay) {
            targetDate = new Date(currentYear, currentMonth + 1, targetDay);
        }

        const diffTime = targetDate.getTime() - new Date(currentYear, currentMonth, currentDate).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'D-Day';
        return `D-${diffDays}`;
    };

    return (
        <div className="space-y-6 overflow-x-hidden">
            <div className="bg-gradient-to-br from-accent-blue via-accent-blue/95 to-accent-blue/90 p-5 rounded-2xl shadow-sm relative overflow-hidden border border-white/5">
                <div className="absolute right-2 top-2 opacity-[0.03] pointer-events-none text-white">
                    <CheckCircle2 size={120} />
                </div>
                <h3 className="font-bold text-[13px] text-white mb-2 border-b border-white/10 pb-1.5 flex items-center gap-2 relative z-10">
                    <CheckCircle2 size={14} className="text-accent-green" /> 결제 수단별 예상 금액
                </h3>
                <div className="space-y-1.5 mb-3 relative z-10">
                    {Object.entries(methodTotals).filter(([k]) => k !== 'TOTAL').map(([method, amount]) => (
                        <div key={method} className="flex justify-between items-center text-[13px] font-bold text-white/80 border-b border-dashed border-white/5 pb-1">
                            <span>{method}</span>
                            <span className="font-mono text-white">{amount.toLocaleString()} ₩</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center text-[15px] font-sans font-black text-white bg-white/10 px-3.5 py-3 rounded-xl border border-white/10 shadow-inner relative z-10">
                    <span>총 합계 (TOTAL)</span>
                    <span className="font-mono text-accent-red font-black text-base drop-shadow-sm bg-white px-2 py-0.5 rounded-lg">{methodTotals.TOTAL.toLocaleString()} ₩</span>
                </div>
            </div>

            {/* Calendar Data Manager - Unifying design */}
            <div className="bg-navy/5 p-4.5 rounded-2xl border border-navy/5 space-y-4">
                {/* Upcoming Payments Accordion */}
                <div className="bg-white border border-navy/5 rounded-2xl shadow-sm overflow-hidden">
                    <div
                        onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
                        className="bg-navy/5 p-3.5 flex justify-between items-center border-b border-navy/5 cursor-pointer hover:bg-navy/10 transition-colors"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
                            <h4 className="font-sans font-black text-[13px] text-navy flex items-center gap-2">
                                결제 예정 내역 ({sortedPayments.length})
                            </h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAddPaymentForm();
                                }}
                                aria-label={showAddForm ? '결제 예정 내역 추가 닫기' : '결제 예정 내역 추가'}
                                title={showAddForm ? '닫기' : '결제 예정 내역 추가'}
                                className={`${showAddForm ? 'bg-accent-red hover:bg-accent-red/90' : 'bg-accent-blue hover:bg-accent-blue/90'} text-white p-1 rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm`}
                            >
                                {showAddForm ? <X size={11} /> : <Plus size={11} />}
                            </button>
                            {isUpcomingExpanded ? <ChevronUp size={14} className="text-navy/45" /> : <ChevronDown size={14} className="text-navy/45" />}
                        </div>
                    </div>

                    <AnimatePresence initial={false}>
                        {isUpcomingExpanded && (
                            <motion.div
                                {...ACCORDION_MOTION}
                                className="overflow-hidden bg-navy/5"
                            >
                                <div className="p-2.5 space-y-2 pb-3">
                                    <AnimatePresence initial={false}>
                                        {showAddForm && (
                                            <motion.div
                                                {...TAB_LIKE_MOTION}
                                                className="bg-white p-4.5 rounded-2xl border border-navy/5 shadow-md relative overflow-hidden mb-3"
                                            >
                                                <div className="space-y-3 relative z-10 py-1">
                                                    <div className="border-b border-navy/5 pb-2 mb-2">
                                                        <span className="text-[12px] font-black text-navy">새 결제 내역 추가</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <div>
                                                            <label className="text-[9px] font-black text-navy/40 uppercase tracking-wider block mb-1">결제처/내용</label>
                                                            <input type="text" value={newPaymentForm.source} onChange={e => setNewPaymentForm({ ...newPaymentForm, source: e.target.value })} className="w-full text-[12px] font-bold border border-navy/10 rounded-xl p-2 outline-none bg-white focus:border-accent-red/20 focus:ring-4 focus:ring-accent-red/5 transition-all text-navy" placeholder="ex. 태권도 학원" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-navy/40 uppercase tracking-wider block mb-1">금액 (₩)</label>
                                                            <input type="number" value={newPaymentForm.amount || ''} onChange={e => setNewPaymentForm({ ...newPaymentForm, amount: Number(e.target.value) })} className="w-full text-[12px] font-bold font-mono border border-navy/10 rounded-xl p-2 outline-none bg-white focus:border-accent-red/20 focus:ring-4 focus:ring-accent-red/5 transition-all text-navy" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-navy/40 uppercase tracking-wider block mb-1">결제수단</label>
                                                            <NativeSafeSelect
                                                                value={newPaymentForm.method}
                                                                options={PAYMENT_METHOD_OPTIONS}
                                                                onChange={method => setNewPaymentForm({ ...newPaymentForm, method })}
                                                                buttonClassName="text-[12px] font-bold border border-navy/10 rounded-xl p-2 bg-white text-navy"
                                                                ariaLabel="결제수단 선택"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-navy/40 uppercase tracking-wider block mb-1">결제일 / 주기</label>
                                                            <NativeSafeDateInput
                                                                value={getPaymentDayDateInput(newPaymentForm.day)}
                                                                onChange={date => setNewPaymentForm({ ...newPaymentForm, day: createPaymentDayLabel(date) })}
                                                                displayValue={newPaymentForm.day || '날짜 선택'}
                                                                pickerMode="popup"
                                                                popupAlign="right"
                                                                buttonClassName="border border-navy/10 rounded-xl p-2 text-[12px] font-bold bg-white text-navy"
                                                                placeholder="결제일"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-black text-navy/40 uppercase tracking-wider block mb-1">할인/메모</label>
                                                        <input type="text" value={newPaymentForm.discount} onChange={e => setNewPaymentForm({ ...newPaymentForm, discount: e.target.value })} className="w-full text-[12px] font-bold border border-navy/10 rounded-xl p-2 outline-none bg-white focus:border-accent-red/20 focus:ring-4 focus:ring-accent-red/5 transition-all text-navy" />
                                                    </div>
                                                    <button onClick={handleAddPayment} className="w-full bg-accent-blue text-white text-[12px] font-bold py-2 rounded-xl mt-2 flex justify-center items-center gap-1 hover:bg-accent-blue/90 active:scale-95 transition-all shadow-md cursor-pointer">
                                                        <Save size={13} /> 결제 내역 저장
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {sortedPayments.map((payment) => (
                                            <motion.div
                                                key={payment.id}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                transition={PAYMENT_CARD_TRANSITION}
                                                className={`p-2 rounded-xl border transition-all duration-300 relative overflow-hidden ${payment.isCompleted ? 'bg-gray-50 border-gray-250 shadow-sm opacity-60' :
                                                    payment.discount ? 'bg-amber-50/70 border-amber-300 shadow-sm hover:border-amber-400' : 'bg-white border-navy/5 shadow-sm hover:border-navy/10 hover:shadow-md'
                                                    }`}
                                            >
                                                {editingPaymentId === payment.id ? (
                                                    <div className="space-y-3 relative z-10 bg-white/50 py-1">
                                                        <div className="flex justify-between items-center border-b border-navy/10 pb-1">
                                                            <span className="text-[12px] font-bold text-navy">결제 내역 수정</span>
                                                            <button onClick={() => setEditingPaymentId(null)} aria-label={`${payment.source} 수정 취소`} className="text-navy/50 hover:text-accent-red"><X size={14} /></button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-navy/70 block">결제처/내용</label>
                                                                <input type="text" value={paymentForm.source} onChange={e => setPaymentForm({ ...paymentForm, source: e.target.value })} className="w-full text-[13px] font-bold border border-navy/20 rounded p-1 outline-none text-navy bg-white" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-navy/70 block">금액 (₩)</label>
                                                                <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} className="w-full text-[13px] font-bold font-mono border border-navy/20 rounded p-1 outline-none text-navy bg-white" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-navy/70 block">결제수단</label>
                                                                <NativeSafeSelect
                                                                    value={paymentForm.method}
                                                                    options={PAYMENT_METHOD_OPTIONS}
                                                                    onChange={method => setPaymentForm({ ...paymentForm, method })}
                                                                    buttonClassName="text-[13px] font-bold border border-navy/20 rounded p-1 text-navy bg-white"
                                                                    ariaLabel="결제수단 선택"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-navy/70 block">결제일 / 주기</label>
                                                                <NativeSafeDateInput
                                                                    value={getPaymentDayDateInput(paymentForm.day)}
                                                                    onChange={date => setPaymentForm({ ...paymentForm, day: createPaymentDayLabel(date) })}
                                                                    displayValue={paymentForm.day || '날짜 선택'}
                                                                    pickerMode="popup"
                                                                    popupAlign="right"
                                                                    buttonClassName="border border-navy/20 rounded p-1 text-[13px] font-bold bg-white text-navy"
                                                                    placeholder="결제일"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-navy/70 block">할인/메모</label>
                                                            <input type="text" value={paymentForm.discount} onChange={e => setPaymentForm({ ...paymentForm, discount: e.target.value })} className="w-full text-[13px] font-bold border border-navy/20 rounded p-1 outline-none text-navy bg-white" />
                                                        </div>
                                                        <button onClick={handleSavePayment} className="w-full bg-accent-blue text-white text-[12px] font-bold py-2 rounded-xl mt-2 flex justify-center items-center gap-1 border border-accent-blue hover:bg-accent-blue/95 transition-all shadow-md cursor-pointer">
                                                            <Save size={13} /> 변경사항 저장
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-1.5 relative z-10">
                                                            <div className="flex flex-col gap-0.5 pt-0.5">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingPaymentId(payment.id);
                                                                        setPaymentForm(payment);
                                                                    }}
                                                                    aria-label={`${payment.source} 수정`}
                                                                    title={`${payment.source} 수정`}
                                                                    className="text-navy/30 hover:text-navy hover:bg-navy/5 transition-all bg-white/80 p-1 rounded-md border border-navy/10 shadow-sm cursor-pointer"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeletePayment(payment.id)}
                                                                    aria-label={`${payment.source} 삭제`}
                                                                    title={`${payment.source} 삭제`}
                                                                    className="text-navy/30 hover:text-accent-red hover:bg-rose-50 transition-all bg-white/80 p-1 rounded-md border border-navy/10 shadow-sm cursor-pointer"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <div className="min-w-0 flex-1">
                                                                        <h3 className={`font-bold text-[13px] leading-snug truncate ${payment.isCompleted ? 'text-gray-500 line-through' : 'text-navy'}`}>
                                                                            {payment.source}
                                                                        </h3>
                                                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-lg font-bold leading-none ${payment.isCompleted ? 'bg-black/5 text-gray-500' :
                                                                                calculateDDay(payment.day).includes('D-Day') || parseInt(calculateDDay(payment.day).replace('D-', '')) <= 3 ? 'bg-accent-red text-white' : 'bg-black/5 text-navy/70'
                                                                                }`}>
                                                                                {payment.isCompleted ? `결제일: ${payment.day}` : calculateDDay(payment.day)}
                                                                            </span>
                                                                            {payment.discount && <span className="text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-lg font-bold leading-none">{payment.discount}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className={`font-mono font-black shrink-0 max-w-[45%] text-right text-[13px] leading-snug truncate ${payment.isCompleted ? 'text-gray-500' : 'text-accent-red'}`}>
                                                                        {payment.amount.toLocaleString()} ₩
                                                                    </div>
                                                                </div>

                                                                <div className="flex justify-between items-center gap-2 mt-1.5">
                                                                    <div className="min-w-0 text-[10px] font-bold text-navy/60 flex items-center gap-1">
                                                                        <AlertCircle size={11} className="shrink-0" />
                                                                        <span className="truncate">{payment.method}</span>
                                                                    </div>
                                                                    {!payment.isCompleted ? (
                                                                        <motion.button
                                                                            whileTap={{ scale: 0.95 }}
                                                                            onClick={() => processPayment(payment.id)}
                                                                            className="bg-accent-blue text-white text-[9px] font-bold px-2 py-1 rounded-lg border border-accent-blue hover:bg-accent-blue/95 transition-all cursor-pointer shadow-sm shrink-0"
                                                                        >
                                                                            결제 처리하기
                                                                        </motion.button>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <div className="flex flex-col items-end leading-tight">
                                                                                <div className="text-accent-green flex items-center gap-1 text-[10px] font-bold">
                                                                                    <CheckCircle2 size={11} /> 완료
                                                                                </div>
                                                                                <div className="text-[9px] text-gray-500 font-mono tracking-tighter">{payment.completedAt}</div>
                                                                            </div>
                                                                            <button onClick={() => undoPayment(payment.id)} className="text-[9px] text-navy/40 hover:text-navy underline flex items-center gap-1 cursor-pointer">
                                                                                <RotateCcw size={10} /> 취소
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Past Payments (Archive) Accordion */}
                <div className="bg-white border border-navy/5 rounded-2xl shadow-sm overflow-hidden">
                    <div
                        onClick={() => setIsArchiveExpanded(!isArchiveExpanded)}
                        className="bg-navy/5 p-3.5 flex justify-between items-center border-b border-navy/5 cursor-pointer hover:bg-navy/10 transition-colors"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                            <h4 className="font-sans font-black text-[13px] text-navy flex items-center gap-2">
                                지난 결제 내역 ({transactionHistory.length})
                            </h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAddHistoryForm();
                                }}
                                aria-label={showAddHistoryForm ? '과거 결제 내역 추가 닫기' : '과거 결제 내역 직접 추가'}
                                title={showAddHistoryForm ? '닫기' : '과거 결제 내역 직접 추가'}
                                className={`${showAddHistoryForm ? 'bg-accent-red hover:bg-accent-red/90' : 'bg-accent-blue hover:bg-accent-blue/90'} text-white p-1 rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm`}
                            >
                                {showAddHistoryForm ? <X size={11} /> : <Plus size={11} />}
                            </button>
                            {isArchiveExpanded ? <ChevronUp size={14} className="text-navy/45" /> : <ChevronDown size={14} className="text-navy/45" />}
                        </div>
                    </div>

                    <AnimatePresence initial={false}>
                        {isArchiveExpanded && (
                            <motion.div
                                {...ACCORDION_MOTION}
                                className="overflow-hidden bg-navy/5"
                            >
                                <div className="p-3.5 space-y-3 pb-4">
                                    <AnimatePresence initial={false}>
                                        {showAddHistoryForm && (
                                            <motion.div
                                                {...TAB_LIKE_MOTION}
                                                className="bg-white p-4.5 rounded-2xl border border-navy/5 shadow-md relative overflow-hidden mb-3"
                                            >
                                                <div className="space-y-3 relative z-10 py-1">
                                                    <div className="border-b border-navy/5 pb-2 mb-2">
                                                        <span className="text-[12px] font-black text-navy">과거 결제 내역 직접 추가</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <div className="col-span-2">
                                                            <label className="text-[9px] font-black text-navy/40 uppercase tracking-wider block mb-1">결제 날짜</label>
                                                            <NativeSafeDateInput
                                                                value={newHistoryForm.fullDate}
                                                                onChange={fullDate => setNewHistoryForm({ ...newHistoryForm, fullDate })}
                                                                pickerMode="popup"
                                                                popupAlign="left"
                                                                buttonClassName="border border-navy/10 rounded-xl p-2 text-[12px] font-bold font-mono bg-white text-navy"
                                                                placeholder="결제 날짜"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-navy/40 uppercase tracking-wider block mb-1">결제처/내용</label>
                                                            <input type="text" value={newHistoryForm.source} onChange={e => setNewHistoryForm({ ...newHistoryForm, source: e.target.value })} className="w-full text-[12px] font-bold border border-navy/10 rounded-xl p-2 outline-none bg-white text-navy focus:border-accent-red/20" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-navy/40 uppercase tracking-wider block mb-1">금액 (₩)</label>
                                                            <input type="number" value={newHistoryForm.amount || ''} onChange={e => setNewHistoryForm({ ...newHistoryForm, amount: Number(e.target.value) })} className="w-full text-[12px] font-bold font-mono border border-navy/10 rounded-xl p-2 outline-none bg-white text-navy focus:border-accent-red/20" />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="text-[9px] font-black text-navy/40 uppercase tracking-wider block mb-1">결제수단</label>
                                                            <NativeSafeSelect
                                                                value={newHistoryForm.method}
                                                                options={PAYMENT_METHOD_OPTIONS}
                                                                onChange={method => setNewHistoryForm({ ...newHistoryForm, method })}
                                                                buttonClassName="text-[12px] font-bold border border-navy/10 rounded-xl p-2 bg-white text-navy"
                                                                ariaLabel="결제수단 선택"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button onClick={handleAddHistory} className="w-full bg-accent-blue text-white text-[12px] font-bold py-2 rounded-xl mt-2 flex justify-center items-center gap-1 hover:bg-accent-blue/90 active:scale-95 transition-all shadow-md cursor-pointer">
                                                        <Save size={13} /> 과거 내역 추가
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Monthly Archive Sub-accordions */}
                                    {sortedMonths.map((month, index) => {
                                        const records = historyByMonth[month];
                                        const monthlyTotal = records.reduce((acc, curr) => acc + curr.amount, 0);
                                        const isExpanded = expandedArchiveMonth === month || (expandedArchiveMonth === null && index === 0);

                                        const [yyyy, mm] = month.split('-');
                                        const formattedMonth = `${yyyy}년 ${parseInt(mm, 10)}월`;

                                        return (
                                            <div key={month} className="bg-white border border-navy/5 rounded-xl shadow-sm overflow-hidden">
                                                <div
                                                    onClick={() => setExpandedArchiveMonth(isExpanded ? 'NONE' : month)}
                                                    className="flex items-center justify-between border-b border-navy/5 bg-navy/5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-navy/10"
                                                >
                                                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                                        <h3 className="whitespace-nowrap font-mono text-[12px] font-black tracking-[-0.04em] text-navy">
                                                            {formattedMonth} 지출 내역
                                                        </h3>
                                                        {isExpanded ? <ChevronUp size={12} className="shrink-0 text-navy/40" /> : <ChevronDown size={12} className="shrink-0 text-navy/40" />}
                                                    </div>
                                                    <div className="ml-2 shrink-0 whitespace-nowrap font-mono text-[12px] font-black tracking-[-0.04em] text-accent-red bg-white px-2 py-0.5 rounded-lg border border-navy/5 shadow-sm">
                                                        {monthlyTotal.toLocaleString()} ₩
                                                    </div>
                                                </div>
                                                <AnimatePresence initial={false}>
                                                    {isExpanded && (
                                                        <motion.div
                                                            {...ACCORDION_MOTION}
                                                            className="overflow-hidden bg-white"
                                                        >
                                                            <div className="divide-y divide-navy/5 px-3.5 py-1">
                                                                {records.map(record => (
                                                                    <div key={record.id} className="py-2.5 relative group">
                                                                        {editingHistoryId === record.id ? (
                                                                            <div className="space-y-2 bg-navy/5 p-3 rounded-xl border border-navy/15 my-1">
                                                                                <div className="flex justify-between items-center mb-1 border-b border-navy/10 pb-1">
                                                                                    <span className="text-[11px] font-black text-navy">과거 내역 수정</span>
                                                                                    <button onClick={() => setEditingHistoryId(null)} className="text-navy/50 hover:text-accent-red"><X size={13} /></button>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    <div className="col-span-2">
                                                                                        <label className="text-[9px] font-black text-navy/70 block">결제 날짜</label>
                                                                                        <NativeSafeDateInput
                                                                                            value={historyForm.fullDate}
                                                                                            onChange={fullDate => setHistoryForm({ ...historyForm, fullDate })}
                                                                                            pickerMode="popup"
                                                                                            popupAlign="left"
                                                                                            buttonClassName="border border-navy/20 rounded p-1 text-[12px] font-bold font-mono bg-white text-navy"
                                                                                            placeholder="결제 날짜"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-[9px] font-black text-navy/70 block">결제처</label>
                                                                                        <input type="text" value={historyForm.source} onChange={e => setHistoryForm({ ...historyForm, source: e.target.value })} className="w-full text-[12px] font-bold border border-navy/20 rounded p-1 outline-none bg-white text-navy" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-[9px] font-black text-navy/70 block">금액</label>
                                                                                        <input type="number" value={historyForm.amount} onChange={e => setHistoryForm({ ...historyForm, amount: Number(e.target.value) })} className="w-full text-[12px] font-bold border border-navy/20 rounded p-1 outline-none bg-white text-navy" />
                                                                                    </div>
                                                                                    <div className="col-span-2">
                                                                                        <label className="text-[9px] font-black text-navy/70 block">결제수단</label>
                                                                                        <NativeSafeSelect
                                                                                            value={historyForm.method}
                                                                                            options={PAYMENT_METHOD_OPTIONS}
                                                                                            onChange={method => setHistoryForm({ ...historyForm, method })}
                                                                                            buttonClassName="text-[12px] font-bold border border-navy/20 rounded p-1 bg-white text-navy"
                                                                                            ariaLabel="결제수단 선택"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-navy/10">
                                                                                    <button onClick={() => handleDeleteHistory(record.id)} className="text-accent-red font-bold text-[11px] flex items-center gap-1 hover:underline cursor-pointer">
                                                                                        <Trash2 size={11} /> 삭제
                                                                                    </button>
                                                                                    <button onClick={handleSaveHistory} className="bg-accent-blue text-white text-[11px] font-bold py-1 px-3 rounded-lg hover:bg-accent-blue/90 flex items-center gap-1 cursor-pointer">
                                                                                        <Save size={11} /> 저장
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex justify-between items-center">
                                                                                <div className="flex-1 cursor-pointer" onClick={() => { setEditingHistoryId(record.id); setHistoryForm({ ...record, fullDate: `${record.month}-${record.date_formatted.split('.')[1]}` }); }}>
                                                                                    <div className="font-bold text-[13px] text-navy">{record.source}</div>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        <span className="text-[10px] text-navy/40 font-mono font-bold">{record.date_formatted}</span>
                                                                                        <span className="text-[10px] bg-navy/5 text-navy/70 px-2 py-0.5 rounded-lg font-bold">{record.method}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="font-mono font-black text-[13px] text-navy cursor-pointer" onClick={() => { setEditingHistoryId(record.id); setHistoryForm({ ...record, fullDate: `${record.month}-${record.date_formatted.split('.')[1]}` }); }}>
                                                                                    {record.amount.toLocaleString()} ₩
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <NativeSafeConfirmDialog
                open={Boolean(deletePaymentId)}
                title="결제 항목 삭제"
                message="이 결제 항목을 완전히 삭제하시겠습니까?"
                confirmLabel="삭제"
                destructive
                onConfirm={confirmDeletePayment}
                onCancel={() => setDeletePaymentId(null)}
            />
            <NativeSafeConfirmDialog
                open={Boolean(deleteHistoryId)}
                title="결제 기록 삭제"
                message="이 결제 기록을 삭제하시겠습니까?"
                confirmLabel="삭제"
                destructive
                onConfirm={confirmDeleteHistory}
                onCancel={() => setDeleteHistoryId(null)}
            />
        </div>
    );
}
