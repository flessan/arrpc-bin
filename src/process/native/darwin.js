import { execFile } from 'node:child_process';

export const getProcesses = () => new Promise(resolve => {
  execFile('/bin/ps', ['-axo', 'pid=,comm='], {
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 16 * 1024 * 1024
  }, (error, stdout) => {
    if (error) return resolve([]);

    const processes = stdout.split(/\r?\n/).map(line => {
      const match = line.match(/^\s*(\d+)\s+(.+?)\s*$/);
      if (!match) return null;
      return [Number(match[1]), match[2], []];
    });

    resolve(processes.filter(Boolean).filter(([pid]) => pid > 0));
  });
});
