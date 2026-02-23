import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Plus, Save, Trash2, Edit2, CreditCard, Settings, X, RotateCcw, History, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function PaymentTab() {
    // Zustand
    const funds = useStore(state => state.funds);
    const payments = useStore(state => state.payments);
    const processPayment = useStore(state => state.processPayment);
    const undoPayment = useStore(state => state.undoPayment);
    const transactionHistory = useStore(state => state.transactionHistory);
    const updateFund = useStore(state => state.updateFund);
    const updatePayment = useStore(state => state.updatePayment);
    const addPayment = useStore(state => state.addPayment);
    const removePayment = useStore(state => state.removePayment);

    // Editing States
    const [editingFundId, setEditingFundId] = useState(null);
    const [fundBalance, setFundBalance] = useState('');

    const [editingPaymentId, setEditingPaymentId] = useState(null);
    const [paymentForm, setPaymentForm] = useState(null);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newPaymentForm, setNewPaymentForm] = useState({ source: '', amount: 0, method: '신용카드', day: '1일', discount: '' });

    const [expandedArchiveMonth, setExpandedArchiveMonth] = useState(null);

    const handleSaveFund = (fund) => {
        const numBalance = Number(fundBalance.replace(/[^0-9]/g, ''));
        if (!isNaN(numBalance)) {
            const todayStr = new Date().toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '');
            updateFund({ ...fund, balance: numBalance, updated: todayStr });
        }
        setEditingFundId(null);
    };

    const handleSavePayment = () => {
        updatePayment(paymentForm);
        setEditingPaymentId(null);
    };

    const handleDeletePayment = (id) => {
        if (window.confirm('이 결제 항목을 완전히 삭제(파기)하시겠습니까?')) {
            removePayment(id);
        }
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

    const methodTotals = payments.reduce((acc, p) => {
        const method = p.method;
        acc[method] = (acc[method] || 0) + p.amount;
        acc.TOTAL = (acc.TOTAL || 0) + p.amount;
        return acc;
    }, { TOTAL: 0 });

    const sortedPayments = [...payments].sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return a.day.localeCompare(b.day);
    });

    const historyByMonth = transactionHistory.reduce((acc, curr) => {
        if (!acc[curr.month]) acc[curr.month] = [];
        acc[curr.month].push(curr);
        return acc;
    }, {});
    const sortedMonths = Object.keys(historyByMonth).sort((a, b) => b.localeCompare(a));

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
        >
            {/* Estimated Funds Summary */}
            <div className="flex items-center gap-3 border-b-2 border-navy pb-2">
                <CreditCard size={24} className="text-navy" />
                <h2 className="font-stencil text-xl flex-1 text-navy">ESTIMATED FUNDS SUMMARY</h2>
            </div>

            <div className="bg-navy text-white rounded shadow-sm p-4 border-2 border-navy relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
                    <CheckCircle2 size={120} />
                </div>
                <h3 className="font-bold mb-3 border-b border-white/20 pb-2 flex items-center gap-2 relative z-10">
                    <CheckCircle2 size={16} className="text-accent-green" /> 결제 수단별 예상 금액
                </h3>
                <div className="space-y-2 mb-4 relative z-10">
                    {Object.entries(methodTotals).filter(([k]) => k !== 'TOTAL').map(([method, amount]) => (
                        <div key={method} className="flex justify-between items-center text-sm font-bold opacity-90 border-b border-dashed border-white/10 pb-1">
                            <span>{method}</span>
                            <span className="font-mono">{amount.toLocaleString()} ₩</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-accent-red bg-white p-2 rounded shadow-inner relative z-10">
                    <span>총 합계 (TOTAL)</span>
                    <span className="font-mono">{methodTotals.TOTAL.toLocaleString()} ₩</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
                {funds.map((fund) => (
                    <div key={fund.id} className="bg-white border-2 border-navy p-3 rounded shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-xs text-navy/60 font-bold">{fund.name}</div>
                            <button
                                onClick={() => {
                                    setEditingFundId(fund.id);
                                    setFundBalance(fund.balance.toString());
                                }}
                                className="text-navy/30 hover:text-navy transition-colors p-1"
                            >
                                <Settings size={14} />
                            </button>
                        </div>

                        {editingFundId === fund.id ? (
                            <div className="flex items-center gap-1 mt-1 z-20 relative">
                                <input
                                    type="number"
                                    value={fundBalance}
                                    onChange={(e) => setFundBalance(e.target.value)}
                                    className="w-full border border-navy/30 rounded px-1 py-1 font-mono text-sm font-bold bg-white text-navy focus:outline-none"
                                />
                                <button onClick={() => handleSaveFund(fund)} className="text-white bg-navy rounded p-1"><Save size={14} /></button>
                                <button onClick={() => setEditingFundId(null)} className="text-navy bg-gray-200 rounded p-1"><X size={14} /></button>
                            </div>
                        ) : (
                            <div className="text-lg font-mono font-bold text-navy">{fund.balance.toLocaleString()} ₩</div>
                        )}

                        <div className="text-[10px] text-navy/40 mt-2 text-right">SYNC: {fund.updated}</div>
                        <div className="absolute right-[-10px] top-[-10px] bg-accent-green/10 w-16 h-16 rounded-full blur-xl pointer-events-none z-0"></div>
                    </div>
                ))}
            </div>

            {/* Required Transactions */}
            <div className="flex justify-between items-end mt-8 border-b-2 border-navy pb-2">
                <div className="flex items-center gap-3">
                    <h2 className="font-stencil text-xl flex-1 text-navy">REQUIRED TRANSACTIONS</h2>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-navy text-white p-1 rounded hover:bg-navy/80 transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div className="space-y-4 pb-4">
                <AnimatePresence>
                    {showAddForm && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-amber-50 p-4 rounded shadow-sm border-2 border-navy relative overflow-hidden"
                        >
                            <div className="space-y-3 relative z-10 py-1">
                                <div className="flex justify-between items-center border-b border-navy/20 pb-1 mb-2">
                                    <span className="text-xs font-bold font-stencil text-navy">NEW TRANSACTION</span>
                                    <button onClick={() => setShowAddForm(false)} className="text-navy/50 hover:text-accent-red"><X size={16} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-navy/70 block">Source</label>
                                        <input type="text" value={newPaymentForm.source} onChange={e => setNewPaymentForm({ ...newPaymentForm, source: e.target.value })} className="w-full text-sm font-bold border border-navy/30 rounded p-1 outline-none bg-white" placeholder="ex. 태권도 학원" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-navy/70 block">Amount (₩)</label>
                                        <input type="number" value={newPaymentForm.amount || ''} onChange={e => setNewPaymentForm({ ...newPaymentForm, amount: Number(e.target.value) })} className="w-full text-sm font-bold font-mono border border-navy/30 rounded p-1 outline-none bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-navy/70 block">Method</label>
                                        <select value={newPaymentForm.method} onChange={e => setNewPaymentForm({ ...newPaymentForm, method: e.target.value })} className="w-full text-sm font-bold border border-navy/30 rounded p-1 outline-none cursor-pointer bg-white">
                                            <option>성남사랑상품권</option>
                                            <option>아동수당</option>
                                            <option>신용카드</option>
                                            <option>성남사랑 + 카드</option>
                                            <option>스쿨뱅킹</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-navy/70 block">Day / Period</label>
                                        <input type="text" value={newPaymentForm.day} onChange={e => setNewPaymentForm({ ...newPaymentForm, day: e.target.value })} className="w-full text-sm font-bold border border-navy/30 rounded p-1 outline-none bg-white" placeholder="ex. 5일" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-navy/70 block">Discount / Memo</label>
                                    <input type="text" value={newPaymentForm.discount} onChange={e => setNewPaymentForm({ ...newPaymentForm, discount: e.target.value })} className="w-full text-sm font-bold border border-navy/30 rounded p-1 outline-none bg-white" />
                                </div>
                                <button onClick={handleAddPayment} className="w-full bg-navy text-white text-xs font-bold py-2 rounded mt-2 flex justify-center items-center gap-1 border-2 border-navy hover:bg-white hover:text-navy transition-colors">
                                    <Save size={14} /> CONFIRM NEW PAYMENT
                                </button>
                            </div>
                        </motion.div>
                    )}
                    {sortedPayments.map((payment) => (
                        <motion.div
                            key={payment.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded shadow-sm border-2 relative overflow-hidden ${payment.isCompleted ? 'bg-gray-100 border-gray-300' :
                                payment.discount ? 'bg-amber-50 border-amber-500' : 'bg-white border-navy'
                                }`}
                        >
                            {/* The dramatically animated Stamp */}
                            <AnimatePresence>
                                {payment.isCompleted && (
                                    <motion.div
                                        initial={{ scale: 3, opacity: 0, rotate: -45 }}
                                        animate={{ scale: 1, opacity: 0.8, rotate: -15, y: -10 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                        className="absolute top-4 right-4 stamp text-[14px] whitespace-nowrap shadow-sm z-20 pointer-events-none"
                                    >
                                        MISSION CLEARED
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {editingPaymentId === payment.id ? (
                                <div className="space-y-3 relative z-10 bg-white/50 py-1">
                                    <div className="flex justify-between items-center border-b border-navy/20 pb-1">
                                        <span className="text-xs font-bold font-stencil text-navy">EDIT TRANSACTION</span>
                                        <button onClick={() => setEditingPaymentId(null)} className="text-navy/50 hover:text-accent-red"><X size={16} /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-navy/70 block">Source</label>
                                            <input type="text" value={paymentForm.source} onChange={e => setPaymentForm({ ...paymentForm, source: e.target.value })} className="w-full text-sm font-bold border border-navy/30 rounded p-1 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-navy/70 block">Amount (₩)</label>
                                            <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} className="w-full text-sm font-bold font-mono border border-navy/30 rounded p-1 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-navy/70 block">Method</label>
                                            <select value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })} className="w-full text-sm font-bold border border-navy/30 rounded p-1 outline-none cursor-pointer">
                                                <option>성남사랑상품권</option>
                                                <option>아동수당</option>
                                                <option>신용카드</option>
                                                <option>성남사랑 + 카드</option>
                                                <option>스쿨뱅킹</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-navy/70 block">Day / Period</label>
                                            <input type="text" value={paymentForm.day} onChange={e => setPaymentForm({ ...paymentForm, day: e.target.value })} className="w-full text-sm font-bold border border-navy/30 rounded p-1 outline-none" placeholder="ex. 5일" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-navy/70 block">Discount / Memo</label>
                                        <input type="text" value={paymentForm.discount} onChange={e => setPaymentForm({ ...paymentForm, discount: e.target.value })} className="w-full text-sm font-bold border border-navy/30 rounded p-1 outline-none" />
                                    </div>
                                    <button onClick={handleSavePayment} className="w-full bg-navy text-white text-xs font-bold py-2 rounded mt-2 flex justify-center items-center gap-1 border-2 border-navy hover:bg-white hover:text-navy transition-colors">
                                        <Save size={14} /> SAVE CHANGES
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="absolute top-2 left-2 z-30 flex flex-col gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingPaymentId(payment.id);
                                                setPaymentForm(payment);
                                            }}
                                            className="text-navy/30 hover:text-navy transition-colors bg-white/80 p-1.5 rounded border border-navy/10 shadow-sm"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePayment(payment.id)}
                                            className="text-navy/30 hover:text-accent-red transition-colors bg-white/80 p-1.5 rounded border border-navy/10 shadow-sm"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-start mb-2 relative z-10 pl-12 pr-4">
                                        <div>
                                            <h3 className={`font-bold text-lg ${payment.isCompleted ? 'text-gray-500 line-through' : 'text-navy'}`}>
                                                {payment.source}
                                            </h3>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                <span className="text-xs bg-black/10 px-1 py-0.5 rounded">D-{payment.day}</span>
                                                {payment.discount && <span className="text-xs bg-amber-200 text-amber-800 px-1 py-0.5 rounded font-bold">{payment.discount}</span>}
                                            </div>
                                        </div>
                                        <div className={`font-mono font-bold shrink-0 ${payment.isCompleted ? 'text-gray-500' : 'text-accent-red'}`}>
                                            {payment.amount.toLocaleString()} ₩
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end mt-4 relative z-10 pl-12">
                                        <div className="text-xs font-bold text-navy/70 flex items-center gap-1">
                                            <AlertCircle size={14} /> {payment.method}
                                        </div>
                                        {!payment.isCompleted ? (
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => processPayment(payment.id)}
                                                className="bg-navy text-white text-xs font-bold px-3 py-2 rounded border-2 border-navy hover:bg-white hover:text-navy transition-colors cursor-pointer"
                                            >
                                                EXECUTE TRANSFER
                                            </motion.button>
                                        ) : (
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="text-accent-green flex items-center gap-1 text-sm font-bold">
                                                    <CheckCircle2 size={16} /> DONE
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono tracking-tighter">{payment.completedAt}</div>
                                                <button onClick={() => undoPayment(payment.id)} className="text-[10px] text-navy/50 hover:text-navy underline flex items-center gap-1 mt-0.5">
                                                    <RotateCcw size={10} /> UNDO
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Archive and History */}
            <div className="flex items-center gap-3 mt-8 border-b-2 border-navy pb-2">
                <History size={24} className="text-navy" />
                <h2 className="font-stencil text-xl flex-1 text-navy">PAYMENT ARCHIVE</h2>
            </div>

            <div className="space-y-4 pb-20">
                {sortedMonths.map((month, index) => {
                    const records = historyByMonth[month];
                    const monthlyTotal = records.reduce((acc, curr) => acc + curr.amount, 0);
                    const isExpanded = expandedArchiveMonth === month || (expandedArchiveMonth === null && index === 0);

                    const [yyyy, mm] = month.split('-');
                    const formattedMonth = `${yyyy}년 ${parseInt(mm, 10)}월`;

                    return (
                        <div key={month} className="bg-white border-2 border-navy/20 rounded-md shadow-sm overflow-hidden">
                            <div
                                onClick={() => setExpandedArchiveMonth(isExpanded ? 'NONE' : month)}
                                className="bg-navy/5 p-3 flex justify-between items-center border-b-2 border-navy/20 cursor-pointer hover:bg-navy/10 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-navy font-mono">{formattedMonth} 지출 내역</h3>
                                    {isExpanded ? <ChevronUp size={16} className="text-navy/50" /> : <ChevronDown size={16} className="text-navy/50" />}
                                </div>
                                <div className="font-mono font-bold text-accent-red">
                                    {monthlyTotal.toLocaleString()} ₩
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
                                        <div className="divide-y divide-navy/10 px-3 py-1">
                                            {records.map(record => (
                                                <div key={record.id} className="py-2 flex justify-between items-center">
                                                    <div>
                                                        <div className="font-bold text-sm text-navy">{record.source}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-gray-500 font-mono">{record.date}</span>
                                                            <span className="text-[10px] bg-navy/10 text-navy px-1 rounded">{record.method}</span>
                                                        </div>
                                                    </div>
                                                    <div className="font-mono font-bold text-sm">
                                                        {record.amount.toLocaleString()} ₩
                                                    </div>
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
    );
}
