from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import shutil
import os

# Import hàm logic từ file logic_xu_ly.py
from logic_xu_ly import tao_file_nhan_xet_hang_loat

app = FastAPI(title="Hệ thống Quản lý Nhận xét Đảng viên")

# Phục vụ file giao diện HTML từ thư mục static
app.mount("/static", StaticFiles(directory="static"), name="static")

def remove_temp_files(paths: list):
    """Hàm chạy ngầm để xóa file tạm sau khi đã trả về cho người dùng"""
    for path in paths:
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                print(f"Lỗi khi xóa file {path}: {e}")

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

@app.post("/api/xuat-nhan-xet")
async def xuat_nhan_xet(background_tasks: BackgroundTasks, file_excel: UploadFile = File(...)):
    excel_path = f"temp_{file_excel.filename}"
    template_path = "Template_BNX.docx"  # Đảm bảo file Word phôi nằm cùng thư mục gốc
    output_path = f"Ket_Qua_{file_excel.filename}.docx"
    
    # Lưu file Excel upload vào ổ đĩa tạm
    with open(excel_path, "wb") as buffer:
        shutil.copyfileobj(file_excel.file, buffer)
        
    try:
        # Gọi hàm xử lý cốt lõi từ file logic_xu_ly.py
        tao_file_nhan_xet_hang_loat(excel_path, template_path, output_path)
        
        # Lên lịch xóa file sau khi Response đã được gửi thành công
        background_tasks.add_task(remove_temp_files, [excel_path, output_path])
        
        # Trả file Word về frontend
        return FileResponse(
            path=output_path, 
            filename="Ban_Nhan_Xet_Tong_Hop.docx",
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        # Trong trường hợp lỗi, cũng cần dọn dẹp file Excel tạm để không đầy rác server
        background_tasks.add_task(remove_temp_files, [excel_path, output_path])
        return {"error": str(e)}
