TRƯỜNG ĐẠI HỌC XÂY DỰNG HÀ NỘI
KHOA CÔNG NGHỆ THÔNG TIN
NGÀNH KHOA HỌC MÁY TÍNH

BÀI TẬP LỚN
An toàn bảo mật thông tin
Đề tài: Xây dựng ứng dụng có chức năng xác thực bằng mã hóa
Giảng viên hướng dẫn: 
Lớp: 67CS
Nhóm: 
Danh sách thành viên:
- Trần Văn Hoàng: 0034467
- Phạm Văn Hoàng: 0034367
- Nguyễn Bá Minh Vũ: 0088567

Hà Nội, ngày 19, tháng 9, 2025

# BÁO CÁO BÀI TẬP LỚN
## Đề tài: Xây dựng ứng dụng có chức năng xác thực bằng mã hóa

---

## 1. Giới thiệu

Trong thời đại công nghệ số, các hệ thống thông tin ngày càng đối mặt với nhiều nguy cơ về bảo mật như rò rỉ dữ liệu, giả mạo tài khoản, hay tấn công đánh cắp thông tin. Vì vậy, việc xây dựng các ứng dụng có khả năng xác thực người dùng bằng mã hóa dữ liệu là nhu cầu cấp thiết.

**Mục tiêu của đề tài:**
- Xây dựng một ứng dụng có chức năng đăng ký, đăng nhập với cơ chế xác thực an toàn.
- Ứng dụng kỹ thuật xác thực mã hóa để bảo vệ mật khẩu và thông tin nhạy cảm.
- Minh họa quy trình xử lý xác thực qua demo thực nghiệm.

---

## 2. Cơ sở lý thuyết

### 2.1. Quy trình xác thực

#### 2.1.1. Khái niệm
Xác thực (Authentication) là quá trình kiểm tra tính chân thực của danh tính được xác định trong quá trình định danh. Đây là lớp bảo mật đầu tiên và quan trọng nhất trong các hệ thống phần mềm, đặc biệt là ứng dụng web, ứng dụng di động và các dịch vụ trực tuyến.

#### 2.1.2. Các bước cơ bản trong quy trình xác thực
- Người dùng nhập thông tin đăng nhập (username, password).
- Ứng dụng gửi thông tin đến server qua HTTPS.
- Server kiểm tra thông tin trong cơ sở dữ liệu (mật khẩu đã được lưu dưới dạng băm + muối).
- Server băm mật khẩu người dùng nhập vào và so sánh với giá trị đã lưu.
- Nếu trùng khớp → xác thực thành công, sinh session hoặc JWT token để quản lý phiên.
- Người dùng sử dụng token này cho các yêu cầu tiếp theo mà không cần nhập lại mật khẩu.

#### 2.1.3. Các phương pháp xác thực phổ biến
- Mật khẩu (Password-based authentication)
- Xác thực hai yếu tố (2FA)
- Xác thực đa yếu tố (MFA)
- Xác thực bằng token (JWT, OAuth2.0)
- Xác thực sinh trắc học

#### 2.1.4. Các vấn đề bảo mật trong xác thực
- Tấn công brute-force, dictionary, MITM, rò rỉ cơ sở dữ liệu.

#### 2.1.5. Biện pháp bảo vệ trong quy trình xác thực
- Mã hóa đường truyền (HTTPS)
- Lưu mật khẩu an toàn (băm + salt)
- Giới hạn số lần đăng nhập sai
- Sử dụng CAPTCHA, 2FA, quản lý phiên làm việc bằng token, phân quyền truy cập

---

### 2.2. Mã hóa (Encryption)

#### 2.2.1. Khái niệm
Mã hóa là quá trình chuyển đổi dữ liệu từ dạng dễ đọc sang dạng không thể đọc được bằng thuật toán và khóa.

#### 2.2.2. Các loại mã hóa
- Đối xứng (AES, DES)
- Bất đối xứng (RSA, ECC)
- Hàm băm (SHA-256, bcrypt, Argon2)
- Salting

