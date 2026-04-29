export const DEFAULT_KAKAO_CHANNEL_CHAT_URL = 'https://pf.kakao.com/_xfgxdqX/chat'

export function getKakaoChannelChatUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_CHAT_URL?.trim()

  if (!configuredUrl) {
    return DEFAULT_KAKAO_CHANNEL_CHAT_URL
  }

  try {
    const url = new URL(configuredUrl)
    const normalizedUrl = `${url.origin}${url.pathname.replace(/\/$/, '')}`

    if (normalizedUrl === DEFAULT_KAKAO_CHANNEL_CHAT_URL) {
      return DEFAULT_KAKAO_CHANNEL_CHAT_URL
    }
  } catch {
    return DEFAULT_KAKAO_CHANNEL_CHAT_URL
  }

  return DEFAULT_KAKAO_CHANNEL_CHAT_URL
}
