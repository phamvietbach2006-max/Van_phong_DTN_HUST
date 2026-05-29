const express = require('express');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const xlsx = require('xlsx');
const multer = require('multer');
const archiver = require('archiver');

const app = express();

// Cấu hình Multer lưu file upload tạm thời
const upload = multer({ dest: 'uploads/' });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Đảm bảo thư mục 'uploads' tồn tại
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// =========================================================
// HÀM LOGIC TỰ ĐỘNG NHẬN XÉT THEO ĐIỂM
// =========================================================
function danhGiaRenLuyen(diemRL) {
    const diem = parseFloat(diemRL);
    if (isNaN(diem)) return "tốt"; // Mặc định nếu file Excel để trống
    
    if (diem >= 90) return "xuất sắc";
    if (diem >= 80) return "tốt";
    if (diem >= 65) return "khá";
    return "trung bình";
}

function sinhNhanXet(cpa, diemRL) {
    const diemCPA = parseFloat(cpa);
    const mucRL = danhGiaRenLuyen(diemRL);
    
    let nangLuc = "";
    let khuyetDiem = "Cần mạnh dạn hơn nữa trong công tác phê bình và tự phê bình.";

    if (isNaN(diemCPA)) {
        nangLuc = `Có kết quả học tập và rèn luyện ${mucRL}, có tinh thần học để nâng cao trình độ chuyên môn. Hoàn thành tốt nhiệm vụ được giao.`;
    } else if (diemCPA >= 3.6) {
        nangLuc = `Có kết quả học tập xuất sắc và rèn luyện ${mucRL}, có tinh thần học để nâng cao trình độ chuyên môn. Hoàn thành tốt nhiệm vụ được giao.`;
    } else if (diemCPA >= 3.2) {
        nangLuc = `Có kết quả học tập giỏi và rèn luyện ${mucRL}, có tinh thần học để nâng cao trình độ chuyên môn. Hoàn thành tốt nhiệm vụ được giao.`;
    } else if (diemCPA >= 2.5) {
        nangLuc = `Có kết quả học tập khá và rèn luyện ${mucRL}, có tinh thần học để nâng cao trình độ chuyên môn. Hoàn thành tốt nhiệm vụ được giao.`;
        khuyetDiem += " Cần cố gắng hơn trong học tập để đạt kết quả tốt.";
    } else {
        nangLuc = `Có kết quả học tập trung bình và rèn luyện ${mucRL}, có tinh thần học để nâng cao trình độ chuyên môn. Cần cố gắng hơn trong học tập để đạt kết quả tốt.`;
    }

    return { nangLuc, khuyetDiem };
}

// =========================================================
// 1. TÍNH NĂNG: XUẤT BẢN NHẬN XÉT HÀNG LOẠT (TỪ EXCEL -> ZIP)
// =========================================================
app.post('/api/nhan-xet-hang-loat', upload.single('fileExcel'), (req, res) => {
    try {
        if (!req.file) return res.status(400).send('Vui lòng chọn file Excel.');

        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Đọc dữ liệu, đổi ô trống thành "" để Word không in ra chữ "undefined"
        let danhSachRaw = xlsx.utils.sheet_to_json(sheet, { defval: "" });

        // Làm sạch dữ liệu (Xóa khoảng trắng thừa ở tên cột và text)
        const danhSachDangVien = danhSachRaw.map(row => {
            const rowSach = {};
            for (let key in row) {
                const cleanKey = key.trim(); 
                rowSach[cleanKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
            }
            return rowSach;
        });

        // Chuẩn bị file Zip
        const zipFileName = `Ban_Nhan_Xet_${Date.now()}.zip`;
        const zipFilePath = path.join(__dirname, zipFileName);
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.pipe(output);

        const templateContent = fs.readFileSync(path.resolve(__dirname, 'templates/Mau_Ban_Nhan_Xet.docx'), 'binary');

        // Vòng lặp xử lý từng Đảng viên
        danhSachDangVien.forEach((dangVien) => {
            // Bỏ qua nếu dòng đó không có Tên (dòng trống)
            if (!dangVien['Họ và tên']) return;

            const zipWord = new PizZip(templateContent);
            const doc = new Docxtemplater(zipWord, { paragraphLoop: true, linebreaks: true });

            // Tự động sinh nhận xét
            const ketQuaNhanXet = sinhNhanXet(dangVien['CPA'], dangVien['Điểm rèn luyện']);

            doc.render({
                stt: dangVien['Số bản nhận xét'], 
                ten_chi_bo: dangVien['Tên chi bộ'],
                thoi_gian_BNX: dangVien['Thời gian'],
                ten_doan_truong: dangVien['Tên Đoàn trường'],
                ho_ten: dangVien['Họ và tên'],
                nhan_xet_nang_luc: ketQuaNhanXet.nangLuc,
                nhan_xet_khuyet_diem: ketQuaNhanXet.khuyetDiem
            });

            const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
            
            // Xóa ký tự cấm trong tên file
            let tenAnToan = dangVien['Họ và tên'].replace(/[/\\?%*:|"<>]/g, '');
            const tenFileWord = `BNX_${tenAnToan}.docx`;
            
            archive.append(buf, { name: tenFileWord });
        });

        archive.finalize();

        // Gửi file Zip về trình duyệt
        output.on('close', () => {
            res.download(zipFilePath, zipFileName, (err) => {
                // Dọn rác
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
            });
        });

    } catch (error) {
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
// KHỞI ĐỘNG SERVER
// =========================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Hệ thống văn phòng Đoàn đang chạy ổn định tại port: ${PORT}`);
});
