import fs from 'fs';
import path from 'path';

const sizeInBytes = 1024; //1 KB
const copiesCount = 20_000;

const buffer = new ArrayBuffer(sizeInBytes);
const asBytes = new Int8Array(buffer);

for (let i = 0; i < sizeInBytes; ++i) {
    asBytes.set([i], i);
}

//Short for 'path'
const p = (filePath: string) => path.resolve(__dirname, '../files-for-test', filePath);

fs.writeFileSync(p('./a0.bin'), asBytes,  { flag: 'w' });

for (let i = 1; i < copiesCount; ++i) {

    fs.copyFile(p('./a0.bin'), p(`./a${i}.bin`), err => {
        if (err) {
            console.error(err);
        }
    });
}
