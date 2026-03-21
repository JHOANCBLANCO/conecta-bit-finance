import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - Valid per Next.js app router 15 warning
  allowedDevOrigins: ["localhost:3000", "192.168.1.34:3000", "192.168.1.34", "multiplicate-unintersecting-vena.ngrok-free.dev", "*.ngrok-free.dev", "*.ngrok-free.app"],
  experimental: {
    serverActions: {
        bodySizeLimit: '20mb',
        allowedOrigins: ['*.github.dev', '*.app.github.dev', 'localhost:3000'],
    },
  },
  // @ts-ignore - Next.js types for devIndicators sometimes lag behind or vary by exact minor version
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  } as any,
};

export default nextConfig;
