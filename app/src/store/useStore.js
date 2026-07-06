import { create } from 'zustand';
import { requireSupabase, supabase } from '../lib/supabase';
import {
    createLocalRepository,
    createSupabaseRepository,
    DEFAULT_SYNC_STATUS,
    LOCAL_STORAGE_KEYS,
    STORAGE_MODE,
    isCloudReadyState,
    resolveStorageMode as resolveRepositoryStorageMode
} from '../lib/storageRepository';
import {
    getDiaryStoragePath,
    isStorageImagePath,
    removeDiaryImagesFromStorage,
    uploadDiaryImagesToStorage
} from '../lib/diaryStorage';
const INITIAL_WEEKLY = {
    '월': [],
    '화': [],
    '수': [],
    '목': [],
    '금': [],
    '토': [],
    '일': []
};
const INITIAL_MISSIONS = [];
const INITIAL_FUNDS = [
    { id: 'f1', name: '아동수당', balance: 0, updated: '미설정' },
    { id: 'f2', name: '지역사랑상품권', balance: 0, updated: '미설정' }
];
const INITIAL_PAYMENTS = [];
const INITIAL_HISTORY = [];
const INITIAL_OPS = [];
const INITIAL_DAILY = [];
const INITIAL_DIARIES = [];
const WEEK_DAYS = Object.keys(INITIAL_WEEKLY);
const DEFAULT_CHILD_PROFILES = { child1: '아이1', child2: '아이2', child3: '아이3' };
const localRepository = createLocalRepository();
const DIARY_RECORDS_STORAGE_KEY = LOCAL_STORAGE_KEYS.DIARY_RECORDS;
const LEGACY_DIARY_RECORDS_STORAGE_KEY = LOCAL_STORAGE_KEYS.LEGACY_DIARY_RECORDS;
const LOCAL_DIARY_SYNC_SIGNATURE_KEY = LOCAL_STORAGE_KEYS.DIARY_SYNC_SIGNATURE;
const CHILD_PROFILE_SYNC_SIGNATURE_KEY = LOCAL_STORAGE_KEYS.CHILD_PROFILE_SYNC_SIGNATURE;
const LAST_SYNC_AT_KEY = LOCAL_STORAGE_KEYS.LAST_SYNC_AT;
const LOCAL_CLOUD_SYNC_SKIP_SIGNATURE_KEY = LOCAL_STORAGE_KEYS.LOCAL_CLOUD_SYNC_SKIP_SIGNATURE;
const CLOUD_CACHE_PREFIX = LOCAL_STORAGE_KEYS.CLOUD_CACHE_PREFIX;
const CLOUD_DIARY_CACHE_PREFIX = LOCAL_STORAGE_KEYS.CLOUD_DIARY_CACHE_PREFIX;
const FAMILY_CONTEXT_CACHE_KEY = LOCAL_STORAGE_KEYS.FAMILY_CONTEXT;
const DIARY_COMMENT_MAX_LENGTH = 50;
const AUTH_SIGN_OUT_TIMEOUT_MS = 2500;
const FAMILY_ACTION_TIMEOUT_MS = 12000;
const DIARY_CLOUD_SAVE_TIMEOUT_MS = 30000;
const DIARY_CLOUD_FETCH_TIMEOUT_MS = 10000;
const DIARY_CLOUD_DELETE_TIMEOUT_MS = 12000;
const DIARY_SYNC_STATE_PENDING = 'pending';
let diaryFetchRequestSeq = 0;
let diaryMutationSeq = 0;

const asArray = (value) => (Array.isArray(value) ? value : []);
const toSafeString = (value, fallback = '') => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return fallback;
    return String(value);
};
const supabaseRepository = createSupabaseRepository({ client: supabase, toSafeString: (value) => toSafeString(value) });
const toSafeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const getLocalDateString = (date = new Date()) => (
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);
const normalizeBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';
const withTimeout = (promise, timeoutMs, timeoutMessage) => Promise.race([
    promise,
    new Promise((resolve) => {
        globalThis.setTimeout(() => resolve({ error: new Error(timeoutMessage) }), timeoutMs);
    })
]);
const withRejectingTimeout = (promise, timeoutMs, timeoutMessage) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = globalThis.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        globalThis.clearTimeout(timeoutId);
    });
};
const markDiaryMutationBoundary = () => {
    diaryMutationSeq += 1;
    return diaryMutationSeq;
};
const createDiaryFetchGuard = () => {
    const requestSeq = ++diaryFetchRequestSeq;
    const mutationSeqAtStart = diaryMutationSeq;
    return () => requestSeq === diaryFetchRequestSeq && mutationSeqAtStart === diaryMutationSeq;
};
const normalizeMethod = (method, fallback = '신용카드') => {
    const normalized = toSafeString(method, fallback).replace('성남', '지역').trim();
    return normalized || fallback;
};
const normalizeTime = (value, fallback = '09:00') => {
    const match = toSafeString(value).match(/^(\d{1,2}):(\d{1,2})/);
    if (!match) return fallback;
    const hour = Math.min(Math.max(parseInt(match[1], 10) || 0, 0), 23);
    const minute = Math.min(Math.max(parseInt(match[2], 10) || 0, 0), 59);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};
const normalizeDayNumber = (value, fallback = 1) => {
    const parsed = typeof value === 'number'
        ? value
        : parseInt(toSafeString(value).replace('일', ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, 1), 31);
};
const normalizeDateDashes = (value, fallback = '') => {
    const raw = toSafeString(value).trim();
    if (!raw) return fallback;
    const dashed = raw.replace(/\./g, '-');
    const match = dashed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!match) return fallback || raw;
    return `${match[1]}-${String(parseInt(match[2], 10)).padStart(2, '0')}-${String(parseInt(match[3], 10)).padStart(2, '0')}`;
};
const normalizeDateDots = (value) => normalizeDateDashes(value).replace(/-/g, '.');
const createLocalId = (prefix, fallbackParts) => {
    const safeParts = fallbackParts.map(part => toSafeString(part).trim()).filter(Boolean);
    return `${prefix}-${safeParts.join('-') || 'item'}`;
};

const normalizeChildProfiles = (profiles) => (
    profiles && typeof profiles === 'object' && !Array.isArray(profiles)
        ? { ...DEFAULT_CHILD_PROFILES, ...profiles }
        : DEFAULT_CHILD_PROFILES
);
const normalizeChildCount = (count) => {
    const parsed = parseInt(count, 10);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(Math.max(parsed, 1), 3);
};
const normalizeCurrentChild = (childId) => {
    const normalized = toSafeString(childId, 'child1');
    return /^child[1-3]$/.test(normalized) ? normalized : 'child1';
};

const normalizeContentPart = (value) => (
    toSafeString(value).trim().replace(/\s+/g, ' ').toLowerCase()
);

const createContentKey = (...parts) => parts.map(normalizeContentPart).join('|');

