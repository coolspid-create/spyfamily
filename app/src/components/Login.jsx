import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Copy, Fingerprint, Key, Lock, LogOut, ShieldAlert, UserPlus, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DATA_DELETE_URL, PRIVACY_POLICY_URL, openExternalPolicyPage } from '../lib/policyLinks';
import { NativeSafeConfirmDialog, NativeSafeTextDialog } from './NativeSafeControls';

export default function Login({ onClose }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [familyName, setFamilyName] = useState('우리 가족');
    const [inviteCode, setInviteCode] = useState('');
    const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
    const [deleteTextOpen, setDeleteTextOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

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

    const handleAuth = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setStatusMsg('');
        try {
            if (isSignUp) {
                await signUp(email, password);
                alert("가입이 완료되었습니다. 로그인을 진행해 주십시오.");
                setIsSignUp(false);
            } else {
                await signIn(email, password);
                onClose?.();
            }
        } catch (error) {
            setErrorMsg(isSignUp ? `가입 실패: ${error.message}` : `로그인 실패: ${error.message}`);
        }
    };

    const handleCreateFamily = async (event) => {
        event.preventDefault();
        setErrorMsg('');
        setStatusMsg('');
        const familyId = await createFamily(familyName.trim() || '우리 가족');
        if (familyId) {
            setStatusMsg('가족 그룹이 생성되었습니다. 초대 코드를 다른 보호자에게 공유할 수 있어요.');
        }
    };

    const handleJoinFamily = async (event) => {
        event.preventDefault();
        setErrorMsg('');
        setStatusMsg('');
        const joined = await joinFamily(inviteCode);
        if (joined) {
            setStatusMsg('가족 그룹에 합류했습니다.');
            setInviteCode('');
        }
    };

    const handleCopyInviteCode = async () => {
        if (!familyInviteCode) return;
        await navigator.clipboard?.writeText(familyInviteCode);
        setStatusMsg('초대 코드를 복사했습니다.');
    };

    const handleSignOut = async () => {
        await signOut();
        onClose?.();
    };

    const openDeleteWarning = () => {
        setErrorMsg('');
        setStatusMsg('');
        setDeleteConfirmText('');
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
        const result = await deleteAccount();
        if (result?.ok) {
            setDeleteTextOpen(false);
            setDeleteConfirmText('');
            alert('회원 탈퇴 및 계정 데이터 파기가 완료되었습니다.');
            onClose?.();
            return;
        }

        setErrorMsg(`탈퇴 처리 중 오류가 발생했습니다: ${result?.error || '다시 시도해 주세요.'}`);
    };

    if (session) {
        return (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-navy/95 p-4"
                >
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35 }}
                        className="relative w-full max-w-sm border-4 border-navy bg-background p-6 shadow-2xl"
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-navy transition-colors hover:bg-navy/20"
                            title="닫기"
                        >
                            <X size={18} />
                        </button>

                    <div className="mb-6 flex flex-col items-center pt-4 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-navy shadow-inner ring-4 ring-navy/10">
                            <Users size={32} className="text-white" />
                        </div>
                        <h1 className="text-center font-sans text-2xl font-black tracking-tighter text-navy">
                            가족 공유 설정
                        </h1>
                        <p className="mt-2 w-full border-b pb-3 text-[11px] font-bold text-navy/50">
                            일정과 다이어리를 같은 가족 안에서만 안전하게 공유합니다.
                        </p>
                    </div>

                    {currentFamilyId ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-navy/10 bg-white p-4">
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

                            <div className="rounded-2xl border border-navy/10 bg-white p-4">
                                <p className="mb-2 text-[12px] font-black text-navy/55">구성원</p>
                                <div className="space-y-1.5">
                                    {familyMembers.map((member) => (
                                        <div key={member.user_id} className="flex items-center justify-between rounded-xl bg-navy/5 px-3 py-2 text-[12px] font-bold text-navy">
                                            <span>{member.display_name || '보호자'}</span>
                                            <span className="text-[10px] uppercase text-navy/45">{member.role}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {statusMsg && (
                                <p className="rounded-xl bg-emerald-50 p-2 text-center text-[12px] font-bold text-emerald-700">
                                    {statusMsg}
                                </p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={leaveFamily}
                                    disabled={isFamilyLoading}
                                    className="flex-1 rounded-xl border border-accent-red/25 bg-accent-red/5 py-3 text-[13px] font-black text-accent-red disabled:opacity-60"
                                >
                                    가족 탈퇴
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSignOut}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy py-3 text-[13px] font-black text-white"
                                >
                                    <LogOut size={15} /> 로그아웃
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <form onSubmit={handleCreateFamily} className="rounded-2xl border border-navy/10 bg-white p-4">
                                <label className="mb-2 block text-[12px] font-black text-navy/60">
                                    새 가족 그룹 만들기
                                </label>
                                <input
                                    type="text"
                                    value={familyName}
                                    onChange={(event) => setFamilyName(event.target.value)}
                                    className="w-full rounded-xl border-2 border-navy/15 bg-white p-3 text-[14px] font-bold text-navy outline-none focus:border-navy"
                                    placeholder="우리 가족"
                                />
                                <button
                                    type="submit"
                                    disabled={isFamilyLoading}
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 text-[13px] font-black text-white disabled:opacity-60"
                                >
                                    <Users size={16} /> 가족 그룹 생성
                                </button>
                            </form>

                            <form onSubmit={handleJoinFamily} className="rounded-2xl border border-navy/10 bg-white p-4">
                                <label className="mb-2 block text-[12px] font-black text-navy/60">
                                    초대 코드로 합류
                                </label>
                                <input
                                    type="text"
                                    value={inviteCode}
                                    onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                                    className="w-full rounded-xl border-2 border-navy/15 bg-white p-3 text-[14px] font-black tracking-wide text-navy outline-none focus:border-navy"
                                    placeholder="FA-1234-5678"
                                />
                                <button
                                    type="submit"
                                    disabled={isFamilyLoading || !inviteCode.trim()}
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-red py-3 text-[13px] font-black text-white disabled:opacity-60"
                                >
                                    <UserPlus size={16} /> 가족 합류
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
                        </div>
                    )}
                        <button
                            type="button"
                            onClick={openDeleteWarning}
                            disabled={isLoading || isFamilyLoading}
                            className="mt-5 w-full text-center text-[11px] font-bold text-navy/40 underline underline-offset-2 transition-colors hover:text-accent-red disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            회원 탈퇴 (계정 및 모든 데이터 영구 삭제)
                        </button>
                    </motion.div>
                </motion.div>

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
                    message="탈퇴를 원하시면 아래 빈칸에 '탈퇴'라고 입력해 주세요."
                    value={deleteConfirmText}
                    onChange={setDeleteConfirmText}
                    placeholder="탈퇴"
                    maxLength={10}
                    confirmLabel={isLoading ? '처리 중...' : '영구 삭제'}
                    cancelLabel="취소"
                    destructive
                    confirmDisabled={deleteConfirmText.trim() !== '탈퇴' || isLoading}
                    onConfirm={handleDeleteAccount}
                    onCancel={() => {
                        setDeleteTextOpen(false);
                        setDeleteConfirmText('');
                    }}
                />
            </>
        );
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
                className="relative z-[121] w-full max-w-sm overflow-hidden rounded-[26px] border border-white/80 bg-[#fffef8] p-5 shadow-[0_18px_50px_rgba(26,35,126,0.20)]"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-navy/5 text-navy/45 transition-all hover:bg-navy/10 hover:text-navy active:scale-95"
                    title="닫기"
                >
                    <X size={16} />
                </button>

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
                                onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
                                className={`rounded-xl py-2 text-[12px] font-black transition-all ${!isSignUp ? 'bg-white text-navy shadow-sm' : 'text-navy/45'}`}
                            >
                                로그인
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
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

                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="rounded-xl border border-accent-red/10 bg-accent-red/5 p-2 text-center text-[11px] font-bold text-accent-red"
                                >
                                    {errorMsg}
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
                        </form>
                    </motion.div>
                </AnimatePresence>

                <div className="mt-5 border-t border-navy/6 pt-3 text-center">
                    <div className="flex items-center justify-center gap-3 text-[9px] font-bold">
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
            </motion.div>
        </div>
    );
}
