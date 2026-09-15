/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/qr',
        destination: 'https://linktr.ee/koreanersglobal',
        permanent: false,
      },
      {
        source: '/creators',
        destination: '/creator',
        permanent: true,
      },
      {
        // 광고 전용 랜딩을 /contact 로 통합 (2026-07-06). 배포 이력상 URL 보존용
        source: '/consult',
        destination: '/contact',
        permanent: true,
      },
    ]
  },
  // 메타데이터(탭 제목 등)를 스트리밍 대신 초기 HTML에 포함시켜 'browser tab' 현상 방지
  htmlLimitedBots: /.*/,
  // Turbopack 설정 (Next.js 16 - 루트 레벨에 위치)
  turbopack: {},
  typescript: {
    ignoreBuildErrors: false, // 빌드 에러를 확인하기 위해 false로 변경 권장
  },
  images: {
    unoptimized: false, // Next.js 이미지 최적화 활성화
    formats: ['image/avif', 'image/webp'], // 최신 이미지 포맷 지원
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fbnatppygeqvlrjhcfez.supabase.co', // Supabase Storage
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'koreaners.co',
      },
      {
        protocol: 'https',
        hostname: 'www.koreaners.co',
      },
    ],
  },
  // 프로덕션 환경에서 console.log 자동 제거 (보안 및 성능)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // error와 warn은 유지 (Sentry 등으로 전송 가능)
    } : false,
  },
  // Vercel 배포 최적화
  experimental: {
    optimizePackageImports: [
      '@blocknote/react',
      '@blocknote/mantine',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'framer-motion',
      'recharts',
    ],
  },
  // BlockNote 관련 빌드 최적화
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 클라이언트 사이드에서만 BlockNote 사용
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
}

export default nextConfig
