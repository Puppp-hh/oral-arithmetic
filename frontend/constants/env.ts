type MiniProgramEnv = 'develop' | 'trial' | 'release';

const API_BASE_URLS: Record<MiniProgramEnv, string> = {
  develop: 'http://127.0.0.1:3000',
  trial:   'https://your-api-domain.example.com',
  release: 'https://your-api-domain.example.com',
};

function getMiniProgramEnv(): MiniProgramEnv {
  try {
    const envVersion = wx.getAccountInfoSync?.().miniProgram?.envVersion;
    if (envVersion === 'trial' || envVersion === 'release') return envVersion;
  } catch {
    // 开发工具或单测环境可能没有 wx 上下文，默认走本地开发地址。
  }
  return 'develop';
}

export function getApiBaseUrl(): string {
  return API_BASE_URLS[getMiniProgramEnv()];
}

export const ENV_CONFIG = {
  API_BASE_URLS,
} as const;
