import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const pad2 = (value) => String(value).padStart(2, '0');
const CALENDAR_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TIME_HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const CLOCK_MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);
const DATE_PICKER_WIDTH = 272;
const TIME_PICKER_WIDTH = 284;
const PICKER_EDGE_PADDING = 16;
const CLOCK_FACE_SIZE = 184;
const CLOCK_RADIUS = 68;

const parseDateValue = (value) => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) return null;
    return date;
};

const formatDateDisplay = (value, placeholder) => {
    const date = parseDateValue(value);
    if (!date) return placeholder;
    return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
};

const toDateInput = (date) => (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
);

const isNativeTimeValue = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');

const getTimeParts = (value) => {
    const [rawHour = '09', rawMinute = '00'] = (isNativeTimeValue(value) ? value : '09:00').split(':');
    const hour24 = Number(rawHour);
    return {
        period: hour24 >= 12 ? 'PM' : 'AM',
        hour12: hour24 % 12 || 12,
        minute: Number(rawMinute) || 0,
    };
};

const createTimeValue = ({ period, hour12, minute }) => {
    let hour24 = Number(hour12) || 12;
    if (period === 'PM' && hour24 < 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    return `${pad2(hour24)}:${pad2(minute)}`;
};

const notifyPickerOpen = (id) => {
    window.dispatchEvent(new CustomEvent('native-safe-picker-open', { detail: id }));
};

const getClockButtonStyle = (angleDegrees) => ({
    left: `calc(50% + ${Math.cos(angleDegrees * Math.PI / 180) * CLOCK_RADIUS}px)`,
    top: `calc(50% + ${Math.sin(angleDegrees * Math.PI / 180) * CLOCK_RADIUS}px)`,
    transform: 'translate(-50%, -50%)',
});

export function NativeSafeSelect({
    value,
    onChange,
    options,
    className = '',
    buttonClassName = '',
    optionClassName = '',
    disabled = false,
    ariaLabel = '선택',
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const normalizedOptions = options.map(option => (
        typeof option === 'string' ? { value: option, label: option } : option
    ));
    const selected = normalizedOptions.find(option => option.value === value);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (!ref.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, []);

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                aria-label={ariaLabel}
                aria-expanded={open}
                onClick={() => !disabled && setOpen(prev => !prev)}
                className={`flex w-full items-center justify-between gap-2 text-left disabled:opacity-50 ${buttonClassName}`}
            >
                <span className="min-w-0 truncate">{selected?.label ?? value}</span>
                <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className="absolute left-0 right-0 top-full z-[220] mt-1 overflow-hidden rounded-xl border border-navy/10 bg-white shadow-xl shadow-navy/10"
                    >
                        {normalizedOptions.map(option => {
                            const selectedOption = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] font-black transition-colors ${selectedOption ? 'bg-navy text-white' : 'text-navy hover:bg-navy/5'} ${optionClassName}`}
                                >
                                    <span className="truncate">{option.label}</span>
                                    <span className={`h-3 w-3 rounded-full border ${selectedOption ? 'border-white bg-white' : 'border-navy/25'}`} />
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function NativeSafeDateInput({
    value,
    onChange,
    className = '',
    buttonClassName = '',
    popupClassName = '',
    popupAlign = 'left',
    placeholder = '날짜 선택',
    displayValue,
    label,
    labelClassName = '',
    stacked = false,
    valueRowClassName = '',
    pickerMode = 'native',
    disabled = false,
    compact = false,
    iconOnly = false,
}) {
    const selectedDate = parseDateValue(value);
    const [open, setOpen] = useState(false);
    const [popupStyle, setPopupStyle] = useState(null);
    const ref = useRef(null);
    const pickerRef = useRef(null);
    const pickerId = useId();
    const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
    const layoutClassName = stacked ? 'flex flex-col gap-1.5' : 'flex items-center gap-2';
    const visibleValue = displayValue ?? formatDateDisplay(value, placeholder);

    const updatePopupPosition = useCallback(() => {
        const anchor = ref.current;
        if (!anchor || typeof window === 'undefined') return;

        const anchorRect = anchor.getBoundingClientRect();
        const appRect = anchor.closest('.app-shell')?.getBoundingClientRect();
        const minLeft = appRect ? appRect.left + PICKER_EDGE_PADDING : PICKER_EDGE_PADDING;
        const maxRight = appRect ? appRect.right - PICKER_EDGE_PADDING : window.innerWidth - PICKER_EDGE_PADDING;
        const popupWidth = Math.min(DATE_PICKER_WIDTH, Math.max(220, maxRight - minLeft));
        const preferredLeft = popupAlign === 'right' ? anchorRect.right - popupWidth : anchorRect.left;
        const left = Math.min(Math.max(preferredLeft, minLeft), maxRight - popupWidth);
        const top = anchorRect.bottom + 8;

        setPopupStyle({
            left,
            top,
            width: popupWidth,
            maxHeight: Math.max(240, window.innerHeight - top - PICKER_EDGE_PADDING),
        });
    }, [popupAlign]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (
                !ref.current?.contains(event.target) &&
                !pickerRef.current?.contains(event.target)
            ) {
                setOpen(false);
            }
        };
        const handlePickerOpen = (event) => {
            if (event.detail !== pickerId) setOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('native-safe-picker-open', handlePickerOpen);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('native-safe-picker-open', handlePickerOpen);
        };
    }, [pickerId]);

    useEffect(() => {
        if (!open) return undefined;

        updatePopupPosition();
        window.addEventListener('resize', updatePopupPosition);
        window.addEventListener('scroll', updatePopupPosition, true);
        return () => {
            window.removeEventListener('resize', updatePopupPosition);
            window.removeEventListener('scroll', updatePopupPosition, true);
        };
    }, [open, updatePopupPosition]);

    const days = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const cells = [];
        for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
        for (let day = 1; day <= last.getDate(); day += 1) cells.push(new Date(year, month, day));
        return cells;
    }, [viewDate]);

    const moveMonth = (offset) => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const renderDateValue = () => (
        <span className={`flex min-w-0 flex-1 items-center gap-2 ${valueRowClassName} ${buttonClassName}`}>
            {!iconOnly && (
                <span className={`min-w-0 flex-1 truncate ${selectedDate ? 'text-navy' : 'text-navy/40'}`}>
                    {visibleValue}
                </span>
            )}
            <CalendarDays size={compact ? 13 : 15} className="shrink-0 text-navy/60" />
        </span>
    );

    if (pickerMode === 'popup') {
        return (
            <div ref={ref} className={`relative min-w-0 ${stacked ? 'flex-1' : ''}`}>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        if (disabled) return;
                        setViewDate(parseDateValue(value) || new Date());
                        setOpen(prev => {
                            const nextOpen = !prev;
                            if (nextOpen) {
                                updatePopupPosition();
                                notifyPickerOpen(pickerId);
                            }
                            return nextOpen;
                        });
                    }}
                    className={`relative min-w-0 w-full text-left ${layoutClassName} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
                    aria-expanded={open}
                    aria-label={placeholder || '날짜 선택'}
                >
                    {label && <span className={labelClassName}>{label}</span>}
                    {renderDateValue()}
                </button>
                {typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                ref={pickerRef}
                                style={popupStyle || { visibility: 'hidden' }}
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                data-native-safe-date-picker
                                className={`fixed z-[270] overflow-y-auto rounded-2xl border border-navy/10 bg-white p-3 shadow-xl shadow-navy/10 no-scrollbar [&::-webkit-scrollbar]:hidden ${popupClassName}`}
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <button type="button" onClick={() => moveMonth(-1)} className="rounded-full p-1.5 text-navy/60 hover:bg-navy/5">
                                        <ChevronLeft size={15} />
                                    </button>
                                    <div className="font-black text-[13px] text-navy">
                                        {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
                                    </div>
                                    <button type="button" onClick={() => moveMonth(1)} className="rounded-full p-1.5 text-navy/60 hover:bg-navy/5">
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center">
                                    {CALENDAR_DAYS.map(day => (
                                        <div key={day} className="py-1 text-[10px] font-black text-navy/35">{day}</div>
                                    ))}
                                    {days.map((date, index) => {
                                        if (!date) return <div key={`empty-${index}`} />;
                                        const dateValue = toDateInput(date);
                                        const selected = value === dateValue;
                                        return (
                                            <button
                                                key={dateValue}
                                                type="button"
                                                onClick={() => {
                                                    onChange(dateValue);
                                                    setViewDate(date);
                                                    setOpen(false);
                                                }}
                                                className={`h-8 rounded-full text-[12px] font-black transition-colors ${selected ? 'bg-navy text-white' : 'text-navy hover:bg-navy/5'}`}
                                            >
                                                {date.getDate()}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(toDateInput(new Date()));
                                        setOpen(false);
                                    }}
                                    className="mt-2 w-full rounded-lg bg-navy/5 px-2 py-1.5 text-[11px] font-black text-navy"
                                >
                                    오늘
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>
        );
    }

    return (
        <label className={`relative min-w-0 ${layoutClassName} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
            {label && <span className={labelClassName}>{label}</span>}
            {renderDateValue()}
            <input
                type="date"
                value={selectedDate ? value : ''}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                aria-label={placeholder || '날짜 선택'}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
        </label>
    );
}

export function NativeSafeTimeInput({
    value,
    onChange,
    className = '',
    inputClassName = '',
    popupClassName = '',
    popupAlign = 'right',
    label,
    labelClassName = '',
    stacked = false,
    valueRowClassName = '',
    pickerMode = 'native',
    disabled = false,
}) {
    const nativeValue = isNativeTimeValue(value) ? value : '';
    const layoutClassName = stacked ? 'flex flex-col gap-1.5' : 'flex items-center gap-2';
    const inputRef = useRef(null);
    const popupRef = useRef(null);
    const timePickerRef = useRef(null);
    const pickerId = useId();
    const [open, setOpen] = useState(false);
    const [timeStep, setTimeStep] = useState('hour');
    const [popupStyle, setPopupStyle] = useState(null);
    const timeParts = getTimeParts(nativeValue);

    const updateTimePopupPosition = useCallback(() => {
        const anchor = popupRef.current;
        if (!anchor || typeof window === 'undefined') return;

        const anchorRect = anchor.getBoundingClientRect();
        const appRect = anchor.closest('.app-shell')?.getBoundingClientRect();
        const minLeft = appRect ? appRect.left + PICKER_EDGE_PADDING : PICKER_EDGE_PADDING;
        const maxRight = appRect ? appRect.right - PICKER_EDGE_PADDING : window.innerWidth - PICKER_EDGE_PADDING;
        const popupWidth = Math.min(TIME_PICKER_WIDTH, Math.max(250, maxRight - minLeft));
        const preferredLeft = popupAlign === 'left' ? anchorRect.left : anchorRect.right - popupWidth;
        const left = Math.min(Math.max(preferredLeft, minLeft), maxRight - popupWidth);
        const preferredTop = anchorRect.bottom + 8;
        const estimatedHeight = 356;
        const canOpenAbove = anchorRect.top - estimatedHeight - 8 > PICKER_EDGE_PADDING;
        const top = preferredTop + estimatedHeight > window.innerHeight - PICKER_EDGE_PADDING && canOpenAbove
            ? anchorRect.top - estimatedHeight - 8
            : preferredTop;

        setPopupStyle({
            left,
            top,
            width: popupWidth,
            maxHeight: Math.max(280, window.innerHeight - top - PICKER_EDGE_PADDING),
        });
    }, [popupAlign]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (
                !popupRef.current?.contains(event.target) &&
                !timePickerRef.current?.contains(event.target)
            ) {
                setOpen(false);
            }
        };
        const handlePickerOpen = (event) => {
            if (event.detail !== pickerId) setOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('native-safe-picker-open', handlePickerOpen);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('native-safe-picker-open', handlePickerOpen);
        };
    }, [pickerId]);

    useEffect(() => {
        if (!open) return undefined;

        const frameId = window.requestAnimationFrame(updateTimePopupPosition);
        window.addEventListener('resize', updateTimePopupPosition);
        window.addEventListener('scroll', updateTimePopupPosition, true);
        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('resize', updateTimePopupPosition);
            window.removeEventListener('scroll', updateTimePopupPosition, true);
        };
    }, [open, updateTimePopupPosition]);

    const updatePopupTime = (patch) => {
        onChange(createTimeValue({ ...timeParts, ...patch }));
    };

    const nudgePopupMinute = (delta) => {
        const [rawHour = '09', rawMinute = '00'] = (nativeValue || '09:00').split(':');
        const totalMinutes = ((Number(rawHour) || 0) * 60) + (Number(rawMinute) || 0);
        const nextMinutes = (totalMinutes + delta + 1440) % 1440;
        onChange(`${pad2(Math.floor(nextMinutes / 60))}:${pad2(nextMinutes % 60)}`);
    };

    const selectedClockAngle = timeStep === 'hour'
        ? ((timeParts.hour12 % 12) * 30) - 90
        : ((timeParts.minute / 60) * 360) - 90;

    const renderTimeContent = () => (
        <>
            {label && (
                <span className={labelClassName}>{label}</span>
            )}
            <span className={`flex min-w-0 flex-1 items-center gap-2 ${valueRowClassName}`}>
                <span
                    aria-hidden="true"
                    className={`min-w-0 flex-1 bg-transparent ${nativeValue ? '' : 'text-navy/40'} ${inputClassName}`}
                >
                    {nativeValue || '09:00'}
                </span>
                <Clock size={14} className="shrink-0 text-navy/60" />
            </span>
        </>
    );

    if (pickerMode === 'popup') {
        return (
            <div ref={popupRef} className={`relative min-w-0 ${stacked ? 'flex-1' : ''}`}>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setOpen(prev => {
                        const nextOpen = !prev;
                        if (nextOpen) {
                            setTimeStep('hour');
                            updateTimePopupPosition();
                            notifyPickerOpen(pickerId);
                        }
                        return nextOpen;
                    })}
                    className={`relative min-w-0 w-full text-left ${layoutClassName} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
                    aria-label="시간 선택"
                    aria-expanded={open}
                >
                    {renderTimeContent()}
                </button>
                {typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                ref={timePickerRef}
                                style={popupStyle || { visibility: 'hidden' }}
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                data-native-safe-time-picker
                                className={`fixed z-[270] overflow-y-auto rounded-2xl border border-navy/10 bg-white p-3 shadow-xl shadow-navy/10 no-scrollbar [&::-webkit-scrollbar]:hidden ${popupClassName}`}
                            >
                                <div className="rounded-2xl bg-navy p-3 text-white">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex rounded-xl bg-white/10 p-1">
                                            {[
                                                { value: 'AM', label: '오전' },
                                                { value: 'PM', label: '오후' },
                                            ].map(option => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => updatePopupTime({ period: option.value })}
                                                    className={`h-8 rounded-lg px-2.5 text-[12px] font-black transition-colors ${timeParts.period === option.value ? 'bg-white text-navy' : 'text-white/60 hover:text-white'}`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-baseline gap-1 font-black tabular-nums">
                                            <button
                                                type="button"
                                                onClick={() => setTimeStep('hour')}
                                                className={`rounded-lg px-1 text-[32px] leading-none ${timeStep === 'hour' ? 'bg-white/15 text-white' : 'text-white/55'}`}
                                            >
                                                {pad2(timeParts.hour12)}
                                            </button>
                                            <span className="text-[30px] leading-none text-white/70">:</span>
                                            <button
                                                type="button"
                                                onClick={() => setTimeStep('minute')}
                                                className={`rounded-lg px-1 text-[32px] leading-none ${timeStep === 'minute' ? 'bg-white/15 text-white' : 'text-white/55'}`}
                                            >
                                                {pad2(timeParts.minute)}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="relative mx-auto mt-4 rounded-full bg-navy/5"
                                    style={{ width: CLOCK_FACE_SIZE, height: CLOCK_FACE_SIZE }}
                                >
                                    <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-red" />
                                    <span
                                        className="absolute left-1/2 top-1/2 h-0.5 origin-left rounded-full bg-accent-red"
                                        style={{
                                            width: 66,
                                            transform: `rotate(${selectedClockAngle}deg)`,
                                        }}
                                    />
                                    {timeStep === 'hour' ? (
                                        TIME_HOURS.map(hour => {
                                            const selected = timeParts.hour12 === hour;
                                            const angle = ((hour % 12) * 30) - 90;
                                            return (
                                                <button
                                                    key={hour}
                                                    type="button"
                                                    onClick={() => {
                                                        updatePopupTime({ hour12: hour });
                                                        setTimeStep('minute');
                                                    }}
                                                    style={getClockButtonStyle(angle)}
                                                    className={`absolute flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-black transition-colors ${selected ? 'bg-accent-red text-white shadow-md shadow-accent-red/20' : 'text-navy hover:bg-white'}`}
                                                >
                                                    {hour}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        CLOCK_MINUTES.map(minute => {
                                            const selected = Math.round(timeParts.minute / 5) * 5 % 60 === minute;
                                            const angle = (minute / 60 * 360) - 90;
                                            return (
                                                <button
                                                    key={minute}
                                                    type="button"
                                                    onClick={() => updatePopupTime({ minute })}
                                                    style={getClockButtonStyle(angle)}
                                                    className={`absolute flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-black transition-colors ${selected ? 'bg-accent-red text-white shadow-md shadow-accent-red/20' : 'text-navy hover:bg-white'}`}
                                                >
                                                    {pad2(minute)}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-navy/5 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => nudgePopupMinute(-1)}
                                        className="rounded-xl bg-navy/5 px-3 py-2 text-[11px] font-black text-navy/60"
                                    >
                                        -1분
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="rounded-xl bg-navy px-5 py-2 text-[12px] font-black text-white shadow-md shadow-navy/10"
                                    >
                                        설정
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => nudgePopupMinute(1)}
                                        className="rounded-xl bg-navy/5 px-3 py-2 text-[11px] font-black text-navy/60"
                                    >
                                        +1분
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>
        );
    }

    const openTimePicker = (event) => {
        if (disabled) return;
        const input = inputRef.current;
        if (!input) return;

        input.focus({ preventScroll: true });
        if (typeof input.showPicker === 'function') {
            try {
                input.showPicker();
                event.preventDefault();
            } catch {
                // Fall back to the label's native activation behavior.
            }
        }
    };

    return (
        <label
            onClick={openTimePicker}
            className={`relative min-w-0 flex-1 ${layoutClassName} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
        >
            {renderTimeContent()}
            <input
                ref={inputRef}
                type="time"
                value={nativeValue}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                aria-label="시간 선택"
                className="pointer-events-none absolute h-px w-px opacity-0"
            />
        </label>
    );
}

export function NativeSafeConfirmDialog({
    open,
    title = '확인',
    message,
    confirmLabel = '확인',
    cancelLabel = '취소',
    destructive = false,
    onConfirm,
    onCancel,
}) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] mx-auto flex max-w-[420px] items-center justify-center bg-navy/45 px-6"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="w-full rounded-2xl border border-navy/10 bg-white p-5 shadow-2xl shadow-navy/20"
                    >
                        <h2 className="text-[16px] font-black text-navy">{title}</h2>
                        <p className="mt-2 text-[13px] font-semibold leading-relaxed text-navy/65">{message}</p>
                        <div className="mt-5 flex gap-2.5">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 rounded-xl border border-navy/10 bg-navy/5 py-2.5 text-[13px] font-black text-navy/55"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className={`flex-1 rounded-xl py-2.5 text-[13px] font-black text-white shadow-md ${destructive ? 'bg-accent-red' : 'bg-navy'}`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function NativeSafeTextDialog({
    open,
    title = '입력',
    message,
    value,
    onChange,
    confirmLabel = '저장',
    cancelLabel = '취소',
    placeholder = '',
    maxLength,
    destructive = false,
    confirmDisabled = false,
    onConfirm,
    onCancel,
}) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] mx-auto flex max-w-[420px] items-center justify-center bg-navy/45 px-6"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="w-full rounded-2xl border border-navy/10 bg-white p-5 shadow-2xl shadow-navy/20"
                    >
                        <h2 className="text-[16px] font-black text-navy">{title}</h2>
                        {message && (
                            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-navy/65">{message}</p>
                        )}
                        <input
                            type="text"
                            value={value}
                            maxLength={maxLength}
                            autoFocus
                            placeholder={placeholder}
                            onChange={(event) => onChange(event.target.value)}
                            className="mt-4 w-full rounded-xl border border-navy/10 bg-navy/5 px-3 py-3 text-[14px] font-black text-navy outline-none focus:border-navy/30 focus:bg-white"
                        />
                        <div className="mt-5 flex gap-2.5">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 rounded-xl border border-navy/10 bg-navy/5 py-2.5 text-[13px] font-black text-navy/55"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={confirmDisabled}
                                className={`flex-1 rounded-xl py-2.5 text-[13px] font-black text-white shadow-md disabled:cursor-not-allowed disabled:opacity-45 ${destructive ? 'bg-accent-red' : 'bg-navy'}`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
