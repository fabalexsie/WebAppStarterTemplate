/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');

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

const log = {
  success: (...args) =>
    args.forEach((arg) =>
      console.log(`${FRMT.fg.green}\u25A0 ${arg}${FRMT.reset}`)
    ),
  info: (...args) =>
    args.forEach((arg) =>
      console.log(`${FRMT.fg.blue}\u25A0 ${arg}${FRMT.reset}`)
    ),
  answer: (...args) =>
    args.forEach((arg) => console.log(`${FRMT.fg.yellow}${arg}${FRMT.reset}`)),
};

// ~https://stackoverflow.com/a/30687420
async function multipleChoiceQuestion(questObj) {
  let stdin = process.stdin;
  let stdout = process.stdout;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  const answers = questObj.answers;
  let selectedOption = questObj.defaultAnswer || 0;

  // make stdin promisable
  const customMoveCursor = (absX, relY) => {
    return new Promise((resolve) => {
      stdout.cursorTo(absX, undefined, () => {
        if (relY != null) {
          stdout.moveCursor(0, relY, () => {
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  };
  const customWrite = (text) => {
    return new Promise((resolve) => {
      stdout.write(text, () => resolve());
    });
  };
  const customClear = () => {
    new Promise((resolve) => {
      stdout.clearScreenDown(() => resolve());
    });
  };

  const printAnswers = async (selectedOption) => {
    await customMoveCursor(0);
    await customClear();

    for (const i in answers) {
      const answ = answers[i];
      if (i == selectedOption) {
        await customWrite(`${FRMT.fg.blue}> ${answ}${FRMT.reset}\n`);
      } else {
        await customWrite(`${answ}\n`);
      }
    }

    await customMoveCursor(0, -answers.length);
  };

  console.log(`${questObj.quest}`);
  await printAnswers(selectedOption);

  const keyListener = async (key) => {
    if (key == '\u001B\u005B\u0041' || key == '\u001B\u005B\u0044') {
      // up or left
      selectedOption--;
      selectedOption = selectedOption < 0 ? answers.length - 1 : selectedOption;
      await printAnswers(selectedOption);
    } else if (key == '\u001B\u005B\u0043' || key == '\u001B\u005B\u0042') {
      // right or down
      selectedOption++;
      selectedOption %= answers.length;
      await printAnswers(selectedOption);
    } else if (key == '\u000D' || key == '\u0020') {
      // enter or space
      await customMoveCursor(0);
      await stdout.clearScreenDown();
      stdin.removeListener('data', keyListener);
      stdin.setRawMode(false);
      log.answer(answers[selectedOption]);
      return selectedOption;
    } else if (key == '\u0003') {
      // ctrl-c
      await customMoveCursor(0);
      await stdout.clearScreenDown();
      stdin.removeListener('data', keyListener);
      process.exit();
    }
  };

  stdin.addListener('data', keyListener);
}

multipleChoiceQuestion({
  quest: 'Frage?',
  answers: [
    'A',
    'Second',
    'Dritte',
    'IV',
    'fünf',
    'six',
    '7th',
    'eight',
    '9',
    '10.',
  ],
  defaultAnswer: 0,
  callback: (selectedAnswer) => {
    log.info(selectedAnswer);
  },
});

// REMOVING this script
/*fs.unlink(__filename, () => {
  log.success('Project initialized');
});*/

log.success('Project initialized');
