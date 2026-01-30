const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// FORCE LD_LIBRARY_PATH
process.env.LD_LIBRARY_PATH = '/opt/alt/alt-nodejs20/root/usr/lib64';

// UNBUFFERED LOGGING TO FILE
const logFilePath = path.join(__dirname, 'debug.log');
const log = (msg) => {
    const line = new Date().toISOString() + ' : ' + msg + '\n';
    try {
        fs.appendFileSync(logFilePath, line);
    } catch (err) { }
    process.stdout.write(line);
};

log('--- STARTING ArgenCash Server (v9) ---');
log('CWD: ' + process.cwd());

// ENV LOADING
const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.builds', 'config', '.env')
];

envPaths.forEach(envPath => {
    if (fs.existsSync(envPath)) {
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
            log('Env loaded: ' + envPath);
        } catch (err) {
            log('Env load error: ' + err.message);
        }
    }
});

if (process.env.DATABASE_URL2 && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL2;
}

log('DATABASE_URL present: ' + (!!process.env.DATABASE_URL));

// VERIFY DATABASE FILE
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
    const dbPath = process.env.DATABASE_URL.replace('file:', '');
    if (fs.existsSync(dbPath)) {
        log('DB File found at: ' + dbPath);
        try {
            fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
            log('DB File is READ/WRITE accessible');
        } catch (e) {
            log('DB File PERMISSION ERROR: ' + e.message);
        }
    } else {
        log('DB File NOT FOUND at: ' + dbPath);
    }
}

const dev = false;
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port, dir: __dirname });
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
                log('RUNTIME ERROR: ' + err.stack);
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
        log('CRITICAL PREPARE ERROR: ' + err.stack);
        process.exit(1);
    });

process.on('uncaughtException', (err) => {
    log('UNCAUGHT EXCEPTION: ' + err.stack);
});

process.on('unhandledRejection', (reason) => {
    log('UNHANDLED REJECTION: ' + reason);
});
