const fs = require('fs');

const csv = fs.readFileSync('units.csv', 'utf8');

const results = [];
const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0);

// Skip header
for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    let parts;
    
    // Simple CSV parser for quoted fields
    if (line.includes('"')) {
        const re = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;
        parts = line.split(re);
    } else {
        parts = line.split(',');
    }
    
    if (parts.length >= 5) {
       let tibetan_name = parts[0].trim().replace(/^"|"$/g, '').trim();
       const file_number = parts[1].trim().replace(/^"|"$/g, '').trim();
       const english_name = parts[2].trim().replace(/^"|"$/g, '').trim();
       const status = parts[3].trim().replace(/^"|"$/g, '').trim();
       const branch = parts[4].trim().replace(/^"|"$/g, '').trim();
       
       if (english_name) {
           results.push({
               tibetan_name: tibetan_name || '',
               file_number: file_number.replace(/^\|/, ''),
               name: english_name,
               is_active: status === 'Active',
               branch: branch || 'Head Office'
           });
       }
    }
}

fs.writeFileSync('public/units_seed.json', JSON.stringify(results, null, 2));
console.log('Successfully wrote ' + results.length + ' valid records to public/units_seed.json');
