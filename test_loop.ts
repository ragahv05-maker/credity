const options = { headers: { 'Authorization': 'Bearer asd', 'Content-Type': 'application/json' } };
const opts = { ...options };
if (opts.headers) {
    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(opts.headers)) {
        headers[key.toLowerCase()] = val as string;
    }
    opts.headers = headers;
}
console.log(opts);
