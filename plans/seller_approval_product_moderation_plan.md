# Kế Hoạch Tích Hợp Quy Trình Phê Duyệt Nhà Bán Hàng và Kiểm Duyệt Sản Phẩm

## 1. Tổng Quan

Hệ thống thương mại điện tử hiện tại cần được cập nhật để bao gồm quy trình phê duyệt bắt buộc cho:
- Đăng ký nhà bán hàng: Yêu cầu xác minh tài liệu và phê duyệt của quản trị viên
- Kiểm duyệt sản phẩm: Có cả kiểm duyệt tự động và thủ công cho các sản phẩm nhạy cảm

## 2. Phân Tích Hệ Thống Hiện Tại

### 2.1. Cơ Sở Dữ Liệu (Prisma Schema)
- Model `sellers` đã có trường `verificationStatus` với các giá trị: `UNVERIFIED`, `PENDING`, `APPROVED`, `REJECTED`
- Model `sellers` đã có trường `documents`, `rejectionReason`, `submittedAt`, `reviewedBy`, `reviewedAt`, `adminNotes`, `resubmissionCount`
- Model `seller_verification_history` đã tồn tại để theo dõi lịch sử xác minh
- Model `products` đã có trường `status` với các giá trị: `active`, `pending`, `draft`, `rejected`
- Model `products` đã có trường `rejectionReason`, `submittedAt`, `reviewedBy`, `reviewedAt`, `adminNotes`, `requiresReReview`
- Model `product_history` đã tồn tại để theo dõi lịch sử sản phẩm

### 2.2. API Đã Có
- `/admin/api/get-pending-sellers` - Lấy danh sách nhà bán hàng đang chờ phê duyệt
- `/admin/api/approve-seller/:sellerId` - Phê duyệt nhà bán hàng
- `/admin/api/reject-seller/:sellerId` - Từ chối nhà bán hàng
- `/admin/api/get-pending-products` - Lấy danh sách sản phẩm đang chờ kiểm duyệt
- `/admin/api/approve-product/:productId` - Phê duyệt sản phẩm
- `/admin/api/reject-product/:productId` - Từ chối sản phẩm
- `/api/submit-seller-documents` - Gửi tài liệu xác minh nhà bán hàng

### 2.3. UI Hiện Tại
- Seller UI: Có trang đăng ký `/signup` với 3 bước (Tạo tài khoản, Thiết lập cửa hàng, Kết nối ngân hàng)
- Admin UI: Có trang quản lý sản phẩm và người bán, nhưng không có trang quản lý yêu cầu đang chờ xử lý

## 3. Thiết Kế Quy Trình Phê Duyệt Nhà Bán Hàng

### 3.1. Quy Trình Chi Tiết
1. **Đăng ký tài khoản**: Người bán đăng ký tài khoản cơ bản (email, mật khẩu, thông tin cá nhân)
2. **Gửi tài liệu xác minh**: Người bán gửi các tài liệu cần thiết:
   - Chứng minh nhân dân/Thẻ căn cước
   - Giấy phép kinh doanh (nếu có)
   - Mã số thuế
   - Các tài liệu liên quan khác
3. **Xác minh tài liệu**: Hệ thống lưu trữ tài liệu và chuyển cho quản trị viên
4. **Phê duyệt hoặc từ chối**: Quản trị viên kiểm tra tài liệu và ra quyết định
5. **Thông báo kết quả**: Người bán nhận thông báo về kết quả phê duyệt

### 3.2. Cải Tiến Hệ Thống Xác Minh
- Thêm các trường mới trong model `sellers` để lưu trữ loại tài liệu cụ thể
- Tạo quy trình xác minh tự động ban đầu (OCR, xác thực hình ảnh)
- Tạo hệ thống phân loại tài liệu để xác định loại tài liệu được gửi

## 4. Thiết Kế Quy Trình Kiểm Duyệt Sản Phẩm

### 4.1. Quy Trình Kiểm Duyệt Tự Động
1. **Quét nhanh**: Hệ thống tự động quét sản phẩm mới đăng
2. **Phát hiện vi phạm**: Kiểm tra từ khóa cấm, hình ảnh không hợp lệ, thông tin thiếu
3. **Tự động từ chối/ẩn**: Nếu vi phạm rõ ràng, hệ thống tự động từ chối sản phẩm
4. **Đánh dấu kiểm duyệt**: Nếu không rõ ràng, sản phẩm được đánh dấu để kiểm duyệt thủ công

### 4.2. Quy Trình Kiểm Duyệt Thủ Công
1. **Sản phẩm nhạy cảm**: Mỹ phẩm, thực phẩm chức năng, hàng hiệu cần kiểm duyệt kỹ lưỡng
2. **Sản phẩm có thương hiệu**: Sản phẩm có thương hiệu cần xác minh giấy tờ sở hữu
3. **Sản phẩm bất thường**: Sản phẩm có dấu hiệu bất thường cần kiểm tra thêm
4. **Phê duyệt hoặc từ chối**: Nhân viên xét duyệt ra quyết định dựa trên tiêu chí

### 4.3. Cải Tiến Hệ Thống Kiểm Duyệt
- Tích hợp AI để phát hiện hình ảnh không phù hợp
- Tạo danh sách từ khóa cấm và danh sách thương hiệu cần xác minh
- Tạo hệ thống phân loại sản phẩm tự động để xác định mức độ kiểm duyệt cần thiết

