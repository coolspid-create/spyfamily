const xlsx = require('xlsx');

const workbook = xlsx.readFile('데이터 테이블.xlsx');
workbook.SheetNames.forEach(sheetName => {
    console.log('--- ' + sheetName + ' ---');
    console.log(JSON.stringify(xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' }), null, 2));
});
