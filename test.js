

const fs = require('fs');
let csvContent = "code,event_day,prize_name,is_used\n";

fs.writeFileSync('test.csv', csvContent);
csvContent += `ABC123,1,"Keychain",false\n`;
console.log(csvContent);