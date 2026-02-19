import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, copyFile } from "fs/promises";
import path from "path";

// Server dependencies to bundle for faster cold starts
const allowlist = [
    "@credverse/shared-auth", // bundle shared-auth: file: deps don't resolve on Railway at runtime
    "cors",
    "cookie-parser",
    "dotenv",
    "express",
    "jsonwebtoken",
];

async function buildAll() {
    console.log("🗑️  Cleaning dist folder...");
    await rm("dist", { recursive: true, force: true });

    console.log("📦 Building frontend...");
    await viteBuild();

    console.log("⚙️  Building server...");
    const pkg = JSON.parse(await readFile("package.json", "utf-8"));
    const allDeps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
    ];
    const externals = allDeps.filter((dep) => !allowlist.includes(dep));

    await mkdir("dist/server", { recursive: true });

    await esbuild({
        entryPoints: ["server/index.ts"],
        platform: "node",
        bundle: true,
        format: "esm",
        outfile: "dist/server/index.js",
        define: {
            "process.env.NODE_ENV": '"production"',
        },
        minify: true,
        external: externals,
        logLevel: "info",
    });

    console.log("✅ Build complete!");
}

buildAll().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
});
