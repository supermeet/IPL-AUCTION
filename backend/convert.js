import fs from 'fs';

const tsv = fs.readFileSync('data/players_new.txt', 'utf-8');
const lines = tsv.trim().split('\n');

const parseBasePrice = (priceStr) => {
  priceStr = priceStr.toUpperCase().trim();
  if (priceStr.includes('CR')) {
    return parseFloat(priceStr.replace('CR', '')) * 10000000;
  } else if (priceStr.includes('LAKHS') || priceStr.includes('LAKH')) {
    return parseFloat(priceStr.replace('LAKHS', '').replace('LAKH', '')) * 100000;
  }
  return 0;
};

const formatFileName = (name) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '.png';
};

const players = lines.map((line, index) => {
  const parts = line.split('\t');
  if (parts.length < 4) return null; // Skip empty lines
  
  const id = index + 1; // Sequential ID
  let name = parts[0].trim().replace(/^\*/, '').trim(); // Remove leading asterisk if any
  // If name has "(IPL)" or "(WPL)", let's remove it for cleaner photo finding, but keep full name just in case?
  // Let's just keep the exact name text for display.
  
  const rating = parseFloat(parts[1].trim());
  const basePriceStr = parts[2].trim();
  const role = parts[3].trim();
  
  const basePrice = parseBasePrice(basePriceStr);
  const points = Math.round(rating * 100);
  const photo = `/players/${formatFileName(name)}`;
  
  return {
    id,
    name,
    role: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(),
    basePrice,
    points,
    photo,
    sold: false,
    soldTo: null,
    soldPrice: null
  };
}).filter(Boolean);

fs.writeFileSync('data/players.json', JSON.stringify(players, null, 2));
console.log(`Converted ${players.length} players to players.json`);
