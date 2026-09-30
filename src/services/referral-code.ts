// Referral codes are generated in Supabase as short alphanumeric strings.
// Restricting the charset here keeps the code safe to inline in HTML/JS and in store URLs.
const REFERRAL_CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Characters messaging apps commonly glue onto the end of a pasted link.
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"»>]+$/;

export function isValidReferralCode(code: string): boolean {
  return REFERRAL_CODE_PATTERN.test(code);
}

// Best-effort recovery of a code that arrived with trailing punctuation
// (e.g. "abc123." from a message ending with the link). Returns null when
// nothing valid can be recovered.
export function recoverReferralCode(raw: string): string | null {
  if (isValidReferralCode(raw)) return raw;
  const cleaned = raw.trim().replace(TRAILING_PUNCTUATION, '');
  return cleaned !== raw && isValidReferralCode(cleaned) ? cleaned : null;
}
