const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// UNBUFFERED LOGGING TO FILE
const logFilePath = path.join(__dirname, 'debug.log');
const log = (msg) => {
    const line = new Date().toISOString() + ' : ' + msg + '\n';
    try {
        fs.appendFileSync(logFilePath, line);
    } catch (err) { }
    process.stdout.write(line);
};

log('--- STARTING ArgenCash Server (v6) ---');
log('CWD: ' + process.cwd());
log('__dirname: ' + __dirname);

// MULTI-PATH ENV LOADING
const envPaths = [
    path.join(__dirname, '.env'), // Standard
    path.join(__dirname, '..', '.env'), // Persistent parent
    path.join(__dirname, '.builds', 'config', '.env') // Hostinger HPanel path
];

envPaths.forEach(envPath => {
    if (fs.existsSync(envPath)) {
        log('Attempting to load env from: ' + envPath);
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length > 1) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                    process.env[key] = value;
                }
            });
            log('Loaded keys from ' + envPath);
        } catch (err) {
            log('Failed to read env from ' + envPath + ': ' + err.message);
        }
    }
});

// Priority Fix: Hostinger sometimes names it DATABASE_URL2 in secret paths
if (process.env.DATABASE_URL2 && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL2;
}

log('DATABASE_URL present: ' + (!!process.env.DATABASE_URL));
log('NEXTAUTH_SECRET present: ' + (!!process.env.NEXTAUTH_SECRET));

const dev = false;
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

log('Selected Port: ' + port);

const app = next({
    dev,
    hostname,
    port,
    dir: __dirname
});
const handle = app.getRequestHandler();

app.prepare()
    .then(() => {
        log('Next.js app prepared. Creating server...');
        const server = createServer(async (req, res) => {
            log('--- REQUEST RECEIVED: ' + req.method + ' ' + req.url + ' ---');
            try {
                const parsedUrl = parse(req.url, true);
                await handle(req, res, parsedUrl);
            } catch (err) {
                log('RUNTIME ERROR handling request: ' + err.stack);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        });

        server.listen(port, hostname, (err) => {
            if (err) {
                log('FAILED to listen: ' + err.stack);
            } else {
                log('HTTP Server listening on port ' + port);
            }
        });
    })
    .catch(err => {
        log('CRITICAL ERROR on app.prepare(): ' + err.stack);
        process.exit(1);
    });

process.on('uncaughtException', (err) => {
    log('UNCAUGHT EXCEPTION: ' + err.stack);
});

process.on('unhandledRejection', (reason) => {
    log('UNHANDLED REJECTION: ' + reason);
});
