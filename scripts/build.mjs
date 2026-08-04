import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { force: true, recursive: true });
await mkdir("dist", { recursive: true });
await cp("site", "dist", { recursive: true });
