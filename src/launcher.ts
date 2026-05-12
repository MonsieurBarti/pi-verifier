import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

export interface LauncherDeps {
  sessionId: string;
  verifierScriptPath: string;
  port: number;
}

export interface LaunchResult {
  tmuxSession: string;
  mode: "in-tmux" | "new-window";
}

export async function launchVerifierTerminal(deps: LauncherDeps): Promise<LaunchResult> {
  const { sessionId, verifierScriptPath, port } = deps;
  const tmuxSession = `pi-verifier-${sessionId}`;

  // Idempotency: if already running, return existing
  if (await tmuxSessionExists(tmuxSession)) {
    return { tmuxSession, mode: process.env.TMUX ? "in-tmux" : "new-window" };
  }

  const command = `PI_VERIFIER_PORT=${port} node ${verifierScriptPath}`;

  if (process.env.TMUX) {
    // In-tmux branch: create sibling window
    await execFileP("tmux", [
      "new-window",
      "-n", tmuxSession,
      "-c", process.cwd(),
      command,
    ]);
    return { tmuxSession, mode: "in-tmux" };
  }

  // New-OS-window branch: detached tmux session
  await execFileP("tmux", [
    "new-session",
    "-d",
    "-s", tmuxSession,
    "-c", process.cwd(),
    command,
  ]);

  await applyVerifierTmuxOptions(tmuxSession);
  await openOsWindow(tmuxSession);

  return { tmuxSession, mode: "new-window" };
}

export async function killVerifierTerminal(sessionId: string): Promise<void> {
  const tmuxSession = `pi-verifier-${sessionId}`;
  try {
    await execFileP("tmux", ["kill-session", "-t", tmuxSession]);
  } catch {
    // ignore "session not found"
  }
}

async function tmuxSessionExists(name: string): Promise<boolean> {
  try {
    await execFileP("tmux", ["has-session", "-t", name]);
    return true;
  } catch {
    return false;
  }
}

async function applyVerifierTmuxOptions(session: string): Promise<void> {
  const opts: [string, string][] = [
    ["mouse", "on"],
    ["status", "off"],
    ["history-limit", "10000"],
    ["set-clipboard", "on"],
  ];
  await Promise.all(
    opts.map(async ([name, value]) => {
      try {
        await execFileP("tmux", ["set-option", "-t", session, name, value]);
      } catch {
        // non-fatal
      }
    }),
  );
}

async function openOsWindow(tmuxSession: string): Promise<void> {
  const attachCmd = `tmux attach -t ${tmuxSession}`;

  // Warp support
  if (await commandExists("warp")) {
    await execFileP("warp", ["-e", attachCmd]);
    return;
  }

  // macOS terminal emulators
  if (process.platform === "darwin") {
    const term = process.env.TERM_PROGRAM;
    if (term === "iTerm.app") {
      await execFileP("osascript", [
        "-e",
        `tell application "iTerm" to activate\ntell application "iTerm" to create window with default profile\ntell current session of current window of application "iTerm" to write text "${attachCmd}"`,
      ]);
      return;
    }
    if (term === "ghostty" || term === "Ghostty") {
      const exists = await commandExists("ghostty");
      await (exists
        ? execFileP("ghostty", ["-e", attachCmd])
        : execFileP("open", ["-na", "Ghostty", "--args", "-e", attachCmd]));
      return;
    }
    if (term === "WezTerm") {
      await execFileP("wezterm", ["cli", "spawn", "--new-window", "--", "tmux", "attach", "-t", tmuxSession]);
      return;
    }
    // Fallback: Terminal.app
    await execFileP("osascript", [
      "-e",
      `tell application "Terminal" to activate\ntell application "Terminal" to do script "${attachCmd}"`,
    ]);
    return;
  }

  // Linux
  if (process.platform === "linux") {
    const explicit = process.env.TERMINAL;
    if (explicit && await commandExists(explicit)) {
      await spawnLinuxTerminal(explicit, attachCmd);
      return;
    }
    const candidates = ["gnome-terminal", "konsole", "kitty", "alacritty", "xterm"];
    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await commandExists(candidate)) {
        // eslint-disable-next-line no-await-in-loop
        await spawnLinuxTerminal(candidate, attachCmd);
        return;
      }
    }
  }

  // Fallback: print attach instruction
  process.stderr.write(`Verifier running in tmux session: tmux attach -t ${tmuxSession}\n`);
}

async function spawnLinuxTerminal(emulator: string, attachCmd: string): Promise<void> {
  const base = emulator.split(/[/]/u).pop();
  switch (base) {
    case "gnome-terminal": {
      await execFileP(emulator, ["--", "bash", "-c", attachCmd]);
      break;
    }
    case "konsole":
    case "kitty":
    case "alacritty":
    case "xterm": {
      await execFileP(emulator, ["-e", "bash", "-c", attachCmd]);
      break;
    }
    default: {
      await execFileP(emulator, ["-e", attachCmd]);
    }
  }
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileP("sh", ["-c", `command -v ${command}`]);
    return true;
  } catch {
    return false;
  }
}
