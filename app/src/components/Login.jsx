import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Fingerprint, Lock, ShieldAlert, Key } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const signIn = useStore(state => state.signIn);
    const signUp = useStore(state => state.signUp);
    const isLoading = useStore(state => state.isLoading);

    const handleAuth = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        try {
            if (isSignUp) {
                await signUp(email, password);
                alert("가입이 완료되었습니다. 로그인을 진행해 주십시오.");
                setIsSignUp(false);
            } else {
                await signIn(email, password);
            }
        } catch (error) {
            setErrorMsg(isSignUp ? `가입 실패: ${error.message}` : `로그인 실패: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-navy flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background patterns */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="absolute top-10 left-10 text-white/5 font-mono text-9xl font-black">FAMILY</div>
            <div className="absolute bottom-10 right-10 text-white/5 font-mono text-9xl font-black">BOARD</div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-sm bg-background p-6 border-4 border-navy shadow-2xl relative"
            >
                {/* Top-secret stamp */}
                <div className="absolute -top-6 -right-6 border-4 border-accent-red text-accent-red font-stencil text-xl p-2 rotate-12 bg-white ring-4 ring-white shadow-lg pointer-events-none stamp">
                    FAMILY BOARD
                </div>

                <div className="flex flex-col items-center mb-8 pt-4">
                    <div className="w-16 h-16 bg-navy rounded-full flex items-center justify-center mb-4 shadow-inner ring-4 ring-navy/10">
                        <Fingerprint size={32} className="text-white" />
                    </div>
                    <h1 className="font-sans text-3xl font-black tracking-tighter text-navy text-center flex items-center justify-center">
                        <span className="tracking-tight">가족</span>
                        <span className="text-accent-red text-xl mx-2 font-bold rotate-12 cursor-default">×</span>
                        <span className="tracking-tight">일정보드</span>
                    </h1>
                    <p className="text-[10px] font-bold tracking-widest text-navy/60 mt-2 uppercase text-center w-full border-b pb-2">
                        우리 가족 일정 / 자금 관리 보드
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1">
                            <ShieldAlert size={14} className="text-accent-red" /> 이메일 (Email)
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white border-2 border-navy/30 rounded p-3 text-navy font-bold focus:border-navy focus:outline-none transition-colors shadow-sm"
                            placeholder="family@home.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1">
                            <Key size={14} className="text-accent-red" /> 비밀번호 (Password)
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white border-2 border-navy/30 rounded p-3 text-navy font-bold font-mono focus:border-navy focus:outline-none transition-colors shadow-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    {errorMsg && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-accent-red text-xs font-bold text-center bg-accent-red/10 p-2 rounded">
                            {errorMsg}
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-navy text-white font-bold tracking-widest py-4 mt-4 rounded border-b-4 border-black active:border-b-0 active:translate-y-1 transition-all flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-navy/90'}`}
                    >
                        {isLoading ? (isSignUp ? '가입 중...' : '로그인 중...') : <><Lock size={18} /> {isSignUp ? '회원가입' : '로그인'}</>}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
                        className="text-xs text-navy font-bold underline hover:text-accent-red"
                    >
                        {isSignUp ? '이미 계정이 있으신가요? (로그인)' : '새로운 가족 계정을 만드시겠습니까? (회원가입)'}
                    </button>
                </div>

                <div className="text-center mt-6">
                    <p className="text-[9px] text-navy/40 font-bold uppercase">Family members only.</p>
                    <p className="text-[9px] text-navy/40 font-bold uppercase mt-1">Keep our family schedules safe.</p>
                </div>
            </motion.div>
        </div>
    );
}
