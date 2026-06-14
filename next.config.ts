import type { NextConfig } from "next";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  basePath: isGithubPages && repoName ? `/${repoName}` : "",
};

export default nextConfig;
