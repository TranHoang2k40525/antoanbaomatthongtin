# antoanbaomatthongtin

## 1. Cơ sở lý thuyết, công thức và giải thích chi tiết

### 1.1. Xác thực người dùng (Authentication)
- **Xác thực** là quá trình xác minh danh tính người dùng trước khi cho phép truy cập tài nguyên.
- **Quy trình thực tế:**
  1. Người dùng nhập username/email/phone và password.
  2. Server tìm user theo username/email/phone.
  3. So sánh password nhập vào với hash trong DB bằng bcrypt (không bao giờ so sánh password gốc).
  4. Nếu đúng, sinh JWT (Json Web Token) trả về cho client.
- **Công thức JWT:**
  - JWT = base64url(header) + '.' + base64url(payload) + '.' + HMACSHA256(base64url(header) + '.' + base64url(payload), secret)
  - Header: `{ "alg": "HS256", "typ": "JWT" }`
  - Payload: `{ "sub": "userId", "exp": <timestamp>, ... }`
  - Signature: HMACSHA256(header.payload, secret)
- **Giải thích:**
  - JWT gồm 3 phần: header, payload, signature. Signature dùng HMAC SHA256 để đảm bảo không ai giả mạo được token nếu không biết secret.
  - Khi client gửi request, token được truyền qua header: `Authorization: Bearer <token>`.
  - Server dùng secret để verify chữ ký, kiểm tra hạn, lấy userId từ payload.

### 1.2. Băm mật khẩu với bcrypt
- **Băm (Hashing)** là chuyển password thành chuỗi không thể đảo ngược.
- **Thuật toán bcrypt:**
  - bcrypt(password, salt) → hash
  - So sánh: bcrypt.compare(password, hash)
  - Salt là chuỗi ngẫu nhiên, tăng độ an toàn, lưu kèm hash.
- **Công thức toán học:**
  - hash = bcrypt(password + salt)
  - hash lưu vào DB, không bao giờ lưu password gốc.
- **Ví dụ thực tế:**
  - password: `123456`
  - salt: `$2b$10$EixZaYVK1fsbw1ZfbX3OXe`
  - hash: `$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Qw8rQnq1r6jQeW5r6jQeW`
- **Giải thích code:**
  - Trong backend, khi đăng ký: `const hash = await bcrypt.hash(password, 10);`
  - Khi đăng nhập: `const match = await bcrypt.compare(password, user.PasswordHash);`

### 1.3. OTP (One-Time Password)
- **OTP** là mã xác thực dùng một lần, thường gồm 6 số, có thời hạn (ví dụ 1 phút).
- **Quy trình thực tế:**
  1. Server sinh mã OTP ngẫu nhiên: `code = Math.floor(100000 + Math.random() * 900000).toString()`
  2. Lưu vào DB: bảng OtpCodes (UserId, Code, ExpiresAt, CreatedAt)
  3. Gửi OTP qua email cho user (dùng nodemailer).
  4. Khi user nhập OTP, kiểm tra:
     - Đúng mã, đúng user, chưa hết hạn → cho phép thao tác (đổi mật khẩu, v.v.)
     - Sai hoặc hết hạn → báo lỗi.
  5. OTP chỉ dùng 1 lần, xóa sau khi xác thực hoặc hết hạn.
- **Công thức kiểm tra:**
  - `if now < ExpiresAt and code == user_input_code: accept`
- **Bảo mật:**
  - OTP sinh ngẫu nhiên, không dự đoán được.
  - Có rate limit gửi OTP để tránh spam (ví dụ: không cho gửi liên tục trong 1 phút).
- **Giải thích code:**
  - Khi gửi OTP: lưu vào DB, gửi email.
  - Khi xác thực: kiểm tra code, hạn, xóa OTP sau khi dùng.