const dedupeRowsByContent = (rows, keyFn) => {
    const seen = new Set();
    return asArray(rows).filter((row) => {
        const key = keyFn(row);
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const createFamilyInviteCode = () => {
    const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const digits = () => Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${letter()}${letter()}${digits()}`;
};

const isUniqueInviteCodeError = (error) => (
    toSafeString(error?.code) === '23505' &&
    toSafeString(error?.message).toLowerCase().includes('invite_code')
);

const isCloudReady = (state) => isCloudReadyState(state, supabase);

const resolveStorageMode = resolveRepositoryStorageMode;

const scopeFamilyQuery = (query, familyId) => supabaseRepository.scopeFamilyQuery(query, familyId);

const isUuid = (value) => (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(toSafeString(value))
);

const createClientUuid = () => (
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const wait = (delayMs) => new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
});

const isFamilyJoinTimeoutError = (error) => (
    toSafeString(error?.message).includes('가족 합류 시간이 초과되었습니다.')
);

const loadPendingMutations = () => {
    try {
        return localRepository.loadPendingMutations();
    } catch {
        return [];
    }
};

const savePendingMutations = (mutations) => {
    try {
        localRepository.savePendingMutations(mutations);
    } catch (error) {
        console.warn('Pending cloud mutation queue could not be saved:', error);
    }
};

const normalizeWeeklyData = (weeklyData) => WEEK_DAYS.reduce((normalized, day) => {
    normalized[day] = asArray(weeklyData?.[day]).map((item, index) => ({
        id: toSafeString(item?.id) || createLocalId(`schedule-${day}`, [index, item?.time, item?.title]),
        localId: toSafeString(item?.localId ?? item?.local_id ?? item?.id) || createLocalId(`schedule-${day}`, [index, item?.time, item?.title]),
        time: normalizeTime(item?.time),
        title: toSafeString(item?.title, '일정'),
        agent: toSafeString(item?.agent, '자율') || '자율',
        location: toSafeString(item?.location),
        contactName: toSafeString(item?.contactName),
        contactPhone: toSafeString(item?.contactPhone),
        isEarly: normalizeBoolean(item?.isEarly),
        isUrgent: normalizeBoolean(item?.isUrgent)
    }));
    return normalized;
}, {});

const normalizeFunds = (funds) => {
    const normalizedFunds = asArray(funds).map((fund, index) => ({
        id: toSafeString(fund?.id) || `fund-${index + 1}`,
        localId: toSafeString(fund?.localId ?? fund?.local_id ?? fund?.id) || `fund-${index + 1}`,
        name: toSafeString(fund?.name, index === 0 ? '아동수당' : '지역사랑상품권').replace('성남', '지역'),
        balance: toSafeNumber(fund?.balance),
        updated: toSafeString(fund?.updated, '미설정') || '미설정'
    }));

    return normalizedFunds.length > 0 ? normalizedFunds : INITIAL_FUNDS;
};

const normalizePayments = (payments) => asArray(payments).map((payment, index) => {
    const day = normalizeDayNumber(payment?.day ?? payment?.payment_day);
    return {
        id: toSafeString(payment?.id) || createLocalId('payment', [index, payment?.source, day]),
        localId: toSafeString(payment?.localId ?? payment?.local_id ?? payment?.id) || createLocalId('payment', [index, payment?.source, day]),
        source: toSafeString(payment?.source, '결제 내역'),
        amount: toSafeNumber(payment?.amount),
        method: normalizeMethod(payment?.method),
        day: `${day} 일`,
        discount: toSafeString(payment?.discount ?? payment?.discount_info),
        isCompleted: normalizeBoolean(payment?.isCompleted ?? payment?.is_completed),
        completedAt: toSafeString(payment?.completedAt),
        justCompleted: false
    };
});

const normalizeMissions = (missions) => asArray(missions).map((mission, index) => {
    const type = mission?.type === 'event' ? 'event' : 'fund';
    const day = normalizeDayNumber(mission?.day);
    return {
        id: toSafeString(mission?.id) || createLocalId('mission', [type, index, mission?.title, day]),
        localId: toSafeString(mission?.localId ?? mission?.local_id ?? mission?.id) || createLocalId('mission', [type, index, mission?.title, day]),
        type,
        day,
        year: type === 'event' ? toSafeNumber(mission?.year, new Date().getFullYear()) : mission?.year,
        month: type === 'event' ? Math.min(Math.max(toSafeNumber(mission?.month, new Date().getMonth() + 1), 1), 12) : mission?.month,
        title: toSafeString(mission?.title, type === 'event' ? '가족일정' : '결제관리')
    };
});

const normalizeOps = (opsData) => asArray(opsData).map((op, index) => ({
    id: toSafeString(op?.id) || createLocalId('ops', [index, op?.title]),
    localId: toSafeString(op?.localId ?? op?.local_id ?? op?.id) || createLocalId('ops', [index, op?.title]),
    title: toSafeString(op?.title, '가족일정'),
    date: normalizeDateDots(op?.date) || '',
    description: toSafeString(op?.description),
    priority: ['HIGH', 'MEDIUM', 'LOW'].includes(op?.priority) ? op.priority : 'MEDIUM',
    status: toSafeString(op?.status, 'PENDING') || 'PENDING',
    participants: {
        mom: normalizeBoolean(op?.participants?.mom),
        dad: normalizeBoolean(op?.participants?.dad)
    },
    checklist: asArray(op?.checklist).map((item, checklistIndex) => ({
        id: toSafeString(item?.id) || createLocalId('checklist', [index, checklistIndex, item?.task]),
        task: toSafeString(item?.task, '준비물'),
        checked: normalizeBoolean(item?.checked ?? item?.is_checked)
    }))
}));

const normalizeDailyTasks = (dailyTasks) => asArray(dailyTasks).map((task, index) => ({
    id: toSafeString(task?.id) || createLocalId('daily', [index, task?.task_name ?? task?.text]),
    localId: toSafeString(task?.localId ?? task?.local_id ?? task?.id) || createLocalId('daily', [index, task?.task_name ?? task?.text]),
    task_name: toSafeString(task?.task_name ?? task?.text ?? task?.title, '할 일'),
    is_completed: normalizeBoolean(task?.is_completed ?? task?.completed ?? task?.checked),
    assigned_date: normalizeDateDashes(task?.assigned_date, getLocalDateString())
}));

const normalizeTransactionHistory = (history) => asArray(history).map((record, index) => ({
    id: toSafeString(record?.id) || createLocalId('history', [index, record?.source, record?.date_formatted]),
    localId: toSafeString(record?.localId ?? record?.local_id ?? record?.id) || createLocalId('history', [index, record?.source, record?.date_formatted]),
    paymentId: toSafeString(record?.paymentId ?? record?.payment_id),
    month: toSafeString(record?.month),
    date_formatted: toSafeString(record?.date_formatted),
    source: toSafeString(record?.source, '결제 내역'),
    amount: toSafeNumber(record?.amount),
    method: normalizeMethod(record?.method, '')
}));

const normalizeNotices = (notices) => asArray(notices).map((notice, index) => ({
    id: toSafeString(notice?.id) || createLocalId('notice', [index, notice?.text]),
    localId: toSafeString(notice?.localId ?? notice?.local_id ?? notice?.id) || createLocalId('notice', [index, notice?.text]),
    text: toSafeString(notice?.text, '알림'),
    checked: normalizeBoolean(notice?.checked ?? notice?.is_checked)
}));

const createScheduleContentKey = ({
    childId,
    day,
    time,
    title,
    agent,
    location,
    contactName,
    contactPhone,
    isEarly,
    isUrgent
}) => createContentKey(
    'schedule',
    childId,
    day,
    normalizeTime(time, ''),
    title,
    agent,
    location,
    contactName,
    contactPhone,
    normalizeBoolean(isEarly) ? '1' : '0',
    normalizeBoolean(isUrgent) ? '1' : '0'
);

const createScheduleCloudContentKey = (row) => createScheduleContentKey({
    childId: row?.child_id,
    day: row?.day_of_week,
    time: row?.start_time,
    title: row?.title,
    agent: row?.pickup_agent || row?.drop_agent || '자율',
    location: row?.location,
    contactName: row?.contact_name,
    contactPhone: row?.contact_phone,
    isEarly: row?.is_early,
    isUrgent: row?.is_urgent
});

const createScheduleLocalContentKey = (day, item) => createScheduleContentKey({
    day,
    time: item?.time,
    title: item?.title,
    agent: item?.agent,
    location: item?.location,
    contactName: item?.contactName,
    contactPhone: item?.contactPhone,
    isEarly: item?.isEarly,
    isUrgent: item?.isUrgent
});

const createPaymentContentKey = ({
    childId,
    source,
    amount,
    method,
    day,
    discount
}) => createContentKey(
    'payment',
    childId,
    source,
    toSafeNumber(amount),
    normalizeMethod(method),
    normalizeDayNumber(day),
    discount
);

const createPaymentCloudContentKey = (row) => createPaymentContentKey({
    childId: row?.child_id,
    source: row?.source,
    amount: row?.amount,
    method: row?.method,
    day: row?.payment_day,
    discount: row?.discount_info
});

const createPaymentLocalContentKey = (payment) => createPaymentContentKey({
    source: payment?.source,
    amount: payment?.amount,
    method: payment?.method,
    day: payment?.day,
    discount: payment?.discount
});

const mergeLocalPaymentsByContent = (payments) => {
    const merged = new Map();
    asArray(payments).forEach((payment) => {
        const key = createPaymentLocalContentKey(payment);
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, payment);
            return;
        }
        merged.set(key, {
            ...existing,
            isCompleted: normalizeBoolean(existing.isCompleted) || normalizeBoolean(payment.isCompleted),
            completedAt: existing.completedAt || payment.completedAt,
            justCompleted: normalizeBoolean(existing.justCompleted) || normalizeBoolean(payment.justCompleted)
        });
    });
    return [...merged.values()];
};

const mergeCloudPaymentsByContent = (payments, historyRows, currentMonth) => {
    const historyByPaymentId = new Map();
    asArray(historyRows).forEach((history) => {
        if (!history?.payment_id) return;
        const list = historyByPaymentId.get(history.payment_id) || [];
        list.push(history);
        historyByPaymentId.set(history.payment_id, list);
    });

    const groups = new Map();
    asArray(payments).forEach((payment) => {
        const key = createPaymentCloudContentKey(payment);
        const list = groups.get(key) || [];
        list.push(payment);
        groups.set(key, list);
    });

    const sortByCreatedAt = (rows) => [...rows].sort((a, b) => {
        const aTime = Date.parse(a?.created_at || a?.updated_at || '') || 0;
        const bTime = Date.parse(b?.created_at || b?.updated_at || '') || 0;
        if (aTime !== bTime) return aTime - bTime;
        return toSafeString(a?.id).localeCompare(toSafeString(b?.id));
    });

    return [...groups.values()].map((group) => {
        const sorted = sortByCreatedAt(group);
        const paymentWithCurrentHistory = sorted.find(payment => (
            asArray(historyByPaymentId.get(payment.id)).some(history => history.month === currentMonth)
        ));
        const completedPayment = sorted.find(payment => normalizeBoolean(payment?.is_completed));
        const canonical = paymentWithCurrentHistory || completedPayment || sorted[0];
        const hasCurrentMonthHistory = sorted.some(payment => (
            asArray(historyByPaymentId.get(payment.id)).some(history => history.month === currentMonth)
        ));

        return {
            ...canonical,
            is_completed: hasCurrentMonthHistory || sorted.some(payment => normalizeBoolean(payment?.is_completed))
        };
    });
};

const createOpsCloudContentKey = (row) => createContentKey(
    'ops',
    row?.child_id,
    row?.title,
    normalizeDateDashes(row?.execution_date),
    row?.description,
    row?.priority,
    row?.status
);

const createOpsLocalContentKey = (op) => createContentKey(
    'ops',
    op?.title,
    normalizeDateDashes(op?.date),
    op?.description,
    op?.priority,
    op?.status,
    normalizeBoolean(op?.participants?.mom) ? '1' : '0',
    normalizeBoolean(op?.participants?.dad) ? '1' : '0',
    asArray(op?.checklist).map(item => (
        `${normalizeContentPart(item?.task)}:${normalizeBoolean(item?.checked) ? '1' : '0'}`
    )).join(',')
);

const createDailyTaskCloudContentKey = (row) => createContentKey(
    'daily',
    row?.child_id,
    row?.task_name,
    normalizeDateDashes(row?.assigned_date),
    normalizeBoolean(row?.is_completed) ? '1' : '0'
);

const createDailyTaskLocalContentKey = (task) => createContentKey(
    'daily',
    task?.task_name,
    normalizeDateDashes(task?.assigned_date),
    normalizeBoolean(task?.is_completed) ? '1' : '0'
);

const createTransactionCloudContentKey = (row) => createContentKey(
    'history',
    row?.child_id,
    row?.month,
    row?.date_formatted,
    row?.source,
    toSafeNumber(row?.amount),
    normalizeMethod(row?.method, '')
);

const createTransactionLocalContentKey = (record) => createContentKey(
    'history',
    record?.month,
    record?.date_formatted,
    record?.source,
    toSafeNumber(record?.amount),
    normalizeMethod(record?.method, '')
);

const createNoticeCloudContentKey = (row) => createContentKey(
    'notice',
    row?.text,
    normalizeBoolean(row?.is_checked) ? '1' : '0'
);

const createNoticeLocalContentKey = (notice) => createContentKey(
    'notice',
    notice?.text,
    normalizeBoolean(notice?.checked) ? '1' : '0'
);

const createAssetCloudContentKey = (row) => createContentKey(
    'asset',
    toSafeString(row?.name).replace('성남', '지역')
);

const createAssetLocalContentKey = (fund) => createContentKey(
    'asset',
    toSafeString(fund?.name).replace('성남', '지역')
);

const createMissionLocalContentKey = (mission) => createContentKey(
    'mission',
    mission?.type,
    mission?.title,
    mission?.day,
    mission?.year,
    mission?.month
);

const dedupeWeeklyDataByContent = (weeklyData) => WEEK_DAYS.reduce((deduped, day) => {
    deduped[day] = dedupeRowsByContent(weeklyData?.[day], item => createScheduleLocalContentKey(day, item));
    return deduped;
}, {});

const dedupeGuestDataByContent = (guestData) => ({
    weeklyData: dedupeWeeklyDataByContent(guestData?.weeklyData),
    missionsData: dedupeRowsByContent(guestData?.missionsData, createMissionLocalContentKey),
    funds: dedupeRowsByContent(guestData?.funds, createAssetLocalContentKey),
    payments: mergeLocalPaymentsByContent(guestData?.payments),
    opsData: dedupeRowsByContent(guestData?.opsData, createOpsLocalContentKey),
    transactionHistory: dedupeRowsByContent(guestData?.transactionHistory, createTransactionLocalContentKey),
    notices: dedupeRowsByContent(guestData?.notices, createNoticeLocalContentKey),
    dailyTasks: dedupeRowsByContent(guestData?.dailyTasks, createDailyTaskLocalContentKey)
});

const createDateLabelFromIso = (isoDate) => {
    const normalizedIsoDate = normalizeDateDashes(isoDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedIsoDate)) return '';
    const [, month, day] = normalizedIsoDate.split('-');
    return `${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
};

const createIsoDateFromLabel = (date, fallbackYear = new Date().getFullYear()) => {
    const match = toSafeString(date).trim().match(/^(\d{1,2})월\s*(\d{1,2})일/);
    if (!match) return null;
    return `${fallbackYear}-${String(parseInt(match[1], 10)).padStart(2, '0')}-${String(parseInt(match[2], 10)).padStart(2, '0')}`;
};

const normalizeDiaryTime = (value) => {
    const raw = toSafeString(value).trim();
    if (raw.includes('오전') || raw.includes('오후')) return raw;
    const match = raw.match(/^(\d{1,2}):(\d{1,2})/);
    if (!match) return '';
    let hour = Math.min(Math.max(parseInt(match[1], 10) || 0, 0), 23);
    const minute = String(Math.min(Math.max(parseInt(match[2], 10) || 0, 0), 59)).padStart(2, '0');
    const ampm = hour >= 12 ? '오후' : '오전';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${ampm} ${hour}:${minute}`;
};

const getDiaryTimeSortMinutes = (value) => {
    const raw = toSafeString(value).trim();
    const koreanMatch = raw.match(/^(오전|오후)\s*(\d{1,2}):(\d{1,2})/);
    if (koreanMatch) {
        let hour = Math.min(Math.max(parseInt(koreanMatch[2], 10) || 0, 0), 12);
        const minute = Math.min(Math.max(parseInt(koreanMatch[3], 10) || 0, 0), 59);
        if (koreanMatch[1] === '오후' && hour < 12) hour += 12;
        if (koreanMatch[1] === '오전' && hour === 12) hour = 0;
        return (hour * 60) + minute;
    }

    const numericMatch = raw.match(/^(\d{1,2}):(\d{1,2})/);
    if (!numericMatch) return 0;

    const hour = Math.min(Math.max(parseInt(numericMatch[1], 10) || 0, 0), 23);
    const minute = Math.min(Math.max(parseInt(numericMatch[2], 10) || 0, 0), 59);
    return (hour * 60) + minute;
};

const getDiaryDateSortBase = (isoDate) => {
    const normalizedIsoDate = normalizeDateDashes(isoDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedIsoDate)) return null;

    const [year, month, day] = normalizedIsoDate.split('-').map(part => parseInt(part, 10));
    const date = new Date(year, month - 1, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return Date.UTC(year, month - 1, day);
};

const getDiaryRecordSortTimestamp = (record) => {
    const dateBase = getDiaryDateSortBase(record?.isoDate ?? record?.date);
    if (dateBase === null) return 0;
    return dateBase + (getDiaryTimeSortMinutes(record?.time) * 60 * 1000);
};

const getDiaryRecordTieBreakerTimestamp = (record) => (
    Date.parse(record?.updatedAt || record?.updated_at || record?.createdAt || record?.created_at || '') || 0
);

const compareDiaryRecordsNewestFirst = (a, b) => {
    const dateDiff = getDiaryRecordSortTimestamp(b) - getDiaryRecordSortTimestamp(a);
    if (dateDiff !== 0) return dateDiff;

    const tieBreakerDiff = getDiaryRecordTieBreakerTimestamp(b) - getDiaryRecordTieBreakerTimestamp(a);
    if (tieBreakerDiff !== 0) return tieBreakerDiff;

    return toSafeString(b?.id || b?.localId).localeCompare(toSafeString(a?.id || a?.localId));
};

const sortDiaryRecordsNewestFirst = (records) => [...asArray(records)].sort(compareDiaryRecordsNewestFirst);

const formatDiaryCommentTime = (value) => {
    const raw = toSafeString(value).trim();
    if (!raw) return '';
    if (/^\d{1,2}월\s*\d{1,2}일/.test(raw)) return raw;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;

    const hour24 = date.getHours();
    const ampm = hour24 >= 12 ? '오후' : '오전';
    const hour12 = hour24 % 12 || 12;
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${date.getMonth() + 1}월 ${date.getDate()}일 ${ampm} ${hour12}:${minute}`;
};

const normalizeDiaryChildId = (record) => {
    const explicitChildId = toSafeString(record?.child_id ?? record?.childId).trim();
    if (/^child[1-3]$/.test(explicitChildId)) return explicitChildId;

    const childName = toSafeString(record?.child).trim();
    const defaultChild = Object.entries(DEFAULT_CHILD_PROFILES).find(([, defaultName]) => childName === defaultName);
    return defaultChild?.[0] || '';
};

const normalizeDiaryIsoDate = (record) => {
    const candidates = [
        record?.isoDate,
        record?.date
    ];

    for (const candidate of candidates) {
        const normalized = normalizeDateDashes(candidate);
        if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    }

    return createIsoDateFromLabel(record?.date) || '';
};

const normalizeDiaryRecords = (records) => (
    Array.isArray(records) ? records : []
).filter(record => record && typeof record === 'object').map((record, index) => {
    const isoDate = normalizeDiaryIsoDate(record);
    const imagePaths = asArray(record?.image_paths ?? record?.imagePaths)
        .map(getDiaryStoragePath)
        .filter(Boolean);
    const imageUrls = asArray(record?.imageUrls).filter(url => typeof url === 'string' && url);
    const imageUrl = toSafeString(record?.imageUrl || imageUrls[0] || imagePaths[0] || '');
    const allImageUrls = [...new Set([
        ...imageUrls,
        ...imagePaths,
        ...(imageUrl ? [imageUrl] : [])
    ])];
    const comments = asArray(record?.diary_comments ?? record?.comments).map((comment, commentIndex) => ({
        id: toSafeString(comment?.id) || `comment-${index}-${commentIndex}`,
        author: toSafeString(comment?.author, '가족') || '가족',
        text: toSafeString(comment?.text).slice(0, DIARY_COMMENT_MAX_LENGTH),
        time: formatDiaryCommentTime(comment?.time ?? comment?.created_at)
    }));
    const syncState = toSafeString(record?.syncState ?? record?.sync_state).trim();
    const childId = normalizeDiaryChildId(record);
    const duplicateIds = [...new Set(asArray(record?.duplicateIds ?? record?.duplicate_ids)
        .map(toSafeString)
        .filter(Boolean))];

    return {
        id: toSafeString(record?.id) || `diary-${isoDate}-${index}`,
        localId: toSafeString(record?.local_id ?? record?.localId),
        ...(childId ? { childId } : {}),
        child: toSafeString(record?.child, '아이1') || '아이1',
        date: createDateLabelFromIso(isoDate) || '날짜 미상',
        isoDate,
        time: normalizeDiaryTime(record?.time),
        mood: toSafeString(record?.mood, '😊') || '😊',
        title: toSafeString(record?.title, '다이어리'),
        text: toSafeString(record?.text),
        hasMedia: Boolean(record?.hasMedia || allImageUrls.length > 0 || imagePaths.length > 0),
        imageUrl: imageUrl || null,
        imageUrls: allImageUrls,
        imagePaths,
        linked: toSafeString(record?.linked),
        reactions: asArray(record?.reactions).filter(item => typeof item === 'string'),
        comments,
        duplicateIds,
        createdAt: toSafeString(record?.created_at ?? record?.createdAt),
        updatedAt: toSafeString(record?.updated_at ?? record?.updatedAt),
        ...(syncState ? { syncState } : {})
    };
});

const createDiaryRecordContentKey = (record) => createContentKey(
    'diary',
    record?.isoDate,
    record?.time,
    record?.mood,
    record?.title,
    record?.text,
    asArray(record?.imagePaths).join(','),
    asArray(record?.imageUrls).length,
    asArray(record?.comments).length
);

const createDiaryRecordDeleteContentKey = (record) => {
    const normalizedRecord = normalizeDiaryRecords([record])[0];
    if (!normalizedRecord) return '';

    return createContentKey(
        'diary-delete',
        normalizedRecord.isoDate,
        normalizedRecord.time,
        normalizedRecord.mood,
        normalizedRecord.title,
        normalizedRecord.text,
        asArray(normalizedRecord.imagePaths).join(','),
        asArray(normalizedRecord.imageUrls).length
    );
};

const getDiaryRecordIds = (record) => ([
    record?.id,
    record?.localId,
    ...asArray(record?.duplicateIds ?? record?.duplicate_ids)
]).map(toSafeString).filter(Boolean);

const mergeDiaryDuplicateRecords = (existing, record) => ({
    ...existing,
    syncState: existing?.syncState || record?.syncState,
    duplicateIds: [...new Set([
        ...getDiaryRecordIds(existing),
        ...getDiaryRecordIds(record)
    ])]
});

const dedupeDiaryRecordsByContent = (records) => {
    const mergedRecords = [];

    normalizeDiaryRecords(records).forEach((record) => {
        const key = createDiaryRecordContentKey(record);
        const ids = new Set(getDiaryRecordIds(record));
        const existingIndex = mergedRecords.findIndex(existing => (
            createDiaryRecordContentKey(existing) === key
            || getDiaryRecordIds(existing).some(id => ids.has(id))
        ));

        if (existingIndex === -1) {
            mergedRecords.push(record);
            return;
        }

        mergedRecords[existingIndex] = mergeDiaryDuplicateRecords(mergedRecords[existingIndex], record);
    });

    return sortDiaryRecordsNewestFirst(mergedRecords);
};

const loadLocalDiaryRecords = () => {
    try {
        const saved = localStorage.getItem(DIARY_RECORDS_STORAGE_KEY) || localStorage.getItem(LEGACY_DIARY_RECORDS_STORAGE_KEY);
        const records = dedupeDiaryRecordsByContent(saved ? JSON.parse(saved) : INITIAL_DIARIES);
        if (saved) {
            localStorage.setItem(DIARY_RECORDS_STORAGE_KEY, JSON.stringify(records));
        }
        return records;
    } catch (error) {
        console.warn('Local diary records could not be loaded safely:', error);
        return INITIAL_DIARIES;
    }
};

const saveLocalDiaryRecords = (records) => {
    try {
        localStorage.setItem(DIARY_RECORDS_STORAGE_KEY, JSON.stringify(dedupeDiaryRecordsByContent(records)));
    } catch (error) {
        console.error('Local diary save failed:', error);
    }
};

const getLocalDiarySyncSignature = (records = loadLocalDiaryRecords()) => JSON.stringify(
    normalizeDiaryRecords(records).map(record => ({
        id: record.localId || record.id,
        date: record.isoDate,
        time: record.time,
        title: record.title,
        text: record.text,
        imageCount: asArray(record.imageUrls).length + asArray(record.imagePaths).length
    }))
);

const markLocalDiariesSynced = () => {
    try {
        localStorage.setItem(LOCAL_DIARY_SYNC_SIGNATURE_KEY, getLocalDiarySyncSignature());
    } catch (error) {
        console.warn('Local diary sync marker could not be saved:', error);
    }
};

const hasUnsyncedLocalDiaries = () => {
    const localDiaries = loadLocalDiaryRecords();
    if (localDiaries.length === 0) return false;
    try {
        return localStorage.getItem(LOCAL_DIARY_SYNC_SIGNATURE_KEY) !== getLocalDiarySyncSignature(localDiaries);
    } catch {
        return true;
    }
};

const clearSupabaseAuthStorage = () => {
    try {
        Object.keys(localStorage)
            .filter(key => key === 'supabase.auth.token' || (key.startsWith('sb-') && key.endsWith('-auth-token')))
            .forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('Supabase auth cache could not be cleared safely:', error);
    }
};

const clearLocalAccountData = () => {
    try {
        clearSupabaseAuthStorage();
        localRepository.removeKeys([
            DIARY_RECORDS_STORAGE_KEY,
            LEGACY_DIARY_RECORDS_STORAGE_KEY,
            LOCAL_DIARY_SYNC_SIGNATURE_KEY,
            CHILD_PROFILE_SYNC_SIGNATURE_KEY,
            LAST_SYNC_AT_KEY,
            FAMILY_CONTEXT_CACHE_KEY,
            LOCAL_STORAGE_KEYS.PENDING_MUTATIONS
        ]);
        ['spy_childProfiles', 'spy_childCount', 'spy_currentChild'].forEach((key) => {
            localStorage.removeItem(key);
        });
        ['child1', 'child2', 'child3'].forEach((childId) => {
            localStorage.removeItem(`spy_guestData_${childId}`);
            localStorage.removeItem(`spy_guestDataLastSynced_${childId}`);
        });
        Object.keys(localStorage)
            .filter(key => (
                key.startsWith(`${CLOUD_CACHE_PREFIX}_`) ||
                key.startsWith(`${CLOUD_DIARY_CACHE_PREFIX}_`)
            ))
            .forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('Local account cache could not be cleared safely:', error);
    }
};

const removeStoragePathsInChunks = async (paths) => {
    await removeDiaryImagesFromStorage({ client: supabase, paths });
};

const normalizeGuestData = (data) => dedupeGuestDataByContent({
    weeklyData: normalizeWeeklyData(data?.weeklyData),
    missionsData: normalizeMissions(data?.missionsData),
    funds: normalizeFunds(data?.funds),
    payments: normalizePayments(data?.payments),
    opsData: normalizeOps(data?.opsData),
    transactionHistory: normalizeTransactionHistory(data?.transactionHistory),
    notices: normalizeNotices(data?.notices),
    dailyTasks: normalizeDailyTasks(data?.dailyTasks)
});

const hasMeaningfulGuestData = (guestData) => {
    const normalized = normalizeGuestData(guestData);
    const hasWeekly = Object.values(normalized.weeklyData).some(items => items.length > 0);
    return (
        hasWeekly ||
        normalized.missionsData.length > 0 ||
        normalized.payments.length > 0 ||
        normalized.opsData.length > 0 ||
        normalized.transactionHistory.length > 0 ||
        normalized.notices.length > 0 ||
        normalized.dailyTasks.length > 0 ||
        normalized.funds.some((fund, index) => fund.balance !== INITIAL_FUNDS[index]?.balance)
    );
};

const getChildIdsForLocalSnapshot = () => ['child1', 'child2', 'child3'];

const getLocalCloudSyncSignature = (state = {}) => {
    const guestDataByChild = getChildIdsForLocalSnapshot().reduce((snapshot, childId) => {
        snapshot[childId] = localStorage.getItem(`spy_guestData_${childId}`) || '';
        return snapshot;
    }, {});

    return JSON.stringify({
        familyId: state.currentFamilyId || null,
        guestDataByChild,
        diaries: getLocalDiarySyncSignature(),
        childProfiles: getChildProfileSyncSignature(state)
    });
};

const isLocalCloudSyncSkipped = (state = {}) => {
    if (!state.currentFamilyId) return false;
    try {
        return localStorage.getItem(LOCAL_CLOUD_SYNC_SKIP_SIGNATURE_KEY) === getLocalCloudSyncSignature(state);
    } catch {
        return false;
    }
};

const markLocalCloudSyncSkippedSignature = (state = {}) => {
    if (!state.currentFamilyId) return;
    try {
        localStorage.setItem(LOCAL_CLOUD_SYNC_SKIP_SIGNATURE_KEY, getLocalCloudSyncSignature(state));
    } catch (error) {
        console.warn('Local cloud sync skip marker could not be saved:', error);
    }
};

const clearLocalCloudSyncSkippedSignature = () => {
    try {
        localStorage.removeItem(LOCAL_CLOUD_SYNC_SKIP_SIGNATURE_KEY);
    } catch (error) {
        console.warn('Local cloud sync skip marker could not be cleared:', error);
    }
};

const hasUnsyncedGuestData = () => getChildIdsForLocalSnapshot().some((childId) => {
    const guestDataStr = localStorage.getItem(`spy_guestData_${childId}`);
    if (!guestDataStr || guestDataStr === localStorage.getItem(`spy_guestDataLastSynced_${childId}`)) {
        return false;
    }

    try {
        return hasMeaningfulGuestData(JSON.parse(guestDataStr));
    } catch {
        return true;
    }
});

const getChildProfileSyncSignature = ({
    childProfiles = savedProfiles,
    childCount = savedChildCount,
    currentChild = savedCurrentChild
} = {}) => JSON.stringify({
    childCount: normalizeChildCount(childCount),
    currentChild: normalizeCurrentChild(currentChild),
    childProfiles: normalizeChildProfiles(childProfiles)
});

const hasMeaningfulChildProfileChanges = ({
    childProfiles = savedProfiles,
    childCount = savedChildCount,
    currentChild = savedCurrentChild
} = {}) => {
    const normalizedProfiles = normalizeChildProfiles(childProfiles);
    const normalizedCount = normalizeChildCount(childCount);
    return (
        normalizedCount !== 1 ||
        normalizeCurrentChild(currentChild) !== 'child1' ||
        normalizedProfiles.child1 !== DEFAULT_CHILD_PROFILES.child1 ||
        normalizedProfiles.child2 !== DEFAULT_CHILD_PROFILES.child2 ||
        normalizedProfiles.child3 !== DEFAULT_CHILD_PROFILES.child3
    );
};

const markChildProfilesSynced = (state = {}) => {
    try {
        localStorage.setItem(CHILD_PROFILE_SYNC_SIGNATURE_KEY, getChildProfileSyncSignature(state));
    } catch (error) {
        console.warn('Child profile sync marker could not be saved:', error);
    }
};

const hasUnsyncedChildProfiles = (state = {}) => {
    if (!hasMeaningfulChildProfileChanges(state)) return false;
    try {
        return localStorage.getItem(CHILD_PROFILE_SYNC_SIGNATURE_KEY) !== getChildProfileSyncSignature(state);
    } catch {
        return true;
    }
};

const hasUnsyncedLocalDataForCloud = (state = {}) => {
    if (isLocalCloudSyncSkipped(state)) return false;
    return (
        hasUnsyncedGuestData() ||
        hasUnsyncedLocalDiaries() ||
        hasUnsyncedChildProfiles(state)
    );
};

const createSnapshotLocalId = (domain, childId, localId) => (
    `${domain}:${childId}:${toSafeString(localId) || createClientUuid()}`
);

const createFamilySnapshotLocalId = (domain, localId) => (
    `${domain}:${toSafeString(localId) || createClientUuid()}`
);

const dedupeRowsByLocalId = (rows) => {
    const rowMap = new Map();
    rows.forEach((row) => {
        const localId = toSafeString(row.local_id);
        rowMap.set(localId || createClientUuid(), row);
    });
    return [...rowMap.values()];
};

const createLocalCloudSyncBackup = (state) => {
    const key = localRepository.createGuestSyncBackupKey();
    const guestDataByChild = getChildIdsForLocalSnapshot().reduce((snapshot, childId) => {
        const guestDataStr = localStorage.getItem(`spy_guestData_${childId}`);
        if (!guestDataStr) return snapshot;

        try {
            snapshot[childId] = normalizeGuestData(JSON.parse(guestDataStr));
        } catch {
            snapshot[childId] = { parseError: true, raw: guestDataStr };
        }
        return snapshot;
    }, {});

    return {
        key,
        payload: {
            createdAt: new Date().toISOString(),
            userId: state.session?.user?.id || null,
            familyId: state.currentFamilyId || null,
            currentChild: state.currentChild,
            childCount: state.childCount,
            childProfiles: state.childProfiles,
            guestDataByChild,
            diaries: loadLocalDiaryRecords()
        }
    };
};

const buildGuestCloudSnapshot = (state) => {
    const tables = {
        schedule: [],
        payment: [],
        asset: [],
        ops: [],
        dailytasks: [],
        transactionhistory: [],
        notice: []
    };
    const guestDataStringsByChild = {};

    for (const childId of getChildIdsForLocalSnapshot()) {
        const guestDataStr = localStorage.getItem(`spy_guestData_${childId}`);
        if (!guestDataStr || guestDataStr === localStorage.getItem(`spy_guestDataLastSynced_${childId}`)) {
            continue;
        }

        const guestData = normalizeGuestData(JSON.parse(guestDataStr));
        if (!hasMeaningfulGuestData(guestData)) {
            guestDataStringsByChild[childId] = guestDataStr;
            continue;
        }

        guestDataStringsByChild[childId] = guestDataStr;

        for (const day in guestData.weeklyData) {
            guestData.weeklyData[day].forEach(item => {
                tables.schedule.push({
                    local_id: createSnapshotLocalId('schedule', childId, item.localId),
                    title: item.title,
                    day_of_week: day,
                    start_time: `${item.time}:00`,
                    pickup_agent: item.agent,
                    drop_agent: item.agent,
                    location: item.location || '',
                    contact_name: item.contactName || '',
                    contact_phone: item.contactPhone || '',
                    is_urgent: item.isUrgent || false,
                    is_early: item.isEarly || false,
                    child_id: childId
                });
            });
        }

        guestData.funds.forEach(fund => {
            tables.asset.push({
                local_id: createFamilySnapshotLocalId('asset', fund.localId),
                name: fund.name,
                balance: fund.balance,
                last_updated: fund.updated === '미설정' ? null : new Date().toISOString()
            });
        });

        guestData.payments.forEach(payment => {
            tables.payment.push({
                local_id: createSnapshotLocalId('payment', childId, payment.localId),
                source: payment.source,
                amount: payment.amount,
                method: payment.method,
                payment_day: normalizeDayNumber(payment.day),
                discount_info: payment.discount,
                is_completed: payment.isCompleted,
                child_id: childId
            });
        });

        guestData.opsData.forEach(op => {
            tables.ops.push({
                local_id: createSnapshotLocalId('ops', childId, op.localId),
                title: op.title,
                execution_date: normalizeDateDashes(op.date),
                description: op.description || '',
                priority: op.priority,
                status: op.status,
                child_id: childId
            });
        });

        guestData.dailyTasks.forEach(task => {
            tables.dailytasks.push({
                local_id: createSnapshotLocalId('daily', childId, task.localId),
                task_name: task.task_name,
                is_completed: task.is_completed,
                assigned_date: task.assigned_date,
                child_id: childId
            });
        });

        guestData.transactionHistory.forEach(history => {
            tables.transactionhistory.push({
                local_id: createSnapshotLocalId('history', childId, history.localId),
                month: history.month,
                date_formatted: history.date_formatted,
                source: history.source,
                amount: history.amount,
                method: history.method || '',
                child_id: childId
            });
        });

        guestData.notices.forEach(notice => {
            tables.notice.push({
                local_id: createSnapshotLocalId('notice', childId, notice.localId),
                text: notice.text,
                is_checked: notice.checked
            });
        });
    }

    const children = Object.entries(normalizeChildProfiles(state.childProfiles))
        .slice(0, normalizeChildCount(state.childCount))
        .map(([childId, displayName], index) => ({
            child_id: childId,
            display_name: displayName,
            sort_order: index + 1,
            is_active: true
        }));

    Object.keys(tables).forEach((tableName) => {
        tables[tableName] = dedupeRowsByLocalId(tables[tableName]);
    });
    tables.schedule = dedupeRowsByContent(tables.schedule, createScheduleCloudContentKey);
    tables.asset = dedupeRowsByContent(tables.asset, createAssetCloudContentKey);
    tables.payment = dedupeRowsByContent(tables.payment, createPaymentCloudContentKey);
    tables.ops = dedupeRowsByContent(tables.ops, createOpsCloudContentKey);
    tables.dailytasks = dedupeRowsByContent(tables.dailytasks, createDailyTaskCloudContentKey);
    tables.transactionhistory = dedupeRowsByContent(tables.transactionhistory, createTransactionCloudContentKey);
    tables.notice = dedupeRowsByContent(tables.notice, createNoticeCloudContentKey);

    return {
        snapshot: {
            family_id: state.currentFamilyId,
            user_id: state.session?.user?.id || null,
            created_at: new Date().toISOString(),
            children,
            tables
        },
        guestDataStringsByChild
    };
};

const isMissingSyncSnapshotRpcError = (error) => (
    ['PGRST202', '42883'].includes(toSafeString(error?.code)) ||
    toSafeString(error?.message).includes('sync_guest_snapshot')
);

const isMissingLocalIdError = (error) => (
    ['42703', 'PGRST204', 'PGRST205'].includes(toSafeString(error?.code)) ||
    toSafeString(error?.message).includes('local_id')
);

const isMissingFamilyChildrenError = (error) => (
    supabaseRepository.isMissingFamilyChildrenError(error)
);

const createFamilyChildRows = ({ familyId, childCount, childProfiles }) => (
    Object.entries(normalizeChildProfiles(childProfiles))
        .slice(0, normalizeChildCount(childCount))
        .map(([childId, displayName], index) => ({
            family_id: familyId,
            child_id: childId,
            display_name: toSafeString(displayName, DEFAULT_CHILD_PROFILES[childId] || childId),
            sort_order: index + 1,
            is_active: true
        }))
);

const upsertFamilyChildren = async ({ familyId, childCount, childProfiles }) => {
    if (!supabase || !familyId) return { ok: false, skipped: true };

    const rows = createFamilyChildRows({ familyId, childCount, childProfiles });
    if (rows.length === 0) return { ok: true };

    const result = await supabaseRepository.upsertFamilyChildren(rows);

    return result;
};

const withoutLocalId = (row) => {
    const nextRow = { ...row };
    delete nextRow.local_id;
    return nextRow;
};

const insertWithLocalIdFallback = async (table, rows, { select = false } = {}) => {
    return supabaseRepository.insertWithLocalIdFallback(table, rows, { select });
};

const CLOUD_SYNC_DATA_TABLES = ['schedule', 'payment', 'ops', 'dailytasks', 'transactionhistory', 'notice', 'diary'];

const inspectMeaningfulCloudFamilyData = async (familyId) => {
    if (!supabase || !familyId) return { hasData: false, counts: {}, assetCount: 0 };

    const counts = {};
    for (const table of CLOUD_SYNC_DATA_TABLES) {
        const { count, error } = await scopeFamilyQuery(
            supabase.from(table).select('id', { count: 'exact', head: true }),
            familyId
        );
        if (error) throw error;
        counts[table] = count || 0;
    }

    const { data: assetRows, error: assetError } = await scopeFamilyQuery(
        supabase.from('asset').select('id, name, balance'),
        familyId
    );
    if (assetError) throw assetError;

    const defaultAssetNames = new Set(INITIAL_FUNDS.map(fund => fund.name));
    const meaningfulAssets = dedupeRowsByContent(assetRows || [], createAssetCloudContentKey)
        .filter(row => (
            toSafeNumber(row?.balance) !== 0 ||
            !defaultAssetNames.has(toSafeString(row?.name).replace('성남', '지역'))
        ));

    return {
        hasData: Object.values(counts).some(value => value > 0) || meaningfulAssets.length > 0,
        counts,
        assetCount: meaningfulAssets.length
    };
};

const verifyGuestSnapshotSync = async ({ snapshot, currentFamilyId }) => {
    const verification = {};

    for (const [table, rows] of Object.entries(snapshot.tables || {})) {
        const expectedLocalIds = [...new Set(rows.map(row => toSafeString(row.local_id)).filter(Boolean))];
        if (expectedLocalIds.length === 0) {
            verification[table] = { expected: 0, actual: 0, skipped: false };
            continue;
        }

        const { data, error } = await scopeFamilyQuery(
            supabase.from(table).select('local_id'),
            currentFamilyId
        ).in('local_id', expectedLocalIds);

        if (error) {
            if (isMissingLocalIdError(error)) {
                verification[table] = {
                    expected: expectedLocalIds.length,
                    actual: null,
                    skipped: true,
                    reason: error.message
                };
                continue;
            }
            throw error;
        }

        const actualLocalIds = new Set((data || []).map(row => row.local_id).filter(Boolean));
        const missingLocalIds = expectedLocalIds.filter(localId => !actualLocalIds.has(localId));
        verification[table] = {
            expected: expectedLocalIds.length,
            actual: actualLocalIds.size,
            skipped: false,
            missing: missingLocalIds
        };

        if (missingLocalIds.length > 0) {
            throw new Error(`${table} 동기화 검증 실패: ${missingLocalIds.length}개 항목이 저장되지 않았습니다.`);
        }
    }

    return verification;
};

const createScheduleKey = (item) => [
    item.time || '',
    (item.title || '').trim(),
    item.agent || '',
    item.location || '',
    item.contactName || '',
    item.contactPhone || ''
].join('|');

const createScheduleCopy = (item, id) => ({
    id,
    localId: id,
    time: item.time,
    title: item.title,
    agent: item.agent,
    location: item.location || '',
    contactName: item.contactName || '',
    contactPhone: item.contactPhone || '',
    isEarly: !!item.isEarly,
    isUrgent: !!item.isUrgent
});

const isPendingReplay = (options = {}) => options?.fromPendingRetry === true;

const getCloudErrorMessage = (error) => toSafeString(error?.message || error, '클라우드 저장 실패');

const queueCloudFailure = ({ get, type, payload, error }) => {
    const message = getCloudErrorMessage(error);
    get().queuePendingMutation({
        type,
        payload,
        lastError: message
    });
    try {
        saveGuestDataToLocalStorage(get());
    } catch (storageError) {
        console.warn('Cloud failure fallback could not be snapshotted locally:', storageError);
    }
    return { ok: false, queued: true, error: message };
};

const getDiaryImageSources = (record) => {
    const imageUrls = asArray(record?.imageUrls).map(toSafeString).filter(Boolean);
    if (imageUrls.length > 0) return imageUrls;

    const imageUrl = toSafeString(record?.imageUrl).trim();
    if (imageUrl) return [imageUrl];

    return asArray(record?.imagePaths).map(toSafeString).filter(Boolean);
};

const prepareDiaryImagesForCloud = async ({ record, familyId }) => {
    const imageSources = getDiaryImageSources(record);
    if (imageSources.length === 0) {
        return {
            imagePaths: asArray(record?.imagePaths).map(getDiaryStoragePath).filter(Boolean),
            uploadedPaths: []
        };
    }

    return withRejectingTimeout(
        uploadDiaryImagesToStorage({
            client: supabase,
            images: imageSources,
            familyId,
            diaryId: record.id
        }),
        DIARY_CLOUD_SAVE_TIMEOUT_MS,
        '다이어리 사진 저장 시간이 초과되었습니다.'
    );
};

const clearDiarySyncState = (record) => {
    if (!record || typeof record !== 'object') return record;
    const { syncState, sync_state, ...rest } = record;
    return rest;
};

const markDiaryPending = (record) => ({
    ...record,
    syncState: DIARY_SYNC_STATE_PENDING
});

const isPendingDiaryRecord = (record) => (
    toSafeString(record?.syncState ?? record?.sync_state) === DIARY_SYNC_STATE_PENDING
);

const isSameDiaryRecordIdentity = (record, nextRecord) => {
    const normalizedRecord = normalizeDiaryRecords([record])[0];
    const normalizedNextRecord = normalizeDiaryRecords([nextRecord])[0];
    if (!normalizedRecord || !normalizedNextRecord) return false;

    const nextIds = new Set(getDiaryRecordIds(normalizedNextRecord));
    if (nextIds.size > 0 && getDiaryRecordIds(normalizedRecord).some(id => nextIds.has(id))) {
        return true;
    }

    return createDiaryRecordContentKey(normalizedRecord) === createDiaryRecordContentKey(normalizedNextRecord);
};

const isSameDiaryDeleteTarget = (record, nextRecord) => {
    if (isSameDiaryRecordIdentity(record, nextRecord)) return true;

    const recordKey = createDiaryRecordDeleteContentKey(record);
    const nextRecordKey = createDiaryRecordDeleteContentKey(nextRecord);
    return Boolean(recordKey && nextRecordKey && recordKey === nextRecordKey);
};

const getDiaryMutationRecord = (mutation) => {
    if (!['diary:add', 'diary:update'].includes(mutation?.type)) return null;
    return normalizeDiaryRecords([mutation?.payload?.diaryData])[0] || null;
};

const getDiaryDeleteMutationRecord = (mutation) => (
    mutation?.type === 'diary:delete'
        ? normalizeDiaryRecords([mutation?.payload?.diaryData])[0] || null
        : null
);

const getDiaryDeleteMutationIds = (mutation) => new Set([
    mutation?.payload?.diaryId,
    ...asArray(mutation?.payload?.diaryIds),
    ...asArray(mutation?.payload?.diaryLocalIds)
].map(toSafeString).filter(Boolean));

const isPendingDiaryMutationCancelledByDelete = (mutation, deleteMutation) => {
    if (deleteMutation?.type !== 'diary:delete') return false;

    const deleteRecord = getDiaryDeleteMutationRecord(deleteMutation);
    const deleteIds = getDiaryDeleteMutationIds(deleteMutation);

    if (['diary:add', 'diary:update'].includes(mutation?.type)) {
        const pendingRecord = getDiaryMutationRecord(mutation);
        if (!pendingRecord) return false;
        if (deleteRecord && isSameDiaryDeleteTarget(pendingRecord, deleteRecord)) return true;
        return getDiaryRecordIds(pendingRecord).some(id => deleteIds.has(id));
    }

    if (mutation?.type === 'diary:comment:add') {
        return deleteIds.has(toSafeString(mutation?.payload?.diaryId));
    }

    return false;
};

const removePendingMutationsCancelledByDeletes = (mutations) => {
    const pendingMutations = asArray(mutations);
    const deleteMutations = pendingMutations.filter(mutation => mutation?.type === 'diary:delete');
    if (deleteMutations.length === 0) return pendingMutations;

    return pendingMutations.filter((mutation) => (
        mutation?.type === 'diary:delete' ||
        !deleteMutations.some(deleteMutation => isPendingDiaryMutationCancelledByDelete(mutation, deleteMutation))
    ));
};

const getDiaryPendingMutationKey = (mutation) => {
    if (['diary:add', 'diary:update'].includes(mutation?.type)) {
        const record = getDiaryMutationRecord(mutation);
        const key = toSafeString(record?.localId || record?.id);
        return key ? `diary:record:${key}` : '';
    }

    if (mutation?.type === 'diary:delete') {
        const record = normalizeDiaryRecords([mutation?.payload?.diaryData])[0];
        const contentKey = record ? createDiaryRecordDeleteContentKey(record) : '';
        if (contentKey) return `diary:delete:${contentKey}`;

        const ids = [
            mutation?.payload?.diaryId,
            ...asArray(mutation?.payload?.diaryIds),
            ...asArray(mutation?.payload?.diaryLocalIds)
        ].map(toSafeString).filter(Boolean).sort();
        return ids.length > 0 ? `diary:delete:${ids.join(':')}` : '';
    }

    if (mutation?.type === 'diary:comment:add') {
        const diaryId = toSafeString(mutation?.payload?.diaryId);
        const comment = mutation?.payload?.comment || {};
        const commentKey = toSafeString(comment.id || comment.text);
        return diaryId && commentKey ? `diary:comment:${diaryId}:${commentKey}` : '';
    }

    return '';
};

const appendPendingMutation = (mutations, queuedMutation) => {
    const mutationKey = getDiaryPendingMutationKey(queuedMutation);
    const baseMutations = queuedMutation?.type === 'diary:delete'
        ? asArray(mutations).filter(mutation => !isPendingDiaryMutationCancelledByDelete(mutation, queuedMutation))
        : asArray(mutations);

    if (!mutationKey) return [...baseMutations, queuedMutation];

    const existingMutation = baseMutations.find(mutation => getDiaryPendingMutationKey(mutation) === mutationKey);
    const nextMutation = (
        existingMutation?.type === 'diary:add' && queuedMutation.type === 'diary:update'
    )
        ? { ...queuedMutation, type: 'diary:add' }
        : queuedMutation;

    return [
        ...baseMutations.filter(mutation => getDiaryPendingMutationKey(mutation) !== mutationKey),
        nextMutation
    ];
};

const isDiaryRecordContentSynced = (cloudRecord, pendingRecord) => (
    createDiaryRecordContentKey(cloudRecord) === createDiaryRecordContentKey(pendingRecord)
);

const isDiaryDeleteMutationTarget = (mutation, record) => {
    if (mutation?.type !== 'diary:delete') return false;

    const pendingRecord = normalizeDiaryRecords([mutation?.payload?.diaryData])[0];
    if (pendingRecord && isSameDiaryDeleteTarget(record, pendingRecord)) return true;

    const deleteIds = new Set([
        mutation?.payload?.diaryId,
        ...asArray(mutation?.payload?.diaryIds),
        ...asArray(mutation?.payload?.diaryLocalIds)
    ].map(toSafeString).filter(Boolean));
    if (deleteIds.size === 0) return false;

    return getDiaryRecordIds(record).some(id => deleteIds.has(id));
};

const reconcileDiaryPendingMutations = (pendingMutations, cloudRecords) => {
    const cloudDiaries = normalizeDiaryRecords(cloudRecords);
    const prunedPendingMutations = removePendingMutationsCancelledByDeletes(pendingMutations);

    return prunedPendingMutations.filter((mutation) => {
        if (['diary:add', 'diary:update'].includes(mutation?.type)) {
            const pendingRecord = getDiaryMutationRecord(mutation);
            if (!pendingRecord) return false;

            const cloudRecord = cloudDiaries.find(record => isSameDiaryRecordIdentity(record, pendingRecord));
            if (!cloudRecord) return true;
            if (mutation.type === 'diary:add') return !isDiaryRecordContentSynced(cloudRecord, pendingRecord);
            return !isDiaryRecordContentSynced(cloudRecord, pendingRecord);
        }

        if (mutation?.type === 'diary:delete') {
            return cloudDiaries.some(record => isDiaryDeleteMutationTarget(mutation, record));
        }

        return true;
    });
};

const mergeCloudDiariesWithLocalPending = (cloudRecords, state) => {
    const pendingDeleteMutations = asArray(state?.pendingMutations).filter(mutation => mutation?.type === 'diary:delete');
    const isBlockedByPendingDelete = (record) => (
        pendingDeleteMutations.some(mutation => isDiaryDeleteMutationTarget(mutation, record))
    );
    const cloudDiaries = dedupeDiaryRecordsByContent(cloudRecords)
        .map(clearDiarySyncState)
        .filter(record => !isBlockedByPendingDelete(record));
    const queuedPendingDiaries = asArray(state?.pendingMutations)
        .map(getDiaryMutationRecord)
        .filter(Boolean)
        .filter(record => !isBlockedByPendingDelete(record))
        .map(markDiaryPending);
    const statePendingDiaries = normalizeDiaryRecords(state?.diaries)
        .filter(isPendingDiaryRecord)
        .filter(record => !isBlockedByPendingDelete(record))
        .map(markDiaryPending);
    const pendingDiaries = dedupeDiaryRecordsByContent([
        ...queuedPendingDiaries,
        ...statePendingDiaries
    ]);

    const pendingOverrides = pendingDiaries.filter((pendingRecord) => {
        const cloudRecord = cloudDiaries.find(record => isSameDiaryRecordIdentity(record, pendingRecord));
        return cloudRecord && !isDiaryRecordContentSynced(cloudRecord, pendingRecord);
    });
    const pendingOnly = pendingDiaries.filter((pendingRecord) => (
        !cloudDiaries.some(record => isSameDiaryRecordIdentity(record, pendingRecord))
    ));
    const mergedCloud = cloudDiaries.map((cloudRecord) => {
        const pendingRecord = pendingOverrides.find(record => isSameDiaryRecordIdentity(record, cloudRecord));
        return pendingRecord || cloudRecord;
    });

    return dedupeDiaryRecordsByContent([
        ...pendingOnly,
        ...mergedCloud
    ]);
};

const findCloudDiaryDeleteTargets = async ({ familyId, targetRecord }) => {
    const normalizedTarget = normalizeDiaryRecords([targetRecord])[0];
    if (!supabase || !familyId || !normalizedTarget) return [];

    const title = toSafeString(normalizedTarget.title).trim();
    if (!title && !normalizedTarget.isoDate && !toSafeString(normalizedTarget.text).trim()) {
        return [];
    }

    let query = supabase
        .from('diary')
        .select('*, diary_comments(*)')
        .eq('family_id', familyId);

    if (normalizedTarget.isoDate) {
        query = query.eq('date', normalizedTarget.isoDate);
    }

    if (title) {
        query = query.eq('title', title);
    }

    const { data, error } = await withRejectingTimeout(
        query,
        DIARY_CLOUD_DELETE_TIMEOUT_MS,
        '다이어리 중복 삭제 대상 확인 시간이 초과되었습니다.'
    );

    if (error) throw error;

    return normalizeDiaryRecords(data).filter(record => isSameDiaryDeleteTarget(record, normalizedTarget));
};

const commitDiaryCloudRecord = (set, record) => {
    const syncedRecord = clearDiarySyncState(normalizeDiaryRecords([record])[0]);
    if (!syncedRecord) return null;

    markDiaryMutationBoundary();
    set((state) => {
        const hasExisting = state.diaries.some(existingRecord => isSameDiaryRecordIdentity(existingRecord, syncedRecord));
        const diaries = hasExisting
            ? state.diaries.map(existingRecord => (
                isSameDiaryRecordIdentity(existingRecord, syncedRecord) ? syncedRecord : existingRecord
            ))
            : [syncedRecord, ...state.diaries];
        return { diaries: saveDiaryRecordsForCurrentMode(state, diaries) };
    });

    return syncedRecord;
};

const saveDiaryRecordsForCurrentMode = (state, records) => {
    const nextRecords = dedupeDiaryRecordsByContent(records);
    if (state.currentFamilyId) {
        saveCloudDiaryCache(state.currentFamilyId, nextRecords);
    } else {
        saveLocalDiaryRecords(nextRecords);
    }
    return nextRecords;
};

const saveDiaryOptimistic = ({ set, diaryData }) => {
    const nextRecord = normalizeDiaryRecords([diaryData])[0];

    markDiaryMutationBoundary();
    set((state) => {
        const recordForState = isCloudReady(state)
            ? markDiaryPending(nextRecord)
            : clearDiarySyncState(nextRecord);
        const hasExisting = state.diaries.some(record => isSameDiaryRecordIdentity(record, nextRecord));
        const nextDiaries = hasExisting
            ? state.diaries.map(record => isSameDiaryRecordIdentity(record, nextRecord) ? recordForState : record)
            : [recordForState, ...state.diaries];
        return { diaries: saveDiaryRecordsForCurrentMode(state, nextDiaries) };
    });

    return nextRecord;
};

const saveDiaryLocalFallback = ({ set, get, diaryData, mutationType, error }) => {
    const nextRecord = saveDiaryOptimistic({ set, diaryData });

    if (mutationType) {
        get().queuePendingMutation({
            type: mutationType,
            payload: { diaryData: nextRecord },
            lastError: getCloudErrorMessage(error)
        });
    }

    return nextRecord;
};

const savedProfiles = (() => {
    try {
        return normalizeChildProfiles(JSON.parse(localStorage.getItem('spy_childProfiles')));
    } catch {
        return DEFAULT_CHILD_PROFILES;
    }
})();
const savedChildCount = (() => {
    try {
        return normalizeChildCount(localStorage.getItem('spy_childCount'));
    } catch {
        return 1;
    }
})();
const savedCurrentChild = (() => {
    try {
        return normalizeCurrentChild(localStorage.getItem('spy_currentChild'));
    } catch {
        return 'child1';
    }
})();

const GUEST_DATA_KEYS = [
    'weeklyData',
    'missionsData',
    'funds',
    'payments',
    'opsData',
    'transactionHistory',
    'notices',
    'dailyTasks'
];

const createGuestDataSnapshot = (state) => normalizeGuestData(GUEST_DATA_KEYS.reduce((snapshot, key) => {
    snapshot[key] = state[key];
    return snapshot;
}, {}));

const hasGuestDataChanged = (prevState, nextState) => (
    !prevState || GUEST_DATA_KEYS.some((key) => prevState[key] !== nextState[key])
);

const saveGuestDataToLocalStorage = (state) => {
    try {
        localStorage.setItem(
            `spy_guestData_${state.currentChild}`,
            JSON.stringify(createGuestDataSnapshot(state))
        );
    } catch (error) {
        console.error('Local save failed:', error);
    }
};

const getCloudCacheKey = (familyId, childId) => (
    `${CLOUD_CACHE_PREFIX}_${familyId}_${childId}`
);

const getCloudDiaryCacheKey = (familyId) => (
    `${CLOUD_DIARY_CACHE_PREFIX}_${familyId}`
);

const saveCloudCacheSnapshot = (state, familyId, childId) => {
    if (!familyId || !childId) return;
    try {
        localRepository.saveJson(getCloudCacheKey(familyId, childId), {
            createdAt: new Date().toISOString(),
            data: createGuestDataSnapshot(state)
        });
    } catch (error) {
        console.warn('Cloud cache could not be saved locally:', error);
    }
};

const loadCloudCacheSnapshot = (familyId, childId) => {
    if (!familyId || !childId) return null;
    const cached = localRepository.loadJson(getCloudCacheKey(familyId, childId), null);
    if (!cached?.data) return null;
    const normalized = normalizeGuestData(cached.data);
    try {
        localRepository.saveJson(getCloudCacheKey(familyId, childId), {
            ...cached,
            data: normalized
        });
    } catch (error) {
        console.warn('Cloud cache cleanup could not be saved locally:', error);
    }
    return normalized;
};

const setCloudCacheForCurrentChild = (set, get, familyId, extraState = {}) => {
    const { currentChild } = get();
    const cached = loadCloudCacheSnapshot(familyId, currentChild);
    if (!cached) return false;

    set({
        ...cached,
        isLoading: false,
        isDataLoaded: true,
        storageMode: STORAGE_MODE.CLOUD_ERROR,
        ...extraState
    });
    return true;
};

const saveCloudDiaryCache = (familyId, records) => {
    if (!familyId) return;
    try {
        localRepository.saveJson(getCloudDiaryCacheKey(familyId), {
            createdAt: new Date().toISOString(),
            records: dedupeDiaryRecordsByContent(records)
        });
    } catch (error) {
        console.warn('Cloud diary cache could not be saved locally:', error);
    }
};

const loadCloudDiaryCache = (familyId) => {
    if (!familyId) return null;
    const cached = localRepository.loadJson(getCloudDiaryCacheKey(familyId), null);
    if (!Array.isArray(cached?.records)) return null;
    const records = dedupeDiaryRecordsByContent(cached.records);
    try {
        localRepository.saveJson(getCloudDiaryCacheKey(familyId), {
            ...cached,
            records
        });
    } catch (error) {
        console.warn('Cloud diary cache cleanup could not be saved locally:', error);
    }
    return records;
};

const saveFamilyContextCache = ({ currentFamilyId, familyInviteCode, familyMembers }, userId) => {
    if (!currentFamilyId || !userId) return;
    try {
        localRepository.saveJson(FAMILY_CONTEXT_CACHE_KEY, {
            createdAt: new Date().toISOString(),
            userId,
            currentFamilyId,
            familyInviteCode: familyInviteCode || null,
            familyMembers: Array.isArray(familyMembers) ? familyMembers : []
        });
    } catch (error) {
        console.warn('Family context cache could not be saved locally:', error);
    }
};

const loadFamilyContextCache = (userId) => {
    if (!userId) return null;
    const cached = localRepository.loadJson(FAMILY_CONTEXT_CACHE_KEY, null);
    if (!cached?.currentFamilyId || cached.userId !== userId) return null;
    return {
        currentFamilyId: cached.currentFamilyId,
        familyInviteCode: cached.familyInviteCode || null,
        familyMembers: Array.isArray(cached.familyMembers) ? cached.familyMembers : []
    };
};

const clearFamilyContextCache = () => {
    try {
        localRepository.removeKeys([FAMILY_CONTEXT_CACHE_KEY]);
    } catch (error) {
        console.warn('Family context cache could not be cleared locally:', error);
    }
};

const loadLocalGuestDataForChild = (childId) => {
    const guestDataStr = localStorage.getItem(`spy_guestData_${childId}`);
    if (!guestDataStr) return normalizeGuestData({});

    try {
        const normalized = normalizeGuestData(JSON.parse(guestDataStr));
        localStorage.setItem(`spy_guestData_${childId}`, JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.warn('Local guest data could not be loaded safely:', error);
        return normalizeGuestData({});
    }
};

const setLocalGuestDataForCurrentChild = (set, get, extraState = {}) => {
    const { currentChild } = get();
    set({
        ...loadLocalGuestDataForChild(currentChild),
        isLoading: false,
        isDataLoaded: true,
        ...extraState
    });
};

const cleanupDuplicateLocalCaches = () => {
    if (typeof localStorage === 'undefined') return { changed: false, keys: [] };

    try {
        const updates = [];
        const backup = {
            createdAt: new Date().toISOString(),
            keys: {}
        };
        const queueJsonUpdate = (key, value) => {
            const currentRaw = localStorage.getItem(key);
            if (currentRaw === null) return;
            const nextRaw = JSON.stringify(value);
            if (currentRaw === nextRaw) return;
            backup.keys[key] = currentRaw;
            updates.push({ key, value: nextRaw });
        };

        getChildIdsForLocalSnapshot().forEach((childId) => {
            const key = `spy_guestData_${childId}`;
            const raw = localStorage.getItem(key);
            if (!raw) return;
            try {
                queueJsonUpdate(key, normalizeGuestData(JSON.parse(raw)));
            } catch (error) {
                console.warn('Local guest data cleanup skipped for unreadable cache:', error);
            }
        });

        [DIARY_RECORDS_STORAGE_KEY, LEGACY_DIARY_RECORDS_STORAGE_KEY].forEach((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            try {
                queueJsonUpdate(key, dedupeDiaryRecordsByContent(JSON.parse(raw)));
            } catch (error) {
                console.warn('Local diary cleanup skipped for unreadable cache:', error);
            }
        });

        Object.keys(localStorage)
            .filter(key => key.startsWith(`${CLOUD_CACHE_PREFIX}_`))
            .forEach((key) => {
                const cached = localRepository.loadJson(key, null);
                if (!cached?.data) return;
                queueJsonUpdate(key, {
                    ...cached,
                    data: normalizeGuestData(cached.data)
                });
            });

        Object.keys(localStorage)
            .filter(key => key.startsWith(`${CLOUD_DIARY_CACHE_PREFIX}_`))
            .forEach((key) => {
                const cached = localRepository.loadJson(key, null);
                if (!Array.isArray(cached?.records)) return;
                queueJsonUpdate(key, {
                    ...cached,
                    records: dedupeDiaryRecordsByContent(cached.records)
                });
            });

        if (updates.length === 0) return { changed: false, keys: [] };

        localStorage.setItem(`spy_localCleanupBackup_${Date.now()}`, JSON.stringify(backup));
        updates.forEach(({ key, value }) => localStorage.setItem(key, value));
        return { changed: true, keys: updates.map(update => update.key) };
    } catch (error) {
        console.warn('Duplicate local cache cleanup could not be completed:', error);
        return { changed: false, keys: [] };
    }
};

cleanupDuplicateLocalCaches();

const getJoinedFamilyForInviteCode = async ({ code, userId }) => {
    if (!supabase || !userId || !code) return null;

    const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (memberError) throw memberError;
    if (!memberData?.family_id) return null;

    const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id, invite_code')
        .eq('id', memberData.family_id)
        .maybeSingle();

    if (familyError) throw familyError;

    const familyCode = toSafeString(familyData?.invite_code).trim().toUpperCase();
    return familyCode === code ? familyData.id : null;
};

const waitForJoinedFamilyForInviteCode = async ({ code, userId, attempts = 8, delayMs = 1500 }) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const familyId = await getJoinedFamilyForInviteCode({ code, userId });
        if (familyId) return familyId;
        if (attempt < attempts - 1) await wait(delayMs);
    }
    return null;
};

const persistGuestData = (config) => (set, get, api) => config((args) => {
    const prevState = get();
    set(args);
    const nextState = get();

    if ((!isCloudReady(nextState) || nextState.storageMode === STORAGE_MODE.CLOUD_ERROR) && hasGuestDataChanged(prevState, nextState)) {
        saveGuestDataToLocalStorage(nextState);
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
    diaries: loadLocalDiaryRecords(),
    isLoading: false,
    isFamilyLoading: false,
    currentFamilyId: null,
    familyMembers: [],
    familyInviteCode: null,
    storageMode: STORAGE_MODE.LOCAL,
    syncStatus: DEFAULT_SYNC_STATUS,
    syncVerification: null,
    lastSyncAt: (() => {
        try {
            return localStorage.getItem(LAST_SYNC_AT_KEY);
        } catch {
            return null;
        }
    })(),
    pendingMutations: loadPendingMutations(),
    // Multi-Child Profile State
    childCount: savedChildCount, // Number of children currently managed (max 3)
    currentChild: savedCurrentChild,
    childProfiles: savedProfiles,

    // Auth State
    session: null,
    isAuthChecking: true,
    isGuestMode: true,

    setGuestMode: (val) => {
        if (val) {
            set({ isGuestMode: val, isAuthChecking: false, storageMode: STORAGE_MODE.LOCAL });
            get().fetchDataFromDB();
        } else {
            set((state) => ({
                isGuestMode: val,
                isAuthChecking: false,
                storageMode: resolveStorageMode(state)
            }));
        }
    },
    refreshStorageMode: () => {
        const state = get();
        const storageMode = resolveStorageMode(state);
        set({ storageMode });
        return storageMode;
    },
    isCloudReady: () => isCloudReady(get()),
    hasUnsyncedLocalData: () => hasUnsyncedLocalDataForCloud(get()),
    markLocalCloudSyncSkipped: () => markLocalCloudSyncSkippedSignature(get()),
    shouldPromptLocalCloudSync: async () => {
        const state = get();
        if (!hasUnsyncedLocalDataForCloud(state)) {
            return { prompt: false, reason: 'no-local-data' };
        }
        if (!isCloudReady(state)) {
            return { prompt: false, reason: 'cloud-not-ready' };
        }

        const cloudStatus = await inspectMeaningfulCloudFamilyData(state.currentFamilyId);
        if (cloudStatus.hasData) {
            markLocalCloudSyncSkippedSignature(state);
            set({
                syncStatus: {
                    phase: 'skipped',
                    message: '가족 공유에 이미 데이터가 있어 로컬 데이터 자동 병합을 중단했습니다.',
                    error: null,
                    backupKey: null
                }
            });
            return { prompt: false, reason: 'cloud-has-data', cloudStatus };
        }

        return { prompt: true, reason: 'empty-cloud', cloudStatus };
    },
    queuePendingMutation: (mutation) => {
        const queuedMutation = {
            id: mutation.id || createClientUuid(),
            type: mutation.type,
            payload: mutation.payload || {},
            createdAt: mutation.createdAt || new Date().toISOString(),
            attempts: mutation.attempts || 0,
            lastError: mutation.lastError || null
        };
        const pendingMutations = appendPendingMutation(get().pendingMutations, queuedMutation);
        savePendingMutations(pendingMutations);
        set({
            pendingMutations,
            storageMode: isCloudReady(get()) ? STORAGE_MODE.CLOUD_ERROR : STORAGE_MODE.LOCAL,
            syncStatus: {
                phase: 'queued',
                message: '클라우드 저장이 끝나지 않아 이 기기에 재저장 대기 항목으로 보관했습니다.',
                error: queuedMutation.lastError,
                backupKey: null
            }
        });
        return queuedMutation;
    },
    saveDiaryLocalFallback: (diaryData, mutationType = 'diary:add', error = null) => (
        saveDiaryLocalFallback({ set, get, diaryData, mutationType, error })
    ),
    saveDiaryOptimistic: (diaryData) => (
        saveDiaryOptimistic({ set, diaryData })
    ),
    clearPendingMutations: () => {
        savePendingMutations([]);
        set({ pendingMutations: [] });
    },
    retryPendingMutations: async () => {
        const state = get();
        if (!isCloudReady(state)) {
            return { ok: false, error: '가족 공유 연결 후 다시 시도할 수 있습니다.' };
        }

        const pending = removePendingMutationsCancelledByDeletes(state.pendingMutations);
        if (pending.length !== asArray(state.pendingMutations).length) {
            savePendingMutations(pending);
            set({ pendingMutations: pending });
        }
        if (pending.length === 0) return { ok: true, retried: 0, failed: 0 };

        savePendingMutations([]);
        set({
            pendingMutations: [],
            syncStatus: {
                phase: 'retrying',
                message: '재저장 대기 항목을 클라우드로 다시 저장하는 중입니다.',
                error: null,
                backupKey: null
            }
        });

        const failed = [];
        for (const mutation of pending) {
            try {
                if (mutation.type === 'diary:add') {
                    await get().addDiary(mutation.payload.diaryData, { fromPendingRetry: true });
                } else if (mutation.type === 'diary:update') {
                    await get().updateDiary(mutation.payload.diaryData, { fromPendingRetry: true });
                } else if (mutation.type === 'diary:delete') {
                    await get().removeDiary(mutation.payload.diaryData || mutation.payload.diaryId, { fromPendingRetry: true });
                } else if (mutation.type === 'diary:comment:add') {
                    await get().addDiaryComment(mutation.payload.diaryId, mutation.payload.comment);
                } else if (mutation.type === 'schedule:add') {
                    await get().addSchedule(mutation.payload.day, mutation.payload.item, { fromPendingRetry: true });
                } else if (mutation.type === 'schedule:update') {
                    await get().updateScheduleItem(mutation.payload.item, { fromPendingRetry: true });
                } else if (mutation.type === 'schedule:delete') {
                    await get().removeScheduleItem(mutation.payload.id, { fromPendingRetry: true });
                } else if (mutation.type === 'payment:add') {
                    await get().addPayment(mutation.payload.paymentData, { fromPendingRetry: true });
                } else if (mutation.type === 'payment:update') {
                    await get().updatePayment(mutation.payload.payment, { fromPendingRetry: true });
                } else if (mutation.type === 'payment:delete') {
                    await get().removePayment(mutation.payload.paymentId, { fromPendingRetry: true });
                } else if (mutation.type === 'ops:add') {
                    await get().addOp(mutation.payload.opData, { fromPendingRetry: true });
                } else if (mutation.type === 'ops:update') {
                    await get().updateOp(mutation.payload.updatedOp, { fromPendingRetry: true });
                } else if (mutation.type === 'ops:delete') {
                    await get().removeOp(mutation.payload.id, { fromPendingRetry: true });
                } else if (mutation.type === 'daily:add') {
                    await get().addDailyTask(mutation.payload.taskName, { fromPendingRetry: true, localId: mutation.payload.localId });
                } else if (mutation.type === 'daily:toggle') {
                    await get().toggleDailyTask(mutation.payload.id, { fromPendingRetry: true });
                } else if (mutation.type === 'daily:delete') {
                    await get().removeDailyTask(mutation.payload.id, { fromPendingRetry: true });
                } else if (mutation.type === 'notice:add') {
                    await get().addNotice(mutation.payload.notice, { fromPendingRetry: true });
                } else if (mutation.type === 'notice:toggle') {
                    await get().updateNotice(mutation.payload.id, { fromPendingRetry: true });
                } else if (mutation.type === 'notice:delete') {
                    await get().removeNotice(mutation.payload.id, { fromPendingRetry: true });
                } else if (mutation.type === 'fund:update') {
                    await get().updateFund(mutation.payload.fund, { fromPendingRetry: true });
                } else if (mutation.type === 'history:add') {
                    await get().addTransactionHistory(mutation.payload.record, { fromPendingRetry: true });
                } else if (mutation.type === 'history:update') {
                    await get().updateTransactionHistory(mutation.payload.record, { fromPendingRetry: true });
                } else if (mutation.type === 'history:delete') {
                    await get().removeTransactionHistory(mutation.payload.id, { fromPendingRetry: true });
                } else if (mutation.type === 'mission:add') {
                    await get().addMission(mutation.payload.mission, { fromPendingRetry: true });
                } else if (mutation.type === 'mission:update') {
                    await get().updateMission(mutation.payload.mission, { fromPendingRetry: true });
                } else if (mutation.type === 'mission:delete') {
                    await get().removeMission(mutation.payload.id, { fromPendingRetry: true });
                } else if (mutation.type === 'payment:process') {
                    await get().processPayment(mutation.payload.paymentId, { ...mutation.payload, fromPendingRetry: true });
                } else if (mutation.type === 'payment:undo') {
                    await get().undoPayment(mutation.payload.paymentId, { ...mutation.payload, fromPendingRetry: true });
                } else if (mutation.type === 'schedule:copy') {
                    const rows = asArray(mutation.payload.rows).map(row => ({
                        ...row,
                        family_id: get().currentFamilyId
                    }));
                    const { error } = await insertWithLocalIdFallback('schedule', rows);
                    if (error) throw error;
                    await get().fetchDataFromDB();
                }
            } catch (error) {
                failed.push({
                    ...mutation,
                    attempts: (mutation.attempts || 0) + 1,
                    lastError: error.message
                });
            }
        }

        savePendingMutations(failed);
        set({
            pendingMutations: failed,
            storageMode: failed.length > 0 ? STORAGE_MODE.CLOUD_ERROR : STORAGE_MODE.CLOUD,
            syncStatus: failed.length > 0
                ? {
                    phase: 'queued',
                    message: '일부 항목은 아직 클라우드 재저장 대기 상태입니다.',
                    error: failed[0]?.lastError || null,
                    backupKey: null
                }
                : {
                    phase: 'complete',
                    message: '클라우드 재저장 대기 항목을 모두 저장했습니다.',
                    error: null,
                    backupKey: null
                }
        });

        return { ok: failed.length === 0, retried: pending.length, failed: failed.length };
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
        const { childCount, childProfiles, currentChild, currentFamilyId, session } = get();
        if (!isCloudReady({ session, currentFamilyId })) {
            return;
        }

        const childResult = await upsertFamilyChildren({
            familyId: currentFamilyId,
            childCount,
            childProfiles
        });

        if (childResult.error) {
            if (isMissingFamilyChildrenError(childResult.error)) {
                await supabase.auth.updateUser({
                    data: {
                        spy_childCount: childCount,
                        spy_childProfiles: childProfiles,
                        spy_currentChild: currentChild
                    }
                });
                markChildProfilesSynced({ childCount, childProfiles, currentChild });
                return;
            }

            console.warn('Family child profile sync failed:', childResult.error);
            set({
                storageMode: STORAGE_MODE.CLOUD_ERROR,
                syncStatus: {
                    phase: 'failed',
                    message: '자녀 프로필 클라우드 저장에 실패했습니다. 로컬에는 계속 보존됩니다.',
                    error: childResult.error.message,
                    backupKey: null
                }
            });
            return;
        }

        markChildProfilesSynced({ childCount, childProfiles, currentChild });
    },

    // ---- Family Share Context ----
    fetchFamilyContext: async () => {
        const { session } = get();
        if (!session || !supabase) {
            set({
                currentFamilyId: null,
                familyInviteCode: null,
                familyMembers: [],
                isFamilyLoading: false,
                storageMode: STORAGE_MODE.LOCAL
            });
            return null;
        }

        set({ isFamilyLoading: true, storageMode: STORAGE_MODE.LINKING });
        try {
            const { data: memberData, error: memberError } = await withRejectingTimeout(
                supabase
                    .from('family_members')
                    .select('family_id, role, display_name')
                    .eq('user_id', session.user.id)
                    .maybeSingle(),
                FAMILY_ACTION_TIMEOUT_MS,
                '가족 공유 연결 상태 확인 시간이 초과되었습니다.'
            );

            if (memberError) throw memberError;

            if (!memberData) {
                clearFamilyContextCache();
                set({
                    currentFamilyId: null,
                    familyInviteCode: null,
                    familyMembers: [],
                    isGuestMode: true,
                    storageMode: STORAGE_MODE.LINKING
                });
                return null;
            }

            const [{ data: familyData, error: familyError }, { data: membersList, error: listError }] = await withRejectingTimeout(
                Promise.all([
                    supabase
                        .from('families')
                        .select('id, name, invite_code')
                        .eq('id', memberData.family_id)
                        .single(),
                    supabase
                        .from('family_members')
                        .select('user_id, role, display_name, joined_at')
                        .eq('family_id', memberData.family_id)
                ]),
                FAMILY_ACTION_TIMEOUT_MS,
                '가족 구성원 정보를 불러오는 시간이 초과되었습니다.'
            );

            if (familyError) throw familyError;
            if (listError) throw listError;

            const nextContext = {
                currentFamilyId: memberData.family_id,
                familyInviteCode: familyData?.invite_code || null,
                familyMembers: membersList || [],
                isGuestMode: false,
                storageMode: STORAGE_MODE.CLOUD
            };

            const { data: childRows, error: childRowsError } = await withRejectingTimeout(
                supabase
                    .from('family_children')
                    .select('child_id, display_name, sort_order, is_active')
                    .eq('family_id', memberData.family_id)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true }),
                FAMILY_ACTION_TIMEOUT_MS,
                '자녀 프로필 정보를 불러오는 시간이 초과되었습니다.'
            );

            if (childRowsError && !isMissingFamilyChildrenError(childRowsError)) {
                throw childRowsError;
            }

            if (childRows?.length > 0) {
                const nextProfiles = { ...DEFAULT_CHILD_PROFILES };
                childRows.forEach((row) => {
                    const childId = normalizeCurrentChild(row.child_id);
                    nextProfiles[childId] = row.display_name || DEFAULT_CHILD_PROFILES[childId];
                });
                const nextChildCount = normalizeChildCount(childRows.length);
                const activeChildIds = new Set(childRows.map(row => normalizeCurrentChild(row.child_id)));
                const preferredChild = normalizeCurrentChild(get().currentChild);
                const nextCurrentChild = activeChildIds.has(preferredChild)
                    ? preferredChild
                    : normalizeCurrentChild(childRows[0]?.child_id);
                localStorage.setItem('spy_childProfiles', JSON.stringify(nextProfiles));
                localStorage.setItem('spy_childCount', nextChildCount.toString());
                localStorage.setItem('spy_currentChild', nextCurrentChild);
                Object.assign(nextContext, {
                    childProfiles: nextProfiles,
                    childCount: nextChildCount,
                    currentChild: nextCurrentChild
                });
                markChildProfilesSynced({
                    childProfiles: nextProfiles,
                    childCount: nextChildCount,
                    currentChild: nextCurrentChild
                });
            }

            set(nextContext);
            saveFamilyContextCache(nextContext, session.user.id);
            return memberData.family_id;
        } catch (error) {
            console.warn('Family context could not be loaded:', error);
            const currentState = get();
            const hasExistingFamilyContext = Boolean(currentState.currentFamilyId);
            const cachedFamilyContext = hasExistingFamilyContext ? null : loadFamilyContextCache(session.user.id);
            const fallbackFamilyId = currentState.currentFamilyId || cachedFamilyContext?.currentFamilyId || null;

            set({
                ...(hasExistingFamilyContext
                    ? {}
                    : cachedFamilyContext
                        ? cachedFamilyContext
                        : {
                            currentFamilyId: null,
                            familyInviteCode: null,
                            familyMembers: []
                        }),
                isGuestMode: !fallbackFamilyId,
                storageMode: session ? STORAGE_MODE.CLOUD_ERROR : STORAGE_MODE.LOCAL,
                syncStatus: {
                    phase: 'failed',
                    message: '가족 공유 연결 상태를 확인하지 못했습니다.',
                    error: error.message,
                    backupKey: null
                }
            });
            return fallbackFamilyId;
        } finally {
            set({ isFamilyLoading: false });
        }
    },
    createFamily: async (familyName = '가족 스케줄러') => {
        const { session } = get();
        if (!session || !supabase) return null;

        set({
            isFamilyLoading: true,
            storageMode: STORAGE_MODE.LINKING,
            syncStatus: { ...DEFAULT_SYNC_STATUS, phase: 'linking', message: '가족 그룹을 생성하는 중입니다.' }
        });
        try {
            let familyData = null;
            let lastFamilyError = null;

            for (let attempt = 0; attempt < 5; attempt += 1) {
                const inviteCode = createFamilyInviteCode();
                const { data, error } = await withRejectingTimeout(
                    supabase
                        .from('families')
                        .insert([{
                            name: toSafeString(familyName, '가족 스케줄러') || '가족 스케줄러',
                            invite_code: inviteCode,
                            created_by: session.user.id
                        }])
                        .select('id')
                        .single(),
                    FAMILY_ACTION_TIMEOUT_MS,
                    '가족 그룹 생성 시간이 초과되었습니다.'
                );

                if (!error) {
                    familyData = data;
                    break;
                }

                lastFamilyError = error;
                if (!isUniqueInviteCodeError(error)) break;
            }

            if (!familyData) throw lastFamilyError || new Error('가족 그룹 생성에 실패했습니다.');

            const { error: memberError } = await withRejectingTimeout(
                supabase
                    .from('family_members')
                    .insert([{
                        user_id: session.user.id,
                        family_id: familyData.id,
                        role: 'owner',
                        display_name: '보호자'
                    }]),
                FAMILY_ACTION_TIMEOUT_MS,
                '가족 구성원 등록 시간이 초과되었습니다.'
            );

            if (memberError) throw memberError;

            await withRejectingTimeout(
                get().fetchFamilyContext(),
                FAMILY_ACTION_TIMEOUT_MS,
                '가족 그룹 생성 후 상태 확인 시간이 초과되었습니다.'
            );
            set({
                syncStatus: hasUnsyncedLocalDataForCloud(get())
                    ? {
                        phase: 'awaiting-confirmation',
                        message: '이 기기의 로컬 데이터를 클라우드로 동기화할지 선택해 주세요.',
                        error: null,
                        backupKey: null
                    }
                    : DEFAULT_SYNC_STATUS
            });
            return familyData.id;
        } catch (error) {
            set({
                storageMode: STORAGE_MODE.CLOUD_ERROR,
                syncStatus: {
                    phase: 'failed',
                    message: '가족 생성에 실패했습니다.',
                    error: error.message,
                    backupKey: null
                }
            });
            return null;
        } finally {
            set({ isFamilyLoading: false });
        }
    },
    joinFamily: async (inviteCode) => {
        const { session } = get();
        if (!session || !supabase) return false;
        set({
            isFamilyLoading: true,
            storageMode: STORAGE_MODE.LINKING,
            syncStatus: { ...DEFAULT_SYNC_STATUS, phase: 'linking', message: '가족 그룹에 합류하는 중입니다.' }
        });
        const code = toSafeString(inviteCode).trim().toUpperCase();
        try {
            const existingFamilyId = await getJoinedFamilyForInviteCode({ code, userId: session.user.id });
            if (existingFamilyId) {
                await withRejectingTimeout(
                    get().fetchFamilyContext(),
                    FAMILY_ACTION_TIMEOUT_MS,
                    '가족 합류 후 상태 확인 시간이 초과되었습니다.'
                );
                set({ syncStatus: DEFAULT_SYNC_STATUS });
                return true;
            }

            const { error } = await withRejectingTimeout(
                supabase.rpc('join_family_by_code', { code_input: code }),
                FAMILY_ACTION_TIMEOUT_MS,
                '가족 합류 시간이 초과되었습니다.'
            );
            if (error) throw error;

            await withRejectingTimeout(
                get().fetchFamilyContext(),
                FAMILY_ACTION_TIMEOUT_MS,
                '가족 합류 후 상태 확인 시간이 초과되었습니다.'
            );
            set({
                syncStatus: hasUnsyncedLocalDataForCloud(get())
                    ? {
                        phase: 'awaiting-confirmation',
                        message: '이 기기의 로컬 데이터를 클라우드로 동기화할지 선택해 주세요.',
                        error: null,
                        backupKey: null
                    }
                    : DEFAULT_SYNC_STATUS
            });
            return true;
        } catch (error) {
            set({
                storageMode: STORAGE_MODE.CLOUD_ERROR,
                syncStatus: {
                    phase: 'failed',
                    message: '가족 합류에 실패했습니다.',
                    error: error.message,
                    backupKey: null
                }
            });
            if (isFamilyJoinTimeoutError(error)) {
                try {
                    const joinedFamilyId = await waitForJoinedFamilyForInviteCode({ code, userId: session.user.id });
                    if (joinedFamilyId) {
                        await get().fetchFamilyContext();
                        set({ syncStatus: DEFAULT_SYNC_STATUS });
                        return true;
                    }
                } catch (reconcileError) {
                    console.warn('Family join timeout reconciliation failed:', reconcileError);
                }
            }
            return false;
        } finally {
            set({ isFamilyLoading: false });
        }
    },
    leaveFamily: async () => {
        const { session, currentFamilyId } = get();
        if (!session || !currentFamilyId || !supabase) return false;

        set({ isFamilyLoading: true, syncStatus: { ...DEFAULT_SYNC_STATUS, phase: 'linking', message: '가족 그룹에서 나가는 중입니다.' } });
        try {
            const { error } = await supabase
                .from('family_members')
                .delete()
                .eq('user_id', session.user.id)
                .eq('family_id', currentFamilyId);

            if (error) throw error;

            setLocalGuestDataForCurrentChild(set, get, {
                currentFamilyId: null,
                familyInviteCode: null,
                familyMembers: [],
                diaries: loadLocalDiaryRecords(),
                isGuestMode: true,
                storageMode: STORAGE_MODE.LOCAL,
                syncStatus: DEFAULT_SYNC_STATUS
            });
            clearFamilyContextCache();
            return true;
        } catch (error) {
            set({
                storageMode: STORAGE_MODE.CLOUD_ERROR,
                syncStatus: {
                    phase: 'failed',
                    message: '가족 탈퇴에 실패했습니다.',
                    error: error.message,
                    backupKey: null
                }
            });
            return false;
        } finally {
            set({ isFamilyLoading: false });
        }
    },

    // ---- Diary Cloud Actions ----
    fetchDiariesFromDB: async () => {
        const { session, currentFamilyId } = get();
        if (!session || !currentFamilyId || !supabase) {
            set({ diaries: loadLocalDiaryRecords() });
            return;
        }

        const canApplyFetchResult = createDiaryFetchGuard();
        let result;
        try {
            result = await withRejectingTimeout(
                supabase
                    .from('diary')
                    .select('*, diary_comments(*)')
                    .eq('family_id', currentFamilyId)
                    .order('date', { ascending: false })
                    .order('created_at', { ascending: false }),
                DIARY_CLOUD_FETCH_TIMEOUT_MS,
                '다이어리 목록 불러오기 시간이 초과되었습니다.'
            );
        } catch (error) {
            if (!canApplyFetchResult()) return;
            console.warn('Cloud diary fetch failed, falling back to family diary cache:', error);
            const fallbackDiaries = mergeCloudDiariesWithLocalPending(
                loadCloudDiaryCache(currentFamilyId) || [],
                get()
            );
            saveCloudDiaryCache(currentFamilyId, fallbackDiaries);
            set({ diaries: fallbackDiaries });
            return;
        }

        const { data, error } = result;

        if (error) {
            if (!canApplyFetchResult()) return;
            console.warn('Cloud diary fetch failed, falling back to family diary cache:', error);
            const fallbackDiaries = mergeCloudDiariesWithLocalPending(
                loadCloudDiaryCache(currentFamilyId) || [],
                get()
            );
            saveCloudDiaryCache(currentFamilyId, fallbackDiaries);
            set({ diaries: fallbackDiaries });
            return;
        }

        if (!canApplyFetchResult()) return;
        const cloudDiaries = dedupeDiaryRecordsByContent(data);
        const pendingMutations = reconcileDiaryPendingMutations(get().pendingMutations, cloudDiaries);
        const normalizedDiaries = mergeCloudDiariesWithLocalPending(
            cloudDiaries,
            { ...get(), pendingMutations }
        );
        saveCloudDiaryCache(currentFamilyId, normalizedDiaries);
        savePendingMutations(pendingMutations);
        set({
            diaries: normalizedDiaries,
            pendingMutations,
            ...(pendingMutations.length === 0 ? { storageMode: STORAGE_MODE.CLOUD } : {})
        });
    },
    syncLocalDiariesToCloud: async () => {
        const { session, currentFamilyId } = get();
        if (!session || !currentFamilyId || !supabase) return;

        const localDiaries = loadLocalDiaryRecords();
        if (localDiaries.length === 0) return;

        const localIds = localDiaries
            .map(record => toSafeString(record.localId || record.id))
            .filter(Boolean);

        const existingLocalIds = new Set();
        if (localIds.length > 0) {
            const { data: existingRows, error: existingError } = await supabase
                .from('diary')
                .select('local_id')
                .eq('family_id', currentFamilyId)
                .in('local_id', localIds);

            if (existingError) throw existingError;
            existingRows?.forEach(row => {
                if (row.local_id) existingLocalIds.add(row.local_id);
            });
        }

        for (const localRecord of localDiaries) {
            const localId = toSafeString(localRecord.localId || localRecord.id);
            if (!localId || existingLocalIds.has(localId)) continue;

            const diaryId = isUuid(localRecord.id) ? localRecord.id : createClientUuid();
            const imageSources = localRecord.imageUrls?.length
                ? localRecord.imageUrls
                : (localRecord.imageUrl ? [localRecord.imageUrl] : []);
            let uploadedPaths = [];

            try {
                const uploadResult = await uploadDiaryImagesToStorage({
                    client: supabase,
                    images: imageSources,
                    familyId: currentFamilyId,
                    diaryId
                });
                uploadedPaths = uploadResult.uploadedPaths;

                const { error } = await supabase
                    .from('diary')
                    .insert([{
                        id: diaryId,
                        family_id: currentFamilyId,
                        user_id: session.user.id,
                        child: localRecord.child,
                        date: localRecord.isoDate,
                        time: localRecord.time,
                        mood: localRecord.mood,
                        title: localRecord.title,
                        text: localRecord.text,
                        image_paths: uploadResult.imagePaths,
                        reactions: localRecord.reactions || [],
                        local_id: localId
                    }]);

                if (error) throw error;
                existingLocalIds.add(localId);
            } catch (error) {
                if (uploadedPaths.length > 0) {
                    await removeDiaryImagesFromStorage({ client: supabase, paths: uploadedPaths });
                }
                throw error;
            }
        }

        markLocalDiariesSynced();
    },
    addDiary: async (diaryData, options = {}) => {
        const { session, currentFamilyId } = get();
        const nextLocal = normalizeDiaryRecords([diaryData])[0];

        if (!session || !currentFamilyId || !supabase) {
            markDiaryMutationBoundary();
            set((state) => {
                const localRecord = clearDiarySyncState(nextLocal);
                const hasExisting = state.diaries.some(record => isSameDiaryRecordIdentity(record, localRecord));
                const diaries = hasExisting
                    ? state.diaries.map(record => isSameDiaryRecordIdentity(record, localRecord) ? localRecord : record)
                    : [localRecord, ...state.diaries];
                return { diaries: saveDiaryRecordsForCurrentMode(state, diaries) };
            });
            return nextLocal;
        }

        let uploadedPaths = [];
        let data = null;
        let error = null;

        try {
            const uploadResult = await prepareDiaryImagesForCloud({
                record: nextLocal,
                familyId: currentFamilyId
            });
            uploadedPaths = uploadResult.uploadedPaths || [];

            const result = await withRejectingTimeout(
                supabase
                    .from('diary')
                    .insert([{
                        ...(isUuid(nextLocal.id) ? { id: nextLocal.id } : {}),
                        family_id: currentFamilyId,
                        user_id: session.user.id,
                        child: nextLocal.child,
                        date: nextLocal.isoDate,
                        time: nextLocal.time,
                        mood: nextLocal.mood,
                        title: nextLocal.title,
                        text: nextLocal.text,
                        image_paths: uploadResult.imagePaths || [],
                        reactions: nextLocal.reactions || [],
                        local_id: nextLocal.localId || null
                    }])
                    .select('*, diary_comments(*)')
                    .single(),
                DIARY_CLOUD_SAVE_TIMEOUT_MS,
                '다이어리 저장 시간이 초과되었습니다.'
            );
            data = result.data;
            error = result.error;
        } catch (saveError) {
            error = saveError;
        }

        if (error) {
            if (uploadedPaths.length > 0) {
                removeDiaryImagesFromStorage({ client: supabase, paths: uploadedPaths }).catch((cleanupError) => {
                    console.warn('Uploaded diary images could not be cleaned after save failure:', cleanupError);
                });
            }
            if (!isPendingReplay(options)) {
                saveDiaryLocalFallback({
                    set,
                    get,
                    diaryData: nextLocal,
                    mutationType: 'diary:add',
                    error
                });
            }
            throw error;
        }

        commitDiaryCloudRecord(set, data || nextLocal);
        await withRejectingTimeout(
            get().fetchDiariesFromDB(),
            DIARY_CLOUD_FETCH_TIMEOUT_MS,
            '저장 후 다이어리 새로고침 시간이 초과되었습니다.'
        ).catch((fetchError) => {
            console.warn('Diary saved, but refresh timed out:', fetchError);
        });
        return normalizeDiaryRecords([data])[0];
    },
    updateDiary: async (diaryData, options = {}) => {
        const { session, currentFamilyId } = get();
        const nextRecord = normalizeDiaryRecords([diaryData])[0];

        if (!session || !currentFamilyId || !supabase || !isUuid(nextRecord.id)) {
            markDiaryMutationBoundary();
            set((state) => {
                const localRecord = clearDiarySyncState(nextRecord);
                const diaries = state.diaries.map(record => (
                    isSameDiaryRecordIdentity(record, localRecord) ? localRecord : record
                ));
                return { diaries: saveDiaryRecordsForCurrentMode(state, diaries) };
            });
            return nextRecord;
        }

        let uploadedPaths = [];
        let error = null;

        try {
            const uploadResult = await prepareDiaryImagesForCloud({
                record: nextRecord,
                familyId: currentFamilyId
            });
            uploadedPaths = uploadResult.uploadedPaths || [];

            const result = await withRejectingTimeout(
                supabase
                    .from('diary')
                    .update({
                        child: nextRecord.child,
                        date: nextRecord.isoDate,
                        time: nextRecord.time,
                        mood: nextRecord.mood,
                        title: nextRecord.title,
                        text: nextRecord.text,
                        image_paths: uploadResult.imagePaths || [],
                        reactions: nextRecord.reactions || [],
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', nextRecord.id)
                    .eq('family_id', currentFamilyId),
                DIARY_CLOUD_SAVE_TIMEOUT_MS,
                '다이어리 수정 저장 시간이 초과되었습니다.'
            );
            error = result.error;
        } catch (saveError) {
            error = saveError;
        }

        if (error) {
            if (uploadedPaths.length > 0) {
                removeDiaryImagesFromStorage({ client: supabase, paths: uploadedPaths }).catch((cleanupError) => {
                    console.warn('Uploaded diary images could not be cleaned after update failure:', cleanupError);
                });
            }
            if (!isPendingReplay(options)) {
                saveDiaryLocalFallback({
                    set,
                    get,
                    diaryData: nextRecord,
                    mutationType: 'diary:update',
                    error
                });
            }
            throw error;
        }
        commitDiaryCloudRecord(set, nextRecord);
        await withRejectingTimeout(
            get().fetchDiariesFromDB(),
            DIARY_CLOUD_FETCH_TIMEOUT_MS,
            '수정 후 다이어리 새로고침 시간이 초과되었습니다.'
        ).catch((fetchError) => {
            console.warn('Diary updated, but refresh timed out:', fetchError);
        });
        return nextRecord;
    },
    removeDiary: async (diaryTarget, options = {}) => {
        const { session, currentFamilyId } = get();
        const requestedRecord = typeof diaryTarget === 'object'
            ? normalizeDiaryRecords([diaryTarget])[0]
            : null;
        const requestedId = toSafeString(requestedRecord?.id || diaryTarget);
        let removedRecord = null;
        let removedRecords = [];
        let nextPendingMutations = null;

        markDiaryMutationBoundary();
        set((state) => {
            const targetRecord = requestedRecord
                || state.diaries.find(record => getDiaryRecordIds(record).includes(requestedId))
                || null;
            removedRecord = targetRecord;

            const shouldRemoveRecord = (record) => (
                targetRecord
                    ? isSameDiaryRecordIdentity(record, targetRecord)
                    : getDiaryRecordIds(record).includes(requestedId)
            );
            removedRecords = state.diaries.filter(shouldRemoveRecord);
            const diaries = state.diaries.filter(record => !shouldRemoveRecord(record));
            const pendingDeleteMatcher = {
                type: 'diary:delete',
                payload: {
                    diaryId: requestedId,
                    diaryIds: removedRecords.flatMap(getDiaryRecordIds).filter(isUuid),
                    diaryLocalIds: [
                        requestedId,
                        ...removedRecords.flatMap(getDiaryRecordIds)
                    ].map(toSafeString).filter(Boolean),
                    diaryData: targetRecord
                }
            };
            const pendingMutations = asArray(state.pendingMutations)
                .filter(mutation => !isPendingDiaryMutationCancelledByDelete(mutation, pendingDeleteMatcher));
            if (pendingMutations.length !== asArray(state.pendingMutations).length) {
                nextPendingMutations = pendingMutations;
            }

            return {
                diaries: saveDiaryRecordsForCurrentMode(state, diaries),
                ...(nextPendingMutations ? { pendingMutations: nextPendingMutations } : {})
            };
        });

        if (nextPendingMutations) {
            savePendingMutations(nextPendingMutations);
        }

        let deleteIds = [...new Set([
            requestedId,
            ...getDiaryRecordIds(removedRecord),
            ...removedRecords.flatMap(getDiaryRecordIds)
        ].filter(isUuid))];
        let deleteLocalIds = [...new Set([
            requestedId,
            ...getDiaryRecordIds(removedRecord),
            ...removedRecords.flatMap(getDiaryRecordIds)
        ].map(toSafeString).filter(Boolean))];

        if (!session || !currentFamilyId || !supabase || (deleteIds.length === 0 && deleteLocalIds.length === 0)) {
            return { ok: true, record: removedRecord };
        }

        const deleteTargetRecord = removedRecord || requestedRecord;
        let duplicateLookupError = null;

        if (deleteTargetRecord) {
            try {
                const cloudDeleteTargets = await findCloudDiaryDeleteTargets({
                    familyId: currentFamilyId,
                    targetRecord: deleteTargetRecord
                });
                const cloudTargetIds = cloudDeleteTargets.flatMap(getDiaryRecordIds);
                deleteIds = [...new Set([
                    ...deleteIds,
                    ...cloudTargetIds.filter(isUuid)
                ])];
                deleteLocalIds = [...new Set([
                    ...deleteLocalIds,
                    ...cloudTargetIds.map(toSafeString).filter(Boolean)
                ])];
            } catch (lookupError) {
                duplicateLookupError = lookupError;
                console.warn('Cloud diary duplicate delete lookup failed:', lookupError);
            }
        }

        let error = null;
        try {
            if (deleteIds.length > 0) {
                const result = await withRejectingTimeout(
                    supabase
                        .from('diary')
                        .delete()
                        .eq('family_id', currentFamilyId)
                        .in('id', deleteIds),
                    DIARY_CLOUD_DELETE_TIMEOUT_MS,
                    '다이어리 삭제 시간이 초과되었습니다.'
                );
                if (result.error) throw result.error;
            }

            if (deleteLocalIds.length > 0) {
                const result = await withRejectingTimeout(
                    supabase
                        .from('diary')
                        .delete()
                        .eq('family_id', currentFamilyId)
                        .in('local_id', deleteLocalIds),
                    DIARY_CLOUD_DELETE_TIMEOUT_MS,
                    '다이어리 중복 기록 삭제 시간이 초과되었습니다.'
                );
                if (result.error) throw result.error;
            }
        } catch (deleteError) {
            error = deleteError;
        }

        if (error) {
            if (!isPendingReplay(options)) {
                get().queuePendingMutation({
                    type: 'diary:delete',
                    payload: {
                        diaryId: requestedId,
                        diaryIds: deleteIds,
                        diaryLocalIds: deleteLocalIds,
                        diaryData: removedRecord
                    },
                    lastError: getCloudErrorMessage(error)
                });
                return { ok: false, queued: true, record: removedRecord, error };
            }
            throw error;
        }

        if (duplicateLookupError && !isPendingReplay(options)) {
            get().queuePendingMutation({
                type: 'diary:delete',
                payload: {
                    diaryId: requestedId,
                    diaryIds: deleteIds,
                    diaryLocalIds: deleteLocalIds,
                    diaryData: removedRecord
                },
                lastError: getCloudErrorMessage(duplicateLookupError)
            });
        }

        await withRejectingTimeout(
            get().fetchDiariesFromDB(),
            DIARY_CLOUD_FETCH_TIMEOUT_MS,
            '삭제 후 다이어리 새로고침 시간이 초과되었습니다.'
        ).catch((fetchError) => {
            console.warn('Diary deleted, but refresh timed out:', fetchError);
        });

        return { ok: true, queued: Boolean(duplicateLookupError), record: removedRecord };
    },
    addDiaryComment: async (diaryId, comment) => {
        const { session, currentFamilyId } = get();
        const safeComment = {
            id: comment.id || `comment-${Date.now()}`,
            author: toSafeString(comment.author, '가족') || '가족',
            text: toSafeString(comment.text).slice(0, DIARY_COMMENT_MAX_LENGTH),
            time: toSafeString(comment.time)
        };

        if (!session || !currentFamilyId || !supabase || !isUuid(diaryId)) {
            markDiaryMutationBoundary();
            set((state) => {
                const diaries = state.diaries.map(record => (
                    record.id === diaryId
                        ? { ...record, comments: [...(record.comments || []), safeComment] }
                        : record
                ));
                return { diaries: saveDiaryRecordsForCurrentMode(state, diaries) };
            });
            return;
        }

        const { error } = await supabase
            .from('diary_comments')
            .insert([{
                diary_id: diaryId,
                family_id: currentFamilyId,
                user_id: session.user.id,
                author: safeComment.author,
                text: safeComment.text
            }]);

        if (error) {
            markDiaryMutationBoundary();
            set((state) => {
                const diaries = state.diaries.map(record => (
                    record.id === diaryId
                        ? { ...record, comments: [...(record.comments || []), safeComment] }
                        : record
                ));
                return { diaries: saveDiaryRecordsForCurrentMode(state, diaries) };
            });
            get().queuePendingMutation({
                type: 'diary:comment:add',
                payload: { diaryId, comment: safeComment },
                lastError: error.message
            });
            throw error;
        }
        await get().fetchDiariesFromDB();
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
        if (session) {
            const currentFamilyId = get().currentFamilyId;
            set({
                session,
                isAuthChecking: false,
                isGuestMode: !currentFamilyId,
                storageMode: resolveStorageMode({ session, currentFamilyId })
            });
        } else {
            clearSupabaseAuthStorage();
            set({
                session,
                isAuthChecking: false,
                isGuestMode: true,
                currentFamilyId: null,
                familyInviteCode: null,
                familyMembers: [],
                diaries: loadLocalDiaryRecords(),
                storageMode: STORAGE_MODE.LOCAL,
                syncStatus: DEFAULT_SYNC_STATUS
            });
        }
    },

    signIn: async (email, password) => {
        set({ isLoading: true });
        try {
            const client = requireSupabase();
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            return data;
        } finally {
            set({ isLoading: false });
        }
    },

    signUp: async (email, password) => {
        set({ isLoading: true });
        try {
            const client = requireSupabase();
            const { data, error } = await client.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            return data;
        } finally {
            set({ isLoading: false });
        }
    },

    signOut: async () => {
        try {
            if (supabase) {
                const { error } = await withTimeout(
                    supabase.auth.signOut({ scope: 'local' }),
                    AUTH_SIGN_OUT_TIMEOUT_MS,
                    '로그아웃 응답 시간이 초과되었습니다.'
                );
                if (error) throw error;
            }
        } catch (error) {
            console.warn('Supabase local sign-out did not complete cleanly, clearing app session anyway:', error);
        } finally {
            clearSupabaseAuthStorage();
            set({
                session: null,
                isGuestMode: true,
                currentFamilyId: null,
                familyInviteCode: null,
                familyMembers: [],
                diaries: loadLocalDiaryRecords(),
                storageMode: STORAGE_MODE.LOCAL,
                syncStatus: DEFAULT_SYNC_STATUS,
                syncVerification: null
            });
            await get().fetchDataFromDB();
        }
        return { ok: true };
    },

    deleteAccount: async () => {
        const { session, currentFamilyId, familyMembers } = get();
        if (!session || !supabase) {
            return { ok: false, error: '로그인이 필요합니다.' };
        }

        set({ isLoading: true });
        try {
            const userId = session.user.id;
            const isOnlyFamilyMember = currentFamilyId && familyMembers.length <= 1;

            let diaryQuery = supabase
                .from('diary')
                .select('image_paths');

            diaryQuery = isOnlyFamilyMember
                ? diaryQuery.eq('family_id', currentFamilyId)
                : diaryQuery.eq('user_id', userId);

            const { data: diaryRows, error: diaryError } = await diaryQuery;
            if (diaryError) throw diaryError;

            const imagePaths = asArray(diaryRows).flatMap((row) => asArray(row.image_paths));
            await removeStoragePathsInChunks(imagePaths);

            const { error } = await supabase.rpc('delete_user_account');
            if (error) throw error;

            clearLocalAccountData();
            set({
                session: null,
                isGuestMode: true,
                isAuthChecking: false,
                currentFamilyId: null,
                familyInviteCode: null,
                familyMembers: [],
                childCount: 1,
                currentChild: 'child1',
                childProfiles: DEFAULT_CHILD_PROFILES,
                weeklyData: INITIAL_WEEKLY,
                missionsData: INITIAL_MISSIONS,
                funds: INITIAL_FUNDS,
                payments: INITIAL_PAYMENTS,
                opsData: INITIAL_OPS,
                transactionHistory: INITIAL_HISTORY,
                notices: [],
                dailyTasks: INITIAL_DAILY,
                diaries: INITIAL_DIARIES,
                storageMode: STORAGE_MODE.LOCAL,
                syncStatus: DEFAULT_SYNC_STATUS,
                syncVerification: null,
                lastSyncAt: null,
                pendingMutations: []
            });
            return { ok: true };
        } catch (error) {
            console.error('Account deletion failed:', error);
            return { ok: false, error: error.message || '알 수 없는 오류가 발생했습니다.' };
        } finally {
            set({ isLoading: false });
        }
    },

    // 1. Weekly Data Actions
    updateSchedule: async (day, newSchedule) => {
        set((state) => ({
            weeklyData: { ...state.weeklyData, [day]: newSchedule }
        }));
    },
    copyScheduleToDays: async (sourceDay, targetDays) => {
        const { currentChild, currentFamilyId, weeklyData, session } = get();
        const sourceSchedule = weeklyData[sourceDay] || [];
        const uniqueTargetDays = [...new Set(targetDays)]
            .filter(day => day !== sourceDay && Array.isArray(weeklyData[day]));

        if (sourceSchedule.length === 0 || uniqueTargetDays.length === 0) {
            return { added: 0, skipped: 0 };
        }

        if (!isCloudReady({ session, currentFamilyId })) {
            let added = 0;
            let skipped = 0;
            const nextWeekly = { ...weeklyData };
            const batchId = Date.now();

            uniqueTargetDays.forEach((day) => {
                const targetSchedule = [...(nextWeekly[day] || [])];
                const existingKeys = new Set(targetSchedule.map(createScheduleKey));

                sourceSchedule.forEach((item, index) => {
                    const key = createScheduleKey(item);
                    if (existingKeys.has(key)) {
                        skipped += 1;
                        return;
                    }

                    existingKeys.add(key);
                    targetSchedule.push(createScheduleCopy(item, `g_${batchId}_${day}_${index}_${added}`));
                    added += 1;
                });

                nextWeekly[day] = targetSchedule.sort((a, b) => a.time.localeCompare(b.time));
            });

            if (added > 0) {
                set({ weeklyData: nextWeekly });
            }

            return { added, skipped };
        }

        const inserts = [];
        let skipped = 0;

        uniqueTargetDays.forEach((day) => {
            const existingKeys = new Set((weeklyData[day] || []).map(createScheduleKey));

            sourceSchedule.forEach((item, index) => {
                const key = createScheduleKey(item);
                if (existingKeys.has(key)) {
                    skipped += 1;
                    return;
                }

                existingKeys.add(key);
                const localId = createLocalId('schedule-copy', [sourceDay, day, item.localId || item.id, index, Date.now()]);
                inserts.push({
                    local_id: localId,
                    title: item.title,
                    day_of_week: day,
                    start_time: item.time + ':00',
                    pickup_agent: item.agent,
                    drop_agent: item.agent,
                    location: item.location || '',
                    contact_name: item.contactName || '',
                    contact_phone: item.contactPhone || '',
                    is_urgent: item.isUrgent || false,
                    is_early: item.isEarly || false,
                    child_id: currentChild,
                    family_id: currentFamilyId
                });
            });
        });

        if (inserts.length === 0) {
            return { added: 0, skipped };
        }

        const { error } = await insertWithLocalIdFallback('schedule', inserts);
        if (error) {
            const nextWeekly = { ...weeklyData };
            inserts.forEach((row) => {
                if (!nextWeekly[row.day_of_week]) return;
                nextWeekly[row.day_of_week] = [
                    ...(nextWeekly[row.day_of_week] || []),
                    {
                        id: row.local_id,
                        localId: row.local_id,
                        time: normalizeTime(row.start_time),
                        title: row.title,
                        agent: row.pickup_agent || row.drop_agent || '자율',
                        location: row.location || '',
                        contactName: row.contact_name || '',
                        contactPhone: row.contact_phone || '',
                        isEarly: row.is_early,
                        isUrgent: row.is_urgent
                    }
                ].sort((a, b) => a.time.localeCompare(b.time));
            });
            set({ weeklyData: nextWeekly });
            queueCloudFailure({
                get,
                type: 'schedule:copy',
                payload: { rows: inserts },
                error
            });
            return { added: inserts.length, skipped, queued: true };
        }

        await get().fetchDataFromDB();
        return { added: inserts.length, skipped };
    },
    addSchedule: async (day, item, options = {}) => {
        const { currentChild, currentFamilyId, session } = get();
        const localId = item.localId || createLocalId('schedule', [currentChild, day, item.time, item.title, Date.now()]);
        const localScheduleItem = {
            id: item.id || localId,
            localId,
            time: item.time,
            title: item.title,
            agent: item.agent,
            location: item.location || '',
            contactName: item.contactName || '',
            contactPhone: item.contactPhone || '',
            isEarly: item.isEarly || false,
            isUrgent: item.isUrgent || false
        };

        if (!isCloudReady({ session, currentFamilyId })) {
            set(s => {
                const newWeekly = { ...s.weeklyData };
                newWeekly[day] = [...(newWeekly[day] || []), localScheduleItem].sort((a, b) => a.time.localeCompare(b.time));
                return { weeklyData: newWeekly };
            });
            return { ok: true, local: true };
        }

        const { error } = await insertWithLocalIdFallback('schedule', [{
            local_id: localId,
            title: item.title,
            day_of_week: day,
            start_time: item.time + ':00',
            pickup_agent: item.agent,
            drop_agent: item.agent,
            location: item.location || '',
            contact_name: item.contactName || '',
            contact_phone: item.contactPhone || '',
            is_urgent: item.isUrgent || false,
            is_early: item.isEarly || false,
            child_id: currentChild,
            family_id: currentFamilyId
        }], { select: true });
        if (error) {
            if (isPendingReplay(options)) throw error;
            set(s => {
                const newWeekly = { ...s.weeklyData };
                newWeekly[day] = [...(newWeekly[day] || []), localScheduleItem].sort((a, b) => a.time.localeCompare(b.time));
                return { weeklyData: newWeekly };
            });
            return queueCloudFailure({
                get,
                type: 'schedule:add',
                payload: { day, item: localScheduleItem },
                error
            });
        }
        await get().fetchDataFromDB();
        return { ok: true };
    },
    updateScheduleItem: async (item, options = {}) => {
        const { session, currentFamilyId } = get();
        if (!isCloudReady({ session, currentFamilyId })) {
            set(s => {
                const newWeekly = { ...s.weeklyData };
                for (const day in newWeekly) {
                    newWeekly[day] = newWeekly[day].map(x =>
                        x.id === item.id
                            ? { ...x, ...item, time: item.time, title: item.title, agent: item.agent, location: item.location, contactName: item.contactName, contactPhone: item.contactPhone }
                            : x
                    ).sort((a, b) => a.time.localeCompare(b.time));
                }
                return { weeklyData: newWeekly };
            });
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('schedule').update({
            title: item.title,
            start_time: item.time + (item.time.length === 5 ? ':00' : ''),
            pickup_agent: item.agent,
            drop_agent: item.agent,
            location: item.location || '',
            contact_name: item.contactName || '',
            contact_phone: item.contactPhone || ''
        }), currentFamilyId).eq('id', item.id);
        if (error) {
            if (isPendingReplay(options)) throw error;
            set(s => {
                const newWeekly = { ...s.weeklyData };
                for (const day in newWeekly) {
                    newWeekly[day] = newWeekly[day].map(x =>
                        x.id === item.id
                            ? { ...x, ...item, time: item.time, title: item.title, agent: item.agent, location: item.location, contactName: item.contactName, contactPhone: item.contactPhone }
                            : x
                    ).sort((a, b) => a.time.localeCompare(b.time));
                }
                return { weeklyData: newWeekly };
            });
            return queueCloudFailure({
                get,
                type: 'schedule:update',
                payload: { item },
                error
            });
        }
        await get().fetchDataFromDB();
        return { ok: true };
    },
    removeScheduleItem: async (id, options = {}) => {
        const { session, currentFamilyId } = get();
        if (!isCloudReady({ session, currentFamilyId })) {
            set(s => {
                const newWeekly = { ...s.weeklyData };
                for (const day in newWeekly) {
                    newWeekly[day] = newWeekly[day].filter(x => x.id !== id);
                }
                return { weeklyData: newWeekly };
            });
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('schedule').delete(), currentFamilyId).eq('id', id);
        if (error) {
            if (isPendingReplay(options)) throw error;
            set(s => {
                const newWeekly = { ...s.weeklyData };
                for (const day in newWeekly) {
                    newWeekly[day] = newWeekly[day].filter(x => x.id !== id);
                }
                return { weeklyData: newWeekly };
            });
            return queueCloudFailure({
                get,
                type: 'schedule:delete',
                payload: { id },
                error
            });
        }
        await get().fetchDataFromDB();
        return { ok: true };
    },

    // 2. Missions Data Actions (Supabase Sync)
    addMission: async (mission, options = {}) => {
        set({ isLoading: true });
        const { currentChild, currentFamilyId, session } = get();
        const localId = mission.localId || mission.id || createLocalId('mission', [currentChild, mission.type, mission.title, mission.day, Date.now()]);
        const applyLocalMission = () => {
            if (mission.type === 'fund') {
                const newPayment = { id: localId, localId, source: mission.title.replace(' 결제', ''), amount: 0, method: '미지정', day: `${mission.day} 일`, discount: '', isCompleted: false };
                const newFundMission = { id: localId, localId, type: 'fund', day: mission.day, title: mission.title };
                set(s => ({
                    payments: [...s.payments, newPayment].sort((a, b) => parseInt(a.day) - parseInt(b.day)),
                    missionsData: [...s.missionsData, newFundMission]
                }));
            } else {
                const year = mission.year || new Date().getFullYear();
                const month = mission.month || new Date().getMonth() + 1;
                const newOp = { id: localId, localId, title: mission.title, date: `${year}.${String(month).padStart(2, '0')}.${String(mission.day).padStart(2, '0')}`, description: '', priority: 'LOW', status: 'PENDING', participants: { mom: false, dad: false }, checklist: [] };
                const newEventMission = { id: localId, localId, type: 'event', year, month, day: mission.day, title: mission.title };
                set(s => ({ opsData: [...s.opsData, newOp], missionsData: [...s.missionsData, newEventMission] }));
            }
        };

        if (!isCloudReady({ session, currentFamilyId })) {
            applyLocalMission();
            set({ isLoading: false });
            return { ok: true, local: true };
        }

        if (mission.type === 'fund') {
            const { error } = await insertWithLocalIdFallback('payment', [{
                local_id: localId,
                source: mission.title.replace(' 결제', ''),
                amount: 0,
                method: '미지정',
                payment_day: mission.day,
                is_completed: false,
                child_id: currentChild,
                family_id: currentFamilyId
            }]);
            if (error) {
                if (isPendingReplay(options)) throw error;
                applyLocalMission();
                set({ isLoading: false });
                return queueCloudFailure({
                    get,
                    type: 'mission:add',
                    payload: { mission: { ...mission, id: localId, localId } },
                    error
                });
            }
        } else {
            const year = mission.year || new Date().getFullYear();
            const month = String(mission.month || new Date().getMonth() + 1).padStart(2, '0');
            const day = String(mission.day).padStart(2, '0');
            const { error } = await insertWithLocalIdFallback('ops', [{
                local_id: localId,
                title: mission.title,
                execution_date: `${year}-${month}-${day}`,
                status: 'PENDING',
                priority: 'LOW',
                child_id: currentChild,
                family_id: currentFamilyId
            }]);
            if (error) {
                if (isPendingReplay(options)) throw error;
                applyLocalMission();
                set({ isLoading: false });
                return queueCloudFailure({
                    get,
                    type: 'mission:add',
                    payload: { mission: { ...mission, id: localId, localId } },
                    error
                });
            }
        }
        await get().fetchDataFromDB();
        set({ isLoading: false });
        return { ok: true };
    },
    updateMission: async (mission, options = {}) => {
        set({ isLoading: true });
        const { session, currentFamilyId } = get();
        const applyLocalMissionUpdate = () => {
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
        };

        if (!isCloudReady({ session, currentFamilyId })) {
            applyLocalMissionUpdate();
            set({ isLoading: false });
            return { ok: true, local: true };
        }

        if (mission.type === 'fund') {
            const { error } = await scopeFamilyQuery(supabase.from('payment').update({
                source: mission.title.replace(' 결제', ''),
                payment_day: mission.day
            }), currentFamilyId).eq('id', mission.id);
            if (error) {
                if (isPendingReplay(options)) throw error;
                applyLocalMissionUpdate();
                set({ isLoading: false });
                return queueCloudFailure({
                    get,
                    type: 'mission:update',
                    payload: { mission },
                    error
                });
            }
        } else {
            const year = mission.year || new Date().getFullYear();
            const month = String(mission.month || new Date().getMonth() + 1).padStart(2, '0');
            const day = String(mission.day).padStart(2, '0');
            const { error } = await scopeFamilyQuery(supabase.from('ops').update({
                title: mission.title,
                execution_date: `${year}-${month}-${day}`
            }), currentFamilyId).eq('id', mission.id);
            if (error) {
                if (isPendingReplay(options)) throw error;
                applyLocalMissionUpdate();
                set({ isLoading: false });
                return queueCloudFailure({
                    get,
                    type: 'mission:update',
                    payload: { mission },
                    error
                });
            }
        }
        await get().fetchDataFromDB();
        set({ isLoading: false });
        return { ok: true };
    },
    removeMission: async (id, options = {}) => {
        const state = get();
        const mission = state.missionsData.find(m => m.id === id);
        if (!mission) return;

        if (!isCloudReady(state)) {
            set((s) => ({
                payments: s.payments.filter(p => p.id !== id),
                opsData: s.opsData.filter(o => o.id !== id),
                missionsData: s.missionsData.filter(m => m.id !== id)
            }));
            return;
        }

        if (mission.type === 'fund') {
            const { error } = await scopeFamilyQuery(supabase.from('payment').delete(), state.currentFamilyId).eq('id', id);
            if (error) {
                if (isPendingReplay(options)) throw error;
                set((s) => ({
                    payments: s.payments.filter(p => p.id !== id),
                    opsData: s.opsData.filter(o => o.id !== id),
                    missionsData: s.missionsData.filter(m => m.id !== id)
                }));
                return queueCloudFailure({
                    get,
                    type: 'mission:delete',
                    payload: { id },
                    error
                });
            }
        } else {
            const { error } = await scopeFamilyQuery(supabase.from('ops').delete(), state.currentFamilyId).eq('id', id);
            if (error) {
                if (isPendingReplay(options)) throw error;
                set((s) => ({
                    payments: s.payments.filter(p => p.id !== id),
                    opsData: s.opsData.filter(o => o.id !== id),
                    missionsData: s.missionsData.filter(m => m.id !== id)
                }));
                return queueCloudFailure({
                    get,
                    type: 'mission:delete',
                    payload: { id },
                    error
                });
            }
        }

        set((state) => ({
            payments: state.payments.filter(p => p.id !== id),
            opsData: state.opsData.filter(o => o.id !== id),
            missionsData: state.missionsData.filter(m => m.id !== id)
        }));
        return { ok: true };
    },

    // 3. Notices Actions (Supabase Sync)
    addNotice: async (notice, options = {}) => {
        const { session, currentFamilyId } = get();
        const localId = notice.localId || notice.id || createLocalId('notice', [notice.text, Date.now()]);
        const localNotice = { id: notice.id || localId, localId, text: notice.text, checked: notice.checked };
        if (!isCloudReady({ session, currentFamilyId })) {
            set(s => ({ notices: [...s.notices, localNotice] }));
            return;
        }
        const { data, error } = await insertWithLocalIdFallback('notice', [{
            local_id: localId,
            text: notice.text,
            is_checked: notice.checked,
            family_id: currentFamilyId
        }], { select: true });
        if (error) {
            if (isPendingReplay(options)) throw error;
            set(s => ({ notices: [...s.notices, localNotice] }));
            return queueCloudFailure({
                get,
                type: 'notice:add',
                payload: { notice: localNotice },
                error
            });
        }
        if (data && data.length > 0) {
            set((state) => ({ notices: [...state.notices, { id: data[0].id, localId: data[0].local_id, text: data[0].text, checked: data[0].is_checked }] }));
        }
        return { ok: true };
    },
    updateNotice: async (id, options = {}) => {
        const state = get();
        const notice = state.notices.find(n => n.id === id);
        if (notice) {
            if (!isCloudReady(state)) {
                set(s => ({ notices: s.notices.map(n => n.id === id ? { ...n, checked: !n.checked } : n) }));
                return;
            }
            const { error } = await scopeFamilyQuery(supabase.from('notice').update({ is_checked: !notice.checked }), state.currentFamilyId).eq('id', id);
            if (error) {
                if (isPendingReplay(options)) throw error;
                set((state) => ({
                    notices: state.notices.map(n => n.id === id ? { ...n, checked: !n.checked } : n)
                }));
                return queueCloudFailure({
                    get,
                    type: 'notice:toggle',
                    payload: { id },
                    error
                });
            }
            set((state) => ({
                notices: state.notices.map(n => n.id === id ? { ...n, checked: !n.checked } : n)
            }));
            return { ok: true };
        }
    },
    removeNotice: async (id, options = {}) => {
        const state = get();
        if (!isCloudReady(state)) {
            set(s => ({ notices: s.notices.filter(n => n.id !== id) }));
            return;
        }
        const { error } = await scopeFamilyQuery(supabase.from('notice').delete(), state.currentFamilyId).eq('id', id);
        if (error) {
            if (isPendingReplay(options)) throw error;
            set((state) => ({
                notices: state.notices.filter(n => n.id !== id)
            }));
            return queueCloudFailure({
                get,
                type: 'notice:delete',
                payload: { id },
                error
            });
        }
        set((state) => ({
            notices: state.notices.filter(n => n.id !== id)
        }));
        return { ok: true };
    },

    // 4. Payments Actions
    addPayment: async (paymentData, options = {}) => {
        const { currentChild, currentFamilyId, session } = get();
        const localId = paymentData.localId || paymentData.id || createLocalId('payment', [currentChild, paymentData.source, paymentData.day, Date.now()]);
        const dayNumber = parseInt(toSafeString(paymentData.day).replace('일', ''), 10) || 1;
        const localPayment = {
            id: paymentData.id || localId,
            localId,
            source: paymentData.source,
            amount: paymentData.amount,
            method: paymentData.method,
            day: `${dayNumber} 일`,
            discount: paymentData.discount,
            isCompleted: false
        };
        const localFundMission = {
            id: paymentData.id || localId,
            type: 'fund',
            day: dayNumber,
            title: `${paymentData.source} 결제(${paymentData.amount.toLocaleString()}₩)`
        };

        if (!isCloudReady({ session, currentFamilyId })) {
            set(s => ({
                payments: [...s.payments, localPayment].sort((a, b) => parseInt(a.day.replace('일', '')) - parseInt(b.day.replace('일', ''))),
                missionsData: [...s.missionsData, localFundMission]
            }));
            return { ok: true, local: true };
        }

        const { data, error } = await insertWithLocalIdFallback('payment', [{
            local_id: localId,
            source: paymentData.source,
            amount: paymentData.amount,
            method: paymentData.method,
            payment_day: dayNumber,
            discount_info: paymentData.discount,
            is_completed: false,
            child_id: currentChild,
            family_id: currentFamilyId
        }], { select: true });

        if (error) {
            if (isPendingReplay(options)) throw error;
            set(s => ({
                payments: [...s.payments, localPayment].sort((a, b) => parseInt(a.day.replace('일', '')) - parseInt(b.day.replace('일', ''))),
                missionsData: [...s.missionsData, localFundMission]
            }));
            return queueCloudFailure({
                get,
                type: 'payment:add',
                payload: { paymentData: { ...paymentData, id: localPayment.id, localId } },
                error
            });
        }

        if (data && data.length > 0) {
            const p = data[0];
            const newPayment = {
                id: p.id,
                localId: p.local_id,
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
        return { ok: true };
    },
    removePayment: async (paymentId, options = {}) => {
        const { session, currentFamilyId } = get();
        if (!isCloudReady({ session, currentFamilyId })) {
            set(s => ({
                payments: s.payments.filter(p => p.id !== paymentId),
                missionsData: s.missionsData.filter(m => m.id !== paymentId)
            }));
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('payment').delete(), currentFamilyId).eq('id', paymentId);
        if (error) {
            if (isPendingReplay(options)) throw error;
            set(s => ({
                payments: s.payments.filter(p => p.id !== paymentId),
                missionsData: s.missionsData.filter(m => m.id !== paymentId)
            }));
            return queueCloudFailure({
                get,
                type: 'payment:delete',
                payload: { paymentId },
                error
            });
        }

        set((state) => ({
            payments: state.payments.filter(p => p.id !== paymentId),
            missionsData: state.missionsData.filter(m => m.id !== paymentId)
        }));
        return { ok: true };
    },
    updatePayment: async (payment, options = {}) => {
        const { session, currentFamilyId } = get();
        if (!isCloudReady({ session, currentFamilyId })) {
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

        const { error } = await scopeFamilyQuery(supabase.from('payment').update({
            source: payment.source,
            amount: payment.amount,
            method: payment.method,
            payment_day: parseInt(payment.day.replace('일', ''), 10) || 1,
            discount_info: payment.discount
        }), currentFamilyId).eq('id', payment.id);

        if (error) {
            if (isPendingReplay(options)) throw error;
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
            return queueCloudFailure({
                get,
                type: 'payment:update',
                payload: { payment },
                error
            });
        }

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
        return { ok: true };
    },
    processPayment: async (paymentId, options = {}) => {
        const state = get();
        const payment = state.payments.find(p => p.id === paymentId);
        if (!payment) {
            if (isPendingReplay(options)) throw new Error('결제 항목을 찾을 수 없습니다.');
            return;
        }
        if (payment.isCompleted && !isPendingReplay(options)) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        const currentMonth = options.currentMonth || `${year}-${month}`;
        const completedAt = options.completedAt || `${year}.${month}.${day} ${hours}:${minutes}`;
        const historyLocalId = options.historyLocalId || createLocalId('history-payment', [get().currentChild, paymentId, currentMonth]);
        const localHistoryRecord = {
            id: historyLocalId,
            localId: historyLocalId,
            paymentId,
            month: currentMonth,
            date_formatted: completedAt,
            source: payment.source,
            amount: payment.amount,
            method: payment.method
        };
        const applyLocalProcessPayment = () => {
            set(s => {
                const hasHistory = s.transactionHistory.some(h => h.paymentId === paymentId && h.month === currentMonth);
                return {
                    payments: s.payments.map(p => p.id === paymentId ? { ...p, isCompleted: true, completedAt, justCompleted: true } : p),
                    transactionHistory: hasHistory ? s.transactionHistory : [localHistoryRecord, ...s.transactionHistory]
                };
            });
        };

        if (!isCloudReady(state)) {
            applyLocalProcessPayment();
            return { ok: true, local: true };
        }

        const { error: paymentError } = await scopeFamilyQuery(
            supabase.from('payment').update({ is_completed: true }),
            state.currentFamilyId
        ).eq('id', paymentId);

        if (paymentError) {
            if (isPendingReplay(options)) throw paymentError;
            applyLocalProcessPayment();
            return queueCloudFailure({
                get,
                type: 'payment:process',
                payload: { paymentId, currentMonth, completedAt, historyLocalId },
                error: paymentError
            });
        }

        const { data: histData, error: historyError } = await insertWithLocalIdFallback('transactionhistory', [{
            local_id: historyLocalId,
            payment_id: paymentId,
            month: currentMonth,
            date_formatted: completedAt,
            source: payment.source,
            amount: payment.amount,
            method: payment.method,
            child_id: get().currentChild,
            family_id: state.currentFamilyId
        }], { select: true });

        if (historyError) {
            if (isPendingReplay(options)) throw historyError;
            applyLocalProcessPayment();
            return queueCloudFailure({
                get,
                type: 'payment:process',
                payload: { paymentId, currentMonth, completedAt, historyLocalId },
                error: historyError
            });
        }

        const newHistoryRecord = histData && histData.length > 0 ? {
            id: histData[0].id,
            localId: histData[0].local_id,
            paymentId,
            month: currentMonth,
            date_formatted: completedAt,
            source: payment.source,
            amount: payment.amount,
            method: payment.method
        } : null;

        set((state) => ({
            payments: state.payments.map(p =>
                p.id === paymentId ? { ...p, isCompleted: true, completedAt, justCompleted: true } : p
            ),
            transactionHistory: newHistoryRecord
                ? [
                    newHistoryRecord,
                    ...state.transactionHistory.filter(h => !(h.paymentId === paymentId && h.month === currentMonth))
                ]
                : state.transactionHistory
        }));
        return { ok: true };
    },
    undoPayment: async (paymentId, options = {}) => {
        const state = get();
        const payment = state.payments.find(p => p.id === paymentId);
        if (!payment) {
            if (isPendingReplay(options)) throw new Error('결제 항목을 찾을 수 없습니다.');
            return;
        }
        if (!payment.isCompleted && !isPendingReplay(options)) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const currentMonth = options.currentMonth || `${year}-${month}`;
        const applyLocalUndoPayment = () => {
            set((s) => ({
                payments: s.payments.map(p =>
                    p.id === paymentId ? { ...p, isCompleted: false, completedAt: null } : p
                ),
                transactionHistory: s.transactionHistory.filter(h => !(h.paymentId === paymentId && h.month === currentMonth))
            }));
        };

        if (!isCloudReady(state)) {
            applyLocalUndoPayment();
            return { ok: true, local: true };
        }

        const { error: paymentError } = await scopeFamilyQuery(
            supabase.from('payment').update({ is_completed: false }),
            state.currentFamilyId
        ).eq('id', paymentId);

        if (paymentError) {
            if (isPendingReplay(options)) throw paymentError;
            applyLocalUndoPayment();
            return queueCloudFailure({
                get,
                type: 'payment:undo',
                payload: { paymentId, currentMonth },
                error: paymentError
            });
        }

        const { error: historyError } = await scopeFamilyQuery(
            supabase.from('transactionhistory').delete(),
            state.currentFamilyId
        ).eq('payment_id', paymentId).eq('month', currentMonth);

        if (historyError) {
            if (isPendingReplay(options)) throw historyError;
            applyLocalUndoPayment();
            return queueCloudFailure({
                get,
                type: 'payment:undo',
                payload: { paymentId, currentMonth },
                error: historyError
            });
        }

        set((state) => ({
            payments: state.payments.map(p =>
                p.id === paymentId ? { ...p, isCompleted: false, completedAt: null } : p
            ),
            transactionHistory: state.transactionHistory.filter(h => !(h.paymentId === paymentId && h.month === currentMonth))
        }));
        return { ok: true };
    },
    updateFund: async (fund, options = {}) => {
        const { session, currentFamilyId } = get();
        const now = new Date();
        const todayStr = `${now.getFullYear().toString().slice(-2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

        if (!isCloudReady({ session, currentFamilyId })) {
            set(s => ({ funds: s.funds.map(f => f.id === fund.id ? { ...fund, updated: todayStr } : f) }));
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('asset').update({ balance: fund.balance, last_updated: new Date().toISOString() }), currentFamilyId).eq('id', fund.id);
        if (error) {
            if (isPendingReplay(options)) throw error;
            set(s => ({ funds: s.funds.map(f => f.id === fund.id ? { ...fund, updated: todayStr } : f) }));
            return queueCloudFailure({
                get,
                type: 'fund:update',
                payload: { fund },
                error
            });
        }
        set((state) => ({
            funds: state.funds.map(f => f.id === fund.id ? { ...fund, updated: todayStr } : f)
        }));
        return { ok: true };
    },

    setOpsData: (ops) => set({ opsData: ops }),
    addOp: async (opData, options = {}) => {
        const { currentChild, currentFamilyId, session } = get();
        const localId = opData.localId || opData.id || createLocalId('ops', [currentChild, opData.date, opData.title, Date.now()]);
        const dateStr = opData.date.replace(/-/g, '.');
        const localOp = {
            id: opData.id || localId,
            localId,
            title: opData.title,
            date: dateStr,
            description: opData.description,
            priority: opData.priority,
            status: 'PENDING',
            participants: { mom: false, dad: false },
            checklist: []
        };
        const localEventMission = {
            id: opData.id || localId,
            type: 'event',
            year: parseInt(dateStr.split('.')[0], 10),
            month: parseInt(dateStr.split('.')[1], 10),
            day: parseInt(dateStr.split('.')[2], 10),
            title: localOp.title
        };

        if (!isCloudReady({ session, currentFamilyId })) {
            set(state => ({
                opsData: [...state.opsData, localOp],
                missionsData: [...state.missionsData, localEventMission]
            }));
            return { ok: true, local: true };
        }

        const { data, error } = await insertWithLocalIdFallback('ops', [{
            local_id: localId,
            title: opData.title,
            execution_date: opData.date.replace(/\./g, '-'),
            description: opData.description,
            priority: opData.priority,
            status: 'PENDING',
            child_id: currentChild,
            family_id: currentFamilyId
        }], { select: true });

        if (error) {
            if (isPendingReplay(options)) throw error;
            set(state => ({
                opsData: [...state.opsData, localOp],
                missionsData: [...state.missionsData, localEventMission]
            }));
            return queueCloudFailure({
                get,
                type: 'ops:add',
                payload: { opData: { ...opData, id: localOp.id, localId } },
                error
            });
        }

        if (data && data.length > 0) {
            const newOp = data[0];
            const parsedOp = {
                id: newOp.id,
                localId: newOp.local_id,
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
        return { ok: true };
    },
    removeOp: async (id, options = {}) => {
        const { session, currentFamilyId } = get();
        if (!isCloudReady({ session, currentFamilyId })) {
            set(state => ({
                opsData: state.opsData.filter(op => op.id !== id),
                missionsData: state.missionsData.filter(m => m.id !== id)
            }));
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('ops').delete(), currentFamilyId).eq('id', id);
        if (error) {
            if (isPendingReplay(options)) throw error;
            set(state => ({
                opsData: state.opsData.filter(op => op.id !== id),
                missionsData: state.missionsData.filter(m => m.id !== id)
            }));
            return queueCloudFailure({
                get,
                type: 'ops:delete',
                payload: { id },
                error
            });
        }

        set(state => ({
            opsData: state.opsData.filter(op => op.id !== id),
            missionsData: state.missionsData.filter(m => m.id !== id)
        }));
        return { ok: true };
    },
    updateOp: async (updatedOp, options = {}) => {
        const state = get();
        const oldOp = state.opsData.find(o => o.id === updatedOp.id);

        if (!isCloudReady(state)) {
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

        const { error } = await scopeFamilyQuery(supabase.from('ops').update({
            title: updatedOp.title,
            execution_date: updatedOp.date.replace(/\./g, '-'),
            description: updatedOp.description,
            priority: updatedOp.priority,
            status: updatedOp.status
        }), state.currentFamilyId).eq('id', updatedOp.id);

        if (error) {
            if (isPendingReplay(options)) throw error;
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
            return queueCloudFailure({
                get,
                type: 'ops:update',
                payload: { updatedOp },
                error
            });
        }

        // Sync Participants
        if (oldOp && oldOp.participants !== updatedOp.participants) {
            await scopeFamilyQuery(supabase.from('opsparticipant').delete(), state.currentFamilyId).eq('ops_id', updatedOp.id);
            const pInserts = [];
            if (updatedOp.participants.mom) pInserts.push({ ops_id: updatedOp.id, agent_id: 'mom', is_assigned: true, family_id: state.currentFamilyId });
            if (updatedOp.participants.dad) pInserts.push({ ops_id: updatedOp.id, agent_id: 'dad', is_assigned: true, family_id: state.currentFamilyId });
            if (pInserts.length > 0) await supabase.from('opsparticipant').insert(pInserts);
        }

        // Sync Checklist
        if (oldOp && oldOp.checklist !== updatedOp.checklist) {
            const newItems = updatedOp.checklist.filter(c => String(c.id).startsWith('c-'));
            if (newItems.length > 0) {
                const { data } = await supabase.from('opschecklist').insert(newItems.map(c => ({
                    ops_id: updatedOp.id,
                    task: c.task,
                    is_checked: c.checked,
                    family_id: state.currentFamilyId
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
                await scopeFamilyQuery(supabase.from('opschecklist').update({ is_checked: c.checked }), state.currentFamilyId).eq('id', c.id);
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
        return { ok: true };
    },

    // 5. Daily Tasks Actions
    addDailyTask: async (taskName, options = {}) => {
        const { currentChild, currentFamilyId, session } = get();
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const localId = options.localId || createLocalId('daily', [currentChild, todayStr, taskName, Date.now()]);
        const localTask = { id: localId, localId, task_name: taskName, is_completed: false, assigned_date: todayStr, child_id: currentChild };

        if (!isCloudReady({ session, currentFamilyId })) {
            set((s) => ({
                dailyTasks: [...s.dailyTasks, localTask]
            }));
            return;
        }

        const { data, error } = await insertWithLocalIdFallback('dailytasks', [{
            local_id: localId,
            task_name: taskName,
            is_completed: false,
            assigned_date: todayStr,
            child_id: currentChild,
            family_id: currentFamilyId
        }], { select: true });

        if (error) {
            if (isPendingReplay(options)) throw error;
            set((s) => ({
                dailyTasks: [...s.dailyTasks, localTask]
            }));
            return queueCloudFailure({
                get,
                type: 'daily:add',
                payload: { taskName, localId },
                error
            });
        }

        if (data && data.length > 0) {
            set((state) => ({
                dailyTasks: [...state.dailyTasks, { ...data[0], localId: data[0].local_id }]
            }));
        }
        return { ok: true };
    },
    toggleDailyTask: async (id, options = {}) => {
        const state = get();
        const task = state.dailyTasks.find(t => t.id === id);
        if (task) {
            if (!isCloudReady(state)) {
                set((s) => ({ dailyTasks: s.dailyTasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t) }));
                return;
            }

            const { error } = await scopeFamilyQuery(supabase.from('dailytasks').update({ is_completed: !task.is_completed }), state.currentFamilyId).eq('id', id);
            if (error) {
                if (isPendingReplay(options)) throw error;
                set((s) => ({ dailyTasks: s.dailyTasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t) }));
                return queueCloudFailure({
                    get,
                    type: 'daily:toggle',
                    payload: { id },
                    error
                });
            }
            set((state) => ({
                dailyTasks: state.dailyTasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t)
            }));
            return { ok: true };
        }
    },
    removeDailyTask: async (id, options = {}) => {
        const { session, currentFamilyId } = get();
        if (!isCloudReady({ session, currentFamilyId })) {
            set((s) => ({ dailyTasks: s.dailyTasks.filter(t => t.id !== id) }));
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('dailytasks').delete(), currentFamilyId).eq('id', id);
        if (error) {
            if (isPendingReplay(options)) throw error;
            set((s) => ({ dailyTasks: s.dailyTasks.filter(t => t.id !== id) }));
            return queueCloudFailure({
                get,
                type: 'daily:delete',
                payload: { id },
                error
            });
        }

        set((state) => ({
            dailyTasks: state.dailyTasks.filter(t => t.id !== id)
        }));
        return { ok: true };
    },

    // 6. Transaction History Actions
    addTransactionHistory: async (record, options = {}) => {
        const { currentChild, currentFamilyId, session } = get();
        const { month, date_formatted, source, amount, method } = record;
        const localId = record.localId || record.id || createLocalId('history', [currentChild, month, date_formatted, source, Date.now()]);
        const localRecord = { id: record.id || localId, localId, month, date_formatted, source, amount, method, child_id: currentChild };

        if (!isCloudReady({ session, currentFamilyId })) {
            set((s) => ({
                transactionHistory: [localRecord, ...s.transactionHistory]
            }));
            return;
        }

        const { data, error } = await insertWithLocalIdFallback('transactionhistory', [{
            local_id: localId,
            month,
            date_formatted,
            source,
            amount,
            method,
            child_id: currentChild,
            family_id: currentFamilyId
        }], { select: true });

        if (error) {
            if (isPendingReplay(options)) throw error;
            set((s) => ({
                transactionHistory: [localRecord, ...s.transactionHistory]
            }));
            return queueCloudFailure({
                get,
                type: 'history:add',
                payload: { record: { ...record, id: localRecord.id, localId } },
                error
            });
        }

        if (data && data.length > 0) {
            set((state) => ({
                transactionHistory: [{ ...data[0], localId: data[0].local_id }, ...state.transactionHistory]
            }));
        }
        return { ok: true };
    },
    updateTransactionHistory: async (record, options = {}) => {
        const { session, currentFamilyId } = get();
        const { id, month, date_formatted, source, amount, method } = record;

        if (!isCloudReady({ session, currentFamilyId })) {
            set(s => ({ transactionHistory: s.transactionHistory.map(th => th.id === id ? { ...th, month, date_formatted, source, amount, method } : th) }));
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('transactionhistory').update({
            month,
            date_formatted,
            source,
            amount,
            method
        }), currentFamilyId).eq('id', id);

        if (error) {
            if (isPendingReplay(options)) throw error;
            set(state => ({
                transactionHistory: state.transactionHistory.map(th => th.id === id ? { ...th, month, date_formatted, source, amount, method } : th)
            }));
            return queueCloudFailure({
                get,
                type: 'history:update',
                payload: { record },
                error
            });
        }

        set(state => ({
            transactionHistory: state.transactionHistory.map(th => th.id === id ? { ...th, month, date_formatted, source, amount, method } : th)
        }));
        return { ok: true };
    },
    removeTransactionHistory: async (id, options = {}) => {
        const { session, currentFamilyId } = get();
        if (!isCloudReady({ session, currentFamilyId })) {
            set(s => ({ transactionHistory: s.transactionHistory.filter(th => th.id !== id) }));
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('transactionhistory').delete(), currentFamilyId).eq('id', id);
        if (error) {
            if (isPendingReplay(options)) throw error;
            set(state => ({
                transactionHistory: state.transactionHistory.filter(th => th.id !== id)
            }));
            return queueCloudFailure({
                get,
                type: 'history:delete',
                payload: { id },
                error
            });
        }

        set(state => ({
            transactionHistory: state.transactionHistory.filter(th => th.id !== id)
        }));
        return { ok: true };
    },

    // ----    // 7. General Data Fetching
    syncGuestDataToCloud: async (options = {}) => {
        let backupKey = null;
        const allowMerge = options?.allowMerge === true;
        set({
            isLoading: true,
            storageMode: STORAGE_MODE.SYNCING,
            syncStatus: {
                phase: 'snapshot',
                message: '로컬 데이터 백업을 만드는 중입니다.',
                error: null,
                backupKey: null
            }
        });
        try {
            const syncState = get();
            const { currentFamilyId, session } = syncState;
            if (!isCloudReady(syncState)) {
                set({
                    storageMode: resolveStorageMode(syncState),
                    syncStatus: {
                        phase: 'failed',
                        message: '가족 공유 연결 후 동기화할 수 있습니다.',
                        error: 'cloud-not-ready',
                        backupKey: null
                    }
                });
                return { ok: false, error: '가족 공유 연결 후 동기화할 수 있습니다.' };
            }

            const backup = createLocalCloudSyncBackup(syncState);
            backupKey = backup.key;
            localStorage.setItem(backup.key, JSON.stringify(backup.payload));

            if (!allowMerge) {
                const cloudStatus = await inspectMeaningfulCloudFamilyData(currentFamilyId);
                if (cloudStatus.hasData) {
                    markLocalCloudSyncSkippedSignature(syncState);
                    set({
                        storageMode: STORAGE_MODE.CLOUD,
                        syncStatus: {
                            phase: 'blocked',
                            message: '가족 공유에 이미 데이터가 있어 로컬 데이터 자동 병합을 중단했습니다.',
                            error: null,
                            backupKey
                        }
                    });
                    await get().fetchDataFromDB();
                    await get().fetchDiariesFromDB();
                    return {
                        ok: false,
                        blocked: true,
                        reason: 'cloud-has-data',
                        error: '가족 공유에 이미 데이터가 있어 로컬 데이터 자동 병합을 중단했습니다.',
                        backupKey,
                        cloudStatus
                    };
                }
            }

            set({
                syncStatus: {
                    phase: 'uploading',
                    message: '로컬 데이터를 클라우드로 업로드하는 중입니다.',
                    error: null,
                    backupKey
                }
            });

            const { snapshot, guestDataStringsByChild } = buildGuestCloudSnapshot(syncState);
            const insertRows = async (table, rows) => {
                if (rows.length === 0) return;
                const rowsWithFamily = rows.map(row => ({
                    ...row,
                    family_id: currentFamilyId,
                    user_id: session.user.id
                }));
                const { error } = await supabase.from(table).upsert(rowsWithFamily, {
                    onConflict: 'family_id,local_id',
                    ignoreDuplicates: false
                });
                if (!error) return;

                if (!['42703', '42P10'].includes(toSafeString(error.code))) throw error;

                const legacyRows = rowsWithFamily.map(withoutLocalId);
                const { error: legacyError } = await supabase.from(table).insert(legacyRows);
                if (legacyError) throw legacyError;
            };

            const rpcResult = await supabase.rpc('sync_guest_snapshot', { snapshot_input: snapshot });
            if (rpcResult.error) {
                if (!isMissingSyncSnapshotRpcError(rpcResult.error)) throw rpcResult.error;

                const childResult = await upsertFamilyChildren({
                    familyId: currentFamilyId,
                    childCount: syncState.childCount,
                    childProfiles: syncState.childProfiles
                });
                if (childResult.error && !isMissingFamilyChildrenError(childResult.error)) {
                    throw childResult.error;
                }

                await insertRows('schedule', snapshot.tables.schedule);
                await insertRows('asset', snapshot.tables.asset);
                await insertRows('payment', snapshot.tables.payment);
                await insertRows('ops', snapshot.tables.ops);
                await insertRows('dailytasks', snapshot.tables.dailytasks);
                await insertRows('transactionhistory', snapshot.tables.transactionhistory);
                await insertRows('notice', snapshot.tables.notice);
            }

            Object.entries(guestDataStringsByChild).forEach(([childId, guestDataStr]) => {
                localStorage.setItem(`spy_guestDataLastSynced_${childId}`, guestDataStr);
            });
            markChildProfilesSynced(syncState);
            clearLocalCloudSyncSkippedSignature();

            set({
                syncStatus: {
                    phase: 'verifying',
                    message: '업로드 결과를 확인하는 중입니다.',
                    error: null,
                    backupKey
                }
            });

            const verification = await verifyGuestSnapshotSync({ snapshot, currentFamilyId });
            await get().syncLocalDiariesToCloud();
            const lastSyncAt = new Date().toISOString();
            localStorage.setItem(LAST_SYNC_AT_KEY, lastSyncAt);
            savePendingMutations([]);

            set({
                isGuestMode: false,
                storageMode: STORAGE_MODE.CLOUD,
                syncStatus: {
                    phase: 'complete',
                    message: '클라우드 동기화가 완료되었습니다.',
                    error: null,
                    backupKey
                },
                lastSyncAt,
                syncVerification: verification,
                pendingMutations: []
            });
            await get().fetchDataFromDB();
            return { ok: true, backupKey };
        } catch (e) {
            console.error('Guest Sync Error:', e);
            set({
                storageMode: STORAGE_MODE.CLOUD_ERROR,
                syncStatus: {
                    phase: 'failed',
                    message: '동기화에 실패했습니다. 로컬 백업은 그대로 보존되어 있습니다.',
                    error: e.message,
                    backupKey
                }
            });
            return { ok: false, error: e.message, backupKey };
        } finally {
            set({ isLoading: false });
        }
    },

    fetchDataFromDB: async () => {
        const { session } = get();
        if (!session) {
            setLocalGuestDataForCurrentChild(set, get, { storageMode: STORAGE_MODE.LOCAL });
            return;
        }

        set({ isLoading: true });
        try {
            let currentFamilyId = get().currentFamilyId;
            if (!currentFamilyId) {
                currentFamilyId = await get().fetchFamilyContext();
            }

            if (!currentFamilyId) {
                setLocalGuestDataForCurrentChild(set, get);
                return;
            }

            // Fetch Assets
            let { data: assetsData } = await scopeFamilyQuery(
                supabase.from('asset').select('*'),
                currentFamilyId
            ).order('last_updated', { ascending: false });
            if (assetsData && assetsData.length === 0) {
                // Multi-tenant: Initialize default funds for new user
                const defaultFunds = [
                    { name: '아동수당', balance: 0, family_id: currentFamilyId },
                    { name: '지역사랑상품권', balance: 0, family_id: currentFamilyId }
                ];
                const { data: insertedData } = await supabase
                    .from('asset')
                    .insert(defaultFunds)
                    .select('*')
                    .order('last_updated', { ascending: false });
                if (insertedData) assetsData = insertedData;
            }

            if (assetsData) {
                assetsData = assetsData.map(a => {
                    if (a.name === '성남사랑상품권') {
                        scopeFamilyQuery(supabase.from('asset').update({ name: '지역사랑상품권' }), currentFamilyId).eq('id', a.id).then();
                        return { ...a, name: '지역사랑상품권' };
                    }
                    return a;
                });
                const formattedFunds = dedupeRowsByContent(assetsData, createAssetCloudContentKey).map(a => {
                    const d = new Date(a.last_updated);
                    const updatedStr = `${d.getFullYear().toString().slice(-2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                    return {
                        id: a.id,
                        localId: a.local_id,
                        name: a.name,
                        balance: a.balance,
                        updated: updatedStr
                    };
                });
                set({ funds: formattedFunds });
            }

            const currentChild = get().currentChild;

            // Fetch Transaction History
            const { data: historyData } = await scopeFamilyQuery(
                supabase.from('transactionhistory').select('*'),
                currentFamilyId
            ).eq('child_id', currentChild).order('created_at', { ascending: false });
            let formattedHistory = [];
            if (historyData) {
                formattedHistory = dedupeRowsByContent(historyData, createTransactionCloudContentKey).map(h => ({
                    id: h.id,
                    localId: h.local_id,
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
            const { data: paymentsData } = await scopeFamilyQuery(
                supabase.from('payment').select('*'),
                currentFamilyId
            ).eq('child_id', currentChild).order('payment_day', { ascending: true });
            if (paymentsData) {
                const now = new Date();
                const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                const formattedPayments = [];
                for (const p of mergeCloudPaymentsByContent(paymentsData, historyData, currentMonthStr)) {
                    let isCompleted = p.is_completed;

                    if (isCompleted) {
                        const hasCurrentMonthTx = formattedHistory.some(h => h.paymentId === p.id && h.month === currentMonthStr);
                        if (!hasCurrentMonthTx) {
                            await scopeFamilyQuery(supabase.from('payment').update({ is_completed: false }), currentFamilyId).eq('id', p.id);
                            isCompleted = false;
                        }
                    }

                    formattedPayments.push({
                        id: p.id,
                        localId: p.local_id,
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
                const { data: opsData } = await scopeFamilyQuery(
                    supabase.from('ops').select('*, opschecklist(*), opsparticipant(*)'),
                    currentFamilyId
                ).eq('child_id', currentChild);
                if (opsData) {
                    const parsedOps = dedupeRowsByContent(opsData, createOpsCloudContentKey).map(o => {
                        const momParticipant = o.opsparticipant?.find(p => p.agent_id === 'mom');
                        const dadParticipant = o.opsparticipant?.find(p => p.agent_id === 'dad');

                        return {
                            id: o.id,
                            localId: o.local_id,
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
            const { data: scheduleData } = await scopeFamilyQuery(
                supabase.from('schedule').select('*'),
                currentFamilyId
            ).eq('child_id', currentChild).order('start_time', { ascending: true });
            if (scheduleData) {
                const newWeekly = { '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': [] };
                dedupeRowsByContent(scheduleData, createScheduleCloudContentKey).forEach(s => {
                    if (newWeekly[s.day_of_week]) {
                        newWeekly[s.day_of_week].push({
                            id: s.id,
                            localId: s.local_id,
                            time: s.start_time.slice(0, 5), // 'HH:MM:SS' -> 'HH:MM'
                            title: s.title,
                            agent: s.pickup_agent || s.drop_agent || '자율',
                            location: s.location || '',
                            contactName: s.contact_name || '',
                            contactPhone: s.contact_phone || '',
                            isEarly: s.is_early,
                            isUrgent: s.is_urgent
                        });
                    }
                });
                set({ weeklyData: newWeekly });
            }

            // Fetch Notices
            const { data: noticeData } = await scopeFamilyQuery(
                supabase.from('notice').select('*'),
                currentFamilyId
            ).order('created_at', { ascending: true });
            if (noticeData) {
                set({
                    notices: dedupeRowsByContent(noticeData, createNoticeCloudContentKey).map(n => ({
                        id: n.id,
                        localId: n.local_id,
                        text: n.text,
                        checked: n.is_checked
                    }))
                });
            }

            // Fetch Daily Tasks logic
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const { data: dailyData, error: dailyError } = await scopeFamilyQuery(
                supabase.from('dailytasks').select('*'),
                currentFamilyId
            )
                .eq('child_id', currentChild)
                .eq('assigned_date', todayStr)
                .order('created_at', { ascending: true });

            if (dailyError) {
                // If the table doesn't exist yet, simply ignore to prevent app crashing before migration runs
            } else if (dailyData) {
                set({
                    dailyTasks: dedupeRowsByContent(dailyData, createDailyTaskCloudContentKey).map(task => ({
                        ...task,
                        localId: task.local_id
                    }))
                });
            }

            saveCloudCacheSnapshot(get(), currentFamilyId, currentChild);

        } catch (err) {
            console.error('Error fetching data:', err);
            const fallbackFamilyId = get().currentFamilyId;
            const restored = setCloudCacheForCurrentChild(set, get, fallbackFamilyId, {
                syncStatus: {
                    phase: 'failed',
                    message: '클라우드 데이터를 불러오지 못해 이 기기에 보관된 마지막 데이터를 표시합니다.',
                    error: err.message,
                    backupKey: null
                }
            });
            if (restored) return;
        } finally {
            set({ isLoading: false });
        }
    }
})));
