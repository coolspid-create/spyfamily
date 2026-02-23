import { create } from 'zustand';
import { supabase } from '../lib/supabase';
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

// 임시 로컬 데이터를 기본값으로 설정 (DB 연동 시 덮어써짐)
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

const INITIAL_HISTORY = [
    { id: 'H01', paymentId: 'past_1', month: '2026-01', date: '2026.01.27 10:15', source: '돌핀수영', amount: 185000, method: '신용카드' },
    { id: 'H02', paymentId: 'past_2', month: '2026-02', date: '2026.02.05 14:30', source: '삼성영어셀레나', amount: 200000, method: '성남사랑상품권' },
    { id: 'H03', paymentId: 'past_3', month: '2026-02', date: '2026.02.11 09:00', source: 'MTA 태권도', amount: 160000, method: '아동수당' },
];

export const useStore = create((set, get) => ({
    // ---- State ----
    weeklyData: INITIAL_WEEKLY,
    missionsData: INITIAL_MISSIONS,
    funds: INITIAL_FUNDS,
    payments: INITIAL_PAYMENTS,
    transactionHistory: INITIAL_HISTORY,
    notices: [{ id: 1, text: '신규 학원 교재비 결제 (카드 준비)', checked: false }],
    isLoading: false,

    // ---- Actions ----
    // 1. Weekly Data Actions
    updateSchedule: (day, newSchedule) => set((state) => ({
        weeklyData: { ...state.weeklyData, [day]: newSchedule }
    })),

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
    processPayment: (paymentId) => set((state) => {
        const payment = state.payments.find(p => p.id === paymentId);
        if (!payment || payment.isCompleted) return state;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        const currentMonth = `${year}-${month}`;
        const completedAt = `${year}.${month}.${day} ${hours}:${minutes}`;

        const newHistoryRecord = {
            id: `H-${Date.now()}`,
            paymentId: payment.id,
            month: currentMonth,
            date: completedAt,
            source: payment.source,
            amount: payment.amount,
            method: payment.method
        };

        if (payment.method.includes('+') || payment.method === '스쿨뱅킹') {
            return {
                payments: state.payments.map(p =>
                    p.id === paymentId ? { ...p, isCompleted: true, completedAt } : p
                ),
                transactionHistory: [newHistoryRecord, ...state.transactionHistory]
            };
        }

        const fund = state.funds.find(f => f.name === payment.method);
        if (fund && payment.method !== '신용카드' && fund.balance < payment.amount) {
            alert(`[WARNING: FUNDS INSUFFICIENT]\n요청 자금: ${payment.amount.toLocaleString()}₩\n현재 잔액: ${fund.balance.toLocaleString()}₩\n자금을 충전하십시오.`);
            return state;
        }

        return {
            funds: state.funds.map(f => {
                if (f.name === payment.method && payment.method !== '신용카드') {
                    return { ...f, balance: f.balance - payment.amount, updated: 'Just now' };
                }
                return f;
            }),
            payments: state.payments.map(p =>
                p.id === paymentId ? { ...p, isCompleted: true, completedAt } : p
            ),
            transactionHistory: [newHistoryRecord, ...state.transactionHistory]
        };
    }),
    undoPayment: (paymentId) => set((state) => {
        const payment = state.payments.find(p => p.id === paymentId);
        if (!payment || !payment.isCompleted) return state;

        let updatedFunds = state.funds;
        if (!payment.method.includes('+') && payment.method !== '신용카드' && payment.method !== '스쿨뱅킹') {
            updatedFunds = state.funds.map(f => {
                if (f.name === payment.method) {
                    return { ...f, balance: f.balance + payment.amount, updated: 'Just now' };
                }
                return f;
            });
        }

        return {
            funds: updatedFunds,
            payments: state.payments.map(p =>
                p.id === paymentId ? { ...p, isCompleted: false, completedAt: null } : p
            ),
            transactionHistory: state.transactionHistory.filter(h => h.paymentId !== paymentId)
        };
    }),
    updateFund: (fund) => set((state) => ({
        funds: state.funds.map(f => f.id === fund.id ? fund : f)
    })),
    updatePayment: (payment) => set((state) => ({
        payments: state.payments.map(p => p.id === payment.id ? payment : p)
    })),

    // ---- Async Actions (Supabase) ----
    // 나중에 데이터베이스와 실제 연동할 때 사용할 함수
    fetchDataFromDB: async () => {
        set({ isLoading: true });
        try {
            // let { data: schedules } = await supabase.from('Schedule').select('*');
            // let { data: payments } = await supabase.from('Payment').select('*');
            // set({ weeklyData: format(schedules), payments });
            console.log('DB Fetched');
        } catch (err) {
            console.error(err);
        } finally {
            set({ isLoading: false });
        }
    }
}));
