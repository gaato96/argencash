const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// MANUAL LOGGING TO FILE
const logFilePath = path.join(__dirname, 'debug.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
const log = (msg) => {
    const line = new Date().toISOString() + ' : ' + msg + '\n';
    logStream.write(line);
    process.stdout.write(line);
};

log('--- STARTING ArgenCash Server ---');
log('CWD: ' + process.cwd());
log('__dirname: ' + __dirname);
log('Node Version: ' + process.version);
log('process.env.PORT: ' + process.env.PORT);
log('process.env.NODE_ENV: ' + process.env.NODE_ENV);

const dev = false;
// Try 127.0.0.1 as some proxies prefer it over 0.0.0.0
const hostname = '127.0.0.1';
const port = parseInt(process.env.PORT, 10) || 3000;

log('Configured Hostname: ' + hostname);
log('Configured Port: ' + port);

const app = next({
    dev,
    hostname,
    port,
    dir: __dirname
});
const handle = app.getRequestHandler();

app.prepare()
    .then(() => {
        log('Next.js app prepared. Starting HTTP server...');
        const server = createServer(async (req, res) => {
            // Log every request to see if they reach us
            log('Request received: ' + req.method + ' ' + req.url);
            try {
                const parsedUrl = parse(req.url, true);
                await handle(req, res, parsedUrl);
            } catch (err) {
                log('ERROR handling request ' + req.url + ' : ' + err.stack);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        });

        server.listen(port, hostname, (err) => {
            if (err) {
                log('FAILED to listen on port ' + port + ': ' + err.stack);
            } else {
                log('HTTP Server ready on ' + hostname + ':' + port);
            }
        });
    })
    .catch(err => {
        log('CRITICAL: Next.js app.prepare() failed: ' + err.stack);
        process.exit(1);
    });

process.on('uncaughtException', (err) => {
    log('UNCAUGHT EXCEPTION: ' + err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    log('UNHANDLED REJECTION at: ' + promise + ' reason: ' + reason);
});
