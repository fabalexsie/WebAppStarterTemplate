// because cd frontend && ... is not cross-platform
const args = ['start'];
const opts = { stdio: 'inherit', cwd: 'frontend', shell: true };
require('child_process').spawn('npm', args, opts);
