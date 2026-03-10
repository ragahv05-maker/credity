import { fetch as undiciFetch } from 'undici';
async function run() {
  try {
    const res = await undiciFetch('http://127.0.0.1:5001/');
    console.log(res.status);
  } catch(e) {
    console.error(e);
  }
}
run();
