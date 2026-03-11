import { create } from 'zustand';
import { supabase } from '../lib/supabase';
const INITIAL_WEEKLY = {
    '월': [{ title: '피아노 학원', time: '14:00', agent: 'mom', isUrgent: false, isEarly: false, location: '상가 2층' }, { title: '수학 숙제', time: '16:00', agent: 'dad', isUrgent: true, isEarly: false, location: '집' }],
    '화': [{ title: '태권도', time: '15:30', agent: 'dad', isUrgent: false, isEarly: false, location: '동네 태권도장' }],
    '수': [{ title: '영어 과외', time: '17:00', agent: 'mom', isUrgent: false, isEarly: false, location: '집' }],
    '목': [{ title: '미술 학원', time: '14:00', agent: 'dad', isUrgent: false, isEarly: false, location: '상가 1층' }],
    '금': [{ title: '수영 강습', time: '16:00', agent: 'mom', isUrgent: true, isEarly: false, location: '스포츠센터' }],
    '토': [{ title: '가족 나들이 (공원)', time: '10:00', agent: 'dad', isUrgent: false, isEarly: false, location: '올림픽공원' }],
    '일': [{ title: '체스 연습', time: '13:00', agent: 'mom', isUrgent: false, isEarly: false, location: '집' }]
};
const INITIAL_MISSIONS = [
    { id: 'm1', type: 'fund', title: '아동수당', day: 25 },
    { id: 'm2', type: 'event', year: 2026, month: 5, day: 5, title: '어린이날 놀이공원' }
];
const INITIAL_FUNDS = [
    { id: 'f1', name: '아동수당 (생활비)', balance: 450000, updated: '26.03.01' },
    { id: 'f2', name: '특별 용돈', balance: 50000, updated: '26.03.05' }
];
const INITIAL_PAYMENTS = [
    { id: 'p1', source: '아동수당 (생활비)', amount: 150000, method: '계좌이체', day: '10일', discount: '', isCompleted: false },
    { id: 'p2', source: '특별 용돈', amount: 30000, method: '카드', day: '15일', discount: '청구할인 5%', isCompleted: false },
    { id: 'p3', source: '아동수당 (생활비)', amount: 200000, method: '자동이체', day: '25일', discount: '', isCompleted: true, completedAt: '2026-03-25' }
];
const INITIAL_HISTORY = [
    { id: 'h1', month: '2026-02', date_formatted: '02.10', source: '아동수당', amount: 150000, method: '계좌이체' }
];
const INITIAL_OPS = [
    { id: 'o1', title: '어린이날 놀이공원', date: '2026.05.05', description: '에버랜드 자유이용권 예매 및 렌터카 예약', priority: '상', status: 'ONGOING', participants: { mom: true, dad: true }, checklist: [{ id: 'c1', task: '티켓 예매', checked: true }, { id: 'c2', task: '렌터카 예약', checked: false }] }
];
const INITIAL_DAILY = [
    { id: 'd1', task_name: '방 정리하기', is_completed: true, assigned_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}` },
    { id: 'd2', task_name: '수학 숙제 2장', is_completed: false, assigned_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}` },
    { id: 'd3', task_name: '저녁식사 후 양치질', is_completed: false, assigned_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}` }
];

const savedProfiles = (() => {
    try {
        return JSON.parse(localStorage.getItem('spy_childProfiles')) || { child1: '대상 1', child2: '대상 2', child3: '대상 3' };
    } catch {
        return { child1: '대상 1', child2: '대상 2', child3: '대상 3' };
    }
})();
const savedChildCount = (() => {
    try {
        return parseInt(localStorage.getItem('spy_childCount')) || 1;
    } catch {
        return 1;
    }
})();
const savedCurrentChild = (() => {
    try {
        return localStorage.getItem('spy_currentChild') || 'child1';
    } catch {
        return 'child1';
    }
})();

const persistGuestData = (config) => (set, get, api) => config((args) => {
    set(args);
    const state = get();
    if (!state.session && state.isGuestMode) {
        const dataToSave = {
            weeklyData: state.weeklyData,
            missionsData: state.missionsData,
            funds: state.funds,
            payments: state.payments,
            opsData: state.opsData,
            transactionHistory: state.transactionHistory,
            notices: state.notices,
            dailyTasks: state.dailyTasks
        };
        localStorage.setItem(`spy_guestData_${state.currentChild}`, JSON.stringify(dataToSave));
    }
}, get, api);

export const useStore = create(persistGuestData((set, get) => ({
    // ---- State ----
    weeklyData: INITIAL_WEEKLY,
    missionsData: INITIAL_MISSIONS,
    funds: INITIAL_FUNDS,
    payments: INITIAL_PAYMENTS,
    opsData: INITIAL_OPS,
    transactionHistory: INITIAL_HISTORY,
    notices: [],
    dailyTasks: [],
    isLoading: false,
    // Multi-Child Profile State
    childCount: savedChildCount, // Number of children currently managed (max 3)
    currentChild: savedCurrentChild,
    childProfiles: savedProfiles,

    // Auth State
    session: null,
    isAuthChecking: true,
    isGuestMode: false,

    setGuestMode: (val) => {
        set({ isGuestMode: val, isAuthChecking: false });
        if (val) {
            get().fetchDataFromDB();
        }
    },

    // ---- Actions ----
    setCurrentChild: async (childId) => {
        localStorage.setItem('spy_currentChild', childId);
        set({ currentChild: childId });
        await get().syncProfilesToCloud();
        get().fetchDataFromDB();
    },
    addChildProfile: async () => {
        const counts = get().childCount;
        if (counts < 3) {
            const nextIdx = counts + 1;
            localStorage.setItem('spy_childCount', nextIdx.toString());
            set({ childCount: nextIdx, currentChild: `child${nextIdx}` });
            await get().syncProfilesToCloud();
            get().fetchDataFromDB();
        }
    },
    removeChildProfile: async () => {
        const counts = get().childCount;
        if (counts > 1) {
            const nextIdx = counts - 1;
            localStorage.setItem('spy_childCount', nextIdx.toString());
            const current = get().currentChild;
            if (current === `child${counts}`) {
                set({ childCount: nextIdx, currentChild: `child${nextIdx}` });
            } else {
                set({ childCount: nextIdx });
            }
            await get().syncProfilesToCloud();
            get().fetchDataFromDB();
        }
    },
    updateChildName: async (id, name) => {
        if (!name.trim()) return;
        const newProfiles = { ...get().childProfiles, [id]: name };
        localStorage.setItem('spy_childProfiles', JSON.stringify(newProfiles));
        set({ childProfiles: newProfiles });
        await get().syncProfilesToCloud();
    },
    syncProfilesToCloud: async () => {
        const { childCount, childProfiles, currentChild, session } = get();
        if (session) {
            await supabase.auth.updateUser({
                data: {
                    spy_childCount: childCount,
                    spy_childProfiles: childProfiles,
                    spy_currentChild: currentChild
                }
            });
        }
    },

    // 0. Auth Actions
    setSession: (session) => {
        if (session && session.user && session.user.user_metadata) {
            const meta = session.user.user_metadata;
            if (meta.spy_childCount) {
                localStorage.setItem('spy_childCount', meta.spy_childCount.toString());
                set({ childCount: meta.spy_childCount });
            }
            if (meta.spy_childProfiles) {
                localStorage.setItem('spy_childProfiles', JSON.stringify(meta.spy_childProfiles));
                set({ childProfiles: meta.spy_childProfiles });
            }
            if (meta.spy_currentChild) {
                localStorage.setItem('spy_currentChild', meta.spy_currentChild);
                set({ currentChild: meta.spy_currentChild });
            }
        }
        set({ session, isAuthChecking: false });
    },

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

    signUp: async (email, password) => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.signUp({
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
        set((state) => ({
            weeklyData: { ...state.weeklyData, [day]: newSchedule }
        }));
    },
    addSchedule: async (day, item) => {
        const { currentChild, session, isGuestMode } = get();
        if (!session && isGuestMode) {
            const newItem = {
                id: 'g_' + Date.now(),
                time: item.time,
                title: item.title,
                agent: item.agent,
                location: item.location || '',
                isEarly: item.isUrgent || false,
                isUrgent: item.isEarly || false
            };
            set(s => {
                const newWeekly = { ...s.weeklyData };
                newWeekly[day] = [...(newWeekly[day] || []), newItem].sort((a, b) => a.time.localeCompare(b.time));
                return { weeklyData: newWeekly };
            });
            return;
        }

        const { error } = await supabase.from('schedule').insert([{
            title: item.title,
            day_of_week: day,
            start_time: item.time + ':00',
            pickup_agent: item.agent,
            drop_agent: item.agent,
            location: item.location || '',
            is_urgent: item.isUrgent || false,
            is_early: item.isEarly || false,
            child_id: currentChild
        }]).select();
        if (error) { alert('일정 추가 실패: ' + error.message); return; }
        await get().fetchDataFromDB();
    },
    updateScheduleItem: async (item) => {
        const { session, isGuestMode } = get();
        if (!session && isGuestMode) {
            set(s => {
                const newWeekly = { ...s.weeklyData };
                for (const day in newWeekly) {
                    newWeekly[day] = newWeekly[day].map(x =>
                        x.id === item.id
                            ? { ...x, ...item, time: item.time, title: item.title, agent: item.agent, location: item.location }
                            : x
                    ).sort((a, b) => a.time.localeCompare(b.time));
                }
                return { weeklyData: newWeekly };
            });
            return;
        }

        const { error } = await supabase.from('schedule').update({
            title: item.title,
            start_time: item.time + (item.time.length === 5 ? ':00' : ''),
            pickup_agent: item.agent,
            drop_agent: item.agent,
            location: item.location || ''
        }).eq('id', item.id);
        if (error) { alert('수정 실패: ' + error.message); return; }
        await get().fetchDataFromDB();
    },
    removeScheduleItem: async (id) => {
        const { session, isGuestMode } = get();
        if (!session && isGuestMode) {
            set(s => {
                const newWeekly = { ...s.weeklyData };
                for (const day in newWeekly) {
                    newWeekly[day] = newWeekly[day].filter(x => x.id !== id);
                }
                return { weeklyData: newWeekly };
            });
            return;
        }

        const { error } = await supabase.from('schedule').delete().eq('id', id);
        if (error) { alert('삭제 실패: ' + error.message); return; }
        await get().fetchDataFromDB();
    },

    // 2. Missions Data Actions (Supabase Sync)
    addMission: async (mission) => {
        set({ isLoading: true });
        const { currentChild, session, isGuestMode } = get();

        if (!session && isGuestMode) {
            const id = 'g_' + Date.now();
            if (mission.type === 'fund') {
                const newPayment = { id, source: mission.title.replace(' 결제', ''), amount: 0, method: '미지정', day: `${mission.day} 일`, discount: '', isCompleted: false };
                const newFundMission = { id, type: 'fund', day: mission.day, title: mission.title };
                set(s => ({
                    payments: [...s.payments, newPayment].sort((a, b) => parseInt(a.day) - parseInt(b.day)),
                    missionsData: [...s.missionsData, newFundMission]
                }));
            } else {
                const year = mission.year || new Date().getFullYear();
                const month = mission.month || new Date().getMonth() + 1;
                const newOp = { id, title: mission.title, date: `${year}.${String(month).padStart(2, '0')}.${String(mission.day).padStart(2, '0')}`, description: '', priority: 'LOW', status: 'PENDING', participants: { mom: false, dad: false }, checklist: [] };
                const newEventMission = { id, type: 'event', year, month, day: mission.day, title: mission.title };
                set(s => ({ opsData: [...s.opsData, newOp], missionsData: [...s.missionsData, newEventMission] }));
            }
            set({ isLoading: false });
            return;
        }

        if (mission.type === 'fund') {
            const { error } = await supabase.from('payment').insert([{
                source: mission.title.replace(' 결제', ''),
                amount: 0,
                method: '미지정',
                payment_day: mission.day,
                is_completed: false,
                child_id: currentChild
            }]);
            if (error) alert('일정 추가 실패: ' + error.message);
        } else {
            const year = mission.year || new Date().getFullYear();
            const month = String(mission.month || new Date().getMonth() + 1).padStart(2, '0');
            const day = String(mission.day).padStart(2, '0');
            const { error } = await supabase.from('ops').insert([{
                title: mission.title,
                execution_date: `${year}-${month}-${day}`,
                status: 'PENDING',
                priority: 'LOW',
                child_id: currentChild
            }]);
            if (error) alert('일정 추가 실패: ' + error.message);
        }
        await get().fetchDataFromDB();
        set({ isLoading: false });
    },
    updateMission: async (mission) => {
        set({ isLoading: true });
        const { session, isGuestMode } = get();

        if (!session && isGuestMode) {
            if (mission.type === 'fund') {
                set(s => ({
                    payments: s.payments.map(p => p.id === mission.id ? { ...p, source: mission.title.replace(' 결제', ''), day: `${mission.day} 일` } : p).sort((a, b) => parseInt(a.day) - parseInt(b.day)),
                    missionsData: s.missionsData.map(m => m.id === mission.id ? { ...m, title: mission.title, day: mission.day } : m)
                }));
            } else {
                const year = mission.year || new Date().getFullYear();
                const month = mission.month || new Date().getMonth() + 1;
                set(s => ({
                    opsData: s.opsData.map(o => o.id === mission.id ? { ...o, title: mission.title, date: `${year}.${String(month).padStart(2, '0')}.${String(mission.day).padStart(2, '0')}` } : o),
                    missionsData: s.missionsData.map(m => m.id === mission.id ? { ...m, title: mission.title, year, month, day: mission.day } : m)
                }));
            }
            set({ isLoading: false });
            return;
        }

        if (mission.type === 'fund') {
            const { error } = await supabase.from('payment').update({
                source: mission.title.replace(' 결제', ''),
                payment_day: mission.day
            }).eq('id', mission.id);
            if (error) alert('일정 수정 실패: ' + error.message);
        } else {
            const year = mission.year || new Date().getFullYear();
            const month = String(mission.month || new Date().getMonth() + 1).padStart(2, '0');
            const day = String(mission.day).padStart(2, '0');
            const { error } = await supabase.from('ops').update({
                title: mission.title,
                execution_date: `${year}-${month}-${day}`
            }).eq('id', mission.id);
            if (error) alert('일정 수정 실패: ' + error.message);
        }
        await get().fetchDataFromDB();
        set({ isLoading: false });
    },
    removeMission: async (id) => {
        const state = get();
        const mission = state.missionsData.find(m => m.id === id);
        if (!mission) return;

        if (!state.session && state.isGuestMode) {
            set((s) => ({
                payments: s.payments.filter(p => p.id !== id),
                opsData: s.opsData.filter(o => o.id !== id),
                missionsData: s.missionsData.filter(m => m.id !== id)
            }));
            return;
        }

        if (mission.type === 'fund') {
            const { error } = await supabase.from('payment').delete().eq('id', id);
            if (error) { alert('삭제 실패: ' + error.message); return; }
        } else {
            const { error } = await supabase.from('ops').delete().eq('id', id);
            if (error) { alert('삭제 실패: ' + error.message); return; }
        }

        set((state) => ({
            payments: state.payments.filter(p => p.id !== id),
            opsData: state.opsData.filter(o => o.id !== id),
            missionsData: state.missionsData.filter(m => m.id !== id)
        }));
    },

    // 3. Notices Actions (Supabase Sync)
    addNotice: async (notice) => {
        const { session, isGuestMode } = get();
        if (!session && isGuestMode) {
            set(s => ({ notices: [...s.notices, { id: 'g_' + Date.now(), text: notice.text, checked: notice.checked }] }));
            return;
        }
        const { data, error } = await supabase.from('notice').insert([{
            text: notice.text,
            is_checked: notice.checked
        }]).select();
        if (error) { console.error(error); return; }
        if (data && data.length > 0) {
            set((state) => ({ notices: [...state.notices, { id: data[0].id, text: data[0].text, checked: data[0].is_checked }] }));
        }
    },
    updateNotice: async (id) => {
        const state = get();
        const notice = state.notices.find(n => n.id === id);
        if (notice) {
            if (!state.session && state.isGuestMode) {
                set(s => ({ notices: s.notices.map(n => n.id === id ? { ...n, checked: !n.checked } : n) }));
                return;
            }
            await supabase.from('notice').update({ is_checked: !notice.checked }).eq('id', id);
            set((state) => ({
                notices: state.notices.map(n => n.id === id ? { ...n, checked: !n.checked } : n)
            }));
        }
    },
    removeNotice: async (id) => {
        const state = get();
        if (!state.session && state.isGuestMode) {
            set(s => ({ notices: s.notices.filter(n => n.id !== id) }));
            return;
        }
        await supabase.from('notice').delete().eq('id', id);
        set((state) => ({
            notices: state.notices.filter(n => n.id !== id)
        }));
    },

    // 4. Payments Actions
    addPayment: async (paymentData) => {
        const { currentChild, session, isGuestMode } = get();
        if (!session && isGuestMode) {
            const id = 'g_' + Date.now();
            const newPayment = {
                id, source: paymentData.source, amount: paymentData.amount, method: paymentData.method,
                day: `${parseInt(paymentData.day.replace('일', ''), 10) || 1} 일`, discount: paymentData.discount, isCompleted: false
            };
            const newFundMission = {
                id, type: 'fund', day: parseInt(paymentData.day.replace('일', ''), 10) || 1, title: `${paymentData.source} 결제(${paymentData.amount.toLocaleString()}₩)`
            };
            set(s => ({
                payments: [...s.payments, newPayment].sort((a, b) => parseInt(a.day.replace('일', '')) - parseInt(b.day.replace('일', ''))),
                missionsData: [...s.missionsData, newFundMission]
            }));
            return;
        }

        const { data, error } = await supabase.from('payment').insert([{
            source: paymentData.source,
            amount: paymentData.amount,
            method: paymentData.method,
            payment_day: parseInt(paymentData.day.replace('일', ''), 10) || 1,
            discount_info: paymentData.discount,
            is_completed: false,
            child_id: currentChild
        }]).select();

        if (error) { alert('요청 실패: ' + error.message); return; }

        if (data && data.length > 0) {
            const p = data[0];
            const newPayment = {
                id: p.id,
                source: p.source,
                amount: p.amount,
                method: p.method,
                day: `${p.payment_day} 일`,
                discount: p.discount_info || '',
                isCompleted: p.is_completed
            };
            const newFundMission = {
                id: p.id,
                type: 'fund',
                day: p.payment_day,
                title: `${p.source} 결제(${p.amount.toLocaleString()}₩)`
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
        const { session, isGuestMode } = get();
        if (!session && isGuestMode) {
            set(s => ({
                payments: s.payments.filter(p => p.id !== paymentId),
                missionsData: s.missionsData.filter(m => m.id !== paymentId)
            }));
            return;
        }

        const { error } = await supabase.from('payment').delete().eq('id', paymentId);
        if (error) { alert('삭제 실패: ' + error.message); return; }

        set((state) => ({
            payments: state.payments.filter(p => p.id !== paymentId),
            missionsData: state.missionsData.filter(m => m.id !== paymentId)
        }));
    },
    updatePayment: async (payment) => {
        const { session, isGuestMode } = get();
        if (!session && isGuestMode) {
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
                        title: `${payment.source} 결제(${payment.amount.toLocaleString()}₩)`
                    } : m)
                };
            });
            return;
        }

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
                    title: `${payment.source} 결제(${payment.amount.toLocaleString()}₩)`
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

        if (!state.session && state.isGuestMode) {
            const newHistoryRecord = {
                id: 'g_' + Date.now(),
                paymentId,
                month: currentMonth,
                date_formatted: completedAt,
                source: payment.source,
                amount: payment.amount,
                method: payment.method
            };
            set(s => ({
                payments: s.payments.map(p => p.id === paymentId ? { ...p, isCompleted: true, completedAt, justCompleted: true } : p),
                transactionHistory: [newHistoryRecord, ...s.transactionHistory]
            }));
            return;
        }

        await supabase.from('payment').update({ is_completed: true }).eq('id', paymentId);

        const { data: histData } = await supabase.from('transactionhistory').insert([{
            payment_id: paymentId,
            month: currentMonth,
            date_formatted: completedAt,
            source: payment.source,
            amount: payment.amount,
            method: payment.method,
            child_id: get().currentChild
        }]).select();

        const newHistoryRecord = histData && histData.length > 0 ? {
            id: histData[0].id,
            paymentId,
            month: currentMonth,
            date_formatted: completedAt,
            source: payment.source,
            amount: payment.amount,
            method: payment.method
        } : null;

        set((state) => ({
            funds: updatedFunds,
            payments: state.payments.map(p =>
                p.id === paymentId ? { ...p, isCompleted: true, completedAt, justCompleted: true } : p
            ),
            transactionHistory: newHistoryRecord ? [newHistoryRecord, ...state.transactionHistory] : state.transactionHistory
        }));
    },
    undoPayment: async (paymentId) => {
        const state = get();
        const payment = state.payments.find(p => p.id === paymentId);
        if (!payment || !payment.isCompleted) return;

        let updatedFunds = state.funds;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const currentMonth = `${year}-${month}`;

        if (!state.session && state.isGuestMode) {
            set((s) => ({
                payments: s.payments.map(p =>
                    p.id === paymentId ? { ...p, isCompleted: false, completedAt: null } : p
                ),
                transactionHistory: s.transactionHistory.filter(h => !(h.paymentId === paymentId && h.month === currentMonth))
            }));
            return;
        }

        await supabase.from('payment').update({ is_completed: false }).eq('id', paymentId);
        await supabase.from('transactionhistory').delete().eq('payment_id', paymentId).eq('month', currentMonth);

        set((state) => ({
            funds: updatedFunds,
            payments: state.payments.map(p =>
                p.id === paymentId ? { ...p, isCompleted: false, completedAt: null } : p
            ),
            transactionHistory: state.transactionHistory.filter(h => !(h.paymentId === paymentId && h.month === currentMonth))
        }));
    },
    updateFund: async (fund) => {
        const { session, isGuestMode } = get();
        const now = new Date();
        const todayStr = `${now.getFullYear().toString().slice(-2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

        if (!session && isGuestMode) {
            set(s => ({ funds: s.funds.map(f => f.id === fund.id ? { ...fund, updated: todayStr } : f) }));
            return;
        }

        await supabase.from('asset').update({ balance: fund.balance, last_updated: new Date().toISOString() }).eq('id', fund.id);
        set((state) => ({
            funds: state.funds.map(f => f.id === fund.id ? { ...fund, updated: todayStr } : f)
        }));
    },

    setOpsData: (ops) => set({ opsData: ops }),
    addOp: async (opData) => {
        const { currentChild, session, isGuestMode } = get();

        if (!session && isGuestMode) {
            const id = 'g_' + Date.now();
            const dateStr = opData.date.replace(/-/g, '.');
            const parsedOp = {
                id,
                title: opData.title,
                date: dateStr,
                description: opData.description,
                priority: opData.priority,
                status: 'PENDING',
                participants: { mom: false, dad: false },
                checklist: []
            };
            const newEventMission = {
                id,
                type: 'event',
                year: parseInt(dateStr.split('.')[0], 10),
                month: parseInt(dateStr.split('.')[1], 10),
                day: parseInt(dateStr.split('.')[2], 10),
                title: parsedOp.title
            };
            set(state => ({
                opsData: [...state.opsData, parsedOp],
                missionsData: [...state.missionsData, newEventMission]
            }));
            return;
        }

        const { data, error } = await supabase.from('ops').insert([{
            title: opData.title,
            execution_date: opData.date.replace(/\./g, '-'),
            description: opData.description,
            priority: opData.priority,
            status: 'PENDING',
            child_id: currentChild
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
                year: parseInt(parsedOp.date.split('.')[0], 10),
                month: parseInt(parsedOp.date.split('.')[1], 10),
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
        const { session, isGuestMode } = get();
        if (!session && isGuestMode) {
            set(state => ({
                opsData: state.opsData.filter(op => op.id !== id),
                missionsData: state.missionsData.filter(m => m.id !== id)
            }));
            return;
        }

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

        if (!state.session && state.isGuestMode) {
            set(s => ({
                opsData: s.opsData.map(op => op.id === updatedOp.id ? updatedOp : op),
                missionsData: s.missionsData.map(m => m.id === updatedOp.id ? {
                    ...m,
                    year: parseInt(updatedOp.date.split('.')[0], 10),
                    month: parseInt(updatedOp.date.split('.')[1], 10),
                    day: parseInt(updatedOp.date.split('.')[2], 10),
                    title: updatedOp.title
                } : m)
            }));
            return;
        }

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
                year: parseInt(updatedOp.date.split('.')[0], 10),
                month: parseInt(updatedOp.date.split('.')[1], 10),
                day: parseInt(updatedOp.date.split('.')[2], 10),
                title: updatedOp.title
            } : m)
        }));
    },

    // 5. Daily Tasks Actions
    addDailyTask: async (taskName) => {
        const { currentChild, session, isGuestMode } = get();
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (!session && isGuestMode) {
            set((s) => ({
                dailyTasks: [...s.dailyTasks, { id: 'g_' + Date.now(), task_name: taskName, is_completed: false, assigned_date: todayStr, child_id: currentChild }]
            }));
            return;
        }

        const { data, error } = await supabase.from('dailytasks').insert([{
            task_name: taskName,
            is_completed: false,
            assigned_date: todayStr,
            child_id: currentChild
        }]).select();

        if (error) { alert('오늘할일 추가 실패: ' + error.message); return; }

        if (data && data.length > 0) {
            set((state) => ({
                dailyTasks: [...state.dailyTasks, data[0]]
            }));
        }
    },
    toggleDailyTask: async (id) => {
        const state = get();
        const task = state.dailyTasks.find(t => t.id === id);
        if (task) {
            if (!state.session && state.isGuestMode) {
                set((s) => ({ dailyTasks: s.dailyTasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t) }));
                return;
            }

            await supabase.from('dailytasks').update({ is_completed: !task.is_completed }).eq('id', id);
            set((state) => ({
                dailyTasks: state.dailyTasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t)
            }));
        }
    },
    removeDailyTask: async (id) => {
        const { session, isGuestMode } = get();
        if (!session && isGuestMode) {
            set((s) => ({ dailyTasks: s.dailyTasks.filter(t => t.id !== id) }));
            return;
        }

        const { error } = await supabase.from('dailytasks').delete().eq('id', id);
        if (error) { alert('삭제 실패: ' + error.message); return; }

        set((state) => ({
            dailyTasks: state.dailyTasks.filter(t => t.id !== id)
        }));
    },

    // 6. Transaction History Actions
    addTransactionHistory: async (record) => {
        const { currentChild, session, isGuestMode } = get();
        const { month, date_formatted, source, amount, method } = record;

        if (!session && isGuestMode) {
            set((s) => ({
                transactionHistory: [{ id: 'g_' + Date.now(), month, date_formatted, source, amount, method, child_id: currentChild }, ...s.transactionHistory]
            }));
            return;
        }

        const { data, error } = await supabase.from('transactionhistory').insert([{
            month,
            date_formatted,
            source,
            amount,
            method,
            child_id: currentChild
        }]).select();

        if (error) { alert('결제 기록 추가 실패: ' + error.message); return; }

        if (data && data.length > 0) {
            set((state) => ({
                transactionHistory: [data[0], ...state.transactionHistory]
            }));
        }
    },
    updateTransactionHistory: async (record) => {
        const { session, isGuestMode } = get();
        const { id, month, date_formatted, source, amount, method } = record;

        if (!session && isGuestMode) {
            set(s => ({ transactionHistory: s.transactionHistory.map(th => th.id === id ? { ...th, month, date_formatted, source, amount, method } : th) }));
            return;
        }

        const { error } = await supabase.from('transactionhistory').update({
            month,
            date_formatted,
            source,
            amount,
            method
        }).eq('id', id);

        if (error) { alert('과거 기록 수정 실패: ' + error.message); return; }

        set(state => ({
            transactionHistory: state.transactionHistory.map(th => th.id === id ? { ...th, month, date_formatted, source, amount, method } : th)
        }));
    },
    removeTransactionHistory: async (id) => {
        const { session, isGuestMode } = get();
        if (!session && isGuestMode) {
            set(s => ({ transactionHistory: s.transactionHistory.filter(th => th.id !== id) }));
            return;
        }

        const { error } = await supabase.from('transactionhistory').delete().eq('id', id);
        if (error) { alert('과거 기록 삭제 실패: ' + error.message); return; }

        set(state => ({
            transactionHistory: state.transactionHistory.filter(th => th.id !== id)
        }));
    },

    // ----    // 7. General Data Fetching
    syncGuestDataToCloud: async () => {
        set({ isLoading: true });
        const { currentChild } = get();
        const guestDataStr = localStorage.getItem(`spy_guestData_${currentChild}`);
        if (!guestDataStr) {
            set({ isLoading: false });
            return;
        }

        try {
            const guestData = JSON.parse(guestDataStr);

            const schedules = [];
            for (const day in guestData.weeklyData) {
                guestData.weeklyData[day].forEach(item => {
                    schedules.push({ title: item.title, day_of_week: day, start_time: item.time + ':00', pickup_agent: item.agent, drop_agent: item.agent, location: item.location || '', is_urgent: item.isUrgent || false, is_early: item.isEarly || false, child_id: currentChild });
                });
            }
            if (schedules.length > 0) await supabase.from('schedule').insert(schedules);

            const payments = guestData.payments.map(p => ({ source: p.source, amount: p.amount, method: p.method, payment_day: parseInt(p.day.replace('일', ''), 10) || 1, discount_info: p.discount, is_completed: p.isCompleted, child_id: currentChild }));
            if (payments.length > 0) await supabase.from('payment').insert(payments);

            const ops = guestData.opsData.map(o => ({ title: o.title, execution_date: o.date.replace(/\./g, '-'), description: o.description || '', priority: o.priority, status: o.status, child_id: currentChild }));
            if (ops.length > 0) await supabase.from('ops').insert(ops);

            const dailyTasks = guestData.dailyTasks.map(t => ({ task_name: t.task_name, is_completed: t.is_completed, assigned_date: t.assigned_date, child_id: currentChild }));
            if (dailyTasks.length > 0) await supabase.from('dailytasks').insert(dailyTasks);

            const history = guestData.transactionHistory.map(h => ({ month: h.month, date_formatted: h.date_formatted, source: h.source, amount: h.amount, method: h.method || '', child_id: currentChild }));
            if (history.length > 0) await supabase.from('transactionhistory').insert(history);

            const notices = guestData.notices.map(n => ({ text: n.text, is_checked: n.checked }));
            if (notices.length > 0) await supabase.from('notice').insert(notices);

            localStorage.removeItem(`spy_guestData_${currentChild}`);
            set({ isGuestMode: false });
            await get().fetchDataFromDB();
        } catch (e) {
            console.error('Guest Sync Error:', e);
            alert('데이터 동기화 실패. 다시 시도해 주세요.');
        } finally {
            set({ isLoading: false });
        }
    },

    fetchDataFromDB: async () => {
        const { session, currentChild, isGuestMode } = get();
        if (!session && isGuestMode) {
            const guestDataStr = localStorage.getItem(`spy_guestData_${currentChild}`);
            if (guestDataStr) {
                try {
                    const parsed = JSON.parse(guestDataStr);
                    set({ ...parsed, isLoading: false, isDataLoaded: true });
                } catch { }
            } else {
                set({
                    weeklyData: INITIAL_WEEKLY,
                    missionsData: INITIAL_MISSIONS,
                    funds: INITIAL_FUNDS,
                    payments: INITIAL_PAYMENTS,
                    opsData: INITIAL_OPS,
                    transactionHistory: INITIAL_HISTORY,
                    notices: [],
                    dailyTasks: INITIAL_DAILY,
                    isLoading: false, isDataLoaded: true
                });
            }
            return;
        }

        if (!session) return;

        set({ isLoading: true });
        try {
            // Fetch Assets
            let { data: assetsData } = await supabase.from('asset').select('*').order('last_updated', { ascending: false });
            if (assetsData && assetsData.length === 0) {
                // Multi-tenant: Initialize default funds for new user
                const defaultFunds = [
                    { name: '아동수당', balance: 0 },
                    { name: '지역사랑상품권', balance: 0 }
                ];
                const { data: insertedData } = await supabase.from('asset').insert(defaultFunds).select('*').order('last_updated', { ascending: false });
                if (insertedData) assetsData = insertedData;
            }

            if (assetsData) {
                assetsData = assetsData.map(a => {
                    if (a.name === '성남사랑상품권') {
                        supabase.from('asset').update({ name: '지역사랑상품권' }).eq('id', a.id).then();
                        return { ...a, name: '지역사랑상품권' };
                    }
                    return a;
                });
                const formattedFunds = assetsData.map(a => {
                    const d = new Date(a.last_updated);
                    const updatedStr = `${d.getFullYear().toString().slice(-2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                    return {
                        id: a.id,
                        name: a.name,
                        balance: a.balance,
                        updated: updatedStr
                    };
                });
                set({ funds: formattedFunds });
            }

            const currentChild = get().currentChild;

            // Fetch Transaction History
            const { data: historyData } = await supabase.from('transactionhistory').select('*').eq('child_id', currentChild).order('created_at', { ascending: false });
            let formattedHistory = [];
            if (historyData) {
                formattedHistory = historyData.map(h => ({
                    id: h.id,
                    paymentId: h.payment_id,
                    month: h.month,
                    date_formatted: h.date_formatted,
                    source: h.source,
                    amount: h.amount,
                    method: h.method.replace('성남', '지역')
                }));
                set({ transactionHistory: formattedHistory });
            }

            // Fetch Payments
            const { data: paymentsData } = await supabase.from('payment').select('*').eq('child_id', currentChild).order('payment_day', { ascending: true });
            if (paymentsData) {
                const now = new Date();
                const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                const formattedPayments = [];
                for (const p of paymentsData) {
                    let isCompleted = p.is_completed;

                    if (isCompleted) {
                        const hasCurrentMonthTx = formattedHistory.some(h => h.paymentId === p.id && h.month === currentMonthStr);
                        if (!hasCurrentMonthTx) {
                            await supabase.from('payment').update({ is_completed: false }).eq('id', p.id);
                            isCompleted = false;
                        }
                    }

                    formattedPayments.push({
                        id: p.id,
                        source: p.source,
                        amount: p.amount,
                        method: p.method.replace('성남', '지역'),
                        day: `${p.payment_day} 일`,
                        discount: p.discount_info || '',
                        isCompleted: isCompleted,
                        justCompleted: false
                    });
                }
                set({ payments: formattedPayments });

                // Update Planner Missions based on Payments
                const fundMissions = formattedPayments.map(p => ({
                    id: p.id,
                    type: 'fund',
                    day: parseInt(p.day.replace('일', ''), 10),
                    title: `${p.source} 결제(${p.amount.toLocaleString()}₩)`
                }));

                // Fetch Ops for Planner & Ops Tab
                const { data: opsData } = await supabase.from('ops').select('*, opschecklist(*), opsparticipant(*)').eq('child_id', currentChild);
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
                        year: parseInt(o.date.split('.')[0], 10),
                        month: parseInt(o.date.split('.')[1], 10),
                        day: parseInt(o.date.split('.')[2], 10),
                        title: o.title
                    }));
                    set({ missionsData: [...fundMissions, ...eventMissions] });
                } else {
                    set({ missionsData: fundMissions });
                }
            }

            // Fetch Schedule
            const { data: scheduleData } = await supabase.from('schedule').select('*').eq('child_id', currentChild).order('start_time', { ascending: true });
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

            // Fetch Notices
            const { data: noticeData } = await supabase.from('notice').select('*').order('created_at', { ascending: true });
            if (noticeData) {
                set({
                    notices: noticeData.map(n => ({
                        id: n.id,
                        text: n.text,
                        checked: n.is_checked
                    }))
                });
            }

            // Fetch Daily Tasks logic
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const { data: dailyData, error: dailyError } = await supabase.from('dailytasks')
                .select('*')
                .eq('child_id', currentChild)
                .eq('assigned_date', todayStr)
                .order('created_at', { ascending: true });

            if (dailyError) {
                // If the table doesn't exist yet, simply ignore to prevent app crashing before migration runs
                console.log('DailyTasks fetch warning:', dailyError.message);
            } else if (dailyData) {
                set({ dailyTasks: dailyData });
            }

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            set({ isLoading: false });
        }
    }
})));
