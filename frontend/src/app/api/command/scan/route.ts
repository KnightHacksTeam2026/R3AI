import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { NextResponse } from "next/server";

type MissionRequest = {
  areaId?: string;
  areaName?: string;
  botId?: string;
  startLongitude?: number;
  startLatitude?: number;
  scanRadiusMiles?: number;
  itemCount?: number;
  robotXDim?: number;
  robotYDim?: number;
  robotZDim?: number;
  weightCapacityKg?: number;
  life?: number;
  detectionOnly?: boolean;
  refreshYolo?: boolean;
};

function resolveRepoRoot() {
  const candidates = [process.cwd(), path.resolve(process.cwd(), "..")];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "Logic", "R3_BOT", "mission_scan.py"))) {
      return candidate;
    }
  }
  throw new Error("Could not locate Logic/R3_BOT/mission_scan.py.");
}

function runMissionScan(payload: MissionRequest) {
  return new Promise<string>((resolve, reject) => {
    const repoRoot = resolveRepoRoot();
    const scriptPath = path.join(repoRoot, "Logic", "R3_BOT", "mission_scan.py");
    const pythonCommand = process.env.PYTHON ?? "python";
    const child = spawn(/* turbopackIgnore: true */ pythonCommand, [scriptPath], { cwd: repoRoot });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `mission scan exited with code ${code}`));
        return;
      }
      resolve(stdout);
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as MissionRequest;
    const stdout = await runMissionScan(payload);
    return NextResponse.json(JSON.parse(stdout));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scan failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
