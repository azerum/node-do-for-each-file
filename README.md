This repository contains the source code of function

```ts
function doForEachFile<T>(
    filenames: string[],
    action: (filename: string) => Promise<T>
): Observable<T> 
```

It allows you to execute an action for each filename from
the array (e.g. read the whole contents of the file) while also handling `EMFILE` (the limit of max opened files per process exceeded by your program) and `ENFILE` (the limit of max opened files in the entire OS is exceeded).

You can then consume the results of each `action` as
`Observable`

```ts
import fs from 'fs/promises';

const content$ = doForEachFile(filenames, fs.readFile);

content$.subscribe(fileContent => ...);
```
