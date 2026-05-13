import type { NextConfig } from 'next'

// Set to your repository name for GitHub Pages, or '' for custom domain / Vercel
const basePath = process.env.NODE_ENV === 'production' ? (process.env.BASE_PATH || '') : ''

// DEPLOYMENT MODES:
// - Server mode (default): supports API routes at /api/logos — deploy to Vercel, Node server, etc.
// - Static export (GitHub Pages): set STATIC_EXPORT=true — API routes are NOT available
//   Add `output: 'export'` and `trailingSlash: true` below for static export.

const isStaticExport = process.env.STATIC_EXPORT === 'true'

const nextConfig: NextConfig = {
    ...(isStaticExport ? { output: 'export', trailingSlash: true } : {}),
    basePath: basePath,
    assetPrefix: basePath || undefined,
    images: {
        unoptimized: true
    },
    env: {
        NEXT_PUBLIC_BASE_PATH: basePath,
    },
}

export default nextConfig