import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { CheckCircle2, ClipboardPaste, Copy, Key, Lock, LogOut, Mail, ShieldAlert, UserPlus, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CONTENT_POLICY_URL, DATA_DELETE_URL, PRIVACY_POLICY_URL, openExternalPolicyPage } from '../lib/policyLinks';
import { readClipboardText, writeClipboardText } from '../lib/clipboard';
import { NativeSafeConfirmDialog, NativeSafeTextDialog } from './NativeSafeControls';

const getAuthErrorMessage = (error, mode) => {
    const message = error?.message || '다시 시도해 주세요.';
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('email not confirmed')) {
        return '이메일 확인이 아직 완료되지 않았습니다. 현재 Supabase 이메일 확인 설정이 켜져 있습니다.';
    }
    if (lowerMessage.includes('invalid login credentials')) {
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
    if (lowerMessage.includes('user already registered') || lowerMessage.includes('already registered')) {
        return '이미 가입된 이메일입니다. 로그인으로 진행해 주세요.';
    }

    return `${mode} 실패: ${message}`;
};

const UI_ACTION_TIMEOUT_MS = 15000;
const FAMILY_UI_ACTION_TIMEOUT_MS = 45000;
const ACCOUNT_DELETE_TIMEOUT_MS = 60000;

const withUiTimeout = (promise, message, timeoutMs = UI_ACTION_TIMEOUT_MS) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        window.clearTimeout(timeoutId);
    });
};

