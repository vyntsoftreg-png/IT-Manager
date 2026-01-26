**QUY TRÌNH CẤP PHÁT TÀI KHOẢN VÀ HƯỚNG DẪN TRUY CẬP HỆ THỐNG CHO NHÂN SỰ MỚI**
PHẦN I: QUY ĐỊNH CẤP PHÁT TÀI KHOẢN HỆ THỐNG
Để đảm bảo tài nguyên công nghệ thông tin được chuẩn bị sẵn sàng và bảo mật, quy trình cấp phát tài khoản sẽ tuân thủ các nguyên tắc sau:
1. Yêu cầu chung về thông tin đầu vào:
*   Thời gian thông báo: Bộ phận yêu cầu cần gửi thông tin tối thiểu 01 ngày làm việc trước khi nhân sự mới bắt đầu làm việc.
*   Thông tin bắt buộc:
    *   Họ và tên đầy đủ.
    *   Vị trí/Chức danh công việc.
    *   Loại hình nhân sự: Thử việc, Chính thức, Thực tập sinh, hay Part-time.
    *   Phòng ban trực thuộc.
*   Xác định quyền hạn truy cập: Cần chỉ định rõ các hệ thống nhân sự cần sử dụng để làm việc, bao gồm nhưng không giới hạn:
    *   Hệ thống ERP (Odoo).
    *   Hệ thống File Server (Quyền truy cập thư mục nào?).
    *   Email công ty.
    *   Các phần mềm chuyên dụng khác (nếu có).
2. Quy trình thực hiện:
*   Bước 1 - Gửi yêu cầu: Trưởng bộ phận chuyên môn hoặc bộ phận Nhân sự gửi yêu cầu (qua Ticket/Email/Form) tới Phòng IT với đầy đủ thông tin nêu trên.
*   Bước 2 - Xử lý và Khởi tạo: Phòng IT tiếp nhận, kiểm tra tính hợp lệ và tiến hành khởi tạo tài khoản trên hệ thống Domain Controller và các nền tảng liên quan.
*   Bước 3 - Bàn giao: Phòng IT gửi thông tin tài khoản (Username và Mật khẩu khởi tạo) qua email hoặc bản in bảo mật cho quản lý trực tiếp của nhân sự hoặc bộ phận Nhân sự để bàn giao.


PHẦN II: HƯỚNG DẪN ĐĂNG NHẬP VÀ SỬ DỤNG HỆ THỐNG (DÀNH CHO NGƯỜI DÙNG)
1. Đăng nhập tài khoản Intranet (Tài khoản máy tính/Domain)
*   Bước 1: Đăng nhập lần đầu
      Tại màn hình đăng nhập Windows, nhập Username và Password (mật khẩu tạm) đã được cung cấp trong biên bản bàn giao.
*   Bước 2: Đổi mật khẩu bắt buộc
    *   Hệ thống sẽ yêu cầu bạn đổi mật khẩu ngay lần đăng nhập đầu tiên (hoặc bạn nhấn `Ctrl + Alt + Del` -> Chọn `Change Password` nếu lần đầu đăng nhập không yêu cầu đổi).
    *   Quy định mật khẩu mạnh:
        *   Phải bao gồm đủ 4 yếu tố: Chữ hoa (A-Z), Chữ thường (a-z), Số (0-9), và Ký tự đặc biệt (!@#...).
        *   Không chứa tên đăng nhập, tên công ty, tên cá nhân hoặc các chuỗi dễ đoán (vd: 123456, Abc@123...).
*   Bước 3: Kiểm tra tài nguyên mạng (File Server)
    *   Vào This PC hoặc Network Drive để kiểm tra các ổ đĩa chung (Department Share, Public Share...).
    *   Lưu ý quan trọng: Đối với lần đăng nhập đầu tiên, đôi khi chính sách hệ thống (Group Policy) chưa cập nhật kịp. Nếu chưa thấy ổ đĩa mạng, vui lòng thực hiện Sign out(Đăng xuất) và Sign in (Đăng nhập) lại máy tính để hệ thống đồng bộ quyền hạn.
2. Truy cập các hệ thống ứng dụng
*   Email Doanh nghiệp:
    *   Truy cập theo đường dẫn được cung cấp.
    *   Đăng nhập bằng thông tin được cấp. Bắt buộc đổi mật khẩu email ngay sau khi đăng nhập thành công để đảm bảo an toàn thông tin.
    *   Đối với nhân viên sale, sau khi đổi mật khẩu email, cần gửi cho IT mật khẩu mới để cấu hình gửi thư trên odoo.
*   Hệ thống Odoo:
    *   Truy cập vào địa chỉ ERP nội bộ của công ty.
    *   Đăng nhập tài khoản Odoo(Được cung cấp hoặc check email lấy thông tin đăng nhập)
3. Đào tạo và Hội nhập
*   Sau khi truy cập thành công vào hệ thống Odoo, nhân sự mới có trách nhiệm truy cập module Tài liệu/Knowledge (hoặc module tương ứng).
*   Đọc kỹ Nội quy công ty và các Hướng dẫn công việc (SOP) dành cho nhân viên mới để nắm bắt văn hóa và quy trình làm việc.

NOTE: 
1.	IT chịu trách nhiệm về các vấn đề liên quan đến vấn đề kỹ thuật, không chịu trách nhiệm về các vấn đề/sai sót cá nhân.
2.	IT quản lý các thông tin liên quan thuộc phạm vi công ty, không quản lý/chịu trách nhiệm về các thông tin, dữ liệu, tài khoản cá nhân, chỉ có thể hỗ trợ xử lý và không bảo đảm khi có vấn đề phát sinh.
Nếu gặp bất kỳ khó khăn nào trong quá trình đăng nhập, vui lòng liên hệ bộ phận IT qua số nội bộ [350], zalo: 0932853165 hoặc kênh thảo luận trên odoo để được hỗ trợ.
