/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const { Stream } = require('stream');

// ~https://logfetch.com/js-console-colors/
const FRMT = {
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
  proj_inited: {
    de: 'Projekt wurde initialisiert',
    en: 'Project initialized',
  },
};

const log = {
  wip: (...args) =>
    args.forEach((arg) =>
      console.log(`${FRMT.fg.cyan}\u25A0 ${arg}${FRMT.reset}`)
    ),
  success: (...args) =>
    args.forEach((arg) =>
      console.log(`${FRMT.fg.green}\u25A0 ${arg}${FRMT.reset}`)
    ),
  error: (...args) =>
    args.forEach((arg) =>
      console.log(`${FRMT.fg.red}\u25A0 ${arg}${FRMT.reset}`)
    ),
  info: (...args) =>
    args.forEach((arg) =>
      console.log(`${FRMT.fg.blue}\u25A0 ${arg}${FRMT.reset}`)
    ),
  answer: (...args) =>
    args.forEach((arg) => console.log(`${FRMT.fg.yellow}${arg}${FRMT.reset}`)),
};

// make stdout promisable
const promOut = {
  moveCursor: (absX, relY) => {
    return new Promise((resolve) => {
      process.stdout.cursorTo(absX, undefined, () => {
        if (relY != null) {
          process.stdout.moveCursor(0, relY, () => {
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  },
  write: (text) => {
    return new Promise((resolve) => {
      process.stdout.write(text, () => resolve());
    });
  },
  clearScreenDown: () => {
    return new Promise((resolve) => {
      process.stdout.clearScreenDown(() => resolve());
    });
  },
};

// ~https://stackoverflow.com/a/30687420
async function multipleChoiceQuestion(questObj) {
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
          await promOut.write(`${FRMT.fg.yellow}> ${answ}${FRMT.reset}\n`);
        } else {
          await promOut.write(`${FRMT.fg.blue}${answ}${FRMT.reset}\n`);
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
        await stdout.clearScreenDown();
        stdin.removeListener('data', keyListener);
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\u001b[?25h'); // show cursor
        log.answer(answers[selectedOption]);
        console.log();
        resolve(selectedOption);
      } else if (key == '\u0003') {
        // ctrl-c
        await promOut.moveCursor(0);
        await stdout.clearScreenDown();
        stdin.removeListener('data', keyListener);
        process.exit();
      }
    };

    stdin.addListener('data', keyListener);
  });
}

function textInputQuestion(question) {
  return new Promise((resolve) => {
    console.log(question);

    process.stdout.write(FRMT.fg.yellow);
    process.stdin.resume();
    process.stdin.on('data', (data) => {
      process.stdout.write(FRMT.reset);
      process.stdin.pause();
      console.log();
      resolve(data.trim()); // remove new line
    });
  });
}

async function startProcess(res, txtKeyStart, txtKeyFinished, workerFnc) {
  return new Promise((resolve, reject) => {
    log.wip(TXT[txtKeyStart][res.language]);

    const outStream = new Stream.Writable();
    let lines = ['', '', ''];

    let printLastThreeLines = async () => {
      for (const line of lines) {
        await promOut.write(` > ${line}\n`);
      }
    };

    printLastThreeLines().then(() => {
      outStream._write = async (chunk, encoding, done) => {
        lines.push(...chunk.toString().split('\n'));
        lines = lines.slice(-3);

        await promOut.moveCursor(0, -3);
        await promOut.clearScreenDown();
        await printLastThreeLines();

        done();
      };

      workerFnc(outStream)
        .then(async () => {
          await promOut.moveCursor(0, -4);
          await promOut.clearScreenDown();
          log.success(TXT[txtKeyFinished][res.language]);
          resolve(res);
        })
        .catch(async () => {
          await promOut.moveCursor(0, -4);
          await promOut.clearScreenDown();
          log.error(`${TXT[txtKeyStart][res.language]} (ERROR)`);
          reject();
        });
    });
  });
}

async function getConfig() {
  const langNo = await multipleChoiceQuestion({
    quest: 'Language?',
    answers: ['deutsch', 'english'],
    defaultAnswer: 1,
  });

  const langConv = ['de', 'en'];

  return {
    language: langConv[langNo],
    projectName: await textInputQuestion(TXT['proj_name'][langConv[langNo]]),
  };
}

process.stdout.write(FRMT.reset);
getConfig()
  .then((res) =>
    startProcess(res, 'renaming_start', 'renaming_finished', (myOut) => {
      return new Promise((resolve, reject) => {
        myOut.write('Doinjg step 1\ndoing step 2');
        setTimeout(() => myOut.write('Doing step 3'), 1500);
        setTimeout(() => myOut.write('step 4'), 4000);
        setTimeout(() => myOut.write('5 finished'), 5000);
        setTimeout(resolve, 10_000); // TODO
      });
    })
  )
  .then((res) => {
    // REMOVING this script
    fs.unlink(__filename, () => {
      log.success(TXT['proj_inited'][res.language]);
    });
  })
  .catch((err) => {
    console.error('Stopped with error: ' + err);
    process.exit(1);
  });

process.on('SIGINT', () => {
  process.stdout.write(FRMT.reset);
  process.exit(0);
});
process.on('SIGTERM', () => {
  process.stdout.write(FRMT.reset);
  process.exit(0);
});