export default function Login({ onClose }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [familyName, setFamilyName] = useState('우리 가족');
    const [inviteCode, setInviteCode] = useState('');
    const [cloudSyncPromptOpen, setCloudSyncPromptOpen] = useState(false);
    const [familyLeaveConfirmOpen, setFamilyLeaveConfirmOpen] = useState(false);
    const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
    const [deleteTextOpen, setDeleteTextOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [accountDeleteComplete, setAccountDeleteComplete] = useState(false);
    const [familyAction, setFamilyAction] = useState(null);
    const [cloudSyncAction, setCloudSyncAction] = useState(null);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [isRetryingPending, setIsRetryingPending] = useState(false);
    const inviteInputRef = useRef(null);

    const signIn = useStore(state => state.signIn);
    const signUp = useStore(state => state.signUp);
    const signOut = useStore(state => state.signOut);
    const deleteAccount = useStore(state => state.deleteAccount);
    const isLoading = useStore(state => state.isLoading);
    const session = useStore(state => state.session);
    const currentFamilyId = useStore(state => state.currentFamilyId);
    const familyMembers = useStore(state => state.familyMembers);
    const familyInviteCode = useStore(state => state.familyInviteCode);
    const isFamilyLoading = useStore(state => state.isFamilyLoading);
    const createFamily = useStore(state => state.createFamily);
    const joinFamily = useStore(state => state.joinFamily);
    const leaveFamily = useStore(state => state.leaveFamily);
    const shouldPromptLocalCloudSync = useStore(state => state.shouldPromptLocalCloudSync);
    const markLocalCloudSyncSkipped = useStore(state => state.markLocalCloudSyncSkipped);
    const syncGuestDataToCloud = useStore(state => state.syncGuestDataToCloud);
    const retryPendingMutations = useStore(state => state.retryPendingMutations);
    const fetchDataFromDB = useStore(state => state.fetchDataFromDB);
    const fetchDiariesFromDB = useStore(state => state.fetchDiariesFromDB);
    const pendingMutations = useStore(state => state.pendingMutations);
    const syncStatus = useStore(state => state.syncStatus);
    const isCreatingFamily = familyAction === 'create';
    const isJoiningFamily = familyAction === 'join';
    const isLeavingFamily = familyAction === 'leave';
    const isCloudSyncing = cloudSyncAction === 'sync';
    const isSkippingCloudSync = cloudSyncAction === 'skip';
    const currentUserId = session?.user?.id || '';
    const currentUserEmail = session?.user?.email || '이메일 확인 중';
    const currentMember = familyMembers.find(member => member.user_id === currentUserId);
    const currentRoleLabel = currentMember?.role ? currentMember.role.toUpperCase() : null;

    const openCloudSyncPromptIfNeeded = async () => {
        try {
            const result = await withUiTimeout(
                shouldPromptLocalCloudSync(),
                '로컬 데이터 동기화 여부를 확인하는 중 응답이 지연되었습니다.',
                FAMILY_UI_ACTION_TIMEOUT_MS
            );
            if (result?.prompt) {
                setCloudSyncPromptOpen(true);
                return true;
            }
        } catch (error) {
            console.warn('Local cloud sync prompt check failed:', error);
        }
        return false;
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setStatusMsg('');
        try {
            if (isSignUp) {
                if (password.length < 6) {
                    setErrorMsg('비밀번호는 최소 6자 이상으로 입력해 주세요.');
                    return;
                }
                if (password !== passwordConfirm) {
                    setErrorMsg('비밀번호와 비밀번호 확인이 서로 다릅니다.');
                    return;
                }

                const data = await signUp(email.trim(), password);
                setPassword('');
                setPasswordConfirm('');

                if (data?.session) {
                    setStatusMsg('가입이 완료되었습니다. 가족 공유 설정을 바로 시작할 수 있어요.');
                } else {
                    setStatusMsg('가입 신청이 접수되었습니다. 현재 Supabase 이메일 확인 설정이 켜져 있어 확인 메일이 발송될 수 있습니다.');
                    setIsSignUp(false);
                }
            } else {
                await signIn(email.trim(), password);
            }
        } catch (error) {
            setErrorMsg(getAuthErrorMessage(error, isSignUp ? '가입' : '로그인'));
        }
    };

    const handleCreateFamily = async (event) => {
        event.preventDefault();
        setErrorMsg('');
        setStatusMsg('');
        setFamilyAction('create');
        try {
            const familyId = await withUiTimeout(
                createFamily(familyName.trim() || '우리 가족'),
                '가족 그룹 생성 응답이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
                FAMILY_UI_ACTION_TIMEOUT_MS
            );
            if (familyId) {
                const promptOpened = await openCloudSyncPromptIfNeeded();
                if (!promptOpened) {
                    await withUiTimeout(fetchDataFromDB(), '가족 데이터를 불러오는 중 응답이 지연되었습니다.', FAMILY_UI_ACTION_TIMEOUT_MS);
                    await withUiTimeout(fetchDiariesFromDB(), '다이어리 데이터를 불러오는 중 응답이 지연되었습니다.', FAMILY_UI_ACTION_TIMEOUT_MS);
                    setStatusMsg('가족 그룹이 생성되었습니다. 초대 코드를 다른 보호자에게 공유할 수 있어요.');
                }
            } else {
                const latestSyncStatus = useStore.getState().syncStatus;
                setErrorMsg(`가족 생성 실패: ${latestSyncStatus?.error || '다시 시도해 주세요.'}`);
            }
        } catch (error) {
            setErrorMsg(`가족 생성 실패: ${error.message || '다시 시도해 주세요.'}`);
        } finally {
            setFamilyAction(null);
        }
    };

    const handleJoinFamily = async (event) => {
        event.preventDefault();
        setErrorMsg('');
        setStatusMsg('');
        setFamilyAction('join');
        try {
            const joined = await withUiTimeout(
                joinFamily(inviteCode),
                '가족 합류 응답이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
                FAMILY_UI_ACTION_TIMEOUT_MS
            );
            if (joined) {
                setInviteCode('');
                const promptOpened = await openCloudSyncPromptIfNeeded();
                if (!promptOpened) {
                    await withUiTimeout(fetchDataFromDB(), '가족 데이터를 불러오는 중 응답이 지연되었습니다.', FAMILY_UI_ACTION_TIMEOUT_MS);
                    await withUiTimeout(fetchDiariesFromDB(), '다이어리 데이터를 불러오는 중 응답이 지연되었습니다.', FAMILY_UI_ACTION_TIMEOUT_MS);
                    setStatusMsg('가족 그룹에 합류했습니다.');
                }
            } else {
                const latestSyncStatus = useStore.getState().syncStatus;
                setErrorMsg(`가족 합류 실패: ${latestSyncStatus?.error || '초대 코드를 확인해 주세요.'}`);
            }
        } catch (error) {
            setErrorMsg(`가족 합류 실패: ${error.message || '다시 시도해 주세요.'}`);
        } finally {
            setFamilyAction(null);
        }
    };

    const handleConfirmCloudSync = async () => {
        if (cloudSyncAction) return;
        setErrorMsg('');
        setCloudSyncAction('sync');
        try {
            const result = await syncGuestDataToCloud();
            if (!result?.ok) {
                if (result?.blocked) {
                    await fetchDataFromDB();
                    await fetchDiariesFromDB();
                    setCloudSyncPromptOpen(false);
                    setStatusMsg('가족 공유에 이미 데이터가 있어 로컬 데이터는 백업으로 남기고 클라우드 데이터를 사용합니다.');
                    return;
                }
                setErrorMsg(`동기화 실패: ${result?.error || '다시 시도해 주세요.'}`);
                return;
            }

            await fetchDiariesFromDB();
            setCloudSyncPromptOpen(false);
            setStatusMsg('이 기기의 로컬 데이터를 가족 공유 계정으로 동기화했습니다.');
        } finally {
            setCloudSyncAction(null);
        }
    };

    const handleSkipCloudSync = async () => {
        if (cloudSyncAction) return;
        setCloudSyncAction('skip');
        markLocalCloudSyncSkipped();
        try {
            await fetchDataFromDB();
            await fetchDiariesFromDB();
            setCloudSyncPromptOpen(false);
            setStatusMsg('로컬 데이터는 이 기기에 백업으로 남겨두고 클라우드 데이터를 사용합니다.');
        } finally {
            setCloudSyncAction(null);
        }
    };

    const handleRetryPendingMutations = async () => {
        if (isRetryingPending) return;
        setErrorMsg('');
        setStatusMsg('');
        setIsRetryingPending(true);
        try {
            const result = await retryPendingMutations();
            if (!result?.ok) {
                setErrorMsg(`다시 저장하지 못한 항목이 있습니다: ${result?.error || '네트워크 상태를 확인해 주세요.'}`);
                return;
            }
            await fetchDataFromDB();
            await fetchDiariesFromDB();
            setStatusMsg('클라우드 재저장 대기 항목을 다시 저장했습니다.');
        } finally {
            setIsRetryingPending(false);
        }
    };

    const handleCopyInviteCode = async () => {
        if (!familyInviteCode) return;
        setErrorMsg('');
        try {
            await writeClipboardText(familyInviteCode, '가족 초대 코드');
            setStatusMsg('초대 코드를 복사했습니다.');
        } catch (error) {
            setErrorMsg(error.message || '클립보드 복사 권한을 사용할 수 없습니다.');
        }
    };

    const handlePasteInviteCode = async () => {
        setErrorMsg('');
        setStatusMsg('');
        try {
            const text = await readClipboardText();
            const nextCode = (text || '').trim().toUpperCase();
            if (!nextCode) {
                setErrorMsg('붙여넣을 초대 코드가 없습니다.');
                return;
            }
            setInviteCode(nextCode);
            setStatusMsg('초대 코드를 붙여넣었습니다.');
        } catch {
            inviteInputRef.current?.focus();
            setErrorMsg('클립보드 읽기 권한이 없어 자동 붙여넣기는 제한됩니다. 입력창에 코드를 직접 입력해 주세요.');
        }
    };

    const handleSignOut = async () => {
        if (isSigningOut) return;
        setErrorMsg('');
        setStatusMsg('');
        setIsSigningOut(true);
        let shouldResetSigningOut = true;
        try {
            const result = await signOut();
            if (result?.ok === false) {
                setErrorMsg(`로그아웃 처리 중 오류가 발생했습니다: ${result?.error || '다시 시도해 주세요.'}`);
                return;
            }
            shouldResetSigningOut = false;
            setIsSigningOut(false);
            onClose?.();
        } finally {
            if (shouldResetSigningOut) setIsSigningOut(false);
        }
    };

    const handleConfirmLeaveFamily = async () => {
        setErrorMsg('');
        setStatusMsg('');
        setFamilyAction('leave');
        try {
            const left = await leaveFamily();
            setFamilyLeaveConfirmOpen(false);
            if (!left) {
                const latestSyncStatus = useStore.getState().syncStatus;
                setErrorMsg(`가족 탈퇴 실패: ${latestSyncStatus?.error || '다시 시도해 주세요.'}`);
                return;
            }
            setStatusMsg('가족 그룹에서 나왔습니다. 로컬 저장 모드로 전환되었습니다.');
        } finally {
            setFamilyAction(null);
        }
    };

    const openDeleteWarning = () => {
        setErrorMsg('');
        setStatusMsg('');
        setDeleteConfirmText('');
        setAccountDeleteComplete(false);
        setDeleteWarningOpen(true);
    };

    const handleDeleteWarningConfirm = () => {
        setDeleteWarningOpen(false);
        setDeleteTextOpen(true);
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText.trim() !== '탈퇴') {
            setErrorMsg("회원 탈퇴를 진행하려면 '탈퇴'를 정확히 입력해 주세요.");
            return;
        }

        setErrorMsg('');
        setIsDeletingAccount(true);
        try {
            const result = await withUiTimeout(
                deleteAccount(),
                '계정 삭제가 1분 이상 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
                ACCOUNT_DELETE_TIMEOUT_MS
            );
            if (result?.ok) {
                setDeleteTextOpen(false);
                setDeleteConfirmText('');
                setStatusMsg('회원 탈퇴 및 계정 데이터 파기가 완료되었습니다.');
                setAccountDeleteComplete(true);
                return;
            }

            setErrorMsg(`탈퇴 처리 중 오류가 발생했습니다: ${result?.error || '다시 시도해 주세요.'}`);
        } catch (error) {
            setErrorMsg(`탈퇴 처리 중 오류가 발생했습니다: ${error.message || '다시 시도해 주세요.'}`);
        } finally {
            setIsDeletingAccount(false);
        }
    };

    if (session) {
        return (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-navy/95 px-3 py-3 no-scrollbar [&::-webkit-scrollbar]:hidden"
                >
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35 }}
                        className="relative z-[121] max-h-[calc(100dvh-24px)] w-full max-w-sm overflow-y-auto border-4 border-navy bg-background p-4 shadow-2xl overscroll-contain no-scrollbar sm:p-5 [&::-webkit-scrollbar]:hidden"
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-navy shadow-sm transition-colors hover:bg-navy/20"
                            title="닫기"
                            aria-label="가족 공유 설정 닫기"
                        >
                            <X size={18} />
                        </button>

                    <div className="mb-3 flex flex-col items-center pt-1 text-center">
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-navy shadow-inner ring-4 ring-navy/10">
                            <Users size={26} className="text-white" />
                        </div>
                        <h1 className="text-center font-sans text-[23px] font-black tracking-tighter text-navy">
                            가족 공유 설정
                        </h1>
                        <p className="mt-1.5 w-full border-b pb-2 text-[11px] font-bold text-navy/50">
                            일정과 다이어리를 같은 가족 안에서만 안전하게 공유합니다.
                        </p>
                    </div>

                    <div className="mb-3 rounded-2xl border border-navy/10 bg-white p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-black text-navy/55">
                            <Mail size={14} className="text-navy/40" />
                            현재 계정
                        </p>
                        <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-navy/5 px-3 py-2">
                            <span className="min-w-0 flex-1 truncate text-[12px] font-black text-navy">
                                {currentUserEmail}
                            </span>
                            {currentRoleLabel && (
                                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-navy/55">
                                    {currentRoleLabel}
                                </span>
                            )}
                        </div>
                    </div>

                    {currentFamilyId ? (
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-navy/10 bg-white p-3">
                                <p className="text-[12px] font-black text-navy/55">가족 초대 코드</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <code className="min-w-0 flex-1 rounded-xl bg-navy/5 px-3 py-2 text-center text-[15px] font-black tracking-wide text-navy">
                                        {familyInviteCode || '발급 대기'}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={handleCopyInviteCode}
                                        disabled={!familyInviteCode}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white disabled:opacity-40"
                                        title="초대 코드 복사"
                                    >
                                        <Copy size={17} />
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-navy/10 bg-white p-3">
                                <p className="mb-2 text-[12px] font-black text-navy/55">구성원</p>
                                <div className="space-y-1.5">
                                    {familyMembers.map((member) => {
                                        const isCurrentMember = member.user_id === currentUserId;

                                        return (
                                        <div key={member.user_id} className={`flex items-center justify-between rounded-xl px-3 py-2 text-[12px] font-bold text-navy ${isCurrentMember ? 'bg-navy/10' : 'bg-navy/5'}`}>
                                            <span className="flex min-w-0 items-center gap-1.5">
                                                {isCurrentMember && <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />}
                                                <span className="truncate">{member.display_name || '보호자'}</span>
                                            </span>
                                            <span className="shrink-0 text-[10px] uppercase text-navy/45">{member.role}</span>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {pendingMutations.length > 0 && (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                    <p className="text-[12px] font-black text-amber-700">
                                        클라우드 재저장 대기 {pendingMutations.length}개
                                    </p>
                                    <p className="mt-1 text-[10px] font-bold leading-relaxed text-amber-700/70">
                                        사진 업로드나 서버 저장이 끝나지 않은 변경사항을 이 기기에 보관 중입니다. 연결이 안정적일 때 다시 저장해 주세요.
                                    </p>
                                    {syncStatus?.error && (
                                        <p className="mt-2 truncate rounded-lg bg-white/70 px-2 py-1 text-[9px] font-bold text-amber-700/70">
                                            {syncStatus.error}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleRetryPendingMutations}
                                        disabled={isLoading || isFamilyLoading || isRetryingPending}
                                        aria-busy={isRetryingPending}
                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-2.5 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isRetryingPending && (
                                            <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/45 border-t-white" />
                                        )}
                                        {isRetryingPending ? '다시 저장 중...' : '클라우드에 다시 저장'}
                                    </button>
                                </div>
                            )}

                            {statusMsg && (
                                <p className="rounded-xl bg-emerald-50 p-2 text-center text-[12px] font-bold text-emerald-700">
                                    {statusMsg}
                                </p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFamilyLeaveConfirmOpen(true)}
                                    disabled={isLeavingFamily || isSigningOut}
                                    className="flex-1 rounded-xl border border-accent-red/25 bg-accent-red/5 py-2.5 text-[13px] font-black text-accent-red disabled:opacity-60"
                                >
                                    가족 탈퇴
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSignOut}
                                    disabled={isSigningOut}
                                    aria-busy={isSigningOut}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy py-2.5 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSigningOut ? (
                                        <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/45 border-t-white" />
                                    ) : (
                                        <LogOut size={15} />
                                    )}
                                    {isSigningOut ? '로그아웃 중...' : '로그아웃'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <form onSubmit={handleCreateFamily} className="rounded-2xl border border-navy/10 bg-white p-3">
                                <label className="mb-1.5 block text-[12px] font-black text-navy/60">
                                    새 가족 그룹 만들기
                                </label>
                                <input
                                    type="text"
                                    value={familyName}
                                    onChange={(event) => setFamilyName(event.target.value)}
                                    spellCheck={false}
                                    className="w-full rounded-xl border border-navy/12 bg-white px-3 py-2.5 text-[14px] font-bold text-navy outline-none transition-all focus:border-navy/20 focus:ring-0"
                                    placeholder="우리 가족"
                                />
                                <button
                                    type="submit"
                                    disabled={isCreatingFamily}
                                    className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-2.5 text-[13px] font-black text-white disabled:opacity-60"
                                >
                                    <Users size={16} /> {isCreatingFamily ? '생성 중...' : '가족 그룹 생성'}
                                </button>
                            </form>

                            <form onSubmit={handleJoinFamily} className="rounded-2xl border border-navy/10 bg-white p-3">
                                <label className="mb-1.5 block text-[12px] font-black text-navy/60">
                                    초대 코드로 합류
                                </label>
                                <div className="relative">
                                    <input
                                        ref={inviteInputRef}
                                        type="text"
                                        value={inviteCode}
                                        onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                                        spellCheck={false}
                                        autoCapitalize="characters"
                                        autoCorrect="off"
                                        className="w-full rounded-xl border border-navy/12 bg-white py-2.5 pl-3 pr-12 text-[14px] font-black tracking-wide text-navy outline-none transition-all focus:border-navy/20 focus:ring-0"
                                        placeholder="AF0201"
                                    />
                                    <button
                                        type="button"
                                        onClick={handlePasteInviteCode}
                                        className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-navy text-white transition-transform active:scale-95"
                                        title="초대 코드 붙여넣기"
                                        aria-label="초대 코드 붙여넣기"
                                    >
                                        <ClipboardPaste size={16} />
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isJoiningFamily || !inviteCode.trim()}
                                    className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-red py-2.5 text-[13px] font-black text-white disabled:opacity-60"
                                >
                                    <UserPlus size={16} /> {isJoiningFamily ? '합류 중...' : '가족 합류'}
                                </button>
                            </form>

                            {statusMsg && (
                                <p className="rounded-xl bg-emerald-50 p-2 text-center text-[12px] font-bold text-emerald-700">
                                    {statusMsg}
                                </p>
                            )}
                            {errorMsg && (
                                <p className="rounded-xl bg-accent-red/10 p-2 text-center text-[12px] font-bold text-accent-red">
                                    {errorMsg}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={handleSignOut}
                                disabled={isSigningOut}
                                aria-busy={isSigningOut}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy/10 bg-navy/5 py-2.5 text-[13px] font-black text-navy transition-colors hover:bg-navy/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSigningOut ? (
                                    <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-navy/25 border-t-navy" />
                                ) : (
                                    <LogOut size={15} />
                                )}
                                {isSigningOut ? '로그아웃 중...' : '로그아웃'}
                            </button>
                        </div>
                    )}
                        <button
                            type="button"
                            onClick={openDeleteWarning}
                            className="mt-3 w-full text-center text-[11px] font-bold text-navy/40 underline underline-offset-2 transition-colors hover:text-accent-red"
                        >
                            회원 탈퇴 (계정 및 모든 데이터 영구 삭제)
                        </button>
                    </motion.div>
                </motion.div>

                <NativeSafeConfirmDialog
                    open={cloudSyncPromptOpen}
                    title="로컬 데이터 동기화"
                    message="가족 공유 공간이 비어 있어 이 기기의 일정, 결제, 할 일, 다이어리 기록을 올릴 수 있습니다. 동기화하지 않아도 로컬 데이터는 이 기기에 백업으로 남아 있습니다."
                    confirmLabel={isCloudSyncing ? '동기화 중...' : '동기화'}
                    cancelLabel={isSkippingCloudSync ? '불러오는 중...' : '나중에'}
                    isProcessing={Boolean(cloudSyncAction)}
                    processingMessage={isSkippingCloudSync ? '가족 공유 데이터를 불러오는 중입니다.' : '로컬 데이터를 가족 공유로 동기화 중입니다.'}
                    processingDetail="완료될 때까지 창을 닫지 말고 잠시만 기다려 주세요."
                    onConfirm={handleConfirmCloudSync}
                    onCancel={handleSkipCloudSync}
                />
                <NativeSafeConfirmDialog
                    open={familyLeaveConfirmOpen}
                    title="가족 탈퇴"
                    message="정말로 가족 그룹에서 나가시겠습니까? 공유된 클라우드 데이터에는 더 이상 접근할 수 없고, 이 기기는 로컬 저장 모드로 전환됩니다."
                    confirmLabel={isLeavingFamily ? '처리 중...' : '가족 탈퇴'}
                    cancelLabel="취소"
                    destructive
                    confirmDisabled={isLeavingFamily}
                    isProcessing={isLeavingFamily}
                    processingMessage="가족 그룹에서 나가는 중입니다."
                    processingDetail="완료되면 이 기기는 로컬 저장 모드로 전환됩니다."
                    onConfirm={handleConfirmLeaveFamily}
                    onCancel={() => setFamilyLeaveConfirmOpen(false)}
                />
                <NativeSafeConfirmDialog
                    open={deleteWarningOpen}
                    title="회원 탈퇴"
                    message="정말로 회원 탈퇴를 진행하시겠습니까? 탈퇴 시 클라우드 서버에 안전하게 보관 및 공유 중인 계정 이메일 정보와 회원님의 소중한 일정, 다이어리 기록 전체가 영구적으로 파기되며 다시 복구할 수 없습니다."
                    confirmLabel="계속"
                    cancelLabel="취소"
                    destructive
                    onConfirm={handleDeleteWarningConfirm}
                    onCancel={() => setDeleteWarningOpen(false)}
                />
                <NativeSafeTextDialog
                    open={deleteTextOpen}
                    title="최종 확인"
                    message="탈퇴를 원하시면 아래 빈칸에 '탈퇴'라고 입력해 주세요. 계정과 사진, 공유 데이터 정리에는 최대 30초까지 걸릴 수 있습니다."
                    errorMessage={errorMsg}
                    isProcessing={isDeletingAccount}
                    processingMessage="계정과 클라우드 데이터를 삭제 중입니다."
                    processingDetail="사진 파일과 가족 공유 데이터를 정리하는 중입니다. 최대 30초까지 걸릴 수 있으니 완료 메시지가 나올 때까지 잠시 기다려 주세요."
                    value={deleteConfirmText}
                    onChange={setDeleteConfirmText}
                    placeholder="탈퇴"
                    maxLength={10}
                    confirmLabel={isDeletingAccount ? '삭제 중...' : '영구 삭제'}
                    cancelLabel="취소"
                    destructive
                    confirmDisabled={deleteConfirmText.trim() !== '탈퇴' || isDeletingAccount}
                    cancelDisabled={isDeletingAccount}
                    inputDisabled={isDeletingAccount}
                    onConfirm={handleDeleteAccount}
                    onCancel={() => {
                        if (isDeletingAccount) return;
                        setDeleteTextOpen(false);
                        setDeleteConfirmText('');
                    }}
                />
            </>
        );
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-3 no-scrollbar [&::-webkit-scrollbar]:hidden">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-navy/45 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 12 }}
                transition={{ type: "spring", duration: 0.3, bounce: 0.12 }}
                className="relative z-[121] max-h-[calc(100dvh-24px)] w-full max-w-sm overflow-y-auto rounded-[26px] border border-white/80 bg-[#fffef8] p-5 shadow-[0_18px_50px_rgba(26,35,126,0.20)] overscroll-contain no-scrollbar [&::-webkit-scrollbar]:hidden"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-navy/5 text-navy/45 transition-all hover:bg-navy/10 hover:text-navy active:scale-95"
                    title="닫기"
                >
                    <X size={16} />
                </button>

                {accountDeleteComplete ? (
                    <div className="flex flex-col items-center px-1 py-8 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <ShieldAlert size={22} className="stroke-[2.5px]" />
                        </div>
                        <h2 className="text-[20px] font-black text-navy">회원 탈퇴 완료</h2>
                        <p className="mt-3 text-[13px] font-bold leading-relaxed text-navy/60">
                            계정 정보와 연결된 클라우드 데이터를 삭제했습니다.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-navy text-[14px] font-black text-white shadow-[0_10px_22px_rgba(26,35,126,0.16)] active:scale-[0.98]"
                        >
                            확인
                        </button>
                    </div>
                ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isSignUp ? 'signup' : 'signin'}
                        initial={{ opacity: 0, x: isSignUp ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isSignUp ? -10 : 10 }}
                        transition={{ duration: 0.16, ease: "easeInOut" }}
                    >
                        <div className="mb-5 flex flex-col items-center pt-3 text-center">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-navy/7 text-navy">
                                {isSignUp ? (
                                    <UserPlus size={20} className="stroke-[2.4px]" />
                                ) : (
                                    <Lock size={20} className="stroke-[2.4px]" />
                                )}
                            </div>
                            <h2 className="flex items-center justify-center font-serif text-[24px] font-black italic leading-none tracking-normal text-navy">
                                Family <span className="mx-1 font-sans text-[17px] font-black not-italic text-accent-red">×</span> Scheduler
                            </h2>
                            <p className="mt-2 text-center text-[12px] font-bold text-navy/45">
                                우리 가족의 소중한 일정 관리
                            </p>
                        </div>

                        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-navy/5 p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(false);
                                    setErrorMsg('');
                                    setStatusMsg('');
                                    setPasswordConfirm('');
                                }}
                                className={`rounded-xl py-2 text-[12px] font-black transition-all ${!isSignUp ? 'bg-white text-navy shadow-sm' : 'text-navy/45'}`}
                            >
                                로그인
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(true);
                                    setErrorMsg('');
                                    setStatusMsg('');
                                }}
                                className={`rounded-xl py-2 text-[12px] font-black transition-all ${isSignUp ? 'bg-white text-accent-red shadow-sm' : 'text-navy/45'}`}
                            >
                                회원가입
                            </button>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-4">
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-black text-navy/60">
                                    <ShieldAlert size={13} className="text-navy/45" /> 이메일
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-14 w-full rounded-2xl border border-navy/12 bg-white px-4 text-[15px] font-bold text-navy shadow-[inset_0_1px_0_rgba(26,35,126,0.03)] outline-none transition-all placeholder:text-navy/25 focus:border-navy/45 focus:ring-4 focus:ring-navy/5"
                                    placeholder="family@home.com"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-black text-navy/60">
                                    <Key size={13} className="text-navy/45" /> 비밀번호
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-14 w-full rounded-2xl border border-navy/12 bg-white px-4 text-[15px] font-bold text-navy shadow-[inset_0_1px_0_rgba(26,35,126,0.03)] outline-none transition-all placeholder:text-navy/25 focus:border-navy/45 focus:ring-4 focus:ring-navy/5"
                                    placeholder="••••••••"
                                />
                            </div>
                            {isSignUp && (
                                <div>
                                    <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-black text-navy/60">
                                        <Key size={13} className="text-navy/45" /> 비밀번호 확인
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordConfirm}
                                        onChange={(e) => setPasswordConfirm(e.target.value)}
                                        className="h-14 w-full rounded-2xl border border-navy/12 bg-white px-4 text-[15px] font-bold text-navy shadow-[inset_0_1px_0_rgba(26,35,126,0.03)] outline-none transition-all placeholder:text-navy/25 focus:border-navy/45 focus:ring-4 focus:ring-navy/5"
                                        placeholder="비밀번호를 한 번 더 입력"
                                    />
                                </div>
                            )}

                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="rounded-xl border border-accent-red/10 bg-accent-red/5 p-2 text-center text-[11px] font-bold text-accent-red"
                                >
                                    {errorMsg}
                                </motion.div>
                            )}
                            {statusMsg && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="rounded-xl border border-emerald-500/10 bg-emerald-50 p-2 text-center text-[11px] font-bold leading-relaxed text-emerald-700"
                                >
                                    {statusMsg}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`mt-2 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl text-[15px] font-black tracking-normal text-white shadow-[0_10px_22px_rgba(26,35,126,0.16)] transition-all duration-200 active:scale-[0.98] ${
                                    isSignUp 
                                        ? 'bg-accent-red hover:bg-accent-red/90' 
                                        : 'bg-navy hover:bg-navy/90'
                                } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? (
                                    isSignUp ? '가입 진행 중...' : '로그인 중...'
                                ) : (
                                    <>
                                        {isSignUp ? <UserPlus size={17} strokeWidth={2.5} /> : <Lock size={17} strokeWidth={2.5} />}
                                        {isSignUp ? '회원가입' : '로그인'}
                                    </>
                                )}
                            </button>
                            {isSignUp && (
                                <p className="mt-3 px-1 text-center text-[10px] font-bold leading-relaxed text-navy/42">
                                    회원가입을 진행하면 개인정보처리방침과 가족 공유 콘텐츠 정책에 동의한 것으로 간주됩니다.
                                </p>
                            )}
                        </form>
                    </motion.div>
                </AnimatePresence>
                )}

                {!accountDeleteComplete && (
                <div className="mt-5 border-t border-navy/6 pt-3 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9px] font-bold">
                        <a
                            href={PRIVACY_POLICY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => {
                                event.preventDefault();
                                openExternalPolicyPage(PRIVACY_POLICY_URL);
                            }}
                            className="text-navy/40 hover:text-accent-red transition-colors underline underline-offset-2"
                        >
                            개인정보처리방침
                        </a>
                        <span className="text-navy/20">|</span>
                        <a
                            href={CONTENT_POLICY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => {
                                event.preventDefault();
                                openExternalPolicyPage(CONTENT_POLICY_URL);
                            }}
                            className="text-navy/40 hover:text-accent-red transition-colors underline underline-offset-2"
                        >
                            콘텐츠 신고/정책
                        </a>
                        <span className="text-navy/20">|</span>
                        <a
                            href={DATA_DELETE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => {
                                event.preventDefault();
                                openExternalPolicyPage(DATA_DELETE_URL);
                            }}
                            className="text-navy/40 hover:text-accent-red transition-colors underline underline-offset-2"
                        >
                            계정 삭제 요청
                        </a>
                    </div>
                </div>
                )}
            </motion.div>
        </div>
    );
}