### 1.4. Upload và xác thực avatar
- **Chỉ user đã xác thực (có JWT hợp lệ) mới được upload avatar.**
- **Quy trình thực tế:**
  1. Client chọn ảnh, gửi POST `/user/me/avatar` với header `Authorization` và body dạng `multipart/form-data`.
  2. Server kiểm tra token, kiểm tra file là ảnh (mimetype bắt đầu bằng `image/`), giới hạn dung lượng (5MB).
  3. Lưu file vào thư mục riêng (ví dụ: `Assets/images/`).
  4. Lưu tên file vào DB (bảng Users, trường AvatarFileName).
  5. Trả về url ảnh mới cho client.
- **Giải thích code:**
  - Sử dụng multer để xử lý upload file, kiểm tra mimetype, giới hạn dung lượng.
  - Sau khi upload, cập nhật trường AvatarFileName trong DB.
  - Khi trả về user, trả về cả avatarUrl nếu có.

### 1.5. Validate dữ liệu đầu vào
- **Kiểm tra dữ liệu đầu vào** là bắt buộc để tránh tấn công injection, XSS, và lỗi logic.
- **Ví dụ:**
  - Email phải đúng định dạng: `/^[a-zA-Z0-9._%+-]+@gmail\.com$/`
  - Số điện thoại: 10 số, bắt đầu bằng 0.
  - Ngày sinh: định dạng `YYYY-MM-DD`.
  - Password: tối thiểu 6 ký tự.
- **Giải thích code:**
  - Trong backend, validate trước khi thao tác DB, trả về lỗi nếu không hợp lệ.
  - Trong frontend, validate trước khi gửi request.

## 2. Quy trình xác thực & mã hóa chi tiết (theo code thực tế)

### 2.1. Đăng ký
1. Người dùng nhập thông tin, mật khẩu.
2. Frontend kiểm tra định dạng email, số điện thoại, độ mạnh mật khẩu.
3. Gửi POST `/api/auth/register`.
4. Server kiểm tra trùng username/email, validate dữ liệu.
5. Băm mật khẩu bằng bcrypt:
   - `hash = await bcrypt.hash(password, 10)`
6. Lưu thông tin vào DB (Users).

### 2.2. Đăng nhập
1. Người dùng nhập tài khoản/mật khẩu.
2. Gửi POST `/api/auth/login`.
3. Server lấy user theo username/email, lấy hash từ DB.
4. So sánh:
   - `const match = await bcrypt.compare(password, user.PasswordHash);`
5. Nếu đúng, sinh JWT:
   - `token = jwt.sign({ sub: user.Id, username: user.Username }, secret, { expiresIn })`
6. Trả về access token, refresh token cho client.

### 2.3. Xác thực JWT
- Các route cần bảo vệ dùng middleware kiểm tra token hợp lệ:
  1. Lấy token từ header.
  2. Giải mã, kiểm tra chữ ký, kiểm tra hạn.
  3. Nếu hợp lệ, lấy userId từ payload, cho phép truy cập.
- **Công thức kiểm tra JWT:**
  - `jwt.verify(token, secret)`
- **Giải thích code:**
  - Middleware đọc header, verify token, gán req.user = payload nếu hợp lệ.

### 2.4. OTP (Quên/Đổi mật khẩu)
1. Gửi yêu cầu OTP (POST `/api/auth/forgot-password/request-otp` hoặc `/change-password/request-otp`).
2. Server sinh OTP:
   - `code = Math.floor(100000 + Math.random() * 900000).toString()`
   - `expiresAt = new Date(Date.now() + 1 * 60 * 1000)`
3. Lưu vào DB: bảng OtpCodes (UserId, Code, ExpiresAt, CreatedAt)
4. Gửi email cho user (dùng nodemailer).
5. Khi user nhập OTP + mật khẩu mới, gửi xác minh:
   - Server kiểm tra code, user, hạn.
   - Nếu đúng, băm mật khẩu mới, cập nhật DB.
   - Xóa OTP khỏi DB.
- **Giải thích code:**
  - Khi xác thực OTP, nếu đúng thì cập nhật mật khẩu mới (băm bằng bcrypt), xóa OTP, xóa refresh token cũ.

