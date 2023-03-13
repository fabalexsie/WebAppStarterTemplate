const fs = require('fs');

const RED = '\x1b[31m';
const NORMAL = '\x1b[0m';
const GREY = '\x1b[2m';
const UNDERSCORE = '\x1b[4m';

const files = process.argv.slice(2);

for (const fileName of files) {
  const fileData = '' + fs.readFileSync(fileName);
  const re = /console\.(?:log|error|warn|debug)/g;
  let match;
  let printedFileName = false;
  while ((match = re.exec(fileData)) != null) {
    if (!printedFileName) {
      console.log(`${UNDERSCORE}${fileName}${NORMAL}`);
      printedFileName = true;
    }

    const textUntilError = fileData.substring(0, match.index);
    const lineNo = textUntilError.split(/\r\n|\r|\n/).length;
    const posInLine = match.index - textUntilError.lastIndexOf('\n');
    console.log(
      `  ${GREY}${lineNo}:${posInLine}  ${RED}error  ${NORMAL}Unexpected console statement  ${GREY}no-console-in-react${NORMAL}`
    );
  }
}

process.exit(1);
