import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Plus, Save, Trash2, Edit2 } from 'lucide-react';

const INITIAL_FUNDS = [
    { id: 'A01', name: '성남사랑상품권', balance: 3326, updated: '26.02.03' },
    { id: 'A02', name: '아동수당', balance: 124100, updated: '26.02.03' },
];

const INITIAL_PAYMENTS = [
    { id: 'P01', source: '돌핀수영', amount: 185000, method: '신용카드', day: '27일', discount: '', isCompleted: false },
    { id: 'P02', source: '신동음악학원', amount: 140000, method: '성남사랑 + 카드', day: '5일', discount: '분할결제 데이터 취합', isCompleted: false },
    { id: 'P03', source: '삼성영어셀레나', amount: 200000, method: '성남사랑상품권', day: '5~6일', discount: '', isCompleted: false },
    { id: 'P04', source: '김재희 미술교실', amount: 70000, method: '성남사랑상품권', day: '3~10일', discount: '', isCompleted: false },
    { id: 'P05', source: 'MTA 태권도', amount: 160000, method: '아동수당', day: '11~14일', discount: '', isCompleted: false },
    { id: 'P07', source: '스쿨뱅킹 (방과후)', amount: 335000, method: '스쿨뱅킹', day: '16일 전날', discount: '자동이체', isCompleted: false },
];

export const INITIAL_MISSIONS = [
    { id: 'm1', type: 'fund', day: 3, title: '김재희 미술교실 결제 (70,000₩)' },
    { id: 'm2', type: 'fund', day: 5, title: '신동음악학원 분할결제' },
    { id: 'm3', type: 'fund', day: 5, title: '삼성영어셀레나 결제 (200,000₩)' },
    { id: 'm4', type: 'fund', day: 6, title: '삼성영어셀레나 결제 기한' },
    { id: 'm5', type: 'fund', day: 11, title: 'MTA 태권도 결제 (160,000₩)' },
    { id: 'm6', type: 'fund', day: 15, title: '스쿨뱅킹 잔액 충전 (335,000₩)' },
    { id: 'm7', type: 'fund', day: 19, title: 'AK 아이체스 결제' },
    { id: 'm8', type: 'fund', day: 20, title: '한마음 수영장 결제' },
    { id: 'm9', type: 'fund', day: 27, title: '돌핀수영 결제 (185,000₩)' },
    { id: 'm10', type: 'event', day: 18, title: '가족 나들이 (Y-Tab 연동 예정)' }
];

