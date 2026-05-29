const express = require('express');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const xlsx = require('xlsx');
const multer = require('multer');
const archiver = require('archiver');

const app = express();

// Cấu hình Multer để lưu tạm file upload vào thư mục 'uploads/'
const upload = multer({ dest: 'uploads/' });

// Cấu hình Express
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Mở thư mục public chứa giao diện web (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Đảm bảo thư mục 'uploads' tồn tại (tránh lỗi khi Multer lưu file tạm)
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// =========================================================
// 1. TÍNH NĂNG: XUẤT BẢN NHẬN XÉT HÀNG LOẠT (TỪ EXCEL -> ZIP)
// =========================================================
app.post('/api/nhan-xet-hang-loat', upload.single('fileExcel'), (req, res) => {
    try {
        if (!req.file) return res.status(400).send('Vui lòng chọn file Excel.');

        // 1. Đọc file Excel upload lên
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const danhSachDangVien = xlsx.utils.sheet_to_json(sheet);

        // 2. Chuẩn bị file Zip
        const zipFileName = `Ban_Nhan_Xet_${Date.now()}.zip`;
        const zipFilePath = path.join(__dirname, zipFileName);
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } }); // Nén mức tối đa
        
        archive.pipe(output);

        // Đọc sẵn template Word
        const templateContent = fs.readFileSync(path.resolve(__dirname, 'templates/Mau_Ban_Nhan_Xet.docx'), 'binary');

        // 3. Vòng lặp: Duyệt qua từng người trong Excel, tạo file Word và ném vào file Zip
        danhSachDangVien.forEach((dangVien) => {
            const zipWord = new PizZip(templateContent);
            const doc = new Docxtemplater(zipWord, { paragraphLoop: true, linebreaks: true });

            // Gắn dữ liệu từ tên cột Excel vào biến trong Word
            doc.render({
                stt: dangVien['Số bản nhận xét'], 
                ten_chi_bo: dangVien['Tên chi bộ'],
                thoi_gian_BNX: dangVien['Thời gian'],
                ten_doan_truong: dangVien['Tên Đoàn trường'],
                ho_ten: dangVien['Họ và tên'],
                nhan_xet_nang_luc: dangVien['Nhận xét năng lực'],
                nhan_xet_khuyet_diem: dangVien['Nhận xét khuyết điểm']
            });

            const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
            
            // Tên file Word sẽ chứa Họ Tên để cán bộ dễ phân biệt
            const tenFileWord = `BNX_${dangVien['Họ và tên'] || 'Khong_Ten'}.docx`;
            archive.append(buf, { name: tenFileWord });
        });

        // 4. Hoàn tất nén
        archive.finalize();

        // 5. Sau khi nén xong, gửi file Zip về cho người dùng
        output.on('close', () => {
            res.download(zipFilePath, zipFileName, (err) => {
                // Xóa file tạm để dọn rác cho Server
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
            });
        });

    } catch (error) {
        // Trong trường hợp lỗi cũng cần dọn rác file tạm
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).send("Có lỗi xảy ra khi tạo bản nhận xét: " + error.message);
    }
});

// =========================================================
// 2. TÍNH NĂNG: XUẤT NGHỊ QUYẾT KẾT NẠP (ĐIỀN FORM TỪ WEB)
// =========================================================
app.post('/api/nghi-quyet', (req, res) => {
    try {
        const { hoTen, ngaySinh, chiDoan, tongSo, coMat, tanThanh } = req.body;
        
        // Tự động tính phần trăm tỷ lệ tán thành
        const tyLe = ((parseInt(tanThanh) / parseInt(coMat)) * 100).toFixed(1) + "%";

        const content = fs.readFileSync(path.resolve(__dirname, 'templates/Mau_Nghi_Quyet.docx'), 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        doc.render({ hoTen, ngaySinh, chiDoan, tongSo, coMat, tanThanh, tyLe });

        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=Nghi_quyet_Ket_nap_${hoTen}.docx`);
        res.send(buf);
    } catch (error) {
        res.status(500).send("Có lỗi xảy ra khi tạo nghị quyết: " + error.message);
    }
});

// =========================================================
// KHỞI ĐỘNG SERVER (CẤU HÌNH PORT ĐỘNG CHO RENDER)
// =========================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Hệ thống văn phòng Đoàn đang chạy ổn định tại port: ${PORT}`);
});
