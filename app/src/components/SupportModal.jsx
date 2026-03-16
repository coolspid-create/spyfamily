import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Coffee, Heart, Smartphone } from 'lucide-react';

const SupportModal = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);
    
    // 이 부분을 실제 계좌 정보로 수정하시면 됩니다!
    const accountInfo = {
        bank: '토스뱅크',
        number: '100248421943',
        name: '신동인'
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(accountInfo.number);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-3xl shadow-2xl z-[201] overflow-hidden border-2 border-navy/5"
                    >
                        {/* Header Image/Icon Section */}
                        <div className="bg-navy p-8 flex flex-col items-center relative overflow-hidden">
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/10 rounded-full -ml-16 -mb-16 blur-2xl" />
                            
                            <motion.div
                                animate={{ 
                                    y: [0, -10, 0],
                                    rotate: [0, 5, -5, 0]
                                }}
                                transition={{ 
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="w-20 h-20 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 relative z-10"
                            >
                                <Coffee size={42} className="text-navy" />
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -top-2 -right-2 w-8 h-8 bg-accent-red rounded-full flex items-center justify-center text-white shadow-md border-2 border-white"
                                >
                                    <Heart size={16} fill="currentColor" />
                                </motion.div>
                            </motion.div>
                            
                            <h2 className="mt-6 text-xl font-black text-white tracking-tight text-center">
                                후원해주셔서 감사합니다!
                            </h2>
                            <p className="mt-2 text-white/60 text-xs font-bold text-center leading-relaxed">
                                보내주신 소중한 마음은 더 나은<br />
                                앱 서비스를 위해 사용됩니다.
                            </p>
                            
                            <button 
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Section */}
                        <div className="p-6 space-y-5">
                            {/* Message */}
                            <div className="bg-navy/5 p-4 rounded-2xl border border-navy/5">
                                <p className="text-[13px] text-navy/70 leading-relaxed font-bold text-center italic">
                                    "커피 한 잔의 응원이<br />
                                    개발자에게 큰 힘이 됩니다 ☕"
                                </p>
                            </div>

                            {/* Account Details Card */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-navy/30 uppercase tracking-[0.2em] ml-1">
                                    Account Information
                                </label>
                                <div className="bg-white border-2 border-navy/10 rounded-2xl p-4 shadow-sm relative group">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-black text-navy/40">BANK</span>
                                        <span className="text-[12px] font-black text-navy">{accountInfo.bank}</span>
                                    </div>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[11px] font-black text-navy/40">NAME</span>
                                        <span className="text-[12px] font-black text-navy">{accountInfo.name}</span>
                                    </div>
                                    
                                    <div className="relative">
                                        <div className="bg-navy/5 rounded-xl py-3 px-4 flex items-center justify-between border border-navy/5 overflow-hidden">
                                            <span className="font-mono text-sm font-bold text-navy tracking-tighter">
                                                {accountInfo.number}
                                            </span>
                                            <button
                                                onClick={handleCopy}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all shadow-sm ${
                                                    copied 
                                                    ? 'bg-accent-green text-white scale-95' 
                                                    : 'bg-navy text-white hover:bg-navy/90 active:scale-95'
                                                }`}
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check size={12} strokeWidth={3} /> Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={12} strokeWidth={3} /> Copy
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alternative Hint */}
                            <div className="flex items-center justify-center gap-2 text-[11px] text-navy/40 font-bold">
                                <Smartphone size={14} />
                                <span>계좌번호가 자동으로 복사되었습니다.</span>
                            </div>

                            {/* Done Button */}
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-navy text-white rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl hover:bg-navy/95 active:scale-[0.98] transition-all transform"
                            >
                                닫기
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SupportModal;
