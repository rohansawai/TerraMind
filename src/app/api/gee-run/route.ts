import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    // Write code to a temp file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `gee_user_script_${Date.now()}.py`);
    await fs.writeFile(tempFile, code, 'utf-8');

    // Run the script in a subprocess
    return new Promise((resolve) => {
      const proc = spawn('python3', [tempFile], { env: process.env });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('close', (code) => {
        // Clean up temp file
        fs.unlink(tempFile).catch(() => {});
        resolve(
          NextResponse.json({ stdout, stderr, exitCode: code })
        );
      });
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 