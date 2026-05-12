import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

export interface LauncherDeps {
  sessionId: string;
  verifierCommand: string;
}

export interface LaunchResult {
  tmuxSession: string;
}

/**
 * Launch the verifier inside a detached tmux session.
 * No terminal window is auto-opened — the user runs `/verify launch` to get
 * the attach command and paste it into their preferred terminal (Warp, iTerm, etc.).
 */
export async function launchVerifierTerminal(deps: LauncherDeps): Promise<LaunchResult> {
  const { sessionId, verifierCommand } = deps;
  const tmuxSession = `pi-verifier-${sessionId}`;

  // Idempotency: if already running, return existing
  if (await tmuxSessionExists(tmuxSession)) {
    return { tmuxSession };
  }

  // Create a detached tmux session that survives even if we disconnect.
  // verifierCommand is a shell-ready string like `bash /tmp/xxx.spawn.sh`.
  await execFileP("tmux", [
    "new-session",
    "-d",
    "-s",
    tmuxSession,
    "-c",
    process.cwd(),
    verifierCommand,
  ]);
  await applyVerifierTmuxOptions(tmuxSession);

  return { tmuxSession };
}

export async function killVerifierTerminal(sessionId: string): Promise<void> {
  const tmuxSession = `pi-verifier-${sessionId}`;
  try {
    await execFileP("tmux", ["kill-session", "-t", tmuxSession]);
  } catch {
    // ignore "session not found"
  }
}

export function getTmuxAttachCommand(sessionId: string): string {
  return `tmux attach -t pi-verifier-${sessionId}`;
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
