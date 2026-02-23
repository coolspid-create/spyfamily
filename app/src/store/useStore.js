import { create } from 'zustand';
import { supabase } from '../lib/supabase';
export const INITIAL_MISSIONS = [];
const INITIAL_WEEKLY = { '월': [], '화': [], '수': [], '목': [], '금': [], '토': [] };
const INITIAL_FUNDS = [];
const INITIAL_PAYMENTS = [];
const INITIAL_HISTORY = [];
const INITIAL_OPS = [];

export const useStore = create((set, get) => ({
    // ---- State ----
    weeklyData: INITIAL_WEEKLY,
    missionsData: INITIAL_MISSIONS,
    funds: INITIAL_FUNDS,
    payments: INITIAL_PAYMENTS,
    opsData: INITIAL_OPS,
    transactionHistory: INITIAL_HISTORY,
    notices: [{ id: 1, text: '신규 학원 교재비 결제 (카드 준비)', checked: false }],
    isLoading: false,

    // Auth State
    session: null,

    // ---- Actions ----
    // 0. Auth Actions
    setSession: (session) => set({ session }),

    signIn: async (email, password) => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        set({ isLoading: false });
        if (error) throw error;
        return data;
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null });
    },

    // 1. Weekly Data Actions
    updateSchedule: async (day, newSchedule) => {
        // Not syncing Schedule individually for now, but keeping local update structure
        set((state) => ({
            weeklyData: { ...state.weeklyData, [day]: newSchedule }
        }));
    },

    // 2. Missions Data Actions
    addMission: (mission) => set((state) => ({
        missionsData: [...state.missionsData, mission].sort((a, b) => a.day - b.day)
    })),
    updateMission: (mission) => set((state) => ({
        missionsData: state.missionsData.map(m => m.id === mission.id ? mission : m).sort((a, b) => a.day - b.day)
    })),
    removeMission: (id) => set((state) => ({
        missionsData: state.missionsData.filter(m => m.id !== id)
    })),

    // 3. Notices Actions
    addNotice: (notice) => set((state) => ({ notices: [...state.notices, notice] })),
    updateNotice: (id) => set((state) => ({
        notices: state.notices.map(n => n.id === id ? { ...n, checked: !n.checked } : n)
    })),
    removeNotice: (id) => set((state) => ({
        notices: state.notices.filter(n => n.id !== id)
    })),

    // 4. Payments Actions
    addPayment: async (paymentData) => {
        const { data, error } = await supabase.from('payment').insert([{
            source: paymentData.source,
            amount: paymentData.amount,
            method: paymentData.method,
            payment_day: parseInt(paymentData.day.replace('일', ''), 10) || 1,
            discount_info: paymentData.discount,
            is_completed: false
        }]).select();

        if (error) { alert('요청 실패: ' + error.message); return; }

        if (data && data.length > 0) {
            const p = data[0];
            const newPayment = {
                id: p.id,
                source: p.source,
                amount: p.amount,
                method: p.method,
                day: `${p.payment_day}일`,
                discount: p.discount_info || '',
                isCompleted: p.is_completed
            };
            const newFundMission = {
                id: p.id,
                type: 'fund',
                day: p.payment_day,
                title: `${p.source} 결제 (${p.amount.toLocaleString()}₩)`
            };
            set((state) => ({
                payments: [...state.payments, newPayment].sort((a, b) => {
                    const numA = parseInt(a.day.replace('일', ''));
                    const numB = parseInt(b.day.replace('일', ''));
                    return numA - numB;
                }),
                missionsData: [...state.missionsData, newFundMission]
            }));
        }
    },
    removePayment: async (paymentId) => {
        const { error } = await supabase.from('payment').delete().eq('id', paymentId);
        if (error) { alert('삭제 실패: ' + error.message); return; }

        set((state) => ({
            payments: state.payments.filter(p => p.id !== paymentId),
            missionsData: state.missionsData.filter(m => m.id !== paymentId),
            transactionHistory: state.transactionHistory.filter(h => h.paymentId !== paymentId)
        }));
    },
    updatePayment: async (payment) => {
        const { error } = await supabase.from('payment').update({
            source: payment.source,
            amount: payment.amount,
            method: payment.method,
            payment_day: parseInt(payment.day.replace('일', ''), 10) || 1,
            discount_info: payment.discount
        }).eq('id', payment.id);

        if (error) { alert('수정 실패: ' + error.message); return; }

        set((state) => {
            const numDay = parseInt(payment.day.replace('일', ''), 10) || 1;
            return {
                payments: state.payments.map(p => p.id === payment.id ? payment : p).sort((a, b) => {
                    const numA = parseInt(a.day.replace('일', ''));
                    const numB = parseInt(b.day.replace('일', ''));
                    return numA - numB;
                }),
                missionsData: state.missionsData.map(m => m.id === payment.id ? {
                    ...m,
                    day: numDay,
                    title: `${payment.source} 결제 (${payment.amount.toLocaleString()}₩)`
                } : m)
            };
        });
    },
    processPayment: async (paymentId) => {
        const state = get();
        const payment = state.payments.find(p => p.id === paymentId);
        if (!payment || payment.isCompleted) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        const currentMonth = `${year}-${month}`;
        const completedAt = `${year}.${month}.${day} ${hours}:${minutes}`;

        let updatedFunds = state.funds;
        if (!payment.method.includes('+') && payment.method !== '신용카드' && payment.method !== '스쿨뱅킹') {
            const fund = state.funds.find(f => f.name === payment.method);
            if (fund && fund.balance < payment.amount) {
                alert(`[WARNING: FUNDS INSUFFICIENT]\n요청 자금: ${payment.amount.toLocaleString()}₩\n현재 잔액: ${fund.balance.toLocaleString()}₩\n자금을 충전하십시오.`);
                return;
            }
            if (fund) {
                const newBalance = fund.balance - payment.amount;
                await supabase.from('asset').update({ balance: newBalance, last_updated: new Date().toISOString() }).eq('id', fund.id);
                updatedFunds = state.funds.map(f => f.id === fund.id ? { ...f, balance: newBalance, updated: '방금 전' } : f);
            }
        }

        await supabase.from('payment').update({ is_completed: true }).eq('id', paymentId);

        const { data: histData } = await supabase.from('transactionhistory').insert([{
            payment_id: paymentId,
            month: currentMonth,
            date_formatted: completedAt,
            source: payment.source,
            amount: payment.amount,
            method: payment.method
        }]).select();

        const newHistoryRecord = histData && histData.length > 0 ? {
            id: histData[0].id,
            paymentId,
            month: currentMonth,
            date: completedAt,
            source: payment.source,
            amount: payment.amount,
            method: payment.method
        } : null;

        set((state) => ({
            funds: updatedFunds,
            payments: state.payments.map(p =>
                p.id === paymentId ? { ...p, isCompleted: true, completedAt } : p
            ),
            transactionHistory: newHistoryRecord ? [newHistoryRecord, ...state.transactionHistory] : state.transactionHistory
        }));
    },
    undoPayment: async (paymentId) => {
        const state = get();
        const payment = state.payments.find(p => p.id === paymentId);
        if (!payment || !payment.isCompleted) return;

        let updatedFunds = state.funds;
        if (!payment.method.includes('+') && payment.method !== '신용카드' && payment.method !== '스쿨뱅킹') {
            const fund = state.funds.find(f => f.name === payment.method);
            if (fund) {
                const newBalance = fund.balance + payment.amount;
                await supabase.from('asset').update({ balance: newBalance, last_updated: new Date().toISOString() }).eq('id', fund.id);
                updatedFunds = state.funds.map(f => f.id === fund.id ? { ...f, balance: newBalance, updated: '방금 전' } : f);
            }
        }

        await supabase.from('payment').update({ is_completed: false }).eq('id', paymentId);
        await supabase.from('transactionhistory').delete().eq('payment_id', paymentId);

        set((state) => ({
            funds: updatedFunds,
            payments: state.payments.map(p =>
                p.id === paymentId ? { ...p, isCompleted: false, completedAt: null } : p
            ),
            transactionHistory: state.transactionHistory.filter(h => h.paymentId !== paymentId)
        }));
    },
    updateFund: async (fund) => {
        await supabase.from('asset').update({ balance: fund.balance, last_updated: new Date().toISOString() }).eq('id', fund.id);
        const todayStr = new Date().toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '');
        set((state) => ({
            funds: state.funds.map(f => f.id === fund.id ? { ...fund, updated: todayStr } : f)
        }));
    },

    // 5. Ops Actions
    setOpsData: (ops) => set({ opsData: ops }),
    addOp: async (opData) => {
        const { data, error } = await supabase.from('ops').insert([{
            title: opData.title,
            execution_date: opData.date.replace(/\./g, '-'),
            description: opData.description,
            priority: opData.priority,
            status: 'PENDING'
        }]).select();

        if (error) { alert('요청 실패: ' + error.message); return; }

        if (data && data.length > 0) {
            const newOp = data[0];
            const parsedOp = {
                id: newOp.id,
                title: newOp.title,
                date: newOp.execution_date.replace(/-/g, '.'),
                description: newOp.description,
                priority: newOp.priority,
                status: newOp.status,
                participants: { mom: false, dad: false },
                checklist: []
            };
            const newEventMission = {
                id: newOp.id,
                type: 'event',
                day: parseInt(parsedOp.date.split('.')[2], 10),
                title: parsedOp.title
            };
            set(state => ({
                opsData: [...state.opsData, parsedOp],
                missionsData: [...state.missionsData, newEventMission]
            }));
        }
    },
    removeOp: async (id) => {
        const { error } = await supabase.from('ops').delete().eq('id', id);
        if (error) { alert('삭제 실패: ' + error.message); return; }

        set(state => ({
            opsData: state.opsData.filter(op => op.id !== id),
            missionsData: state.missionsData.filter(m => m.id !== id)
        }));
    },
    updateOp: async (updatedOp) => {
        const state = get();
        const oldOp = state.opsData.find(o => o.id === updatedOp.id);

        const { error } = await supabase.from('ops').update({
            title: updatedOp.title,
            execution_date: updatedOp.date.replace(/\./g, '-'),
            description: updatedOp.description,
            priority: updatedOp.priority,
            status: updatedOp.status
        }).eq('id', updatedOp.id);

        if (error) { console.error('Ops update error:', error); alert('업데이트 실패: ' + error.message); return; }

        // Sync Participants
        if (oldOp && oldOp.participants !== updatedOp.participants) {
            await supabase.from('opsparticipant').delete().eq('ops_id', updatedOp.id);
            const pInserts = [];
            if (updatedOp.participants.mom) pInserts.push({ ops_id: updatedOp.id, agent_id: 'mom', is_assigned: true });
            if (updatedOp.participants.dad) pInserts.push({ ops_id: updatedOp.id, agent_id: 'dad', is_assigned: true });
            if (pInserts.length > 0) await supabase.from('opsparticipant').insert(pInserts);
        }

        // Sync Checklist
        if (oldOp && oldOp.checklist !== updatedOp.checklist) {
            const newItems = updatedOp.checklist.filter(c => String(c.id).startsWith('c-'));
            if (newItems.length > 0) {
                const { data } = await supabase.from('opschecklist').insert(newItems.map(c => ({
                    ops_id: updatedOp.id,
                    task: c.task,
                    is_checked: c.checked
                }))).select();

                if (data) {
                    updatedOp.checklist = updatedOp.checklist.map(c => {
                        const dbItem = data.find(d => d.task === c.task);
                        return dbItem ? { ...c, id: dbItem.id } : c;
                    });
                }
            }
            const existingItems = updatedOp.checklist.filter(c => !String(c.id).startsWith('c-'));
            for (let c of existingItems) {
                await supabase.from('opschecklist').update({ is_checked: c.checked }).eq('id', c.id);
            }
        }

        set(state => ({
            opsData: state.opsData.map(op => op.id === updatedOp.id ? updatedOp : op),
            missionsData: state.missionsData.map(m => m.id === updatedOp.id ? {
                ...m,
                day: parseInt(updatedOp.date.split('.')[2], 10),
                title: updatedOp.title
            } : m)
        }));
    },

    // ---- Async Actions (Supabase) ----
    fetchDataFromDB: async () => {
        set({ isLoading: true });
        try {
            // Fetch Assets
            const { data: assetsData } = await supabase.from('asset').select('*').order('last_updated', { ascending: false });
            if (assetsData) {
                const formattedFunds = assetsData.map(a => ({
                    id: a.id,
                    name: a.name,
                    balance: a.balance,
                    updated: new Date(a.last_updated).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '')
                }));
                set({ funds: formattedFunds });
            }

            // Fetch Payments
            const { data: paymentsData } = await supabase.from('payment').select('*').order('payment_day', { ascending: true });
            if (paymentsData) {
                const formattedPayments = paymentsData.map(p => ({
                    id: p.id,
                    source: p.source,
                    amount: p.amount,
                    method: p.method,
                    day: `${p.payment_day}일`,
                    discount: p.discount_info || '',
                    isCompleted: p.is_completed
                }));
                set({ payments: formattedPayments });

                // Update Planner Missions based on Payments
                const fundMissions = paymentsData.map(p => ({
                    id: p.id,
                    type: 'fund',
                    day: p.payment_day,
                    title: `${p.source} 결제 (${p.amount.toLocaleString()}₩)`
                }));

                // Fetch Ops for Planner & Ops Tab
                const { data: opsData } = await supabase.from('ops').select('*, opschecklist(*), opsparticipant(*)');
                if (opsData) {
                    const parsedOps = opsData.map(o => {
                        const momParticipant = o.opsparticipant?.find(p => p.agent_id === 'mom');
                        const dadParticipant = o.opsparticipant?.find(p => p.agent_id === 'dad');

                        return {
                            id: o.id,
                            title: o.title,
                            date: o.execution_date.replace(/-/g, '.'),
                            description: o.description,
                            priority: o.priority,
                            status: o.status,
                            participants: {
                                mom: momParticipant ? momParticipant.is_assigned : false,
                                dad: dadParticipant ? dadParticipant.is_assigned : false
                            },
                            checklist: (o.opschecklist || []).map(c => ({
                                id: c.id,
                                task: c.task,
                                checked: c.is_checked
                            }))
                        };
                    });
                    set({ opsData: parsedOps });

                    const eventMissions = parsedOps.map(o => ({
                        id: o.id,
                        type: 'event',
                        day: parseInt(o.date.split('.')[2], 10), // extract day
                        title: o.title
                    }));
                    set({ missionsData: [...fundMissions, ...eventMissions] });
                } else {
                    set({ missionsData: fundMissions });
                }
            }

            // Fetch Transaction History
            const { data: historyData } = await supabase.from('transactionhistory').select('*').order('created_at', { ascending: false });
            if (historyData) {
                const formattedHistory = historyData.map(h => ({
                    id: h.id,
                    paymentId: h.payment_id,
                    month: h.month,
                    date: h.date_formatted,
                    source: h.source,
                    amount: h.amount,
                    method: h.method
                }));
                set({ transactionHistory: formattedHistory });
            }

            // Fetch Schedule
            const { data: scheduleData } = await supabase.from('schedule').select('*').order('start_time', { ascending: true });
            if (scheduleData) {
                const newWeekly = { '월': [], '화': [], '수': [], '목': [], '금': [], '토': [] };
                scheduleData.forEach(s => {
                    if (newWeekly[s.day_of_week]) {
                        newWeekly[s.day_of_week].push({
                            id: s.id,
                            time: s.start_time.slice(0, 5), // 'HH:MM:SS' -> 'HH:MM'
                            title: s.title,
                            agent: s.pickup_agent || s.drop_agent || '자율',
                            location: s.location || '',
                            isEarly: s.is_early,
                            isUrgent: s.is_urgent
                        });
                    }
                });
                set({ weeklyData: newWeekly });
            }

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            set({ isLoading: false });
        }
    }
}));
