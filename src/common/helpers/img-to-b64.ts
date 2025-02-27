import { readFileSync } from "fs";
import { resolve } from "path";

export function ImgToB64(pathFile: string): string | null {
  try {
    const imgPath = resolve(pathFile);
    const imgData = readFileSync(imgPath);
    return Buffer.from(imgData).toString("base64");
  } catch (error) {
    console.error("Error al leer la imagen:", error);
    return null;
  }
}
