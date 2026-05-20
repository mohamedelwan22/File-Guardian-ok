// pdf-parse is a CommonJS module
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return (data.text as string) || "";
  } catch {
    return "";
  }
}
