import type { NextConfig } from "next";

console.log("MY_DB_URL_B64:", Buffer.from(process.env.DATABASE_URL || "").toString("base64"));

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
