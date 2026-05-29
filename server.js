const express = require('express');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const xlsx = require('xlsx');
const multer = require('multer');

const app = express();
const upload = multer({ dest: 'uploads/' }); // Thư mục tạm lưu file excel khi admin upload

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Mở công khai thư mục public để người dùng truy cập giao diện web
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// TÍNH NĂNG 1: XUẤT BẢN NHẬN XÉT (WORD)
// ==========================================
app.post('/api/nhan-xet', (req, res) => {
    try {
        const { hoTen, ngayVaoDang, chiDoan, uuDiem, khuyetDiem } = req.body;
        
        // Đọc template Word mẫu
        const content = fs.readFileSync(path.resolve(__dirname, 'templates/Mau_Ban_Nhan_Xet.docx'), 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Điền data vào các tag {hoTen}, {ngayVaoDang},... trong file Word
        doc.render({ hoTen, ngayVaoDang, chiDoan, uuDiem, khuyetDiem });

        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        
        // Trả file Word về trực tiếp cho trình duyệt tự tải xuống
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=Ban_nhan_xet_${hoTen}.docx`);
        res.send(buf);
    } catch (error) {
        res.status(500).send("Có lỗi xảy ra khi tạo bản nhận xét: " + error.message);
    }
});

// ==========================================
// TÍNH NĂNG 2: XUẤT NGHỊ QUYẾT KẾT NẠP (WORD)
// ==========================================
app.post('/api/nghi-quyet', (req, res) => {
    try {
        const { hoTen, ngaySinh, chiDoan, tongSo, coMat, tanThanh } = req.body;
        
        // Tính toán tỷ lệ phần trăm tự động cho văn phòng Đoàn đỡ phải bấm máy tính
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

// ==========================================
// TÍNH NĂNG 3: TRA CỨU SỐ TÀI KHOẢN (EXCEL)
// ==========================================
let DATABASE_SINH_VIEN = []; // Lưu danh sách SV tạm thời trong RAM. (Thực tế nên lưu database)

// Route nhận file Excel từ Admin
app.post('/api/upload-excel', upload.single('fileExcel'), (req, res) => {
    try {
        if (!req.file) return res.status(400).send('Vui lòng chọn file Excel.');
        
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Chuyển dữ liệu Excel thành mảng JSON để JS xử lý tìm kiếm nhanh
        DATABASE_SINH_VIEN = xlsx.utils.sheet_to_json(sheet);
        
        // Xóa file tạm sau khi đã nạp xong vào RAM
        fs.unlinkSync(req.file.path);

        res.send("<script>alert('Tải lên dữ liệu sinh viên thành công!'); window.location.href='/tra-cuu.html';</script>");
    } catch (error) {
        res.status(500).send("Lỗi đọc file Excel: " + error.message);
    }
});

// Route API tra cứu bằng Ajax
app.get('/api/tra-cuu', (req, res) => {
    const mssvCanTim = req.query.mssv;
    if (!mssvCanTim) {
        return res.json({ success: false, message: "Thiếu tham số mã số sinh viên." });
    }

    // Tìm kiếm trong mảng JSON (File Excel yêu cầu có cột tên là 'MSSV', 'HoTen', 'STK', 'NganHang')
    const sinhVien = DATABASE_SINH_VIEN.find(sv => String(sv.MSSV).trim() === String(mssvCanTim).trim());

    if (sinhVien) {
        res.json({ success: true, data: sinhVien });
    } else {
        res.json({ success: false, message: "Không tìm thấy thông tin của sinh viên này trong hệ thống. Liên hệ Admin để cập nhật file Excel dữ liệu." });
    }
});

// Khởi chạy server ở cổng 3000
app.listen(3000, () => {
    console.log("Hệ thống văn phòng Đoàn đang chạy tại: http://localhost:3000");
});
