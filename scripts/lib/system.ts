import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

/** Parses a Linux CPU list such as `0-3,6` into `[0, 1, 2, 3, 6]`. */
export function parseCpuList(list: string): number[] {
  const cpus = new Set<number>();

  for (const part of list.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const [from, to] = trimmed.split("-").map((value) => Number.parseInt(value, 10));
    if (from === undefined || Number.isNaN(from)) {
      throw new Error(`Invalid CPU list: ${list}`);
    }

    for (let cpu = from; cpu <= (to ?? from); cpu++) cpus.add(cpu);
  }

  return [...cpus].sort((a, b) => a - b);
}

/** Formats `[0, 1, 2, 3, 6]` as `0-3,6`. */
export function formatCpuList(cpus: readonly number[]): string {
  const ranges: string[] = [];
  let start = cpus[0];
  let prev = cpus[0];

  for (const cpu of [...cpus.slice(1), Number.NaN]) {
    if (cpu === (prev ?? 0) + 1) {
      prev = cpu;
      continue;
    }
    if (start !== undefined) ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = cpu;
    prev = cpu;
  }

  return ranges.join(",");
}

function hasCommand(command: string): boolean {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** CPUs this process may run on (respects cgroup/affinity restrictions on Linux). */
export function allowedCpus(): number[] {
  try {
    const status = fs.readFileSync("/proc/self/status", "utf8");
    const match = /^Cpus_allowed_list:\s*(.+)$/m.exec(status);
    if (match?.[1]) return parseCpuList(match[1]);
  } catch {
    // not Linux
  }

  return Array.from({ length: os.availableParallelism() }, (_, index) => index);
}

export const canPinCpus = process.platform === "linux" && hasCommand("taskset");

export interface CpuLayout {
  /** CPUs the server under test is pinned to. */
  server: number[];
  /** CPUs the runner and its load generator are pinned to. */
  client: number[];
  /** CPUs the type checker is pinned to. */
  typecheck: number[];
  pinned: boolean;
}

/**
 * Picks disjoint CPU sets for the server and the load generator so they never compete for
 * the same core. The first CPU is left to the OS (interrupts, housekeeping) whenever possible.
 *
 * - 4+ CPUs: server = last CPU, load generator = the two CPUs before it
 * - 3 CPUs:  server = last CPU, load generator = the middle CPU
 * - 2 CPUs:  server = second CPU, load generator = first CPU
 */
export function defaultCpuLayout(cpus: readonly number[] = allowedCpus()): CpuLayout {
  const n = cpus.length;

  if (!canPinCpus || n < 2) {
    return { server: [...cpus], client: [...cpus], typecheck: [...cpus], pinned: false };
  }

  const server = [cpus[n - 1]!];
  const client = n >= 4 ? [cpus[n - 3]!, cpus[n - 2]!] : [cpus[n - 2]!];
  const typecheck = n >= 4 ? cpus.slice(1) : [...cpus];

  return { server, client, typecheck, pinned: true };
}

/** Prefixes a command with `taskset` so it (and every thread it spawns) runs on `cpus` only. */
export function pinned(
  command: string,
  args: string[],
  cpus: readonly number[] | undefined,
): [string, string[]] {
  if (!cpus || !canPinCpus) return [command, args];
  return ["taskset", ["-c", formatCpuList(cpus), command, ...args]];
}

let clockTicksPerSecond: number | undefined;

function clockTicks(): number {
  if (clockTicksPerSecond === undefined) {
    try {
      clockTicksPerSecond = Number.parseInt(execFileSync("getconf", ["CLK_TCK"]).toString(), 10);
    } catch {
      clockTicksPerSecond = 100;
    }
    if (!Number.isFinite(clockTicksPerSecond) || clockTicksPerSecond <= 0)
      clockTicksPerSecond = 100;
  }
  return clockTicksPerSecond;
}

/** Total CPU time (user + system, all threads) consumed by a process so far, in seconds. */
export function processCpuSeconds(pid: number): number | undefined {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    // The command name (field 2) may contain spaces, so parse from the closing parenthesis.
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    const utime = Number(fields[11]);
    const stime = Number(fields[12]);
    return (utime + stime) / clockTicks();
  } catch {
    return undefined;
  }
}

/** Current and peak resident set size of a process, in bytes. */
export function processMemory(pid: number): { rss: number; peakRss: number } | undefined {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    const rss = /^VmRSS:\s*(\d+) kB$/m.exec(status)?.[1];
    const peakRss = /^VmHWM:\s*(\d+) kB$/m.exec(status)?.[1];
    if (rss === undefined || peakRss === undefined) return undefined;
    return { rss: Number(rss) * 1024, peakRss: Number(peakRss) * 1024 };
  } catch {
    return undefined;
  }
}

export interface CpuTimes {
  total: number;
  steal: number;
}

/**
 * Aggregated jiffies of the given CPUs from `/proc/stat`. Steal time is the time the hypervisor
 * ran something else while this VM wanted the CPU — a direct measure of noisy neighbours.
 */
export function cpuTimes(cpus: readonly number[]): CpuTimes | undefined {
  try {
    const stat = fs.readFileSync("/proc/stat", "utf8");
    const result = { total: 0, steal: 0 };

    for (const cpu of cpus) {
      const line = new RegExp(`^cpu${cpu} (.+)$`, "m").exec(stat)?.[1];
      if (!line) return undefined;
      const values = line.trim().split(/\s+/).map(Number);
      // user nice system idle iowait irq softirq steal guest guest_nice — guest time is already
      // included in user/nice, so only the first eight fields are summed.
      result.total += values.slice(0, 8).reduce((a, b) => a + b, 0);
      result.steal += values[7] ?? 0;
    }

    return result;
  } catch {
    return undefined;
  }
}

function tryRead(file: string): string | undefined {
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    return undefined;
  }
}

function tryExec(command: string, args: string[]): string | undefined {
  try {
    return execFileSync(command, args, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

export interface Environment {
  cpu: string;
  cores: number;
  memory: string;
  os: string;
  virtualization?: string;
  node: string;
  v8: string;
  pnpm?: string;
}

export function environment(): Environment {
  const cpus = os.cpus();
  const lscpu = tryExec("lscpu", []);
  const hypervisor = lscpu && /^Hypervisor vendor:\s*(.+)$/m.exec(lscpu)?.[1];
  const pnpm = /\bpnpm\/(\S+)/.exec(process.env.npm_config_user_agent ?? "")?.[1];
  const distro = tryRead("/etc/os-release")?.match(/^PRETTY_NAME="?([^"\n]+)"?$/m)?.[1];

  return {
    cpu: cpus[0]?.model.trim() ?? "unknown",
    cores: cpus.length,
    memory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
    os: `${distro ?? os.type()} (${os.type()} ${os.release()} ${os.arch()})`,
    virtualization: hypervisor ? `${hypervisor} VM` : undefined,
    node: process.version,
    v8: process.versions.v8,
    pnpm,
  };
}