### 2.5. Đổi/cập nhật avatar
1. Người dùng chọn ảnh, gửi POST `/api/user/me/avatar` (multipart/form-data).
2. Server kiểm tra token, kiểm tra file là ảnh, lưu file vào thư mục riêng.
3. Lưu tên file vào DB, trả về url mới.
4. Frontend gọi lại API lấy user để cập nhật avatar mới.
- **Giải thích code:**
  - Sử dụng multer, lưu file, cập nhật DB, trả về url ảnh mới.

## 3. Demo quy trình thực tế (theo codebase)

### 3.1. Đăng ký
```http
POST /api/auth/register
{
  "username": "user1",
  "email": "user1@gmail.com",
  "password": "12345678",
  ...
}
```
- Server: kiểm tra, băm mật khẩu, lưu DB.

### 3.2. Đăng nhập
```http
POST /api/auth/login
{
  "username": "user1",
  "password": "12345678"
}
```
- Server: kiểm tra, trả về JWT.

### 3.3. Quên/Đổi mật khẩu bằng OTP
```http
POST /api/auth/forgot-password/request-otp
{
  "email": "user1@gmail.com"
}
```
- Server: sinh OTP, gửi email, lưu DB.

```http
POST /api/auth/forgot-password/verify
{
  "email": "user1@gmail.com",
  "code": "123456",
  "newPassword": "newpass123"
}
```
- Server: kiểm tra OTP, băm mật khẩu mới, cập nhật DB.

### 3.4. Đổi/cập nhật avatar
```http
POST /api/user/me/avatar
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
  avatar: <file>
```
- Server: kiểm tra token, lưu file, cập nhật DB, trả về url mới.

## 4. Đảm bảo bảo mật & các lưu ý thực tiễn (theo code thực tế)
- Không lưu mật khẩu gốc, chỉ lưu hash (bcrypt).
- Token JWT ký bằng secret, chỉ server biết, không truyền qua URL.
- OTP sinh ngẫu nhiên, có thời hạn, chỉ dùng 1 lần, rate limit gửi OTP.
- Chỉ user đã xác thực mới được đổi thông tin/avatar.
- Ảnh đại diện chỉ truy cập qua url public, không lộ thông tin nhạy cảm.
- Validate dữ liệu đầu vào ở cả frontend và backend.
- Đặt CORS, giới hạn upload file, kiểm tra loại file khi upload.
- Xóa OTP hết hạn định kỳ (có thể dùng job hoặc khi xác thực OTP).
- Khi đổi mật khẩu, xóa refresh token cũ để bảo vệ phiên cũ.
- Đếm số lần đăng nhập sai, khóa tài khoản nếu vượt quá giới hạn (MAX_FAILED).

## 5. Cấu trúc file chính & vai trò (theo code thực tế)
- backend/controllers/userController.js: Xử lý lấy/cập nhật user, avatar, kiểm tra token, lưu file.
- backend/controllers/authController.js: Đăng ký, đăng nhập, OTP, đổi mật khẩu, băm mật khẩu, sinh JWT, gửi email OTP.
- backend/routes/user.js: Định nghĩa route user, upload avatar, dùng multer kiểm tra file.
- backend/middleware/authMiddleware.js: Kiểm tra JWT, lấy userId từ token, trả lỗi nếu token không hợp lệ.
- backend/server.js: Mount route, phục vụ ảnh tĩnh, cấu hình CORS, mount các middleware.
- frontend/api.js: Gọi API, upload avatar, quản lý token, interceptor tự động refresh token khi hết hạn.
- frontend/UseContext.js: Quản lý trạng thái user, xác thực, cập nhật avatar, lưu token vào AsyncStorage.
- frontend/screens/HomeScreen.js: Giao diện đổi avatar, đổi thông tin, gọi updateAvatar, validate dữ liệu.

---

**Hệ thống đã đảm bảo đầy đủ các bước xác thực, mã hóa, bảo mật, OTP, upload avatar, quản lý phiên đăng nhập, validate dữ liệu, và các lưu ý thực tiễn để tránh lỗ hổng bảo mật. Tất cả các quy trình đều được thực hiện đúng chuẩn bảo mật hiện đại, có giải thích chi tiết từng bước, từng công thức, từng thuật toán và các trường hợp thực tế.**