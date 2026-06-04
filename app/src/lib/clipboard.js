import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';

const getSafeText = (text) => String(text || '');

const copyWithSelectionFallback = (text) => {
    const safeText = getSafeText(text);
    if (!safeText) return false;

    const textarea = document.createElement('textarea');
    textarea.value = safeText;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let copied = false;
    try {
        copied = document.execCommand('copy');
    } finally {
        document.body.removeChild(textarea);
    }

    return copied;
};

export const writeClipboardText = async (text, label = 'Family Scheduler') => {
    const safeText = getSafeText(text);
    if (!safeText) return false;

    if (Capacitor.isNativePlatform()) {
        await Clipboard.write({ string: safeText, label });
        return true;
    }

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(safeText);
            return true;
        }
    } catch {
        // Fall back to the older selection-based copy path below.
    }

    if (copyWithSelectionFallback(safeText)) {
        return true;
    }

    throw new Error('클립보드 복사 권한을 사용할 수 없습니다.');
};

export const readClipboardText = async () => {
    if (Capacitor.isNativePlatform()) {
        const result = await Clipboard.read();
        return result?.value || '';
    }

    if (!navigator.clipboard?.readText) {
        throw new Error('클립보드 읽기 권한을 사용할 수 없습니다.');
    }

    return navigator.clipboard.readText();
};
