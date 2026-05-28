import pandas as pd
from docxtpl import DocxTemplate

def phan_loai_don_vi(chi_doan):
    """Tự động phân loại Chi bộ và Đoàn trường/LCĐ dựa trên tên Chi đoàn hệ Chính quy"""
    cd = str(chi_doan).lower()
    
    # 1. Nhóm ngành đặc thù dễ trùng lặp (Cần kiểm tra trước)
    if 'troy' in cd or 'hệ thống thông tin quản lý' in cd:
        return "Chi bộ sinh viên Toán - Tin", "Liên chi đoàn Khoa Toán - Tin"
    if 'y sinh' in cd:
        return "Chi bộ sinh viên Điện Điện tử", "Đoàn trường Điện - Điện tử"
    if 'quản lý năng lượng' in cd:
        return "Chi bộ sinh viên Kinh tế", "Đoàn trường Kinh tế"

    # 2. Nhóm các Đoàn trường có Chi bộ riêng
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

    # 3. Nhóm gộp chung "Chi bộ sinh viên"
    elif any(x in cd for x in ['tiếng anh', 'tiếng trung', 'tiếng hàn', 'ngoại ngữ', 'fl']):
        return "Chi bộ sinh viên", "Liên chi đoàn Khoa Ngoại ngữ"
    elif any(x in cd for x in ['công nghệ giáo dục', 'quản lý giáo dục', 'tâm lý học', 'ed']):
        return "Chi bộ sinh viên", "Liên chi đoàn Khoa Khoa học và Công nghệ giáo dục"
    elif any(x in cd for x in ['vật lý', 'hạt nhân', 'ph']):
        return "Chi bộ sinh viên", "Liên chi đoàn Khoa Vật lý Kỹ thuật"
    else:
        return "[Tên Chi bộ]", "[Tên Đoàn trường/LCĐ]"

def get_muc_hoc_tap(gpa):
    try:
        gpa = float(gpa)
    except:
        return "trung bình"
    if gpa >= 3.6: return "xuất sắc"
    elif gpa >= 3.2: return "giỏi"
    elif gpa >= 2.5: return "khá"
    else: return "trung bình"

def get_muc_ren_luyen(chuoi_diem_rl):
    try:
        cac_ky = [float(x.strip()) for x in str(chuoi_diem_rl).split('-') if x.strip().isdigit()]
        if not cac_ky: return "tốt" 
        diem_tb_rl = sum(cac_ky) / len(cac_ky)
        if diem_tb_rl >= 90: return "xuất sắc"
        elif diem_tb_rl >= 80: return "tốt"
        elif diem_tb_rl >= 65: return "khá"
        else: return "trung bình"
    except:
        return "tốt"

def get_nhan_xet_toan_dien(gpa, chuoi_diem_rl):
    muc_hoc_tap = get_muc_hoc_tap(gpa)
    muc_ren_luyen = get_muc_ren_luyen(chuoi_diem_rl)
    
    nang_luc = f"Có kết quả học tập {muc_hoc_tap} và rèn luyện {muc_ren_luyen}, có tinh thần học để nâng cao trình độ chuyên môn. Hoàn thành tốt nhiệm vụ được giao."
    khuyet_diem = "Cần mạnh dạn hơn nữa trong công tác phê bình và tự phê bình."
    
    if muc_hoc_tap == "trung bình":
        khuyet_diem += " Cần cố gắng hơn trong học tập để đạt kết quả tốt."
    elif muc_hoc_tap == "khá":
        khuyet_diem += " Cần cố gắng hơn trong học tập để đạt kết quả tốt."
        
    if muc_ren_luyen in ["khá", "trung bình"]:
        khuyet_diem += " Cần tích cực tham gia các hoạt động phong trào Đoàn - Hội để nâng cao điểm rèn luyện."
        
    return nang_luc, khuyet_diem

def get_thoi_gian_bnx(chuoi_ngay_hop, ten_doan_truong):
    try:
        ngay_thang_raw = str(chuoi_ngay_hop).split(',')[0].strip()
        parts = ngay_thang_raw.split('.')
        if len(parts) == 3:
            ngay_chuoi = f"ngày {parts[0]} tháng {parts[1]} năm {parts[2]}"
        else:
            ngay_chuoi = "ngày .... tháng .... năm 2026"
    except:
        ngay_chuoi = "ngày .... tháng .... năm 2026"
        
    if "Liên chi đoàn" in ten_doan_truong:
        ky_hieu = "- BNX/LCĐ"
    elif "Đoàn trường" in ten_doan_truong:
        ky_hieu = "- BNX/ĐT"
    else:
        ky_hieu = "- BNX/ĐT"
        
    return f"{ky_hieu} {ngay_chuoi}"

def tao_file_nhan_xet_hang_loat(excel_path, template_path, output_path):
    """Hàm lõi gọi từ FastAPI để tổng hợp và xuất tệp Word"""
    # Đọc dữ liệu, bỏ qua 2 dòng tiêu đề đầu tiên
    df = pd.read_excel(excel_path, skiprows=2)
    df = df.dropna(subset=['Họ tên'])
    
    danh_sach = []
    
    for index, row in df.iterrows():
        ho_ten = str(row['Họ tên']).strip()
        gpa = row['TB 2 kỳ gần nhất']
        chuoi_diem_rl = row['Điểm rèn luyện']
        chi_doan = str(row['Chi đoàn, khóa'])
        chuoi_ngay_hop = row.get('Ngày họp Đoàn trường/ LCĐ; Đồng ý/Số UV', '')
        
        try:
            stt = f"{int(float(row['TT'])):02d}"
        except:
            stt = "00"
            
        ten_chi_bo, ten_doan_truong = phan_loai_don_vi(chi_doan)
        nang_luc, khuyet_diem = get_nhan_xet_toan_dien(gpa, chuoi_diem_rl)
        thoi_gian_bnx = get_thoi_gian_bnx(chuoi_ngay_hop, ten_doan_truong)
        
        danh_sach.append({
            'stt': stt,
            'thoi_gian_BNX': thoi_gian_bnx,
            'ho_ten': ho_ten,
            'ten_chi_bo': ten_chi_bo,
            'ten_doan_truong': ten_doan_truong,
            'nhan_xet_nang_luc': nang_luc,
            'nhan_xet_khuyet_diem': khuyet_diem
        })
    
    doc = DocxTemplate(template_path)
    doc.render({'students': danh_sach})
    doc.save(output_path)
