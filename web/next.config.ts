import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// Env lives in the repo-root .env.local; load it before Next inlines NEXT_PUBLIC_* values.
loadEnvConfig(`${process.cwd()}/..`);

const nextConfig: NextConfig = {};

export default nextConfig;
