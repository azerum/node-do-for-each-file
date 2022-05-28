import { Observable, Subject } from "rxjs";

export default function doForEachFile<T>(
    filenames: string[],
    action: (filename: string) => Promise<T>
): Observable<T> {
    const subject = new Subject<T>();

    let failed = false;
    let completedCount = 0;

    let timeout: NodeJS.Timeout | null = null;
    let nextBackoffTimeInMs = 2000;

    const postponedFiles: string[] = [];

    filenames.forEach(handle);
    return subject.asObservable();

    function handle(file: string) {
        action(file).then(
            onCompleted,
            error => onFailed(file, error)
        );
    }

    function onCompleted(result: T) {
        if (failed) {
            return;
        }

        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }

        subject.next(result);
        ++completedCount;

        if (completedCount === filenames.length) {
            subject.complete();
            return;
        }

        handleNextPostponedFileIfAny();
    }

    function onFailed(file: string, error: any) {
        if (failed) {
            return;
        }

        switch (error.code) {
            case 'ENFILE':
                //Too many files open in the whole operating system
                postponedFiles.push(file);

                if (!timeout) {
                    timeout = setTimeout(
                        () => {
                            handleNextPostponedFileIfAny();
                            timeout = null;
                        }, 

                        nextBackoffTimeInMs
                    );

                    nextBackoffTimeInMs *= 2;
                }
            break;

            case 'EMFILE':
                //Too many files open by the current process
                postponedFiles.push(file);
                break;

            default:
                failed = true;
                subject.error(error);
                break;
        }
    }

    function handleNextPostponedFileIfAny() {
        if (postponedFiles.length > 0) {
            const file = postponedFiles.splice(0, 1)[0];
            handle(file);
        }
    }
}
