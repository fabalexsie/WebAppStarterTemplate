/* eslint-disable @typescript-eslint/no-var-requires */
const { exec } = require('child_process');
const fs = require('fs');
const { Stream } = require('stream');

const cnsl = {
  // ~https://logfetch.com/js-console-colors/
  FRMT: {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    // Foreground (text) colors
    fg: {
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      crimson: '\x1b[38m',
    },
    // Background colors
    bg: {
      black: '\x1b[40m',
      red: '\x1b[41m',
      green: '\x1b[42m',
      yellow: '\x1b[43m',
      blue: '\x1b[44m',
      magenta: '\x1b[45m',
      cyan: '\x1b[46m',
      white: '\x1b[47m',
      crimson: '\x1b[48m',
    },
  },
  wip: (...args) =>
    args.forEach((arg) =>
      console.log(`${cnsl.FRMT.fg.cyan}\u25A0 ${arg}${cnsl.FRMT.reset}`)
    ),
  success: (...args) =>
    args.forEach((arg) =>
      console.log(`${cnsl.FRMT.fg.green}\u25A0 ${arg}${cnsl.FRMT.reset}`)
    ),
  error: (...args) =>
    args.forEach((arg) =>
      console.log(`${cnsl.FRMT.fg.red}\u25A0 ${arg}${cnsl.FRMT.reset}`)
    ),
  info: (...args) =>
    args.forEach((arg) =>
      console.log(`${cnsl.FRMT.fg.blue}\u25A0 ${arg}${cnsl.FRMT.reset}`)
    ),
  answer: (...args) =>
    args.forEach((arg) =>
      console.log(`${cnsl.FRMT.fg.yellow}${arg}${cnsl.FRMT.reset}`)
    ),
  textInputQuestion: (question) => {
    return new Promise((resolve) => {
      console.log(question);

      process.stdout.write(cnsl.FRMT.fg.yellow);
      process.stdin.resume();
      process.stdin.on('data', (data) => {
        process.stdout.write(cnsl.FRMT.reset);
        process.stdin.pause();
        console.log();
        resolve(data.trim()); // remove new line
      });
    });
  },
  multipleChoiceQuestion: async (questObj) => {
    // ~https://stackoverflow.com/a/30687420
    return new Promise((resolve) => {
      let stdin = process.stdin;
      let stdout = process.stdout;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      stdout.write('\u001b[?25l'); // hide cursor

      const answers = questObj.answers;
      let selectedOption = questObj.defaultAnswer || 0;

      const printAnswers = async (selectedOption) => {
        await promOut.moveCursor(0);
        await promOut.clearScreenDown();

        for (const i in answers) {
          const answ = answers[i];
          if (i == selectedOption) {
            await promOut.write(
              `${cnsl.FRMT.fg.yellow}> ${answ}${cnsl.FRMT.reset}\n`
            );
          } else {
            await promOut.write(
              `${cnsl.FRMT.fg.blue}${answ}${cnsl.FRMT.reset}\n`
            );
          }
        }

        await promOut.moveCursor(0, -answers.length);
      };

      console.log(`${questObj.quest}`);
      printAnswers(selectedOption);

      const keyListener = async (key) => {
        if (key == '\u001B\u005B\u0041' || key == '\u001B\u005B\u0044') {
          // up or left
          selectedOption--;
          selectedOption =
            selectedOption < 0 ? answers.length - 1 : selectedOption;
          await printAnswers(selectedOption);
        } else if (key == '\u001B\u005B\u0043' || key == '\u001B\u005B\u0042') {
          // right or down
          selectedOption++;
          selectedOption %= answers.length;
          await printAnswers(selectedOption);
        } else if (key == '\u000D' || key == '\u0020') {
          // enter or space
          await promOut.moveCursor(0);
          await promOut.clearScreenDown();
          stdin.removeListener('data', keyListener);
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\u001b[?25h'); // show cursor
          cnsl.answer(answers[selectedOption]);
          console.log();
          resolve(selectedOption);
        } else if (key == '\u0003') {
          // ctrl-c
          await promOut.moveCursor(0);
          await promOut.clearScreenDown();
          stdin.removeListener('data', keyListener);
          process.exit();
        }
      };

      stdin.addListener('data', keyListener);
    });
  },
};

const TXT = {
  proj_name: {
    de: 'Wie soll die WebApp heißen?',
    en: 'What should the WebApp be named?',
  },
  renaming_start: {
    de: 'Dateien und Texte werden umbenannt',
    en: 'Files and texts are renamed',
  },
  renaming_finished: {
    de: 'Alle Dateien und Texte wurden erfolgreich umbenannt',
    en: 'All files and texts were successfully renamed',
  },
  git_env_start: {
    de: '*.env wird aus git entfernt',
    en: '*.env will be removed from git',
  },
  git_env_finished: {
    de: '*.env wurde erfolgreich aus git entfernt',
    en: '*.env was successfully removed from git',
  },
  npm_install_backend: {
    de: 'Installation der npm packages (Backend)',
    en: 'Installing the npm packages (Backend)',
  },
  npm_install_backend_finished: {
    de: 'Installation der npm packages abgeschlossen (Backend)',
    en: 'Installation of the npm packages completed (Backend)',
  },
  npm_install_frontend: {
    de: 'Installation der npm packages (Frontend)',
    en: 'Installing the npm packages (Frontend)',
  },
  npm_install_frontend_finished: {
    de: 'Installation der npm packages abgeschlossen (Frontend)',
    en: 'Installation of the npm packages completed (Frontend)',
  },
  proj_inited: {
    de: 'Projekt wurde initialisiert',
    en: 'Project initialized',
  },
};

// make stdout promisable
const promOut = {
  moveCursor: (absX, relY) => {
    return new Promise((resolve) => {
      if (process.stdout.cursorTo || resolve()) {
        // in debug mode not available
        process.stdout.cursorTo(absX, undefined, () => {
          if (relY != null) {
            process.stdout.moveCursor(0, relY, () => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      }
    });
  },
  write: (text) => {
    return new Promise((resolve) => {
      process.stdout.write(text, () => resolve());
    });
  },
  clearScreenDown: () => {
    return new Promise((resolve) => {
      if (process.stdout.clearScreenDown || resolve()) {
        // in debug mode not available
        process.stdout.clearScreenDown(() => resolve());
      }
    });
  },
};

const promExec = (cmd, myOut) => {
  return new Promise((resolve, reject) => {
    exec(cmd, async (err, stdout, stderr) => {
      // await myOut.write('LOG');
      // await myOut.write(stdout);
      // await myOut.write('GOL');
      if (err != null) {
        reject(err);
      } else {
        await myOut.write(cnsl.FRMT.reset);
        await myOut.write(stdout);
        resolve(stdout);
      }
    });
  });
};

async function startSubProcess(res, txtKeyStart, txtKeyFinished, workerFnc) {
  return new Promise((resolve, reject) => {
    cnsl.wip(TXT[txtKeyStart][res.language]);

    const outStream = new Stream.Writable();
    let lines = ['', '', ''];

    let printThreeLines = async () => {
      for (const line of lines.filter((l, i) => i < 3)) {
        await promOut.write(` > ${line}\n`);
      }
    };

    printThreeLines().then(() => {
      outStream._write = async (chunk, encoding, done) => {
        lines.push(...chunk.toString().split('\n'));
        //lines = lines.slice(-3);

        while (lines.length > 3) {
          await promOut.moveCursor(0, -3);
          await promOut.clearScreenDown();
          await printThreeLines();
          lines = lines.slice(1);
          await new Promise((resolve) => setTimeout(resolve, 200)); // TODO: remove
        }

        done();
      };
      Promise.all([
        workerFnc(outStream),
        new Promise((resolve) => outStream.on('finish', resolve)), // you have to call stream.end
      ])
        .then(async () => {
          await promOut.moveCursor(0, -4);
          await promOut.clearScreenDown();
          cnsl.success(TXT[txtKeyFinished][res.language]);
          resolve(res);
        })
        .catch(async (err) => {
          await promOut.moveCursor(0, -4);
          // await promOut.clearScreenDown();
          cnsl.error(`${TXT[txtKeyStart][res.language]} (ERROR)`);
          await promOut.moveCursor(0, 3);
          reject(err);
        });
    });
  });
}

async function getConfig() {
  if (true) return { language: 'de', projectName: 'myName' }; // TODO REMOVE
  const langNo = await cnsl.multipleChoiceQuestion({
    quest: 'Language?',
    answers: ['deutsch', 'english'],
    defaultAnswer: 1,
  });

  const langConv = ['de', 'en'];

  return {
    language: langConv[langNo],
    projectName: await cnsl.textInputQuestion(
      TXT['proj_name'][langConv[langNo]]
    ),
  };
}

process.stdout.write(cnsl.FRMT.reset);
getConfig()
  .then((res) =>
    // RENAME app to the given name // TODO
    startSubProcess(
      res,
      'renaming_start',
      'renaming_finished',
      (myOut) =>
        new Promise((resolve, reject) => {
          myOut.write('Doinjg step 1\ndoing step 2');
          setTimeout(() => myOut.write('Doing step 3'), 50);
          setTimeout(() => myOut.write('step 4'), 100);
          setTimeout(() => myOut.end('5 finished'), 200);
          setTimeout(resolve, 300);
          resolve();
        })
    )
  )
  .then((res) =>
    // REMOVE *.env from git
    startSubProcess(res, 'git_env_start', 'git_env_finished', (myOut) =>
      Promise.resolve()
        // add to gitignore
        .then(() => promExec('echo .env >> .gitignore', myOut))
        // remove file from git index
        .then(() => promExec('git rm --cached .env', myOut))
        .then(() => myOut.end())
    )
  )
  .then((res) =>
    startSubProcess(
      res,
      'npm_install_backend',
      'npm_install_backend_finished',
      (myOut) =>
        // install backend
        promExec('npm i', myOut).then(() => myOut.end())
    )
  )
  .then((res) =>
    startSubProcess(
      res,
      'npm_install_frontend',
      'npm_install_frontend_finished',
      (myOut) =>
        // install frontend
        promExec('cd frontend && npm i', myOut).then(() => myOut.end())
    )
  )
  .then((res) => {
    if (true) return res;
    // REMOVING this script
    fs.unlink(__filename, () => {
      cnsl.success('Removed this script');

      // ASK for doing a commit // TODO committen (..text..)?: <Oder was anderes hier eingeben>
      cnsl.info(
        'Please do a commit to save this initial state. For example with:'
      );
      console.log(`git commit -m "Initialized project '${res.projectName}'"`);

      cnsl.success(TXT['proj_inited'][res.language]);
    });
  })
  .catch((err) => {
    console.error('step execution stopped with error:\n' + err);
    process.exit(1);
  });

process.on('SIGINT', () => {
  process.stdout.write(cnsl.FRMT.reset);
  process.exit(0);
});
process.on('SIGTERM', () => {
  process.stdout.write(cnsl.FRMT.reset);
  process.exit(0);
});
