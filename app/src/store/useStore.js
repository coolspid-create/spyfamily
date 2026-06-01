import { create } from 'zustand';
import { requireSupabase, supabase } from '../lib/supabase';
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
const DIARY_RECORDS_STORAGE_KEY = 'family-diary-records-v1';
const LEGACY_DIARY_RECORDS_STORAGE_KEY = 'memory-mvp-records-v2';
const DIARY_COMMENT_MAX_LENGTH = 50;
const DIARY_PHOTO_BUCKET = 'diary-photos';

const asArray = (value) => (Array.isArray(value) ? value : []);
const toSafeString = (value, fallback = '') => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return fallback;
    return String(value);
};
const toSafeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const getLocalDateString = (date = new Date()) => (
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);
const normalizeBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';
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

const createFamilyInviteCode = () => {
    const segment = () => Math.floor(1000 + Math.random() * 9000).toString();
    return `FA-${segment()}-${segment()}`;
};

const scopeFamilyQuery = (query, familyId) => (
    familyId ? query.eq('family_id', familyId) : query
);

const isUuid = (value) => (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(toSafeString(value))
);

const createClientUuid = () => (
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const isDirectImageSource = (value) => /^(data:image\/|blob:|https?:\/\/|\/)/i.test(toSafeString(value).trim());

const isStorageImagePath = (value) => {
    const raw = toSafeString(value).trim();
    return Boolean(raw) && !isDirectImageSource(raw);
};

const getBlobExtension = (blob) => {
    const mime = toSafeString(blob?.type, 'image/jpeg').toLowerCase();
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    return 'jpg';
};

const dataUrlToBlob = async (imageSource) => {
    const response = await fetch(imageSource);
    if (!response.ok) throw new Error('이미지 파일을 읽을 수 없습니다.');
    return response.blob();
};

const uploadDiaryImagesToStorage = async ({ images, familyId, diaryId }) => {
    if (!supabase || !familyId || !diaryId) {
        return { imagePaths: images.filter(isStorageImagePath), uploadedPaths: [] };
    }

    const imagePaths = [];
    const uploadedPaths = [];

    for (const [index, imageSource] of images.entries()) {
        const source = toSafeString(imageSource).trim();
        if (!source) continue;

        if (isStorageImagePath(source)) {
            imagePaths.push(source);
            continue;
        }

        if (!source.startsWith('data:image/') && !source.startsWith('blob:')) {
            continue;
        }

        const blob = await dataUrlToBlob(source);
        const extension = getBlobExtension(blob);
        const storagePath = `${familyId}/${diaryId}/${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${extension}`;
        const { error } = await supabase.storage
            .from(DIARY_PHOTO_BUCKET)
            .upload(storagePath, blob, {
                cacheControl: '3600',
                contentType: blob.type || 'image/jpeg',
                upsert: false
            });

        if (error) throw error;
        imagePaths.push(storagePath);
        uploadedPaths.push(storagePath);
    }

    return { imagePaths, uploadedPaths };
};

const normalizeWeeklyData = (weeklyData) => WEEK_DAYS.reduce((normalized, day) => {
    normalized[day] = asArray(weeklyData?.[day]).map((item, index) => ({
        id: toSafeString(item?.id) || createLocalId(`schedule-${day}`, [index, item?.time, item?.title]),
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
        type,
        day,
        year: type === 'event' ? toSafeNumber(mission?.year, new Date().getFullYear()) : mission?.year,
        month: type === 'event' ? Math.min(Math.max(toSafeNumber(mission?.month, new Date().getMonth() + 1), 1), 12) : mission?.month,
        title: toSafeString(mission?.title, type === 'event' ? '가족일정' : '결제관리')
    };
});

const normalizeOps = (opsData) => asArray(opsData).map((op, index) => ({
    id: toSafeString(op?.id) || createLocalId('ops', [index, op?.title]),
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
    task_name: toSafeString(task?.task_name ?? task?.text ?? task?.title, '할 일'),
    is_completed: normalizeBoolean(task?.is_completed ?? task?.completed ?? task?.checked),
    assigned_date: normalizeDateDashes(task?.assigned_date, getLocalDateString())
}));

const normalizeTransactionHistory = (history) => asArray(history).map((record, index) => ({
    id: toSafeString(record?.id) || createLocalId('history', [index, record?.source, record?.date_formatted]),
    paymentId: toSafeString(record?.paymentId ?? record?.payment_id),
    month: toSafeString(record?.month),
    date_formatted: toSafeString(record?.date_formatted),
    source: toSafeString(record?.source, '결제 내역'),
    amount: toSafeNumber(record?.amount),
    method: normalizeMethod(record?.method, '')
}));

const normalizeNotices = (notices) => asArray(notices).map((notice, index) => ({
    id: toSafeString(notice?.id) || createLocalId('notice', [index, notice?.text]),
    text: toSafeString(notice?.text, '알림'),
    checked: normalizeBoolean(notice?.checked ?? notice?.is_checked)
}));

const createDateLabelFromIso = (isoDate) => {
    const [, month, day] = normalizeDateDashes(isoDate, getLocalDateString()).split('-');
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

const normalizeDiaryRecords = (records) => (
    Array.isArray(records) ? records : []
).map((record, index) => {
    const isoDate = normalizeDateDashes(
        record?.isoDate ?? record?.date,
        createIsoDateFromLabel(record?.date) || getLocalDateString()
    );
    const imagePaths = asArray(record?.image_paths ?? record?.imagePaths).filter(path => typeof path === 'string' && path);
    const imageUrls = asArray(record?.imageUrls).filter(url => typeof url === 'string' && url);
    const imageUrl = toSafeString(record?.imageUrl || imageUrls[0] || imagePaths[0] || '');
    const allImageUrls = imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);
    const comments = asArray(record?.diary_comments ?? record?.comments).map((comment, commentIndex) => ({
        id: toSafeString(comment?.id) || `comment-${index}-${commentIndex}`,
        author: toSafeString(comment?.author, '가족') || '가족',
        text: toSafeString(comment?.text).slice(0, DIARY_COMMENT_MAX_LENGTH),
        time: toSafeString(comment?.time ?? comment?.created_at)
    }));

    return {
        id: toSafeString(record?.id) || `diary-${isoDate}-${index}`,
        localId: toSafeString(record?.local_id ?? record?.localId),
        child: toSafeString(record?.child, '아이1') || '아이1',
        date: createDateLabelFromIso(isoDate),
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
        comments
    };
});

const loadLocalDiaryRecords = () => {
    try {
        const saved = localStorage.getItem(DIARY_RECORDS_STORAGE_KEY) || localStorage.getItem(LEGACY_DIARY_RECORDS_STORAGE_KEY);
        return saved ? normalizeDiaryRecords(JSON.parse(saved)) : INITIAL_DIARIES;
    } catch (error) {
        console.warn('Local diary records could not be loaded safely:', error);
        return INITIAL_DIARIES;
    }
};

const saveLocalDiaryRecords = (records) => {
    try {
        localStorage.setItem(DIARY_RECORDS_STORAGE_KEY, JSON.stringify(normalizeDiaryRecords(records)));
    } catch (error) {
        console.error('Local diary save failed:', error);
    }
};

const clearLocalAccountData = () => {
    try {
        [DIARY_RECORDS_STORAGE_KEY, LEGACY_DIARY_RECORDS_STORAGE_KEY].forEach((key) => {
            localStorage.removeItem(key);
        });
        ['spy_childProfiles', 'spy_childCount', 'spy_currentChild'].forEach((key) => {
            localStorage.removeItem(key);
        });
        ['child1', 'child2', 'child3'].forEach((childId) => {
            localStorage.removeItem(`spy_guestData_${childId}`);
            localStorage.removeItem(`spy_guestDataLastSynced_${childId}`);
        });
    } catch (error) {
        console.warn('Local account cache could not be cleared safely:', error);
    }
};

const removeStoragePathsInChunks = async (paths) => {
    const uniquePaths = [...new Set(asArray(paths).map(toSafeString).filter(isStorageImagePath))];
    for (let index = 0; index < uniquePaths.length; index += 100) {
        const chunk = uniquePaths.slice(index, index + 100);
        const { error } = await supabase.storage.from(DIARY_PHOTO_BUCKET).remove(chunk);
        if (error) throw error;
    }
};

const normalizeGuestData = (data) => ({
    weeklyData: normalizeWeeklyData(data?.weeklyData),
    missionsData: normalizeMissions(data?.missionsData),
    funds: normalizeFunds(data?.funds),
    payments: normalizePayments(data?.payments),
    opsData: normalizeOps(data?.opsData),
    transactionHistory: normalizeTransactionHistory(data?.transactionHistory),
    notices: normalizeNotices(data?.notices),
    dailyTasks: normalizeDailyTasks(data?.dailyTasks)
});

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
    time: item.time,
    title: item.title,
    agent: item.agent,
    location: item.location || '',
    contactName: item.contactName || '',
    contactPhone: item.contactPhone || '',
    isEarly: !!item.isEarly,
    isUrgent: !!item.isUrgent
});

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

const persistGuestData = (config) => (set, get, api) => config((args) => {
    const prevState = get();
    set(args);
    const nextState = get();

    if (!nextState.session && nextState.isGuestMode && hasGuestDataChanged(prevState, nextState)) {
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
            set({ isGuestMode: val, isAuthChecking: false });
            get().fetchDataFromDB();
        } else {
            set({ isGuestMode: val, isAuthChecking: false });
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
        if (session && supabase) {
            await supabase.auth.updateUser({
                data: {
                    spy_childCount: childCount,
                    spy_childProfiles: childProfiles,
                    spy_currentChild: currentChild
                }
            });
        }
    },

    // ---- Family Share Context ----
    fetchFamilyContext: async () => {
        const { session } = get();
        if (!session || !supabase) {
            set({
                currentFamilyId: null,
                familyInviteCode: null,
                familyMembers: [],
                isFamilyLoading: false
            });
            return null;
        }

        set({ isFamilyLoading: true });
        try {
            const { data: memberData, error: memberError } = await supabase
                .from('family_members')
                .select('family_id, role, display_name')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (memberError) throw memberError;

            if (!memberData) {
                set({
                    currentFamilyId: null,
                    familyInviteCode: null,
                    familyMembers: []
                });
                return null;
            }

            const [{ data: familyData, error: familyError }, { data: membersList, error: listError }] = await Promise.all([
                supabase
                    .from('families')
                    .select('id, name, invite_code')
                    .eq('id', memberData.family_id)
                    .single(),
                supabase
                    .from('family_members')
                    .select('user_id, role, display_name, joined_at')
                    .eq('family_id', memberData.family_id)
            ]);

            if (familyError) throw familyError;
            if (listError) throw listError;

            set({
                currentFamilyId: memberData.family_id,
                familyInviteCode: familyData?.invite_code || null,
                familyMembers: membersList || [],
                isGuestMode: false
            });
            return memberData.family_id;
        } catch (error) {
            console.warn('Family context could not be loaded:', error);
            set({
                currentFamilyId: null,
                familyInviteCode: null,
                familyMembers: []
            });
            return null;
        } finally {
            set({ isFamilyLoading: false });
        }
    },
    createFamily: async (familyName = '가족 스케줄러') => {
        const { session } = get();
        if (!session || !supabase) return null;

        set({ isFamilyLoading: true });
        try {
            const inviteCode = createFamilyInviteCode();
            const { data: familyData, error: familyError } = await supabase
                .from('families')
                .insert([{
                    name: toSafeString(familyName, '가족 스케줄러') || '가족 스케줄러',
                    invite_code: inviteCode,
                    created_by: session.user.id
                }])
                .select('id')
                .single();

            if (familyError) throw familyError;

            const { error: memberError } = await supabase
                .from('family_members')
                .insert([{
                    user_id: session.user.id,
                    family_id: familyData.id,
                    role: 'owner',
                    display_name: '보호자'
                }]);

            if (memberError) throw memberError;

            await get().fetchFamilyContext();
            await get().syncGuestDataToCloud();
            await get().syncLocalDiariesToCloud();
            await get().fetchDataFromDB();
            await get().fetchDiariesFromDB();
            return familyData.id;
        } catch (error) {
            alert('가족 생성 실패: ' + error.message);
            return null;
        } finally {
            set({ isFamilyLoading: false });
        }
    },
    joinFamily: async (inviteCode) => {
        if (!supabase) return false;
        set({ isFamilyLoading: true });
        try {
            const code = toSafeString(inviteCode).trim().toUpperCase();
            const { error } = await supabase.rpc('join_family_by_code', { code_input: code });
            if (error) throw error;

            await get().fetchFamilyContext();
            await get().syncGuestDataToCloud();
            await get().syncLocalDiariesToCloud();
            await get().fetchDataFromDB();
            await get().fetchDiariesFromDB();
            return true;
        } catch (error) {
            alert('합류 실패: ' + error.message);
            return false;
        } finally {
            set({ isFamilyLoading: false });
        }
    },
    leaveFamily: async () => {
        const { session, currentFamilyId } = get();
        if (!session || !currentFamilyId || !supabase) return false;
        if (!confirm('정말로 가족 그룹에서 탈퇴하시겠습니까? 공유된 데이터에 더 이상 접근할 수 없습니다.')) return false;

        set({ isFamilyLoading: true });
        try {
            const { error } = await supabase
                .from('family_members')
                .delete()
                .eq('user_id', session.user.id)
                .eq('family_id', currentFamilyId);

            if (error) throw error;

            set({
                currentFamilyId: null,
                familyInviteCode: null,
                familyMembers: [],
                weeklyData: INITIAL_WEEKLY,
                payments: INITIAL_PAYMENTS,
                missionsData: INITIAL_MISSIONS,
                opsData: INITIAL_OPS,
                transactionHistory: INITIAL_HISTORY,
                notices: [],
                dailyTasks: INITIAL_DAILY,
                diaries: loadLocalDiaryRecords(),
                isGuestMode: true
            });
            await get().fetchDataFromDB();
            return true;
        } catch (error) {
            alert('탈퇴 실패: ' + error.message);
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

        const { data, error } = await supabase
            .from('diary')
            .select('*, diary_comments(*)')
            .eq('family_id', currentFamilyId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Cloud diary fetch failed, falling back to local records:', error);
            set({ diaries: loadLocalDiaryRecords() });
            return;
        }

        set({ diaries: normalizeDiaryRecords(data) });
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
                    await supabase.storage.from(DIARY_PHOTO_BUCKET).remove(uploadedPaths);
                }
                throw error;
            }
        }
    },
    addDiary: async (diaryData) => {
        const { session, currentFamilyId } = get();
        const nextLocal = normalizeDiaryRecords([diaryData])[0];

        if (!session || !currentFamilyId || !supabase) {
            set((state) => {
                const diaries = [nextLocal, ...state.diaries];
                saveLocalDiaryRecords(diaries);
                return { diaries };
            });
            return nextLocal;
        }

        const { data, error } = await supabase
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
                image_paths: nextLocal.imagePaths || [],
                reactions: nextLocal.reactions || [],
                local_id: nextLocal.localId || null
            }])
            .select('*, diary_comments(*)')
            .single();

        if (error) {
            set((state) => {
                const diaries = [nextLocal, ...state.diaries];
                saveLocalDiaryRecords(diaries);
                return { diaries };
            });
            throw error;
        }

        await get().fetchDiariesFromDB();
        return normalizeDiaryRecords([data])[0];
    },
    updateDiary: async (diaryData) => {
        const { session, currentFamilyId } = get();
        const nextRecord = normalizeDiaryRecords([diaryData])[0];

        if (!session || !currentFamilyId || !supabase || !isUuid(nextRecord.id)) {
            set((state) => {
                const diaries = state.diaries.map(record => record.id === nextRecord.id ? nextRecord : record);
                saveLocalDiaryRecords(diaries);
                return { diaries };
            });
            return nextRecord;
        }

        const { error } = await supabase
            .from('diary')
            .update({
                child: nextRecord.child,
                date: nextRecord.isoDate,
                time: nextRecord.time,
                mood: nextRecord.mood,
                title: nextRecord.title,
                text: nextRecord.text,
                image_paths: nextRecord.imagePaths || [],
                reactions: nextRecord.reactions || [],
                updated_at: new Date().toISOString()
            })
            .eq('id', nextRecord.id)
            .eq('family_id', currentFamilyId);

        if (error) throw error;
        await get().fetchDiariesFromDB();
        return nextRecord;
    },
    removeDiary: async (diaryId) => {
        const { session, currentFamilyId } = get();
        if (!session || !currentFamilyId || !supabase || !isUuid(diaryId)) {
            set((state) => {
                const diaries = state.diaries.filter(record => record.id !== diaryId);
                saveLocalDiaryRecords(diaries);
                return { diaries };
            });
            return;
        }

        const { error } = await supabase
            .from('diary')
            .delete()
            .eq('id', diaryId)
            .eq('family_id', currentFamilyId);

        if (error) throw error;
        await get().fetchDiariesFromDB();
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
            set((state) => {
                const diaries = state.diaries.map(record => (
                    record.id === diaryId
                        ? { ...record, comments: [...(record.comments || []), safeComment] }
                        : record
                ));
                saveLocalDiaryRecords(diaries);
                return { diaries };
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

        if (error) throw error;
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
        // When setting a real session, immediately clear all data to prevent
        // guest/test data from showing before fetchDataFromDB completes
        if (session) {
            set({
                session,
                isAuthChecking: false,
                isGuestMode: false,
                weeklyData: INITIAL_WEEKLY,
                missionsData: INITIAL_MISSIONS,
                funds: INITIAL_FUNDS,
                payments: INITIAL_PAYMENTS,
                opsData: INITIAL_OPS,
                transactionHistory: INITIAL_HISTORY,
                notices: [],
                dailyTasks: INITIAL_DAILY,
                diaries: INITIAL_DIARIES
            });
        } else {
            set({
                session,
                isAuthChecking: false,
                isGuestMode: true,
                currentFamilyId: null,
                familyInviteCode: null,
                familyMembers: [],
                diaries: loadLocalDiaryRecords()
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
        if (supabase) {
            await supabase.auth.signOut();
        }
        set({
            session: null,
            isGuestMode: true,
            currentFamilyId: null,
            familyInviteCode: null,
            familyMembers: [],
            diaries: loadLocalDiaryRecords()
        });
        await get().fetchDataFromDB();
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

            if (currentFamilyId) {
                let diaryQuery = supabase
                    .from('diary')
                    .select('image_paths')
                    .eq('family_id', currentFamilyId);

                if (!isOnlyFamilyMember) {
                    diaryQuery = diaryQuery.eq('user_id', userId);
                }

                const { data: diaryRows, error: diaryError } = await diaryQuery;
                if (diaryError) throw diaryError;

                const imagePaths = asArray(diaryRows).flatMap((row) => asArray(row.image_paths));
                await removeStoragePathsInChunks(imagePaths);
            }

            const { error } = await supabase.rpc('delete_user_account');
            if (error) throw error;

            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) {
                console.warn('Sign-out after account deletion failed:', signOutError);
            }

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
                diaries: INITIAL_DIARIES
            });
            clearLocalAccountData();
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
        const { currentChild, currentFamilyId, weeklyData, session, isGuestMode } = get();
        const sourceSchedule = weeklyData[sourceDay] || [];
        const uniqueTargetDays = [...new Set(targetDays)]
            .filter(day => day !== sourceDay && Array.isArray(weeklyData[day]));

        if (sourceSchedule.length === 0 || uniqueTargetDays.length === 0) {
            return { added: 0, skipped: 0 };
        }

        if (!session && isGuestMode) {
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

            sourceSchedule.forEach((item) => {
                const key = createScheduleKey(item);
                if (existingKeys.has(key)) {
                    skipped += 1;
                    return;
                }

                existingKeys.add(key);
                inserts.push({
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

        const { error } = await supabase.from('schedule').insert(inserts);
        if (error) {
            alert('일정 복사 실패: ' + error.message);
            return { added: 0, skipped };
        }

        await get().fetchDataFromDB();
        return { added: inserts.length, skipped };
    },
    addSchedule: async (day, item) => {
        const { currentChild, currentFamilyId, session, isGuestMode } = get();
        if (!session && isGuestMode) {
            const newItem = {
                id: 'g_' + Date.now(),
                time: item.time,
                title: item.title,
                agent: item.agent,
                location: item.location || '',
                contactName: item.contactName || '',
                contactPhone: item.contactPhone || '',
                isEarly: item.isEarly || false,
                isUrgent: item.isUrgent || false
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
            contact_name: item.contactName || '',
            contact_phone: item.contactPhone || '',
            is_urgent: item.isUrgent || false,
            is_early: item.isEarly || false,
            child_id: currentChild,
            family_id: currentFamilyId
        }]).select();
        if (error) { alert('일정 추가 실패: ' + error.message); return; }
        await get().fetchDataFromDB();
    },
    updateScheduleItem: async (item) => {
        const { session, isGuestMode, currentFamilyId } = get();
        if (!session && isGuestMode) {
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
        if (error) { alert('수정 실패: ' + error.message); return; }
        await get().fetchDataFromDB();
    },
    removeScheduleItem: async (id) => {
        const { session, isGuestMode, currentFamilyId } = get();
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

        const { error } = await scopeFamilyQuery(supabase.from('schedule').delete(), currentFamilyId).eq('id', id);
        if (error) { alert('삭제 실패: ' + error.message); return; }
        await get().fetchDataFromDB();
    },

    // 2. Missions Data Actions (Supabase Sync)
    addMission: async (mission) => {
        set({ isLoading: true });
        const { currentChild, currentFamilyId, session, isGuestMode } = get();

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
                child_id: currentChild,
                family_id: currentFamilyId
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
                child_id: currentChild,
                family_id: currentFamilyId
            }]);
            if (error) alert('일정 추가 실패: ' + error.message);
        }
        await get().fetchDataFromDB();
        set({ isLoading: false });
    },
    updateMission: async (mission) => {
        set({ isLoading: true });
        const { session, isGuestMode, currentFamilyId } = get();

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
            const { error } = await scopeFamilyQuery(supabase.from('payment').update({
                source: mission.title.replace(' 결제', ''),
                payment_day: mission.day
            }), currentFamilyId).eq('id', mission.id);
            if (error) alert('일정 수정 실패: ' + error.message);
        } else {
            const year = mission.year || new Date().getFullYear();
            const month = String(mission.month || new Date().getMonth() + 1).padStart(2, '0');
            const day = String(mission.day).padStart(2, '0');
            const { error } = await scopeFamilyQuery(supabase.from('ops').update({
                title: mission.title,
                execution_date: `${year}-${month}-${day}`
            }), currentFamilyId).eq('id', mission.id);
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
            const { error } = await scopeFamilyQuery(supabase.from('payment').delete(), state.currentFamilyId).eq('id', id);
            if (error) { alert('삭제 실패: ' + error.message); return; }
        } else {
            const { error } = await scopeFamilyQuery(supabase.from('ops').delete(), state.currentFamilyId).eq('id', id);
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
        const { session, isGuestMode, currentFamilyId } = get();
        if (!session && isGuestMode) {
            set(s => ({ notices: [...s.notices, { id: 'g_' + Date.now(), text: notice.text, checked: notice.checked }] }));
            return;
        }
        const { data, error } = await supabase.from('notice').insert([{
            text: notice.text,
            is_checked: notice.checked,
            family_id: currentFamilyId
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
            await scopeFamilyQuery(supabase.from('notice').update({ is_checked: !notice.checked }), state.currentFamilyId).eq('id', id);
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
        await scopeFamilyQuery(supabase.from('notice').delete(), state.currentFamilyId).eq('id', id);
        set((state) => ({
            notices: state.notices.filter(n => n.id !== id)
        }));
    },

    // 4. Payments Actions
    addPayment: async (paymentData) => {
        const { currentChild, currentFamilyId, session, isGuestMode } = get();
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
            child_id: currentChild,
            family_id: currentFamilyId
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
        const { session, isGuestMode, currentFamilyId } = get();
        if (!session && isGuestMode) {
            set(s => ({
                payments: s.payments.filter(p => p.id !== paymentId),
                missionsData: s.missionsData.filter(m => m.id !== paymentId)
            }));
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('payment').delete(), currentFamilyId).eq('id', paymentId);
        if (error) { alert('삭제 실패: ' + error.message); return; }

        set((state) => ({
            payments: state.payments.filter(p => p.id !== paymentId),
            missionsData: state.missionsData.filter(m => m.id !== paymentId)
        }));
    },
    updatePayment: async (payment) => {
        const { session, isGuestMode, currentFamilyId } = get();
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

        const { error } = await scopeFamilyQuery(supabase.from('payment').update({
            source: payment.source,
            amount: payment.amount,
            method: payment.method,
            payment_day: parseInt(payment.day.replace('일', ''), 10) || 1,
            discount_info: payment.discount
        }), currentFamilyId).eq('id', payment.id);

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

        await scopeFamilyQuery(supabase.from('payment').update({ is_completed: true }), state.currentFamilyId).eq('id', paymentId);

        const { data: histData } = await supabase.from('transactionhistory').insert([{
            payment_id: paymentId,
            month: currentMonth,
            date_formatted: completedAt,
            source: payment.source,
            amount: payment.amount,
            method: payment.method,
            child_id: get().currentChild,
            family_id: state.currentFamilyId
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

        await scopeFamilyQuery(supabase.from('payment').update({ is_completed: false }), state.currentFamilyId).eq('id', paymentId);
        await scopeFamilyQuery(supabase.from('transactionhistory').delete(), state.currentFamilyId).eq('payment_id', paymentId).eq('month', currentMonth);

        set((state) => ({
            funds: updatedFunds,
            payments: state.payments.map(p =>
                p.id === paymentId ? { ...p, isCompleted: false, completedAt: null } : p
            ),
            transactionHistory: state.transactionHistory.filter(h => !(h.paymentId === paymentId && h.month === currentMonth))
        }));
    },
    updateFund: async (fund) => {
        const { session, isGuestMode, currentFamilyId } = get();
        const now = new Date();
        const todayStr = `${now.getFullYear().toString().slice(-2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

        if (!session && isGuestMode) {
            set(s => ({ funds: s.funds.map(f => f.id === fund.id ? { ...fund, updated: todayStr } : f) }));
            return;
        }

        await scopeFamilyQuery(supabase.from('asset').update({ balance: fund.balance, last_updated: new Date().toISOString() }), currentFamilyId).eq('id', fund.id);
        set((state) => ({
            funds: state.funds.map(f => f.id === fund.id ? { ...fund, updated: todayStr } : f)
        }));
    },

    setOpsData: (ops) => set({ opsData: ops }),
    addOp: async (opData) => {
        const { currentChild, currentFamilyId, session, isGuestMode } = get();

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
            child_id: currentChild,
            family_id: currentFamilyId
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
        const { session, isGuestMode, currentFamilyId } = get();
        if (!session && isGuestMode) {
            set(state => ({
                opsData: state.opsData.filter(op => op.id !== id),
                missionsData: state.missionsData.filter(m => m.id !== id)
            }));
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('ops').delete(), currentFamilyId).eq('id', id);
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

        const { error } = await scopeFamilyQuery(supabase.from('ops').update({
            title: updatedOp.title,
            execution_date: updatedOp.date.replace(/\./g, '-'),
            description: updatedOp.description,
            priority: updatedOp.priority,
            status: updatedOp.status
        }), state.currentFamilyId).eq('id', updatedOp.id);

        if (error) { console.error('Ops update error:', error); alert('업데이트 실패: ' + error.message); return; }

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
    },

    // 5. Daily Tasks Actions
    addDailyTask: async (taskName) => {
        const { currentChild, currentFamilyId, session, isGuestMode } = get();
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
            child_id: currentChild,
            family_id: currentFamilyId
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

            await scopeFamilyQuery(supabase.from('dailytasks').update({ is_completed: !task.is_completed }), state.currentFamilyId).eq('id', id);
            set((state) => ({
                dailyTasks: state.dailyTasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t)
            }));
        }
    },
    removeDailyTask: async (id) => {
        const { session, isGuestMode, currentFamilyId } = get();
        if (!session && isGuestMode) {
            set((s) => ({ dailyTasks: s.dailyTasks.filter(t => t.id !== id) }));
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('dailytasks').delete(), currentFamilyId).eq('id', id);
        if (error) { alert('삭제 실패: ' + error.message); return; }

        set((state) => ({
            dailyTasks: state.dailyTasks.filter(t => t.id !== id)
        }));
    },

    // 6. Transaction History Actions
    addTransactionHistory: async (record) => {
        const { currentChild, currentFamilyId, session, isGuestMode } = get();
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
            child_id: currentChild,
            family_id: currentFamilyId
        }]).select();

        if (error) { alert('결제 기록 추가 실패: ' + error.message); return; }

        if (data && data.length > 0) {
            set((state) => ({
                transactionHistory: [data[0], ...state.transactionHistory]
            }));
        }
    },
    updateTransactionHistory: async (record) => {
        const { session, isGuestMode, currentFamilyId } = get();
        const { id, month, date_formatted, source, amount, method } = record;

        if (!session && isGuestMode) {
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

        if (error) { alert('과거 기록 수정 실패: ' + error.message); return; }

        set(state => ({
            transactionHistory: state.transactionHistory.map(th => th.id === id ? { ...th, month, date_formatted, source, amount, method } : th)
        }));
    },
    removeTransactionHistory: async (id) => {
        const { session, isGuestMode, currentFamilyId } = get();
        if (!session && isGuestMode) {
            set(s => ({ transactionHistory: s.transactionHistory.filter(th => th.id !== id) }));
            return;
        }

        const { error } = await scopeFamilyQuery(supabase.from('transactionhistory').delete(), currentFamilyId).eq('id', id);
        if (error) { alert('과거 기록 삭제 실패: ' + error.message); return; }

        set(state => ({
            transactionHistory: state.transactionHistory.filter(th => th.id !== id)
        }));
    },

    // ----    // 7. General Data Fetching
    syncGuestDataToCloud: async () => {
        set({ isLoading: true });
        const { currentChild, currentFamilyId, session } = get();
        const guestDataStr = localStorage.getItem(`spy_guestData_${currentChild}`);
        if (!session || !currentFamilyId || !guestDataStr) {
            set({ isLoading: false });
            return;
        }

        try {
            const guestData = normalizeGuestData(JSON.parse(guestDataStr));

            const schedules = [];
            for (const day in guestData.weeklyData) {
                guestData.weeklyData[day].forEach(item => {
                    schedules.push({ title: item.title, day_of_week: day, start_time: item.time + ':00', pickup_agent: item.agent, drop_agent: item.agent, location: item.location || '', contact_name: item.contactName || '', contact_phone: item.contactPhone || '', is_urgent: item.isUrgent || false, is_early: item.isEarly || false, child_id: currentChild, family_id: currentFamilyId });
                });
            }
            if (schedules.length > 0) await supabase.from('schedule').insert(schedules);

            const payments = guestData.payments.map(p => ({ source: p.source, amount: p.amount, method: p.method, payment_day: normalizeDayNumber(p.day), discount_info: p.discount, is_completed: p.isCompleted, child_id: currentChild, family_id: currentFamilyId }));
            if (payments.length > 0) await supabase.from('payment').insert(payments);

            const ops = guestData.opsData.map(o => ({ title: o.title, execution_date: normalizeDateDashes(o.date), description: o.description || '', priority: o.priority, status: o.status, child_id: currentChild, family_id: currentFamilyId }));
            if (ops.length > 0) await supabase.from('ops').insert(ops);

            const dailyTasks = guestData.dailyTasks.map(t => ({ task_name: t.task_name, is_completed: t.is_completed, assigned_date: t.assigned_date, child_id: currentChild, family_id: currentFamilyId }));
            if (dailyTasks.length > 0) await supabase.from('dailytasks').insert(dailyTasks);

            const history = guestData.transactionHistory.map(h => ({ month: h.month, date_formatted: h.date_formatted, source: h.source, amount: h.amount, method: h.method || '', child_id: currentChild, family_id: currentFamilyId }));
            if (history.length > 0) await supabase.from('transactionhistory').insert(history);

            const notices = guestData.notices.map(n => ({ text: n.text, is_checked: n.checked, family_id: currentFamilyId }));
            if (notices.length > 0) await supabase.from('notice').insert(notices);

            await get().syncLocalDiariesToCloud();
            localStorage.setItem(`spy_guestDataLastSynced_${currentChild}`, guestDataStr);
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
        const { session, currentChild } = get();
        if (!session) {
            const guestDataStr = localStorage.getItem(`spy_guestData_${currentChild}`);
            if (guestDataStr) {
                try {
                    const parsed = normalizeGuestData(JSON.parse(guestDataStr));
                    set({ ...parsed, isLoading: false, isDataLoaded: true });
                } catch (error) {
                    console.warn('Local guest data could not be loaded safely:', error);
                    set({
                        ...normalizeGuestData({}),
                        isLoading: false,
                        isDataLoaded: true
                    });
                }
            } else {
                set({
                    ...normalizeGuestData({}),
                    isLoading: false, isDataLoaded: true
                });
            }
            return;
        }

        if (!session) return;

        set({ isLoading: true });
        try {
            let currentFamilyId = get().currentFamilyId;
            if (!currentFamilyId) {
                currentFamilyId = await get().fetchFamilyContext();
            }

            if (!currentFamilyId) {
                set({
                    ...normalizeGuestData({}),
                    isLoading: false,
                    isDataLoaded: true
                });
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
            const { data: historyData } = await scopeFamilyQuery(
                supabase.from('transactionhistory').select('*'),
                currentFamilyId
            ).eq('child_id', currentChild).order('created_at', { ascending: false });
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
            const { data: paymentsData } = await scopeFamilyQuery(
                supabase.from('payment').select('*'),
                currentFamilyId
            ).eq('child_id', currentChild).order('payment_day', { ascending: true });
            if (paymentsData) {
                const now = new Date();
                const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                const formattedPayments = [];
                for (const p of paymentsData) {
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
            const { data: scheduleData } = await scopeFamilyQuery(
                supabase.from('schedule').select('*'),
                currentFamilyId
            ).eq('child_id', currentChild).order('start_time', { ascending: true });
            if (scheduleData) {
                const newWeekly = { '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': [] };
                scheduleData.forEach(s => {
                    if (newWeekly[s.day_of_week]) {
                        newWeekly[s.day_of_week].push({
                            id: s.id,
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
                set({ dailyTasks: dailyData });
            }

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            set({ isLoading: false });
        }
    }
})));
