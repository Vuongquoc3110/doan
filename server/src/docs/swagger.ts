export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Klever Fruit API Documentation',
    version: '1.0.0',
    description: 'Hệ thống REST API cho ứng dụng bán trái cây nhập khẩu & giỏ quà tặng cao cấp Klever Fruit',
    contact: {
      name: 'Klever Fruit CSKH',
      email: 'cskh@kleverjuice.com.vn',
      url: 'https://kleverfruits.com.vn',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Máy chủ phát triển nội bộ',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/health': {
      get: {
        summary: 'Kiểm tra trạng thái kết nối Server và Database',
        responses: { 200: { description: 'Hệ thống hoạt động bình thường' } },
      },
    },
    '/api/v1/auth/login': {
      post: {
        summary: 'Đăng nhập người dùng bằng SĐT và mật khẩu',
        responses: { 200: { description: 'Đăng nhập thành công' } },
      },
    },
    '/api/v1/auth/register': {
      post: {
        summary: 'Đăng ký tài khoản khách hàng mới',
        responses: { 201: { description: 'Đăng ký thành công' } },
      },
    },
    '/api/v1/public/products': {
      get: {
        summary: 'Lấy danh sách sản phẩm (có lọc theo danh mục, xuất xứ, khoảng giá, sắp xếp)',
        responses: { 200: { description: 'Danh sách sản phẩm' } },
      },
    },
    '/api/v1/public/stores': {
      get: {
        summary: 'Lấy danh sách 22+ chi nhánh cửa hàng kèm tọa độ',
        responses: { 200: { description: 'Danh sách cửa hàng' } },
      },
    },
    '/api/v1/orders/checkout': {
      post: {
        summary: 'Đặt hàng kèm Transaction và trừ tồn kho',
        responses: { 201: { description: 'Đặt hàng thành công' } },
      },
    },
    '/api/v1/admin/dashboard': {
      get: {
        summary: 'Thống kê doanh thu và đơn hàng cho Quản trị viên',
        responses: { 200: { description: 'Dữ liệu báo cáo' } },
      },
    },
    '/api/v1/staff/shift-overview': {
      get: {
        summary: 'Tổng quan ca làm việc nhân viên tại cửa hàng',
        responses: { 200: { description: 'Số liệu ca làm' } },
      },
    },
  },
};
