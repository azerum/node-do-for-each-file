import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const totalSizeInBytes = 1204 * 1024 * 50; //50MB
const filesCount = 20_000;

const oneFileSize = Math.floor(totalSizeInBytes / filesCount);

const buffer = new ArrayBuffer(oneFileSize);
const asBytes = new Int8Array(buffer);

for (let i = 0; i < oneFileSize; ++i) {
    asBytes.set([i], i);
}

const directory = path.resolve(__dirname, '../files-for-testing');

if (fs.existsSync(directory)) {
    execSync(`rm -rf "${directory}"`)
}

execSync(`mkdir "${directory}"`);

//Short for 'path'
const p = (filePath: string) => path.join(directory, filePath);

fs.writeFileSync(p('./a0.bin'), asBytes,  { flag: 'w' });

for (let i = 1; i < filesCount; ++i) {
    fs.copyFile(p('./a0.bin'), p(`./a${i}.bin`), err => {
        if (err) {
            console.error(err);
        }
    });
}