export default function PaymentTab() {
    const [funds, setFunds] = useState(INITIAL_FUNDS);
    const [payments, setPayments] = useState(INITIAL_PAYMENTS);
    const [missionsData, setMissionsData] = useState(INITIAL_MISSIONS);
    const [manageMissionForm, setManageMissionForm] = useState(null);

    const openManageMissionForm = (mission = null) => {
        if (mission) {
            setManageMissionForm(mission);
        } else {
            setManageMissionForm({ id: Date.now().toString(), type: 'fund', day: 1, title: '' });
        }
    };

    const saveManageMissionData = () => {
        if (!manageMissionForm.title.trim()) return;
        const exists = missionsData.find(m => m.id === manageMissionForm.id);
        if (exists) {
            setMissionsData(missionsData.map(m => m.id === manageMissionForm.id ? manageMissionForm : m));
        } else {
            setMissionsData([...missionsData, manageMissionForm].sort((a, b) => a.day - b.day));
        }
        setManageMissionForm(null);
    };

    const removeManageData = (id) => {
        setMissionsData(missionsData.filter(m => m.id !== id));
    };

    const handlePayment = (payment) => {
        if (payment.isCompleted) return;

        if (payment.method.includes('+') || payment.method === '스쿨뱅킹') {
            // 분할 결제 또는 자동이체는 경보만 시뮬레이션
            setPayments(prev => prev.map(p =>
                p.id === payment.id ? { ...p, isCompleted: true } : p
            ));
            return;
        }

        const fund = funds.find(f => f.name === payment.method);
        if (fund && payment.method !== '신용카드' && fund.balance < payment.amount) {
            alert(`[WARNING: FUNDS INSUFFICIENT]\n요청 자금: ${payment.amount.toLocaleString()}₩\n현재 잔액: ${fund.balance.toLocaleString()}₩\n자금을 충전하십시오.`);
            return;
        }

        // Deduct from matching fund
        setFunds(prev => prev.map(fund => {
            if (fund.name === payment.method && payment.method !== '신용카드') {
                return { ...fund, balance: fund.balance - payment.amount, updated: 'Just now' };
            }
            return fund;
        }));

        // Mark payment as completed
        setPayments(prev => prev.map(p =>
            p.id === payment.id ? { ...p, isCompleted: true } : p
        ));
    };

    const methodTotals = payments.reduce((acc, p) => {
        const method = p.method;
        acc[method] = (acc[method] || 0) + p.amount;
        acc.TOTAL = (acc.TOTAL || 0) + p.amount;
        return acc;
    }, { TOTAL: 0 });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="font-stencil text-xl border-b-2 border-navy flex-1">ESTIMATED FUNDS SUMMARY</h2>
            </div>

            <div className="bg-navy text-white rounded shadow-sm p-4 border-2 border-navy">
                <h3 className="font-bold mb-3 border-b border-white/20 pb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-accent-green" /> 결제 수단별 예상 금액
                </h3>
                <div className="space-y-2 mb-4">
                    {Object.entries(methodTotals).filter(([k]) => k !== 'TOTAL').map(([method, amount]) => (
                        <div key={method} className="flex justify-between items-center text-sm font-bold opacity-90 border-b border-dashed border-white/10 pb-1">
                            <span>{method}</span>
                            <span className="font-mono">{amount.toLocaleString()} ₩</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-accent-red bg-white p-2 rounded shadow-inner">
                    <span>총 합계 (TOTAL)</span>
                    <span className="font-mono">{methodTotals.TOTAL.toLocaleString()} ₩</span>
                </div>
            </div>

            <div className="flex items-center gap-3 mt-8">
                <h2 className="font-stencil text-xl border-b-2 border-navy flex-1">REQUIRED TRANSACTIONS</h2>
            </div>

            <div className="space-y-4 pb-4">
                {payments.map(payment => (
                    <div key={payment.id} className={`p-4 rounded shadow-sm border-2 relative overflow-hidden ${payment.isCompleted ? 'bg-gray-100 border-gray-300' :
                        payment.discount ? 'bg-amber-50 border-amber-500' : 'bg-white border-navy'
                        }`}>
                        {payment.isCompleted && (
                            <div className="absolute top-2 right-[-10px] stamp text-[10px] whitespace-nowrap">MISSION CLEARED</div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className={`font-bold text-lg ${payment.isCompleted ? 'text-gray-500 line-through' : 'text-navy'}`}>
                                    {payment.source}
                                </h3>
                                <span className="text-xs bg-black/10 px-1 py-0.5 rounded mr-1">D-{payment.day}</span>
                                {payment.discount && <span className="text-xs bg-amber-200 text-amber-800 px-1 py-0.5 rounded font-bold">{payment.discount}</span>}
                            </div>
                            <div className={`font-mono font-bold ${payment.isCompleted ? 'text-gray-500' : 'text-accent-red'}`}>
                                {payment.amount.toLocaleString()} ₩
                            </div>
                        </div>

                        <div className="flex justify-between items-end mt-4">
                            <div className="text-xs font-bold text-navy/70 flex items-center gap-1">
                                <AlertCircle size={14} /> {payment.method}
                            </div>
                            {!payment.isCompleted ? (
                                <button
                                    onClick={() => handlePayment(payment)}
                                    className="bg-navy text-white text-xs font-bold px-3 py-2 rounded border-2 border-navy hover:bg-white hover:text-navy transition-colors cursor-pointer"
                                >
                                    EXECUTE TRANSFER
                                </button>
                            ) : (
                                <div className="text-accent-green flex items-center gap-1 text-sm font-bold">
                                    <CheckCircle2 size={16} /> DONE
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-3 mt-8">
                <h2 className="font-stencil text-xl border-b-2 border-navy flex-1">CALENDAR DATA MANAGER</h2>
            </div>

            <div className="bg-navy/5 p-4 rounded border-2 border-navy/20 space-y-4 pb-4">
                <button onClick={() => openManageMissionForm()} className="w-full bg-navy text-background font-bold text-sm py-3 rounded border-2 border-navy flex justify-center items-center gap-2 hover:bg-white hover:text-navy transition-colors">
                    <Plus size={16} /> 새로운 일정/결제일 달력에 추가
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
                        <div key={item.id} className="bg-white border-2 border-navy rounded p-3 flex justify-between items-center group shadow-sm">
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
                                <button onClick={() => removeManageData(item.id)} className="p-2 hover:bg-accent-red/10 rounded text-accent-red transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
