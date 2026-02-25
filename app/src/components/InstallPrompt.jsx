import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS] = useState(() => /iphone|ipad|ipod/.test(window.navigator?.userAgent?.toLowerCase() || ''));

    useEffect(() => {
        // 1. Check if user is on a mobile device
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isMobileDevice = /iphone|ipad|ipod|android/i.test(userAgent);

        // 2. Check if app is already running in standalone mode (installed)
        const isInStandaloneMode = () =>
            ('standalone' in window.navigator) && (window.navigator.standalone) ||
            window.matchMedia('(display-mode: standalone)').matches;

        // 3. Prevent nagging logic - check if dismissed recently
        const isDismissed = localStorage.getItem('spy_installDismissed') === 'true';

        if (isMobileDevice && !isInStandaloneMode() && !isDismissed) {
            // Delay prompt slightly so it's not jarring initially
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }

        // Capture Android native prompt
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!isInStandaloneMode() && !isDismissed) {
                setShowPrompt(true);
            }
        };

        const handleManualTrigger = () => {
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('manualInstallPrompt', handleManualTrigger);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('manualInstallPrompt', handleManualTrigger);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Android / Chrome: Use native prompt
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        } else if (isIOS) {
            // iOS: User must interact manually, just show tooltip instructions
            alert('아이폰(iOS) 설치 방법:\n\n하단의 탭 바에서 [공유하기(↑)] 버튼을 누른 후,\n메뉴를 조금 내려서 [홈 화면에 추가]를 선택해주세요!');
        } else {
            // Android / Fallbacks (Samsung Internet, WebViews like KakaoTalk)
            alert('설치 안내:\n\n안드로이드 기기에서는 우측 상단(또는 하단)의 [ ⋮ ] 메뉴 버튼을 누른 후, [홈 화면에 추가] 또는 [앱 설치]를 선택해주세요!\n\n※ 만약 카카오톡이나 네이버 앱 브라우저로 접속하셨다면, 우측 하단 [ ⋮ ] 메뉴를 눌러 "다른 브라우저(크롬 등)로 열기" 후 진행해주세요.');
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('spy_installDismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-4 right-4 z-[100] bg-navy text-white p-4 rounded-xl shadow-2xl border-2 border-accent-red flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-full text-accent-red">
                        <Download size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">기밀 앱 설치 안내</h4>
                        <p className="text-[10px] text-white/70">스마트폰 바탕화면에 설치하고<br />최적화된 환경으로 접속하시겠습니까?</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleInstallClick}
                        className="bg-accent-red hover:bg-red-600 text-white font-bold text-xs py-2 px-3 rounded shadow-md transition-colors"
                    >
                        설치하기
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="text-white/40 hover:text-white p-1 transition-colors"
                        title="닫기"
                    >
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
