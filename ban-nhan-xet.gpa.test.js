const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('ban-nhan-xet.html', 'utf8');
const parseBlock = html.slice(
  html.indexOf('        function parseGPA(raw) {'),
  html.indexOf('        function parseDRL(raw) {')
);
const drlBlock = html.slice(
  html.indexOf('        function parseDRL(raw) {'),
  html.indexOf('        function evaluateHocTap(gpa) {')
);
const lookupBlock = html.slice(
  html.indexOf('        function removeAccents(str) {'),
  html.indexOf('        async function previewData() {')
);
const evaluationBlock = html.slice(
  html.indexOf('        function evaluateHocTap(gpa) {'),
  html.indexOf('        function removeAccents(str) {')
);

assert(parseBlock && drlBlock && lookupBlock && evaluationBlock, 'Could not find GPA helpers in HTML');

const sandbox = {};
vm.runInNewContext(`${parseBlock}\n${drlBlock}\n${evaluationBlock}\n${lookupBlock}
this.calculateAverageGPA = calculateAverageGPA;
this.evaluateHocTap = evaluateHocTap;
this.evaluateRenLuyen = evaluateRenLuyen;
this.getColValue = getColValue;
this.getMissingColumns = getMissingColumns;
this.isBadGPA = isBadGPA;
this.isBadDRL = isBadDRL;
this.isValidDateValue = isValidDateValue;`, sandbox);

const row = {
  'GPA 2024.2': '3,20',
  'GPA 2025.1': '3.80',
};

const gpa242 = sandbox.getColValue(row, ['2024.2', '20242', 'gpa1', 'ky1']) || '-';
const gpa251 = sandbox.getColValue(row, ['2025.1', '20251', 'gpa2', 'ky2']) || '-';
const fallback = sandbox.getColValue(row, ['tb2ky', 'trungbinh', 'diemhoctap', 'gpatrungbinh', 'gpa'], ['20242', '20251', 'gpa1', 'gpa2', 'ky1', 'ky2']);
const average = sandbox.calculateAverageGPA(gpa242, gpa251, fallback);

assert.strictEqual(fallback, '');
assert.strictEqual(average.raw, '3.50');
assert.strictEqual(average.obj.val, 3.5);
assert.strictEqual(average.obj.missing, false);

const fromSheet = sandbox.calculateAverageGPA('-', '-', '3.25');
assert.strictEqual(fromSheet.raw, '3.25');
assert.strictEqual(fromSheet.obj.val, 3.25);
assert.strictEqual(fromSheet.obj.missing, false);

assert.strictEqual(sandbox.evaluateHocTap(2.3), 'bỏ');
assert.strictEqual(sandbox.evaluateRenLuyen(60), 'bỏ');
assert(!html.includes('"trung bình"'));

assert.strictEqual(
  sandbox.getMissingColumns(['Ho ten', 'GPA 2024.2', 'GPA 2025.1', 'DRL', 'Ngay hop', 'So BNX']).length,
  0
);
assert(sandbox.getMissingColumns(['Ho ten', 'DRL', 'Ngay hop', 'So BNX']).includes('GPA 2024.2'));
assert.strictEqual(sandbox.isBadGPA('3,5'), false);
assert.strictEqual(sandbox.isBadGPA('3.59 (Da tot nghiep)'), false);
assert.strictEqual(sandbox.isBadGPA('4.5'), true);
assert.strictEqual(sandbox.isBadGPA('abc3'), true);
assert.strictEqual(sandbox.isBadDRL('72-88'), false);
assert.strictEqual(sandbox.isBadDRL('101'), true);
assert.strictEqual(sandbox.isValidDateValue('06/07/2026'), true);
assert.strictEqual(sandbox.isValidDateValue('31/02/2026'), false);

console.log('GPA average check passed');
