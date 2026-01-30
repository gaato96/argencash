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
    } catch (err) {
        // Fallback to console if file write fails
    }
    process.stdout.write(line);
};

log('--- STARTING ArgenCash Server (v4) ---');
log('CWD: ' + process.cwd());
log('__dirname: ' + __dirname);
log('Node Version: ' + process.version);
log('PORT from env: ' + process.env.PORT);

// Log all env vars to see if there is a special Hostinger port
log('All ENV keys: ' + Object.keys(process.env).join(', '));

const dev = false;
const hostname = '0.0.0.0'; // Back to 0.0.0.0 to be sure
const port = parseInt(process.env.PORT, 10) || 3000;

log('Selected Hostname: ' + hostname);
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
            // THIS LOG IS CRITICAL: If we don't see this, the request is not reaching Node
            log('--- REQUEST RECEIVED: ' + req.method + ' ' + req.url + ' ---');
            try {
                const parsedUrl = parse(req.url, true);
                await handle(req, res, parsedUrl);
            } catch (err) {
                log('ERROR handling request: ' + err.stack);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        });

        server.listen(port, hostname, (err) => {
            if (err) {
                log('FAILED to listen: ' + err.stack);
            } else {
                log('HTTP Server listening on ' + hostname + ':' + port);
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
