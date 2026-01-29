const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

const dev = false; // Force production for Hostinger
const hostname = '0.0.0.0'; // Listen on all interfaces
const port = process.env.PORT || 3000;

console.log('--- STARTING ArgenCash Server ---');
console.log('Current Working Directory (CWD):', process.cwd());
console.log('Directory Name (__dirname):', __dirname);
console.log('Node Version:', process.version);

const app = next({
    dev,
    hostname,
    port,
    dir: __dirname // Explicitly point to current directory
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
    createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    })
        .listen(port, () => {
            console.log(`> Ready on port ${port}`);
        });
}).catch(err => {
    console.error('Next.js app.prepare() failed:', err);
    process.exit(1);
});
