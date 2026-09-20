import { copyFile } from "node:fs/promises";

await copyFile("src/index.d.ts", "dist/index.d.ts");