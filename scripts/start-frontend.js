// because cd frontend && ... is not cross-platform
const args = ['start'];
const opts = { stdio: 'inherit', cwd: 'frontend', shell: true };
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('child_process').spawn('npm', args, opts);
