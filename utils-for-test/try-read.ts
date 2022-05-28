import fs from "fs";
import path from 'path';

const myPath = process.argv[1];
const myDirectory = path.dirname(myPath);

const directory = path.resolve(myDirectory, '../files-for-test');

fs.readdir(directory, (err, files) => {
    if (err) {
        console.error(err);
        process.exitCode = -1;
        return;
    }

    let failedOnce = false;

    files.forEach(f => {
        const absoluteF = path.resolve(directory, f);

        fs.readFile(absoluteF, (err, buffer) => {
            if (err && !failedOnce) {
                failedOnce = true;
                console.log(err.code);
            }
        });
    });
});
