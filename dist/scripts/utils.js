"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectInputStream = void 0;
function collectInputStream(inputStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        inputStream.on('error', err => {
            reject(err);
        });
        inputStream.on('data', chunk => {
            chunks.push(chunk);
        });
        inputStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });
}
exports.collectInputStream = collectInputStream;
