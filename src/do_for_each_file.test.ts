import doForEachFile from "./do_for_each_file";
import fs from "fs";
import path from 'path';

test(
    'Does action for each filename and returns results in completion order', 
    done => {
        const filenames: string[] = [];

        //Loop backwards to show that Obserable returns values not in
        //`filenames` array order
        for (let i = 10; i >= 0; --i) {
            filenames.push(Array(i).fill('a').join(''));
        }

        async function action(filename: string): Promise<number> {
            const length = filename.length;

            await delay(length * 100);
            return length;
        }

        const observable = doForEachFile(filenames, action);
        let expected = 0;

        observable.subscribe({
            complete: done,
            error: failShouldNotError,

            next(value) {
                expect(value).toBe(expected);
                ++expected;
            }
        });
    }
);

function delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function failShouldNotError(error: any) {
    console.log('Got error: ', error);
    
    fail("Observable should complete without errors. " + 
        "See console log for the details about the error"
    );
}

test(
    'Fails when `action` throws any error other from `EMFILE` or `ENFILE`', 
    done => {
        const expectedError = new Error('Expected');
        let callsCount = 0;

        async function action(filename: string): Promise<number> {
            ++callsCount;

            switch (callsCount) {
                case 1: throwEmfile();
                case 3: throwEnfile();
                case 6: throw expectedError;
            }

            return 42;
        }

        const filenames = Array<string>(10).fill('a');
        const observable = doForEachFile(filenames, action);

        observable.subscribe({
            complete() {
                fail('Observable should have failed');
            },

            error(error) {
                expect(error).toMatchObject(expectedError);
                done();
            }
        })
    }
);

function throwEmfile(): never {
    const e: NodeJS.ErrnoException = {
        code: 'EMFILE',
        name: 'EMFILE',
        message: 'Too many filed opened by this process'
    };

    throw e;
}

function throwEnfile(): never {
    const e: NodeJS.ErrnoException = {
        code: 'ENFILE',
        name: 'ENFILE',
        message: 'Too many files opened in the OS'
    };

    throw e;
}

test('Calls `action` for each filename even if EMFILE is thrown', done => {
    const maxSimultaneousActions = 3;
    let inflightCalls = 0;

    async function action(filename: string): Promise<string> {
        if (inflightCalls + 1 >= maxSimultaneousActions) {
            throwEmfile();
        }

        ++inflightCalls;
        await delay(100);
        --inflightCalls;

        return filename;
    }

    testWithIdentityAction(distinctFilenames(10), action, done);
});

function distinctFilenames(count: number): string[] {
    const filenames: string[] = [];

    for (let i = 0; i < count; ++i) {
        filenames.push(Array(i).fill('a').join(''));
    }

    return filenames;
}

/**
 * Run test with `action` that returns the filename parameter
 */
function testWithIdentityAction(
    filenames: string[],
    action: (filename: string) => Promise<string>,
    done: jest.DoneCallback,
    beforeSubscribe?: () => void
) {
    const observable = doForEachFile(filenames, action);
    const returnedFilenames: string[] = [];

    beforeSubscribe?.call(undefined);

    observable.subscribe({
        error: failShouldNotError,

        complete() {
            expect(returnedFilenames.sort()).toEqual(filenames);
            done();
        },

        next(value) {
            returnedFilenames.push(value);
        }
    });
}

test(
    'Calls `action` for each filename even if ENFILE is thrown and is ' + 
    'caused by other processes',
    
    done => {
        let tooManyFilesAreOpenInOs = true;

        async function action(filename: string): Promise<string> {
            if (tooManyFilesAreOpenInOs) {
                throwEnfile();
            }

            await delay(50);
            return filename;
        }

        const beforeSubscribe = () => {
            setTimeout(() => tooManyFilesAreOpenInOs = false, 1000);
        };

        testWithIdentityAction(distinctFilenames(10), action, done, beforeSubscribe);
    }
);

test(
    'Calls `action` for each filename even if ENFILE is thrown and is ' + 
    'caused by this process itself',

    done => {
        const maxFilesOpenInOs = 3;
        let currentFilesOpenInOs = 0;

        async function action(filename: string): Promise<string> {
            if (currentFilesOpenInOs + 1 >= maxFilesOpenInOs) {
                throwEnfile();
            }

            ++currentFilesOpenInOs;
            await delay(10);
            --currentFilesOpenInOs;

            return filename;
        }

        testWithIdentityAction(distinctFilenames(10), action, done);
    }
);

//If you want to run this test, first ensure that there are bunch of files in
//`files-for-testing/`. Use `generate-files.ts` to generate them
test.skip('Works in a real situation with a lot of files', done => {
    const filesDirectory = path.resolve(__dirname, '../files-for-testing');

    fs.readdir(filesDirectory, (err, filenames) => {
        if (err) {
            fail(err);
        }

        async function action(filename: string): Promise<string> {
            return new Promise<string>((resolve, reject) => {
                fs.readFile(filename, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        //Return the filename instead of the data
                        resolve(filename);
                    }
                });
            });
        }

        filenames = filenames.map(f => path.resolve(filesDirectory, f));
        testWithIdentityAction(filenames, action, done);
    });
});
