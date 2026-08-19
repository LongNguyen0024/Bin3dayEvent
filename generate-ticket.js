const fs = require('fs');

// Generates an unpredictable 6-character code (e.g. "K7X9P2")
// Excludes confusing characters like 0, O, 1, I
function makeRandomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate 240 completely unique codes
const codePool = new Set();
while (codePool.size < 240) {
  codePool.add(makeRandomCode());
}
const allCodes = Array.from(codePool);

// Prize Definitions
const day1Prizes = [
  ...Array(7).fill('Keychain'),
  ...Array(7).fill('Fragrance Bottle'),
  ...Array(3).fill('Hat'),
  ...Array(3).fill('T-Shirt'),
  ...Array(60).fill('Better Luck Next Time!')
];

const day2Prizes = [
  ...Array(1).fill('$100 Cash'),
  ...Array(6).fill('Keychain'),
  ...Array(6).fill('Fragrance Bottle'),
  ...Array(3).fill('Hat'),
  ...Array(4).fill('T-Shirt'),
  ...Array(60).fill('Better Luck Next Time!')
];

const day3Prizes = [
  ...Array(1).fill('$100 Cash'),
  ...Array(6).fill('Keychain'),
  ...Array(7).fill('Fragrance Bottle'),
  ...Array(4).fill('Hat'),
  ...Array(3).fill('T-Shirt'),
  ...Array(59).fill('Better Luck Next Time!')
];

// Build CSV rows
let csvContent = "code,event_day,prize_name,is_used\n";

// Day 1 (First 80 codes)
for (let i = 0; i < 80; i++) {
  csvContent += `${allCodes[i]},1,"${day1Prizes[i]}",false\n`;
}

// Day 2 (Next 80 codes)
for (let i = 80; i < 160; i++) {
  csvContent += `${allCodes[i]},2,"${day2Prizes[i - 80]}",false\n`;
}

// Day 3 (Final 80 codes)
for (let i = 160; i < 240; i++) {
  csvContent += `${allCodes[i]},3,"${day3Prizes[i - 160]}",false\n`;
}

fs.writeFileSync('tickets.csv', csvContent);
console.log('Done! Generated 240 random tickets in tickets.csv');