const fs = require('fs'); const path = require('path'); const flagPath = path.join(__dirname, '../backups', 'MTA3', 'flag.txt'); function readFlagFile() {try {const flag = fs.readFileSync(flagPath, 'utf8');return flag;} catch (error) {return 'Failed to read flag file';}}const result = readFlagFile();result;