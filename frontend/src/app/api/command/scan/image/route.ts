import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
};

function resolveImageDirectory() {
  const candidates = [process.cwd(), path.resolve(process.cwd(), "..")];
  for (const candidate of candidates) {
    const imageDirectory = path.join(candidate, "Logic", "R3-YOLO", "images");
    if (fsSync.existsSync(imageDirectory)) return imageDirectory;
  }
  throw new Error("Could not locate Logic/R3-YOLO/images.");
}

export async function GET(request: Request) {
  try {
    const requestedName = new URL(request.url).searchParams.get("name");
    if (!requestedName) return NextResponse.json({ error: "Image name is required." }, { status: 400 });

    const relativeName = requestedName.replaceAll("\\", "/");
    const extension = path.extname(relativeName).toLowerCase();
    if (path.isAbsolute(relativeName) || relativeName.split("/").includes("..") || !CONTENT_TYPES[extension]) {
      return NextResponse.json({ error: "Invalid sample image path." }, { status: 400 });
    }

    const imageDirectory = path.resolve(resolveImageDirectory());
    const imagePath = path.resolve(imageDirectory, relativeName);
    if (!imagePath.startsWith(`${imageDirectory}${path.sep}`)) {
      return NextResponse.json({ error: "Invalid sample image path." }, { status: 400 });
    }

    const bytes = await fs.readFile(/* turbopackIgnore: true */ imagePath);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[extension],
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return NextResponse.json(
      { error: code === "ENOENT" ? "Sample image not found." : "Could not load sample image." },
      { status: code === "ENOENT" ? 404 : 500 },
    );
  }
}
