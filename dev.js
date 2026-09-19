import { spawn } from 'child_process';
import http from 'http';

function checkBackend(callback) {
  const req = http.get('http://127.0.0.1:8001/api/health', (res) => {
    callback(res.statusCode === 200);
  });

  req.on('error', () => callback(false));

  req.setTimeout(1000, () => {
    req.destroy();
    callback(false);
  });
}

function startBackend() {
  console.log(
    '[DocuMind] Starting FastAPI backend on http://127.0.0.1:8001 ...'
  );

  const proc = spawn(
    'python',
    [
      '-m',
      'uvicorn',
      'backend.app.main:app',
      '--host',
      '127.0.0.1',
      '--port',
      '8001',
    ],
    {
      stdio: 'inherit',
    }
  );

  proc.on('error', (err) => {
    console.error('[DocuMind] Failed to start FastAPI:', err);
  });

  return proc;
}

checkBackend((isRunning) => {
  let backendProc = null;

  if (!isRunning) {
    backendProc = startBackend();
  } else {
    console.log(
      '[DocuMind] FastAPI backend already running on http://127.0.0.1:8001'
    );
  }

  console.log(
    '[DocuMind] Starting Vite frontend on http://localhost:3000 ...'
  );

  const viteProc = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--port',
      '3000',
      '--host',
      '0.0.0.0',
    ],
    {
      stdio: 'inherit',
    }
  );

  viteProc.on('error', (err) => {
    console.error('[DocuMind] Failed to start Vite:', err);
  });

  const cleanup = () => {
    if (backendProc) {
      backendProc.kill();
    }

    viteProc.kill();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
});
