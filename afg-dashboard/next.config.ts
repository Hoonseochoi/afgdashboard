import type { NextConfig } from "next";
import path from "path";

// 상위 폴더 lockfile 때문에 Next가 루트를 잘못 잡는 것 방지 → .env.local 로드 및 모듈 해석을 이 패키지 기준으로
const cwd = process.cwd();
const projectRoot = cwd.endsWith("afg-dashboard") ? cwd : path.resolve(cwd, "afg-dashboard");

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
