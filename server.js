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

log('--- STARTING ArgenCash Server (v5) ---');
log('CWD: ' + process.cwd());
log('__dirname: ' + __dirname);
log('Node Version: ' + process.version);

// ROBUST ENV LOADING
try {
    require('dotenv').config();
    log('.env loaded via dotenv');
} catch (e) {
    log('dotenv not available, attempting manual .env load');
    try {
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length > 1) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                    process.env[key] = value;
                }
            });
            log('.env loaded manually');
        } else {
            log('.env file NOT FOUND at ' + envPath);
        }
    } catch (err) {
        log('Error reading .env: ' + err.message);
    }
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
