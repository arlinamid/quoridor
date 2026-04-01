export function getDeviceFingerprint(): string {
  const cookieName = 'quoridor_device_fp';
  const match = document.cookie.match(new RegExp('(^| )' + cookieName + '=([^;]+)'));
  
  if (match) {
    return match[2];
  }
  
  // Generate a new unique fingerprint if it doesn't exist
  const array = new Uint32Array(4);
  window.crypto.getRandomValues(array);
  const fp = Array.from(array, dec => ('0' + dec.toString(16)).slice(-8)).join('-');
  
  // Save to cookie (expires in 1 year)
  const d = new Date();
  d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
  document.cookie = `${cookieName}=${fp};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  
  return fp;
}
