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
  webFallbackUrl: 'https://croc.poker',
};

export function getRedirectInfo(userAgent: string, referralCode: string): RedirectInfo {
  const parser = new UAParser(userAgent);
  const os = parser.getOS();
  const device = parser.getDevice();

  const osName = os.name?.toLowerCase() || '';
  const osVersion = os.version || '';
  const deviceModel = device.model || '';

  // iOS
  if (osName.includes('ios') || osName.includes('mac os')) {
    // Check if it's actually mobile
    if (device.type === 'mobile' || device.type === 'tablet') {
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
