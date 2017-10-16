if (process.argv.length < 4) {
    console.info("Usage: wiremock-reload ${WIREMOCK_HOSTNAME} ${WIREMOCK_PORT} ${MAPPING_JSON_DIR}")
    process.exit(1);
}

const host = process.argv[2];
const port = process.argv[3];
const dir = process.argv[4];

const http = require('http');
const fs = require('fs');
const path = require('path');

items = fs.readdirSync(dir);
const data = items
    .filter(i => i.indexOf('.json') > 0)
    .map(i => ({ data: require(path.resolve(dir, `./${i}`)), name: i }))
    .filter(d => d.data.request);

run();

async function run() {
    try {
        const deleteData = await deleteAll();
        console.log('ALL DELETED: ', deleteData.statusCode);
        const arPostData = await Promise.all(data.map(d => post(d)));
        arPostData.forEach(d => {
            console.log('POST OK: ', JSON.parse(d.data).request);
        })
    } catch (e) {
        console.error('ERROR===>', e);
    }
}

async function deleteAll() {
    return await ajax('/__admin/mappings', 'DELETE', '');
}

async function post(api) {
    return await ajax('/__admin/mappings', 'POST', JSON.stringify(api.data));
}

function ajax(path, method, bodyString) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: host,
            port: port,
            path: path,
            method: method,
        }, response => {
            var respData = '';
            response.setEncoding('utf-8');
            response.on('data', (chunk) => {
                respData += chunk;
            });
            response.on('end', () => {
                var fnResult = (Math.round(response.statusCode / 100)) === 2 ? resolve : reject;
                fnResult({
                    statusCode: response.statusCode,
                    data: respData
                })
            });
        });
        req.on('error', (e) => {
            reject({
                statusCode: undefined,
                data: e
            });
        });
        req.write(bodyString);
        req.end();
    })
}