import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";

type ResumeInput = { idempotencyKey: string; title: string; summary: string; baseResume: { id: string; sourcePath: string } };

/** Select the owner's approved PDF byte-for-byte. Never generate a per-job CV. */
export async function renderTailoredResume(input: ResumeInput) {
  const bytes = await readFile(resolve(input.baseResume.sourcePath));
  if ((await PDFDocument.load(bytes)).getPageCount() !== 1) throw new Error("BASE_RESUME_MUST_BE_ONE_PAGE");
  const outputDir = resolve(/* turbopackIgnore: true */ process.env.RESUME_OUTPUT_DIR ?? "runtime/resumes");
  await mkdir(outputDir, { recursive: true });
  const hash = createHash("sha256").update(bytes).digest("hex");
  const path = resolve(outputDir, `approved-${input.baseResume.id}-${hash}.pdf`);
  await writeFile(path, bytes);
  return { path, fallback: false, pageCount: 1, selectedOriginal: true };
}
