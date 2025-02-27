import { existsSync, mkdirSync } from "fs";

export const createFolder = (path: string) => {
  if (existsSync(path)) {
    return;
  }

  mkdirSync(path, { recursive: true });
};
