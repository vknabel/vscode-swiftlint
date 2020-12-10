import {
  ChildProcess,
  ExecException,
  execFile,
  ExecFileOptionsWithBufferEncoding,
} from "child_process";

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
  const process = execFile(
    file,
    args,
    options,
    (error: any | ExecException | null, stdout: string | any, stderr) => {
      currentlyRunningChildProcesses.delete(process);
      callback(error, stdout, stderr);
    }
  );
  currentlyRunningChildProcesses.add(process);
  return process;
}

export function killAllChildProcesses() {
  for (const child of currentlyRunningChildProcesses) {
    child.kill();
  }
}
