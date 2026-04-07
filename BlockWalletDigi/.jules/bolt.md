## 2024-04-07 - Parallelize bulk external API pulls
**Learning:** Parallelizing database write operations can swallow errors meant to halt execution, so only read operations like external API fetches should be parallelized while keeping subsequent writes sequential to ensure data integrity.
**Action:** When refactoring sequential loops into parallel operations, ensure that error handling is preserved within the result processing phase (e.g., via `Promise.allSettled`) to prevent individual failures from crashing the entire batch operation.
