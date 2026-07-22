const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('nghi-quyet.html', 'utf8');
const helperBlock = html.slice(
  html.indexOf('        function parseDate(raw) {'),
  html.indexOf('        async function previewData() {')
);
const docxLayoutBlock = html.slice(
  html.indexOf('        function fixIctKinhGuiLayout(docXml) {'),
  html.indexOf('        function showCustomModal(options) {')
);

assert(helperBlock && docxLayoutBlock, 'Could not find helpers in nghi-quyet.html');

const sandbox = {};
vm.runInNewContext(`${docxLayoutBlock}
${helperBlock}
this.parseDate = parseDate;
this.getColValue = getColValue;
this.getMissingColumns = getMissingColumns;
this.isValidDateValue = isValidDateValue;
this.fixIctKinhGuiLayout = fixIctKinhGuiLayout;`, sandbox);

const headers = [
  'Họ tên',
  'GPA 2024.2',
  'GPA 2025.1',
  'DRL',
  'Ngày họp Đoàn trường',
  'Thời gian họp Thường vụ',
  'Số NQ'
];

assert.strictEqual(sandbox.getMissingColumns(headers).length, 0);
assert(sandbox.getMissingColumns(headers.filter((header) => header !== 'Thời gian họp Thường vụ')).includes('Thời gian họp Thường vụ'));
assert(sandbox.getMissingColumns(headers.filter((header) => header !== 'Ngày họp Đoàn trường')).includes('Ngày họp Đoàn trường/LCĐ'));

const row = {
  'Ngày họp Đoàn trường': '06/07/2026',
  'Thời gian họp Thường vụ': '08/07/2026'
};

const ngayHopRaw = sandbox.getColValue(row, ['ngayhopdoantruong', 'ngayhoplcd', 'dongysouv', 'doantruonglcd', 'ngayhop', 'thoigian'], ['chidoan', 'thuongvu']);
const thuongVuRaw = sandbox.getColValue(row, ['thoigianhopthuongvu', 'ngayhopthuongvu', 'hopthuongvu']);

assert.strictEqual(sandbox.parseDate(ngayHopRaw), 'ngày 06 tháng 07 năm 2026');
assert.strictEqual(sandbox.parseDate(thuongVuRaw), 'ngày 08 tháng 07 năm 2026');
assert.strictEqual(sandbox.isValidDateValue(thuongVuRaw), true);
assert(html.includes('ThoiGianHopThuongvu: student.thoiGianHopThuongVu'));

const sampleNghiQuyetXml = [
  '<w:p><w:pPr><w:ind w:firstLine="720"/></w:pPr><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:t xml:space="preserve">              </w:t></w:r><w:r><w:t xml:space="preserve">Kính </w:t></w:r><w:r><w:t xml:space="preserve">gửi:    </w:t></w:r><w:r><w:t xml:space="preserve">- </w:t></w:r><w:r><w:t>C</w:t></w:r><w:r><w:t>hi</w:t></w:r><w:r><w:t xml:space="preserve"> ủy Chi</w:t></w:r><w:r><w:t xml:space="preserve"> bộ </w:t></w:r><w:r><w:t>Sinh viên</w:t></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:t>Công nghệ Thông tin và Truyền thông</w:t></w:r><w:r><w:t>;</w:t></w:r></w:p>',
  '<w:p><w:r><w:t xml:space="preserve">                            </w:t></w:r><w:r><w:t xml:space="preserve">    </w:t></w:r><w:r><w:t xml:space="preserve">              </w:t></w:r><w:r><w:t xml:space="preserve">- Đảng </w:t></w:r><w:r><w:t>uỷ</w:t></w:r><w:r><w:t xml:space="preserve"> Đại học Bách khoa Hà Nội.</w:t></w:r></w:p>'
].join('');
const fixedNghiQuyetXml = sandbox.fixIctKinhGuiLayout(sampleNghiQuyetXml);
assert(!fixedNghiQuyetXml.includes('w:firstLine="720"'));
assert(fixedNghiQuyetXml.includes(`<w:t xml:space="preserve">${' '.repeat(11)}Kính </w:t>`));
assert(fixedNghiQuyetXml.includes('<w:t xml:space="preserve">gửi:</w:t></w:r><w:r><w:t xml:space="preserve"> - </w:t>'));
assert(fixedNghiQuyetXml.includes(`<w:t xml:space="preserve">${' '.repeat(14)}- Đảng </w:t>`));

console.log('Nghị quyết Thường vụ check passed');
