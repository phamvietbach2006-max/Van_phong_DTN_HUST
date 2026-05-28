import pandas as pd
from docxtpl import DocxTemplate
import html

def phan_loai_don_vi(chi_doan):
    """Phân loại Chi bộ và Đoàn trường dựa trên tên chi đoàn."""
    cd = str(chi_doan).lower()
    
    # Nhóm đặc thù (Kiểm tra trước)
    if 'troy' in cd or 'hệ thống thông tin quản lý' in cd:
        return "Chi bộ sinh viên Toán - Tin", "Liên chi đoàn Khoa Toán - Tin"
    if 'y sinh' in cd:
        return "Chi bộ sinh viên Điện Điện tử", "Đoàn trường Điện - Điện tử"
    if 'quản lý năng lượng' in cd:
        return "Chi bộ sinh viên Kinh tế", "Đoàn trường Kinh tế"

    # Nhóm Đoàn trường/LCĐ
    if any(x in cd for x in ['điện', 'điều khiển', 'tự động hóa', 'truyền thông', 'đa phương tiện', 'viễn thông', 'nhúng', 'iot', 'ee', 'et']):
        return "Chi bộ sinh viên Điện Điện tử", "Đoàn trường Điện - Điện tử"
    elif any(x in cd for x in ['thực phẩm', 'sinh học', 'hóa', 'môi trường', 'tài nguyên', 'bf', 'ch', 'ev']):
        return "Chi bộ sinh viên Hóa và Khoa học sự sống", "Đoàn trường Hóa và Khoa học Sự sống"
    elif any(x in cd for x in ['nhiệt', 'cơ điện tử', 'cơ khí', 'chế tạo máy', 'ô tô', 'hàng không', 'he', 'me', 'te']):
        return "Chi bộ sinh viên Cơ Khí", "Đoàn trường Cơ khí"
    elif any(x in cd for x in ['dữ liệu', 'trí tuệ nhân tạo', 'an toàn không gian số', 'công nghệ thông tin', 'cntt', 'máy tính', 'it']):
        return "Chi bộ sinh viên Công nghệ thông tin và truyền thông", "Đoàn trường Công nghệ Thông tin và Truyền thông"
    elif any(x in cd for x in ['vật liệu', 'vi điện tử', 'nano', 'polyme', 'compozit', 'kỹ thuật in', 'dệt may', 'ms', 'tx']):
        return "Chi bộ sinh viên Vật liệu", "Đoàn trường Vật liệu"
    elif any(x in cd for x in ['kinh doanh', 'logistics', 'chuỗi cung ứng', 'kế toán', 'quản lý công nghiệp', 'tài chính', 'ngân hàng', 'em']):
        return "Chi bộ sinh viên Kinh tế", "Đoàn trường Kinh tế"
    elif any(x in cd for x in ['tính toán', 'toán', 'mi']):
        return "Chi bộ sinh viên Toán - Tin", "Liên chi đoàn Khoa Toán - Tin"
    
    # Nhóm gộp
    elif any(x in cd for x in ['tiếng anh', 'tiếng trung', 'tiếng hàn', 'ngoại ngữ', 'fl']):
        return "Chi bộ sinh viên", "Liên chi đoàn Khoa Ngoại ngữ"
    elif any(x in cd for x in ['công nghệ giáo dục', 'quản lý giáo dục', 'tâm lý học', 'ed']):
        return "Chi bộ sinh viên", "Liên chi đoàn Khoa Khoa học và Công nghệ giáo dục"
    elif any(x in cd for x in ['vật lý', 'hạt nhân', 'ph']):
        return "Chi bộ sinh viên", "Liên chi đoàn Khoa Vật lý Kỹ thuật"
    
    return "[Tên Chi bộ]", "[Tên Đoàn trường/LCĐ]"

def get_nhan_xet_toan_dien(gpa, chuoi_diem_rl):
    """Tính toán logic nhận xét và mã hóa ký tự để tránh lỗi Word XML"""
    try:
        gpa = float(gpa)
    except: gpa = 0.0
    
    # Xác định mức
    muc_ht = "xuất sắc" if gpa >= 3.6 else "giỏi" if gpa >= 3.2 else "khá" if gpa >= 2.5 else "trung bình"
    
    # Tính điểm RL
    try:
        ky = [float(x.strip()) for x in str(chuoi_diem_rl).split('-') if x.strip().isdigit()]
        tb_rl = sum(ky)/len(ky) if ky else 80
    except: tb_rl = 80
    muc_rl = "xuất sắc" if tb_rl >= 90 else "tốt" if tb_rl >= 80 else "khá" if tb_rl >= 65 else "trung bình"
    
    nang_luc = f"Có kết quả học tập {muc_ht} và rèn luyện {muc_rl}, có tinh thần học để nâng cao trình độ chuyên môn. Hoàn thành tốt nhiệm vụ được giao."
    khuyet_diem = "Cần mạnh dạn hơn nữa trong công tác phê bình và tự phê bình."
    
    if gpa < 3.2: khuyet_diem += " Cần cố gắng hơn trong học tập để đạt kết quả tốt."
    if tb_rl < 80: khuyet_diem += " Cần tích cực tham gia các hoạt động phong trào Đoàn - Hội để nâng cao điểm rèn luyện."
    
    # MÃ HÓA KÝ TỰ ĐẶC BIỆT ĐỂ KHÔNG LỖI WORD
    return html.escape(nang_luc), html.escape(khuyet_diem)

def tao_file_nhan_xet_hang_loat(excel_path, template_path, output_path):
    df = pd.read_excel(excel_path, skiprows=2)
    df = df.dropna(subset=['Họ tên'])
    
    danh_sach = []
    for _, row in df.iterrows():
        # Xử lý an toàn dữ liệu
        ho_ten = html.escape(str(row['Họ tên']).strip())
        nang_luc, khuyet_diem = get_nhan_xet_toan_dien(row['TB 2 kỳ gần nhất'], row['Điểm rèn luyện'])
        cb, dt = phan_loai_don_vi(row['Chi đoàn, khóa'])
        
        # Xử lý thời gian và ký hiệu
        ngay = str(row.get('Ngày họp Đoàn trường/ LCĐ; Đồng ý/Số UV', '')).split(',')[0].replace('.', '/')
        ky_hieu = "- BNX/LCĐ" if "Liên chi đoàn" in dt else "- BNX/ĐT"
        stt = f"{int(float(row['TT'])):02d}" if pd.notnull(row['TT']) else "00"
        
        danh_sach.append({
            'stt': stt,
            'thoi_gian_BNX': f"{ky_hieu} ngày {ngay}",
            'ho_ten': ho_ten,
            'ten_chi_bo': html.escape(cb),
            'ten_doan_truong': html.escape(dt),
            'nhan_xet_nang_luc': nang_luc,
            'nhan_xet_khuyet_diem': khuyet_diem
        })
    
    # Xuất file
    doc = DocxTemplate(template_path)
    doc.render({'students': danh_sach})
    doc.save(output_path)
