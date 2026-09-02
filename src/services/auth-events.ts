import type { AuthTokens } from '../types/auth';

type SessionExpiredListener = () => void;
type TokensRefreshedListener = (tokens: AuthTokens) => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();
const tokensRefreshedListeners = new Set<TokensRefreshedListener>();

export function subscribeSessionExpired(listener: SessionExpiredListener) {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

export function subscribeTokensRefreshed(listener: TokensRefreshedListener) {
  tokensRefreshedListeners.add(listener);
  return () => tokensRefreshedListeners.delete(listener);
}

export function emitSessionExpired() {
  sessionExpiredListeners.forEach((listener) => listener());
}

export function emitTokensRefreshed(tokens: AuthTokens) {
  tokensRefreshedListeners.forEach((listener) => listener(tokens));
}