#### 2.2.3. Ứng dụng của mã hóa trong xác thực
- Mật khẩu luôn được băm + salt trước khi lưu.
- Token JWT được ký bằng khóa bí mật để đảm bảo không bị giả mạo.

---

### 2.3. Quy trình xác thực với mã hóa trong ứng dụng web

- Đăng ký: Mật khẩu được băm + salt, lưu vào DB.
- Đăng nhập: Mật khẩu nhập vào được băm + salt, so sánh với DB.
- Cấp token: Sinh JWT token gồm Header, Payload, Signature.
- Truy cập API: Client gửi token trong header, server kiểm tra tính hợp lệ.
- Gia hạn hoặc thu hồi token khi hết hạn.

---

### 2.4. Kết hợp xác thực và mã hóa trong thực tế

- Lưu mật khẩu an toàn: bcrypt/Argon2
- Quản lý phiên làm việc: JWT
- Bảo vệ dữ liệu khi truyền: HTTPS
- Ngăn chặn tấn công: khóa tài khoản, lưu log đăng nhập

---

## 3. Cấu trúc chương trình

Chương trình được thiết kế theo mô hình Client – Server, gồm các lớp chính:

### 3.1. Lớp giao diện người dùng (Frontend - React Native)

- Cung cấp giao diện đăng ký, đăng nhập, quản lý tài khoản, đổi mật khẩu, cập nhật avatar.
- Thu thập dữ liệu người dùng và gửi về server qua API.
- Hiển thị thông báo, trạng thái xác thực.
- Sử dụng HTTPS, không lưu mật khẩu dạng plain text, kiểm tra tính hợp lệ dữ liệu trước khi gửi.

**[Chèn ảnh minh họa giao diện đăng nhập/đăng ký tại đây]**

---

### 3.2. Lớp xử lý nghiệp vụ (Backend - Node.js/Express)

- Xử lý logic xác thực, so sánh mật khẩu nhập vào với mật khẩu đã mã hóa trong CSDL.
- Sinh và xác minh JWT để quản lý phiên làm việc.
- Áp dụng các thuật toán mã hóa và băm (bcrypt cho mật khẩu, HMAC SHA-256 cho JWT).
- Quản lý quyền truy cập, phân biệt user thường và admin.
- Sử dụng salt + hash, giới hạn số lần đăng nhập sai, token có thời gian sống.

**[Chèn ảnh minh họa luồng xác thực backend tại đây]**

---

### 3.3. Lớp dữ liệu (SQL Server)

- Lưu trữ thông tin người dùng (username, email, mật khẩu đã băm, quyền truy cập).
- Quản lý bảng log đăng nhập, đảm bảo toàn vẹn và bảo mật dữ liệu.
- Mật khẩu không bao giờ lưu ở dạng gốc, phân quyền truy cập DB.

**[Chèn ảnh minh họa cấu trúc bảng dữ liệu tại đây]**

---

### 3.4. Luồng xử lý tổng quát

1. Người dùng nhập username + password tại Client.
2. Client gửi dữ liệu đến Server qua HTTPS.
3. Server kiểm tra dữ liệu đầu vào, băm mật khẩu nhập vào, so sánh với mật khẩu băm trong CSDL.
4. Nếu đúng, Server sinh JWT token và trả về cho Client.
5. Client lưu token tạm thời và gửi token kèm theo các request tiếp theo.
6. Server xác minh token trước khi xử lý các yêu cầu khác.

**[Chèn sơ đồ luồng xử lý tổng quát tại đây]**

---

## 4. Demo thực nghiệm

### 4.1. Màn hình chính
- Hiển thị các tùy chọn Đăng nhập, Đăng ký, hoặc Truy cập thông tin nếu đã đăng nhập.
- Kiểm tra token lưu trữ, tự động chuyển hướng nếu đã đăng nhập.

**[Chèn ảnh màn hình chính tại đây]**

---

### 4.2. Trang đăng nhập
- Nhập username, password, hỗ trợ "Quên mật khẩu".
- Gửi POST đến server, server băm password và so sánh với DB.
- Nếu thành công, trả về JWT token, chuyển hướng đến Trang thông tin.

