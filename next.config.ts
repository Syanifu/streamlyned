import type { NextConfig } from "next";

console.log("MY_DB_URL_MASKED:", process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'Not set');

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
