export const PRIVACY_POLICY_URL = 'https://coolspid-create.github.io/family-scheduler-policy/privacy.html';
export const DATA_DELETE_URL = 'https://coolspid-create.github.io/family-scheduler-policy/delete-account.html';

export function openExternalPolicyPage(url) {
  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');

  if (!openedWindow) {
    window.location.href = url;
  }
}