**[Chèn ảnh trang đăng nhập tại đây]**

---

### 4.3. Trang đăng ký
- Nhập username, password, email, kiểm tra tính hợp lệ.
- Gửi POST đến server, server băm password (với salt), lưu vào DB.
- Gửi email xác nhận (nếu có) với mã OTP để kích hoạt tài khoản.

**[Chèn ảnh trang đăng ký tại đây]**

---

### 4.4. Trang thông tin cá nhân
- Hiển thị thông tin cá nhân, cho phép chỉnh sửa, đổi mật khẩu, cập nhật avatar.
- Yêu cầu token trong header để truy cập.

**[Chèn ảnh trang thông tin cá nhân tại đây]**

---

### 4.5. Trang đổi mật khẩu
- Nhập mật khẩu cũ, mới, xác nhận mới.
- Server băm mật khẩu cũ để so sánh, nếu khớp thì băm mật khẩu mới và cập nhật DB.
- Yêu cầu OTP để xác nhận thay đổi.

**[Chèn ảnh trang đổi mật khẩu tại đây]**

---

### 4.6. Quên mật khẩu
- Nhập email, server sinh OTP hoặc token reset, gửi qua email.
- Nhập OTP hoặc click liên kết, đặt mật khẩu mới.

**[Chèn ảnh trang quên mật khẩu tại đây]**

---

### 4.7. Đổi/cập nhật avatar
- Gửi file ảnh qua API, server kiểm tra token, lưu file, cập nhật DB, trả về url mới.

**[Chèn ảnh chức năng đổi avatar tại đây]**

---

### 4.8. Demo API calls thực tế

- Đăng ký:  
  `POST /api/auth/register`  
  ```json
  {
    "username": "user1",
    "email": "user1@gmail.com",
    "password": "12345678"
  }
  ```
- Đăng nhập:  
  `POST /api/auth/login`  
  ```json
  {
    "username": "user1",
    "password": "12345678"
  }
  ```
- Quên/Đổi mật khẩu bằng OTP:  
  `POST /api/auth/forgot-password/request-otp`  
  `POST /api/auth/forgot-password/verify`
- Đổi/cập nhật avatar:  
  `POST /api/user/me/avatar` (multipart/form-data, có token)

---

## 5. Đảm bảo bảo mật & các lưu ý thực tiễn

- Không lưu mật khẩu gốc, chỉ lưu hash (bcrypt).
- Token JWT ký bằng secret, chỉ server biết, không truyền qua URL.
- OTP sinh ngẫu nhiên, có thời hạn, chỉ dùng 1 lần, rate limit gửi OTP.
- Chỉ user đã xác thực mới được đổi thông tin/avatar.
- Ảnh đại diện chỉ truy cập qua url public, không lộ thông tin nhạy cảm.
- Validate dữ liệu đầu vào ở cả frontend và backend.
- Đặt CORS, giới hạn upload file, kiểm tra loại file khi upload.
- Xóa OTP hết hạn định kỳ.
- Khi đổi mật khẩu, xóa refresh token cũ.
- Đếm số lần đăng nhập sai, khóa tài khoản nếu vượt quá giới hạn.

---

## 6. Kết luận và đề xuất

Báo cáo đã trình bày đầy đủ về cơ sở lý thuyết, cấu trúc chương trình, demo thực nghiệm và bảo mật cho ứng dụng. Hệ thống đảm bảo đầy đủ các bước xác thực, mã hóa, bảo mật, OTP, upload avatar, quản lý phiên, và các lưu ý thực tiễn để tránh lỗ hổng.

**Đề xuất cải tiến:**
- Thêm hỗ trợ OAuth cho đăng nhập qua Google/Facebook.
- Tích hợp logging chi tiết để theo dõi tấn công.
- Kiểm tra bảo mật định kỳ bằng công cụ như OWASP ZAP.

---

**[Chèn ảnh tổng kết, ảnh nhóm, hoặc ảnh minh họa cuối báo cáo tại đây]**
