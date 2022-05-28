import { Observable, Subject } from "rxjs";

export default function doForEachFile<T>(
    filenames: string,
    action: (filename: string) => Promise<T>
): Observable<T> {
    type F = (filename: string) => Promise<T>;

    const subject = new Subject<T>();

    let failed = false;
    let completedCount = 0;

    let nextBackoffTime = 2;

    const postponedFuncs: F[] = [];

    funcs.forEach(run);

    return subject.asObservable();

    function run(f: F) {
        f().then(
            result => onCompleted(f, result),
            error => onFailed(f, error)
        );
    }

    function onCompleted(f: F, result: T) {
        if (failed) {
            return;
        }

        subject.next(result);
        ++completedCount;

        if (completedCount === funcs.length) {
            subject.complete();
            return;
        }

        if (postponedFuncs.length > 0) {
            const nextF = postponedFuncs.splice(0, 1)[0];
            run(nextF);
        }
    }

    function onFailed(f: F, error: any) {
        if (failed) {
            return;
        }

        switch (error.code) {
            case 'ENFILE':
                //Too many files open by the current process. We can wait for
                //next file operation to complete and then start the next one
                break;

            case 'EMFILE':
                //Too many files open in the whole operating system.
                //All we can do here is exponential backoff
                break;

            default:
                failed = true;
                subject.error(error);
                break;
        }
    }
}
