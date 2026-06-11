export const STORAGE_MODE = {
    LOCAL: 'local',
    LINKING: 'linking',
    SYNCING: 'syncing',
    CLOUD: 'cloud',
    CLOUD_ERROR: 'cloud-error'
};

export const DEFAULT_SYNC_STATUS = {
    phase: 'idle',
    message: '',
    error: null,
    backupKey: null
};

export const LOCAL_STORAGE_KEYS = {
    DIARY_RECORDS: 'family-diary-records-v1',
    LEGACY_DIARY_RECORDS: 'memory-mvp-records-v2',
    DIARY_SYNC_SIGNATURE: 'family-diary-records-last-synced-v1',
    CHILD_PROFILE_SYNC_SIGNATURE: 'spy_childProfilesLastSynced',
    LAST_SYNC_AT: 'spy_lastSyncAt',
    GUEST_SYNC_BACKUP_PREFIX: 'spy_guestSyncBackup',
    LOCAL_CLOUD_SYNC_SKIP_SIGNATURE: 'spy_localCloudSyncSkipSignature',
    CLOUD_CACHE_PREFIX: 'spy_cloudCache',
    CLOUD_DIARY_CACHE_PREFIX: 'spy_cloudDiaryCache',
    FAMILY_CONTEXT: 'spy_familyContext',
    PENDING_MUTATIONS: 'spy_pendingMutations',
    CHILD_PROFILES: 'spy_childProfiles',
    CHILD_COUNT: 'spy_childCount',
    CURRENT_CHILD: 'spy_currentChild'
};

const getStorage = () => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
};

export const isCloudReadyState = ({ session, currentFamilyId }, client) => (
    Boolean(session && currentFamilyId && client)
);

export const resolveStorageMode = ({ session, currentFamilyId, storageMode }) => {
    if (storageMode === STORAGE_MODE.SYNCING) return STORAGE_MODE.SYNCING;
    if (storageMode === STORAGE_MODE.CLOUD_ERROR && session && currentFamilyId) return STORAGE_MODE.CLOUD_ERROR;
    if (session && currentFamilyId) return STORAGE_MODE.CLOUD;
    if (session) return STORAGE_MODE.LINKING;
    return STORAGE_MODE.LOCAL;
};

export const createLocalRepository = (storageProvider = getStorage) => {
    const storage = () => (
        typeof storageProvider === 'function' ? storageProvider() : storageProvider
    );

    const getItem = (key) => storage()?.getItem(key) ?? null;
    const setItem = (key, value) => storage()?.setItem(key, value);
    const removeItem = (key) => storage()?.removeItem(key);

    return {
        getItem,
        setItem,
        removeItem,
        loadJson(key, fallback = null) {
            try {
                const raw = getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch {
                return fallback;
            }
        },
        saveJson(key, value) {
            setItem(key, JSON.stringify(value));
        },
        removeKeys(keys) {
            keys.forEach(removeItem);
        },
        loadPendingMutations() {
            const parsed = this.loadJson(LOCAL_STORAGE_KEYS.PENDING_MUTATIONS, []);
            return Array.isArray(parsed) ? parsed : [];
        },
        savePendingMutations(mutations) {
            const safeMutations = Array.isArray(mutations) ? mutations : [];
            if (safeMutations.length === 0) {
                removeItem(LOCAL_STORAGE_KEYS.PENDING_MUTATIONS);
                return;
            }
            this.saveJson(LOCAL_STORAGE_KEYS.PENDING_MUTATIONS, safeMutations);
        },
        createGuestSyncBackupKey(now = Date.now()) {
            return `${LOCAL_STORAGE_KEYS.GUEST_SYNC_BACKUP_PREFIX}_${now}`;
        }
    };
};

export const createSupabaseRepository = ({ client, toSafeString = String }) => {
    const withoutLocalId = (row) => {
        const nextRow = { ...row };
        delete nextRow.local_id;
        return nextRow;
    };

    return {
        scopeFamilyQuery(query, familyId) {
            if (!familyId) throw new Error('가족 공유 연결이 필요합니다.');
            return query.eq('family_id', familyId);
        },
        isMissingFamilyChildrenError(error) {
            return (
                ['PGRST205', '42P01', '42703'].includes(toSafeString(error?.code)) ||
                toSafeString(error?.message).includes('family_children')
            );
        },
        async upsertFamilyChildren(rows) {
            if (!client || rows.length === 0) return { ok: true, skipped: !client };

            const { error } = await client
                .from('family_children')
                .upsert(rows, { onConflict: 'family_id,child_id' });

            if (error) return { ok: false, error };
            return { ok: true };
        },
        async insertWithLocalIdFallback(table, rows, { select = false } = {}) {
            const safeRows = Array.isArray(rows) ? rows : [rows];
            const runInsert = (nextRows) => {
                const query = client.from(table).insert(nextRows);
                return select ? query.select() : query;
            };

            const result = await runInsert(safeRows);
            if (!result.error || !safeRows.some(row => Object.prototype.hasOwnProperty.call(row, 'local_id'))) {
                return result;
            }

            if (toSafeString(result.error.code) !== '42703' && !toSafeString(result.error.message).includes('local_id')) {
                return result;
            }

            return runInsert(safeRows.map(withoutLocalId));
        }
    };
};
