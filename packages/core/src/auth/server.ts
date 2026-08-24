import { createServer, type Server } from 'node:http';

export interface CallbackResult {
  code: string;
  state: string;
}

export interface EphemeralServerOptions {
  port?: number;
  expectedState: string;
  timeoutMs?: number;
}

export class EphemeralAuthServer {
  private readonly port: number;
  private readonly expectedState: string;
  private readonly timeoutMs: number;
  private server?: Server;

  constructor(options: EphemeralServerOptions) {
    this.port = options.port || 3391;
    this.expectedState = options.expectedState;
    this.timeoutMs = options.timeoutMs || 120000; // 2 minutes
  }

  async waitForCallback(): Promise<CallbackResult> {
    return new Promise((resolve, reject) => {
      let timeoutHandle: Timer;

      this.server = createServer((req, res) => {
        try {
          const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);

          if (url.pathname !== '/callback') {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }

          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          const error = url.searchParams.get('error');
          const errorDescription = url.searchParams.get('error_description');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(this.renderHtmlResponse(false, `Authentication error: ${error} - ${errorDescription || ''}`));
            clearTimeout(timeoutHandle);
            this.shutdown();
            reject(new Error(`OAuth Error: ${error} (${errorDescription || 'no description'})`));
            return;
          }

          if (!code || !state) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(this.renderHtmlResponse(false, 'Missing code or state parameter.'));
            clearTimeout(timeoutHandle);
            this.shutdown();
            reject(new Error('Invalid callback: missing code or state'));
            return;
          }

          if (state !== this.expectedState) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(this.renderHtmlResponse(false, 'State mismatch detected (CSRF protection).'));
            clearTimeout(timeoutHandle);
            this.shutdown();
            reject(new Error('State mismatch detected: potential CSRF attempt'));
            return;
          }

          // Success
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.renderHtmlResponse(true, 'Authentication successful! You can now close this tab and return to your terminal.'));

          clearTimeout(timeoutHandle);
          setTimeout(() => this.shutdown(), 500); // Allow browser to finish rendering
          resolve({ code, state });
        } catch (err) {
          clearTimeout(timeoutHandle);
          this.shutdown();
          reject(err);
        }
      });

      this.server.on('error', (err) => {
        clearTimeout(timeoutHandle);
        this.shutdown();
        reject(err);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        timeoutHandle = setTimeout(() => {
          this.shutdown();
          reject(new Error(`Authentication timed out after ${this.timeoutMs / 1000}s.`));
        }, this.timeoutMs);
      });
    });
  }

  shutdown(): void {
    if (this.server) {
      try {
        this.server.close();
      } catch {
        // Ignore close errors
      }
      this.server = undefined;
    }
  }

  private renderHtmlResponse(success: boolean, message: string): string {
    const title = success ? 'Cast CLI: Authenticated' : 'Cast CLI: Auth Failed';
    const color = success ? '#10b981' : '#ef4444';
    const icon = success ? '✓' : '✕';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: #1e293b;
      padding: 2.5rem;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      text-align: center;
      max-width: 420px;
      border: 1px solid #334155;
    }
    .icon {
      font-size: 3rem;
      color: ${color};
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  }
}
