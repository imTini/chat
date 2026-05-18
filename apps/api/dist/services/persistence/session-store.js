import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../../../../../data/sessions");
async function ensureDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}
export async function saveSession(id, meta, history) {
    await ensureDir();
    const file = path.join(DATA_DIR, `${id}.json`);
    await fs.writeFile(file, JSON.stringify({ meta, history }, null, 2));
}
export async function listSessions() {
    await ensureDir();
    const files = await fs.readdir(DATA_DIR);
    const results = [];
    for (const file of files) {
        if (!file.endsWith(".json"))
            continue;
        try {
            const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
            const data = JSON.parse(raw);
            results.push({ meta: data.meta, history: data.history ?? [] });
        }
        catch {
            // skip corrupted files
        }
    }
    return results;
}
export async function deleteSessionFile(id) {
    const file = path.join(DATA_DIR, `${id}.json`);
    try {
        await fs.unlink(file);
    }
    catch {
        // ignore if not exists
    }
}
