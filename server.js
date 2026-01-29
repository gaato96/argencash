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

const dev = false;
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

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
        createServer(async (req, res) => {
            try {
                const parsedUrl = parse(req.url, true);
                await handle(req, res, parsedUrl);
            } catch (err) {
                log('ERROR handling request ' + req.url + ' : ' + err.stack);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        })
            .listen(port, () => {
                log('HTTP Server ready on port ' + port);
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
