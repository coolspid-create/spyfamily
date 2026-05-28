import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const ONBOARDING_VERSION = '4';
const COMPLETED_KEY = 'familyScheduler.onboarding.completed';
const VERSION_KEY = 'familyScheduler.onboarding.version';
const TOUR_MOTION_TRANSITION = { duration: 0.15 };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getStoredCompletion = () => {
  try {
    return (
      localStorage.getItem(COMPLETED_KEY) === 'true' &&
      localStorage.getItem(VERSION_KEY) === ONBOARDING_VERSION
    );
  } catch {
    return false;
  }
};

const isExistingUser = () => {
  try {
    // If user already has saved app data, they are a returning user
    return !!(
      localStorage.getItem('spy_guestData_child1') ||
      localStorage.getItem('spy_childProfiles') ||
      localStorage.getItem('spy_childCount')
    );
  } catch {
    return false;
  }
};

const setStoredCompletion = () => {
  try {
    localStorage.setItem(COMPLETED_KEY, 'true');
    localStorage.setItem(VERSION_KEY, ONBOARDING_VERSION);
  } catch {
    // localStorage can be unavailable in some embedded browsers.
  }
};

export default function OnboardingTour({ activeTab, onTabChange, replayKey }) {
  const steps = useMemo(() => [
    {
      id: 'intro',
      tab: 'home',
      target: '[data-tour="app-title"]',
      shape: 'circle',
      message: '아이의 복잡한 하루를\n한눈에 정리하세요.',
    },
    {
      id: 'child',
      tab: 'home',
      target: '[data-tour="child-selector"]',
      shape: 'circle',
      message: '아이별 일정과 결제 정보를\n따로 관리할 수 있어요.',
    },
    {
      id: 'weekly',
      tab: 'home',
      target: '[data-tour="nav-home"]',
      shape: 'circle',
      message: '요일별 일정을\n타임라인으로 확인하세요.',
    },
    {
      id: 'add-schedule',
      tab: 'home',
      target: '[data-tour="add-schedule"]',
      shape: 'circle',
      message: '새 일정을 추가해\n오늘의 흐름을 만들어보세요.',
    },
    {
      id: 'daily',
      tab: 'daily',
      target: '[data-tour="nav-daily"]',
      shape: 'circle',
      message: '오늘 꼭 해야 할 일을\n체크리스트로 관리하세요.',
    },
    {
      id: 'monthly',
      tab: 'map',
      target: '[data-tour="nav-map"]',
      shape: 'circle',
      message: '한 달의 일정과 결제일을\n함께 확인하세요.',
    },
    {
      id: 'payment',
      tab: 'payment',
      target: '[data-tour="nav-payment"]',
      shape: 'circle',
      message: '학원비와 정기 지출을\n미리 정리하세요.',
    },
    {
      id: 'family-events',
      tab: 'ops',
      target: '[data-tour="nav-ops"]',
      shape: 'circle',
      message: '특별한 가족 일정은\n따로 모아보세요.',
    },
    {
      id: 'local',
      tab: 'home',
      target: '[data-tour="local-status"]',
      shape: 'circle',
      message: '현재 데이터는\n이 기기에 저장됩니다.',
    },
    {
      id: 'start',
      tab: 'home',
      message: '아이와 함께 즐거운 시간 보내세요!',
    },
  ], []);

  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isTargetMissing, setIsTargetMissing] = useState(false);

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;
  const isStartStep = currentStep?.id === 'start';

  const openTour = useCallback((startIndex = 0) => {
    setCurrentIndex(startIndex);
    setIsOpen(true);
  }, []);

  const closeTour = useCallback((markCompleted = false) => {
    if (markCompleted) {
      setStoredCompletion();
    }
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!getStoredCompletion()) {
      // Existing users who have app data should not see the onboarding
      if (isExistingUser()) {
        setStoredCompletion();
        return undefined;
      }
      const timer = window.setTimeout(() => openTour(0), 650);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [openTour]);

  useEffect(() => {
    if (replayKey > 0) {
      const timer = window.setTimeout(() => openTour(0), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [openTour, replayKey]);

  useEffect(() => {
    if (!isOpen || !currentStep?.tab || currentStep.tab === activeTab) {
      return;
    }
    onTabChange(currentStep.tab);
  }, [activeTab, currentStep, isOpen, onTabChange]);

  const measureTarget = useCallback((shouldScroll = false) => {
    if (!isOpen || !currentStep?.target) {
      setTargetRect(null);
      setIsTargetMissing(false);
      return;
    }

    const target = document.querySelector(currentStep.target);
    if (!target) {
      setTargetRect(null);
      setIsTargetMissing(true);
      return;
    }

    if (shouldScroll === true) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }

    window.setTimeout(() => {
      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      setIsTargetMissing(false);
    }, 180);
  }, [currentStep, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const timer = window.setTimeout(() => measureTarget(true), currentStep?.tab && currentStep.tab !== activeTab ? 280 : 80);
    const refresh = () => measureTarget(false);

    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
    };
  }, [activeTab, currentStep, isOpen, measureTarget]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeTour(false);
      }
      if (event.key === 'ArrowRight') {
        setCurrentIndex(index => Math.min(index + 1, steps.length - 1));
      }
      if (event.key === 'ArrowLeft') {
        setCurrentIndex(index => Math.max(index - 1, 0));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeTour, isOpen, steps.length]);

  const highlightStyle = useMemo(() => {
    if (!targetRect) {
      return null;
    }

    const padding = currentStep.id === 'add-schedule' ? 8 : 14;
    const size = Math.max(targetRect.width, targetRect.height) + padding * 2;

    return {
      left: targetRect.left + targetRect.width / 2 - size / 2,
      top: targetRect.top + targetRect.height / 2 - size / 2,
      width: size,
      height: size,
      borderRadius: '999px',
    };
  }, [currentStep, targetRect]);

  const focusCircle = useMemo(() => {
    if (!highlightStyle) {
      return null;
    }

    return {
      cx: highlightStyle.left + highlightStyle.width / 2,
      cy: highlightStyle.top + highlightStyle.height / 2,
      r: highlightStyle.width / 2,
    };
  }, [highlightStyle]);

  const textStyle = useMemo(() => {
    const width = Math.min(340, window.innerWidth - 56);

    if (isStartStep) {
      return {
        width,
        left: clamp(window.innerWidth / 2 - width / 2, 28, window.innerWidth - width - 28),
        top: clamp(window.innerHeight * 0.42, 116, window.innerHeight - 260),
        textAlign: 'center',
      };
    }

    const centerX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth / 2;
    const targetMiddle = targetRect ? targetRect.top + targetRect.height / 2 : window.innerHeight / 2;

    const left = clamp(centerX - width / 2, 28, window.innerWidth - width - 28);
    const preferredTop = targetMiddle < window.innerHeight * 0.45
      ? Math.min(targetMiddle + 150, window.innerHeight - 260)
      : Math.max(targetMiddle - 210, 96);

    return {
      width,
      left,
      top: clamp(preferredTop, 92, window.innerHeight - 260),
    };
  }, [isStartStep, targetRect]);

  const goNext = useCallback(() => {
    if (isLastStep) {
      closeTour(true);
      return;
    }
    setCurrentIndex(index => Math.min(index + 1, steps.length - 1));
  }, [closeTour, isLastStep, steps.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-live="polite"
        >
          {!highlightStyle && (
            <div className="absolute inset-0 bg-slate-950/75" />
          )}

          {highlightStyle && focusCircle && (
            <>
              <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true">
                <defs>
                  <mask id="family-scheduler-tour-mask">
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    <motion.circle
                      animate={focusCircle}
                      initial={false}
                      transition={TOUR_MOTION_TRANSITION}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="rgba(4, 8, 18, 0.74)"
                  mask="url(#family-scheduler-tour-mask)"
                />
              </svg>
              <motion.div
                className="absolute pointer-events-none border-2 border-white/95 bg-white/10 shadow-[0_18px_48px_rgba(255,255,255,0.18)]"
                style={{ borderRadius: '999px' }}
                initial={false}
                animate={{
                  left: highlightStyle.left,
                  top: highlightStyle.top,
                  width: highlightStyle.width,
                  height: highlightStyle.height,
                  opacity: 1,
                  scale: 1,
                }}
                transition={TOUR_MOTION_TRANSITION}
              >
                <span className="tour-pulse-ring absolute inset-0 rounded-[inherit] border-2 border-white/80" />
                <span className="tour-pulse-ring tour-pulse-ring-delayed absolute inset-0 rounded-[inherit] border-2 border-accent-red/80" />
              </motion.div>
            </>
          )}

          {!isStartStep && (
            <button
              type="button"
              onClick={() => closeTour(false)}
              className="fixed right-5 top-5 pointer-events-auto z-[205] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="가이드 닫기"
            >
              <X size={24} />
            </button>
          )}

          {highlightStyle && !isTargetMissing && (
            <button
              type="button"
              onClick={goNext}
              className="fixed pointer-events-auto z-[204] cursor-pointer rounded-full bg-transparent"
              style={highlightStyle}
              aria-label={`${currentStep.message.replace(/\n/g, ' ')} 다음 안내 보기`}
            />
          )}

          {isStartStep ? (
            <motion.div
              key={`${currentStep.id}-message`}
              className="fixed pointer-events-none z-[203] flex flex-col items-center text-center"
              style={textStyle}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.2 }}
            >
              <p className="whitespace-pre-line text-[27px] font-black leading-tight tracking-normal text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.45)]">
                {currentStep.message}
              </p>
              <button
                type="button"
                onClick={() => closeTour(true)}
                className="pointer-events-auto mt-3 min-w-[116px] rounded-full border border-white/40 bg-white/18 px-6 py-3 text-sm font-bold text-white/90 shadow-[0_10px_28px_rgba(0,0,0,0.26)] backdrop-blur-md transition-colors hover:bg-white/28 focus:outline-none focus:ring-2 focus:ring-white/55"
                aria-label="가이드 완료하고 시작하기"
              >
                시작하기
              </button>
            </motion.div>
          ) : (
            <motion.p
              key={`${currentStep.id}-message`}
              className="fixed pointer-events-none z-[203] whitespace-pre-line text-[27px] font-black leading-tight tracking-normal text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
              style={textStyle}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.2 }}
            >
              {isTargetMissing ? '화면을 다시 정리한 뒤\n가이드를 이어갈게요.' : currentStep.message}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
