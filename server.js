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

        // 1. Đọc file Excel upload lên
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
            // Bỏ qua nếu dòng đó không có 'Họ tên' (dòng trống cuối file)
            if (!dangVien['Họ tên']) return;

            const zipWord = new PizZip(templateContent);
            const doc = new Docxtemplater(zipWord, { paragraphLoop: true, linebreaks: true });

            // Tự động sinh nhận xét dựa trên cột điểm TB 2 kỳ và Điểm rèn luyện
            const ketQuaNhanXet = sinhNhanXet(dangVien['TB 2 kỳ gần nhất'], dangVien['Điểm rèn luyện']);

            // Gắn dữ liệu từ tên cột Excel vào biến trong Word
            doc.render({
                stt: dangVien['Số BNX'], 
                ho_ten: dangVien['Họ tên'],
                mssv: dangVien['Mã số Sinh viên'],
                ngay_sinh: dangVien['Ngày sinh'],
                chi_doan: dangVien['Chi đoàn, khóa'],
                gpa_1: dangVien['GPA 2024.2'],
                gpa_2: dangVien['GPA 2025.1'],
                ngay_y_kien_cd: dangVien['Ngày lấy ý kiến chi đoàn'],
                ngay_hop_doan: dangVien['Ngày họp Đoàn trường/LCĐ; số phiếu'],
                tinh_trang: dangVien['Tình trạng hồ sơ: ngày nhận, được thông qua/trả lại ngày, lý do'],
                
                // Dữ liệu lấy từ hàm tự động
                nhan_xet_nang_luc: ketQuaNhanXet.nangLuc,
                nhan_xet_khuyet_diem: ketQuaNhanXet.khuyetDiem
            });

            const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
            
            // Xóa ký tự cấm trong tên file Windows/Mac
            let tenAnToan = dangVien['Họ tên'].replace(/[/\\?%*:|"<>]/g, '');
            const tenFileWord = `BNX_${tenAnToan}.docx`;
            
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
