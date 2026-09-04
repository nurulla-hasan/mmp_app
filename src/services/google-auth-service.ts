import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { API_BASE_URL } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import { AuthService } from './auth-service';
import type { AuthTokens } from '../types/auth';

const MOBILE_OAUTH_REDIRECT_URL = 'mouzamappro://oauth';

type GoogleSignInResult =
  | { type: 'success'; tokens: AuthTokens }
  | { type: 'cancel' }
  | { type: 'error'; message: string };

const createCodeVerifier = () =>
  `${Crypto.randomUUID()}${Crypto.randomUUID()}${Crypto.randomUUID()}`;

const createCodeChallenge = (codeVerifier: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, codeVerifier);

export const GoogleAuthService = {
  async signIn(): Promise<GoogleSignInResult> {
    if (Platform.OS === 'web') {
      return {
        type: 'error',
        message: 'Google সাইন ইন মোবাইল অ্যাপ বিল্ড থেকে ব্যবহার করুন।',
      };
    }

    // `expoGoConfig` may also be embedded in standalone manifests. `appOwnership`
    // remains `expo` specifically in Expo Go and is null in standalone APKs.
    if (Constants.appOwnership === 'expo') {
      return {
        type: 'error',
        message: 'Google সাইন ইন Expo Go-তে নয়—APK বা development build-এ টেস্ট করুন।',
      };
    }

    const codeVerifier = createCodeVerifier();
    const codeChallenge = await createCodeChallenge(codeVerifier);
    const authUrl = new URL(`${API_BASE_URL}${API_ENDPOINTS.auth.google}`);
    authUrl.searchParams.set('client', 'mobile');
    authUrl.searchParams.set('codeChallenge', codeChallenge);

    const browserResult = await WebBrowser.openAuthSessionAsync(
      authUrl.toString(),
      MOBILE_OAUTH_REDIRECT_URL
    );

    if (browserResult.type !== 'success' || !browserResult.url) {
      return { type: 'cancel' };
    }

    const callbackUrl = new URL(browserResult.url);
    const oauthError = callbackUrl.searchParams.get('error');

    if (oauthError) {
      return {
        type: 'error',
        message: 'Google দিয়ে সাইন ইন সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।',
      };
    }

    const code = callbackUrl.searchParams.get('code');
    if (!code) {
      return {
        type: 'error',
        message: 'Google সাইন ইন কোড পাওয়া যায়নি। আবার চেষ্টা করুন।',
      };
    }

    const exchangeResult = await AuthService.exchangeGoogleMobileCode({
      code,
      codeVerifier,
    });

    if (!exchangeResult.success || !exchangeResult.data) {
      return {
        type: 'error',
        message: exchangeResult.message || 'Google দিয়ে সাইন ইন সম্পন্ন করা যায়নি।',
      };
    }

    return {
      type: 'success',
      tokens: exchangeResult.data,
    };
  },
};
