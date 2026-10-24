import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  // Opens the treemap in your browser automatically when ANALYZE=true
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Backend stores video thumbnails and clip thumbnails on Cloudinary
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        // YouTube video thumbnails
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        // Google OAuth user avatar URLs
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        // Backend Render host
        protocol: "https",
        hostname: "clipcash-api.onrender.com",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
