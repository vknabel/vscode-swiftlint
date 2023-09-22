import {
  ChildProcess,
  ExecException,
  execFile,
  ExecFileOptionsWithBufferEncoding,
  spawn,
} from "child_process";
import * as os from "os";
import { Readable } from "stream";

const currentlyRunningChildProcesses = new Set<ChildProcess>();

export function execShell(
  file: string,
  args: readonly string[] | null | undefined,
  options: ExecFileOptionsWithBufferEncoding,
  callback: (
    error: ExecException | null,
    stdout: Buffer,
    stderr: Buffer
  ) => void
): ChildProcess {
  let process: ChildProcess;
  function processHandler(
    error: any | ExecException | null,
    stdout: string | any,
    stderr: Buffer
  ) {
    currentlyRunningChildProcesses.delete(process);
    callback(error, stdout, stderr);
  }

  if (os.platform() === "win32") {
    process = spawn(file, args ?? [], { ...options, shell: true });
    var stdoutBuffers: Buffer[] = [];
    process.stdout?.on('data', (data) => { stdoutBuffers.push(data); });

    var stderrBuffers: Buffer[] = [];
    process.stderr?.on('data', (data) => { stderrBuffers.push(data); });

    process.on("error", async (error) => {
      processHandler(
        error,
        Buffer.concat(stdoutBuffers).toString(),
        Buffer.concat(stderrBuffers)
      );
    });
    process.on("close", () => {
      processHandler(
        null,
        Buffer.concat(stdoutBuffers).toString(),
        Buffer.concat(stderrBuffers)
      );
    });
  } else {
    process = execFile(file, args, options, processHandler);
  }
  currentlyRunningChildProcesses.add(process);
  return process;
}

export function killAllChildProcesses() {
  for (const child of currentlyRunningChildProcesses) {
    child.kill();
  }
}

async function bufferFromReadableStream(
  readableStream: Readable
): Promise<Buffer> {
  const buffers: Buffer[] = [];
  for await (const data of readableStream) {
    buffers.push(data);
  }
  return Buffer.concat(buffers);
}
