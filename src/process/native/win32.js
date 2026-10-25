import { execFile } from 'node:child_process';

const processQuery = [
  'Get-CimInstance Win32_Process',
  '| Select-Object ProcessId, ExecutablePath, CommandLine',
  '| ConvertTo-Json -Compress'
].join(' ');

function splitCommandLine(commandLine) {
  if (!commandLine) return [];
  const tokens = commandLine.match(/"(?:[^"\\]|\\.)*"|[^\s]+/g) || [];
  return tokens.map(token => token.replace(/^"|"$/g, ''));
}

export const getProcesses = () => new Promise(resolve => {
  execFile('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    processQuery
  ], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15000,
    maxBuffer: 32 * 1024 * 1024
  }, (error, stdout) => {
    if (error || !stdout.trim()) return resolve([]);

    try {
      const parsed = JSON.parse(stdout.replace(/^\uFEFF/, ''));
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      resolve(rows
        .map(row => {
          const pid = Number(row.ProcessId);
          const executablePath = row.ExecutablePath || splitCommandLine(row.CommandLine)[0] || '';
          const args = splitCommandLine(row.CommandLine).slice(1);
          return [pid, executablePath, args];
        })
        .filter(([pid, executablePath]) => pid > 0 && executablePath));
    } catch {
      resolve([]);
    }
  });
});