## 5. Cập Nhật UI Admin

### 5.1. Trang Quản Lý Yêu Cầu Nhà Bán Hàng Đang Chờ
- Tạo trang mới: `/dashboard/pending-sellers`
- Hiển thị danh sách nhà bán hàng đang chờ phê duyệt
- Cho phép xem tài liệu, phê duyệt hoặc từ chối
- Hiển thị lý do từ chối nếu có

### 5.2. Trang Quản Lý Sản Phẩm Đang Chờ Kiểm Duyệt
- Tạo trang mới: `/dashboard/pending-products`
- Hiển thị danh sách sản phẩm đang chờ kiểm duyệt
- Cho phép xem chi tiết sản phẩm, phê duyệt hoặc từ chối
- Hiển thị lý do từ chối nếu có

## 6. Cập Nhật UI Seller

### 6.1. Trang Gửi Tài Liệu Xác Minh
- Cập nhật trang `/signup` để thêm bước gửi tài liệu xác minh
- Hoặc tạo trang riêng `/verify-business` cho người bán hiện tại

### 6.2. Trạng Thái Xác Minh
- Hiển thị trạng thái xác minh hiện tại
- Hiển thị thông báo nếu tài liệu bị từ chối

## 7. Cập Nhật Backend Services

### 7.1. Auth Service
- Cập nhật chức năng gửi tài liệu xác minh nhà bán hàng
- Tích hợp xác minh tài liệu tự động ban đầu
- Cập nhật quy trình đăng ký để yêu cầu tài liệu

### 7.2. Product Service
- Tích hợp hệ thống kiểm duyệt tự động
- Cập nhật quy trình tạo sản phẩm để bao gồm kiểm duyệt
- Tạo hệ thống phân loại sản phẩm nhạy cảm

### 7.3. Admin Service
- Cập nhật các endpoint quản lý yêu cầu đang chờ
- Tạo hệ thống thông báo cho quản trị viên

## 8. Hệ Thống Ghi Nhật Ký

### 8.1. Nhật Ký Xác Minh Nhà Bán Hàng
- Ghi lại toàn bộ quá trình xác minh nhà bán hàng
- Ghi lại lý do từ chối nếu có
- Ghi lại người thực hiện phê duyệt/từ chối

### 8.2. Nhật Ký Kiểm Duyệt Sản Phẩm
- Ghi lại toàn bộ quá trình kiểm duyệt sản phẩm
- Ghi lại lý do từ chối nếu có
- Ghi lại kết quả kiểm duyệt tự động

## 9. Hệ Thống Thông Báo

### 9.1. Thông Báo Cho Người Bán
- Gửi email thông báo khi yêu cầu được phê duyệt/từ chối
- Hiển thị thông báo trong hệ thống quản lý người bán
- Cung cấp lý do cụ thể khi yêu cầu bị từ chối

### 9.2. Thông Báo Cho Quản Trị Viên
- Thông báo khi có yêu cầu mới cần xử lý
- Gửi email nhắc nhở nếu yêu cầu chờ quá lâu

## 10. Triển Khai

### 10.1. Giai đoạn 1: Cập nhật cơ sở dữ liệu và API
- [ ] Cập nhật Prisma schema nếu cần
- [ ] Cập nhật các API endpoint cho việc quản lý yêu cầu đang chờ
- [ ] Thêm các hàm xử lý kiểm duyệt tự động

### 10.2. Giai đoạn 2: Cập nhật UI Admin
- [ ] Tạo trang quản lý nhà bán hàng đang chờ
- [ ] Tạo trang quản lý sản phẩm đang chờ
- [ ] Tích hợp các chức năng phê duyệt/từ chối

### 10.3. Giai đoạn 3: Cập nhật UI Seller
- [ ] Cập nhật quy trình đăng ký để yêu cầu tài liệu
- [ ] Thêm trang gửi tài liệu xác minh
- [ ] Hiển thị trạng thái xác minh

### 10.4. Giai đoạn 4: Kiểm thử và triển khai
- [ ] Kiểm thử toàn bộ quy trình
- [ ] Đảm bảo tính bảo mật và toàn vẹn dữ liệu
- [ ] Triển khai lên môi trường sản xuất

## 11. Lưu Ý Bảo Mật

- Đảm bảo tài liệu xác minh được lưu trữ an toàn
- Mã hóa thông tin nhạy cảm
- Kiểm soát truy cập nghiêm ngặt cho quản trị viên
- Ghi nhật ký hoạt động để theo dõi

## 12. Mô Hình Kiến Trúc

```mermaid
graph TD
    A[Seller Registration] --> B[Submit Documents]
    B --> C[Document Verification]
    C --> D{Auto Verification}
    D -->|Pass| E[Send to Admin Review]
    D -->|Fail| F[Auto Reject]
    E --> G[Admin Review]
    G --> H{Approve/Reject}
    H -->|Approve| I[Seller Approved]
    H -->|Reject| J[Seller Rejected with Reason]
    
    K[Product Creation] --> L[Auto Moderation Check]
    L --> M{Auto Approve/Reject}
    M -->|Approve| N[Product Active]
    M -->|Reject| O[Auto Reject Product]
    M -->|Manual Review| P[Send to Admin Review]
    P --> Q[Admin Review]
    Q --> R{Approve/Reject}
    R -->|Approve| N
    R -->|Reject| S[Reject Product with Reason]