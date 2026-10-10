import { UAParser } from 'ua-parser-js';

interface RedirectInfo {
  platform: 'ios' | 'android' | 'desktop';
  redirectUrl: string;
  osVersion?: string;
  deviceModel?: string;
}

const APP_CONFIG = {
  iosAppStoreUrl: 'https://apps.apple.com/fr/app/crocpoker-poker-gratuit/id6741067848',
  androidPackage: 'com.crocpoker',
  webFallbackUrl: 'https://croc.poker/application-poker',
};

export interface RedirectHints {
  // True when the client reported a multi-touch screen (navigator.maxTouchPoints > 1).
  // Safari on iPadOS 13+ and iPhones in "Request Desktop Website" mode send a
  // Macintosh user agent, so this is the only way to tell them apart from a Mac.
  touch?: boolean;
}

export const WEB_FALLBACK_URL = APP_CONFIG.webFallbackUrl;

export function getRedirectInfo(
  userAgent: string,
  referralCode: string,
  hints: RedirectHints = {},
): RedirectInfo {
  const parser = new UAParser(userAgent);
  const os = parser.getOS();
  const device = parser.getDevice();

  // ua-parser-js reports "iOS" / "macOS" (v2) or "Mac OS" (v1): normalise spacing.
  const osName = (os.name?.toLowerCase() || '').replace(/\s+/g, '');
  const osVersion = os.version || '';
  const deviceModel = device.model || '';

  // iOS
  if (osName.includes('ios') || osName.includes('macos')) {
    // Check if it's actually mobile (or a touch device hiding behind a Mac user agent)
    const isTouchMac = osName.includes('macos') && hints.touch === true;
    if (device.type === 'mobile' || device.type === 'tablet' || isTouchMac) {
      return {
        platform: 'ios',
        redirectUrl: APP_CONFIG.iosAppStoreUrl,
        osVersion,
        deviceModel,
      };
    }
  }

  // Android
  if (osName.includes('android')) {
    const referrer = encodeURIComponent(`referral_code=${referralCode}`);
    return {
      platform: 'android',
      redirectUrl: `https://play.google.com/store/apps/details?id=${APP_CONFIG.androidPackage}&referrer=${referrer}`,
      osVersion,
      deviceModel,
    };
  }

  // Desktop fallback
  return {
    platform: 'desktop',
    redirectUrl: APP_CONFIG.webFallbackUrl,
  };
}
