import runMax from "./run_max";
import fs from "fs";
import fsAsync from 'fs/promises';
import path from 'path';

test('Returns functions results in their completion order', done => {
    async function f(no: number): Promise<number> {
        await delay(no * 50);
        return no;
    }

    const funcs = [];
    
    for (let i = 10; i >= 1; --i) {
        funcs.push(() => f(i));
    }

    const observable = runMax(funcs, () => false);
    let valuesCount = 0;

    observable.subscribe({
        complete() {
            expect(valuesCount).toBe(10);
            done();
        },

        error: failShouldNotError,

        next(value) {
            ++valuesCount;
            expect(value).toBe(valuesCount);
        }
    });
});

function delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function failShouldNotError(error: any) {
    console.log('Got error: ', error);

    fail("runMax()'s Observable should complete without errors. " + 
        "See console log for the details about the error"
    );
}

test("Runs all functions in parallel when they never reach the limit", done => {
    let currentInflightCalls = 0;
    let maxInflightCalls = 0;

    async function f(): Promise<number> {
        ++currentInflightCalls;
        maxInflightCalls = Math.max(maxInflightCalls, currentInflightCalls);

        await delay(100);
        --currentInflightCalls;

        return 42;
    }

    const funcs = Array(10).fill(f);
    const observable = runMax(funcs, () => false);

    observable.subscribe({
        complete() {
            expect(maxInflightCalls).toBe(10);
            expect(currentInflightCalls).toBe(0);

            done();
        },

        error: failShouldNotError
    });
});

test(
    'Errors when any function throws an error for which ' + 
    '`isReachedLimitError` returns false',

    done => {
        let callsCount = 0;

        async function f(): Promise<number> {
            ++callsCount;

            switch (callsCount) {
                case 3:
                    throw new Error('Reached limit');

                case 6:
                    throw new Error('Some other error');
            }

            return 42;
        }

        const funcs = Array(10).fill(f);
        const observable = runMax(funcs, isReachedLimitError);

        observable.subscribe({
             complete() {
                 fail("runMax()'s Observable should error");
             },

             error(error: any) {
                 if (error instanceof Error) {
                     expect(error.message).toBe('Some other error');
                     done();
                     return;
                 }

                 fail('Returned error must be same as thrown exception');
             }
        });
    }
);

function isReachedLimitError(error: any) {
    return error.message === 'Reached limit';
}

test(
    'Completes all the functions even when they have simultaneous calls limit', 
    done => {
        const limit = 3;
        let currentInflightCalls = 0;

        async function f(): Promise<number> {
            ++currentInflightCalls;

            if (currentInflightCalls === limit) {
                --currentInflightCalls;
                throw new Error('Reached limit');
            }

            await delay(50);
            --currentInflightCalls;

            return 42;
        }

        const funcs = Array(10).fill(f);

        const observable = runMax(funcs, isReachedLimitError);
        let valuesCount = 0;

        observable.subscribe({
            complete() {
                expect(valuesCount).toBe(10);
                expect(currentInflightCalls).toBe(0);

                done();
            },

            error: failShouldNotError,

            next() {
                ++valuesCount;
            }
        });
    }
);

test.skip('Handles a real-life situation with opening a lot of files', done => {
    const filesForTestPath = path.resolve(__dirname, '../files-for-test');

    const isOpenedTooManyFilesError = (error: any) => {
        switch (error.code) {
            case 'EMFILE':
                return true;

            case 'ENFILE':
                return true;
        }

        return false;
    };

    fs.readdir(filesForTestPath, (error, files) => {
        if (error) {
            fail(error);
        }
        
        let filesRead = 0;
        
        const funcs = files.map(filename => {
            const absoluteFilename = path.resolve(filesForTestPath, filename);

            return async () => {
                await fsAsync.readFile(absoluteFilename);
                ++filesRead;
            }
        });

        const observable = runMax(funcs, isOpenedTooManyFilesError);

        observable.subscribe({
            complete() {
                expect(filesRead).toBe(files.length);
                done();
            },

            error: failShouldNotError
        });
    });
});
