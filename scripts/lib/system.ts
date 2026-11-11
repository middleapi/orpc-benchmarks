import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function tryRead(file: string): string | undefined {
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    return undefined;
  }
}

function tryExec(command: string, args: string[]): string | undefined {
  try {
    return run(command, args).trim();
  } catch {
    return undefined;
  }
}

/** Runs a command and returns its stdout; throws with its output if it fails. */
export function run(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {},
): string {
  const result = spawnSync(command, args, { ...options, encoding: "utf8" });
  if (result.status !== 0) {
    const reason =
      result.error?.message ??
      (result.signal ? `killed by ${result.signal}` : `exit code ${result.status}`);
    const where = options.cwd ? ` in ${options.cwd}` : "";
    throw new Error(
      `\`${[command, ...args].join(" ")}\` failed${where} (${reason}):\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result.stdout;
}

function packageJson(root: string, pkg: string) {
  return JSON.parse(fs.readFileSync(path.join(root, "node_modules", pkg, "package.json"), "utf8"));
}

export function packageVersion(root: string, pkg: string): string {
  return packageJson(root, pkg).version;
}

/** Command running an installed package's bin script with this Node.js (no shell shim needed). */
export function packageBin(root: string, pkg: string, name = pkg): [string, string] {
  const { bin } = packageJson(root, pkg);
  const script = typeof bin === "string" ? bin : bin?.[name];
  if (typeof script !== "string") throw new Error(`${pkg} has no "${name}" executable`);
  return [process.execPath, path.join(root, "node_modules", pkg, script)];
}

/** Parses a Linux CPU list such as `0-3,6`. */
export function parseCpuList(list: string): number[] {
  const cpus = new Set<number>();
  for (const part of list.split(",")) {
    const [, from, to = from] = /^\s*(\d+)(?:-(\d+))?\s*$/.exec(part) ?? [];
    if (from === undefined || Number(from) > Number(to)) {
      throw new Error(`Invalid CPU list: "${list}"`);
    }
    for (let cpu = Number(from); cpu <= Number(to); cpu++) cpus.add(cpu);
  }
  return [...cpus].sort((a, b) => a - b);
}

/** Formats `[0, 1, 2, 3, 6]` as `0-3,6`. */
export function formatCpuList(cpus: readonly number[]): string {
  const ranges: string[] = [];
  for (let i = 0; i < cpus.length; i++) {
    const start = cpus[i]!;
    while (cpus[i + 1] === cpus[i]! + 1) i++;
    ranges.push(start === cpus[i] ? `${start}` : `${start}-${cpus[i]}`);
  }
  return ranges.join(",");
}

/** CPUs this process may run on (affinity and cgroup limits included). */
export function allowedCpus(): number[] {
  const list = tryRead("/proc/self/status")?.match(/^Cpus_allowed_list:\s*(.+)$/m)?.[1];
  return list
    ? parseCpuList(list)
    : Array.from({ length: os.availableParallelism() }, (_, index) => index);
}

/** Groups `cpus` by physical core (SMT siblings together). */
function physicalCores(cpus: readonly number[]): number[][] {
  const cores = new Map<string, number[]>();
  for (const cpu of cpus) {
    const topology = `/sys/devices/system/cpu/cpu${cpu}/topology`;
    const key =
      tryRead(`${topology}/core_cpus_list`) ??
      tryRead(`${topology}/thread_siblings_list`) ??
      `${cpu}`;
    cores.set(key, [...(cores.get(key) ?? []), cpu]);
  }
  return [...cores.values()];
}

interface CpuLayout {
  /** The server under test, and `tsc`. */
  server: number[];
  /** The runner and its load generator threads. */
  client: number[];
  /** SMT siblings of the server, left unused. */
  idle: number[];
  /** Client CPUs on the server's physical core. */
  shared: number[];
}

/**
 * Default: the server gets one thread of the last physical core, the load generator up to two
 * CPUs on other cores (one per core first), sparing the first CPU for the OS when another is free.
 */
function pickCpus(
  cpus: readonly number[],
  cores: number[][],
  overrides: { server?: number[]; client?: number[] },
): CpuLayout {
  const server = overrides.server ?? [cores.at(-1)!.at(-1)!];
  const others = cores.filter((core) => !core.some((cpu) => server.includes(cpu)));
  let client = overrides.client;
  if (!client && others.length === 0) {
    client = cpus.filter((cpu) => !server.includes(cpu)).slice(-2);
  } else if (!client) {
    const pool =
      others.length > 1 ? others.slice(1) : others[0]!.length > 1 ? [others[0]!.slice(1)] : others;
    const nearestFirst = [...pool].reverse();
    const candidates: number[] = [];
    for (let thread = 0; thread < Math.max(...pool.map((core) => core.length)); thread++) {
      for (const core of nearestFirst)
        if (core[thread] !== undefined) candidates.push(core[thread]!);
    }
    client = candidates.slice(0, 2).sort((a, b) => a - b);
  }
  if (server.some((cpu) => client.includes(cpu))) {
    throw new Error("The server and load generator CPUs must not overlap");
  }
  if (!client.length) throw new Error("No CPU left for the load generator: pass --client-cpus");

  const serverCores = cores.filter((core) => core.some((cpu) => server.includes(cpu))).flat();
  return {
    server,
    client,
    idle: serverCores.filter((cpu) => !server.includes(cpu) && !client.includes(cpu)),
    shared: client.filter((cpu) => serverCores.includes(cpu)),
  };
}

/** The CPU layout, or `undefined` when nothing can be pinned (needs Linux, `taskset`, 2+ CPUs). */
export function cpuLayout(overrides: {
  server?: number[];
  client?: number[];
}): CpuLayout | undefined {
  const cpus = allowedCpus();
  if (process.platform !== "linux" || cpus.length < 2 || !tryExec("taskset", ["--version"])) {
    return undefined;
  }
  for (const cpu of [...(overrides.server ?? []), ...(overrides.client ?? [])]) {
    if (!cpus.includes(cpu))
      throw new Error(`CPU ${cpu} is not available (allowed: ${formatCpuList(cpus)})`);
  }
  return pickCpus(cpus, physicalCores(cpus), overrides);
}

/** Prefixes a command with `taskset`, so it and all its threads run on `cpus` only. */
export function pinned(
  command: string,
  args: string[],
  cpus?: readonly number[],
): [string, string[]] {
  return cpus ? ["taskset", ["-c", formatCpuList(cpus), command, ...args]] : [command, args];
}

/** Pins every thread of this process to `cpus`; threads created later inherit the mask. */
export function pinCurrentProcess(cpus: readonly number[]): void {
  run("taskset", ["-a", "-p", "-c", formatCpuList(cpus), String(process.pid)]);
}

/** Unit of the CPU times in /proc/<pid>/stat on every Linux architecture Node.js runs on. */
const USER_HZ = 100;

/** CPU time (user + system, all threads) a process has used, in seconds. */
export function processCpuSeconds(pid: number): number | undefined {
  const stat = tryRead(`/proc/${pid}/stat`);
  if (!stat) return undefined;
  // The command name may contain spaces: parse after its closing parenthesis.
  const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
  return (Number(fields[11]) + Number(fields[12])) / USER_HZ;
}

/** Current and peak resident set size of a process, in bytes. */
export function processMemory(pid: number): { rss: number; peakRss: number } | undefined {
  const status = tryRead(`/proc/${pid}/status`);
  const kib = (field: string) =>
    Number(status?.match(new RegExp(`^${field}:\\s*(\\d+) kB$`, "m"))?.[1]) * 1024;
  const rss = kib("VmRSS");
  const peakRss = kib("VmHWM");
  return Number.isNaN(rss) || Number.isNaN(peakRss) ? undefined : { rss, peakRss };
}

/** Total and steal jiffies of `cpus` (steal: time the hypervisor gave to other VMs). */
export function cpuTimes(cpus: readonly number[]): { total: number; steal: number } | undefined {
  const stat = tryRead("/proc/stat");
  if (!stat) return undefined;
  const times = { total: 0, steal: 0 };
  for (const cpu of cpus) {
    const line = stat.match(new RegExp(`^cpu${cpu} (.+)$`, "m"))?.[1];
    if (!line) return undefined;
    // user nice system idle iowait irq softirq steal (guest time is already in user and nice)
    const values = line.trim().split(/\s+/).slice(0, 8).map(Number);
    times.total += values.reduce((a, b) => a + b, 0);
    times.steal += values[7] ?? 0;
  }
  return times;
}

export interface Environment {
  cpu: string;
  /** Logical CPUs. */
  cores: number;
  threadsPerCore?: number;
  memory: string;
  os: string;
  virtualization?: string;
  node: string;
  v8: string;
  pnpm?: string;
}

export function environment(): Environment {
  const lscpu = tryExec("lscpu", []);
  const hypervisor = lscpu?.match(/^Hypervisor vendor:\s*(.+)$/m)?.[1];
  const threadsPerCore = lscpu?.match(/^Thread\(s\) per core:\s*(\d+)$/m)?.[1];
  const distro = tryRead("/etc/os-release")?.match(/^PRETTY_NAME="?([^"\n]+)"?$/m)?.[1];

  return {
    cpu: os.cpus()[0]?.model.trim() ?? "unknown",
    cores: os.cpus().length,
    threadsPerCore: threadsPerCore ? Number(threadsPerCore) : undefined,
    memory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
    os: `${distro ?? os.type()} (${os.type()} ${os.release()} ${os.arch()})`,
    virtualization: hypervisor ? `${hypervisor} VM` : undefined,
    node: process.version,
    v8: process.versions.v8,
    pnpm: /\bpnpm\/(\S+)/.exec(process.env.npm_config_user_agent ?? "")?.[1],
  };
}
