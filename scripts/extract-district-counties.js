const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/Users/diogopita/Documents/Projetos/crm-prestadores/public/geo/portugal-municipalities-simplified.geojson', 'utf8'));

// Get unique districts and their municipalities
const districtToCounties = {};

for (const feature of data.features) {
  const props = feature.properties;
  const district = props.dis_name;
  const county = props.con_name;

  if (!district || !county) continue;

  if (!districtToCounties[district]) {
    districtToCounties[district] = [];
  }
  if (!districtToCounties[district].includes(county)) {
    districtToCounties[district].push(county);
  }
}

// Sort districts and counties
const sorted = {};
for (const district of Object.keys(districtToCounties).sort()) {
  sorted[district] = districtToCounties[district].sort();
}

console.log(JSON.stringify(sorted, null, 2));
