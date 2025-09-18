const Joi = require('joi');
// Hàm kiểm tra định dạng email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Hàm kiểm tra định dạng số điện thoại Việt Nam: 10 số, bắt đầu bằng 0
const isValidPhone = (phone) => /^0\d{9}$/.test(phone);

// Có thể mở rộng thêm các schema nếu cần validate dữ liệu đầu vào
module.exports = {
    isValidEmail,
    isValidPhone
};
