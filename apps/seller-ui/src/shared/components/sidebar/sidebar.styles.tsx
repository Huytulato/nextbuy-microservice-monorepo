'use client'
import styled from 'styled-components';

// 1. SidebarWrapper: Thêm border phải để tách biệt và màu nền trắng sáng hơn
export const SidebarWrapper = styled.div`
  background-color: #ffffff; // Đổi thành trắng tinh để sạch sẽ
  width: 260px; // Tăng nhẹ độ rộng
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px 16px; // Padding chuẩn hơn
  border-right: 1px solid #e5e7eb; // Thêm đường kẻ ngăn cách
  position: fixed; // Cố định sidebar
  left: 0;
  top: 0;
  z-index: 50;
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    transform: translateX(-100%); // Ẩn trên mobile
  }
`;

// 2. Overlay: Giữ nguyên
export const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 40;
  display: none;
  
  @media (max-width: 768px) {
    display: block; // Chỉ hiện trên mobile khi mở menu
  }
`;

// 3. Header: Chỉnh màu đậm (Slate-900)
export const Header = styled.div`
  font-size: 1.5rem;
  font-weight: 800; // Rất đậm
  margin-bottom: 30px;
  color: #0f172a; // Màu đen xanh đậm (rất rõ nét)
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

// 4. Body: Giữ nguyên
export const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px; // Khoảng cách giữa các item
`;

// --- [THÊM MỚI] MenuLabel: Tiêu đề nhóm (ví dụ: Main Menu, Products) ---
export const MenuLabel = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8; // Màu xám trung tính
  font-weight: 600;
  margin-top: 20px;
  margin-bottom: 8px;
  padding-left: 12px;
`;

// --- [THÊM MỚI] MenuItem: Link bấm được (Quan trọng nhất để sửa lỗi mờ) ---
// Nhận vào prop $active để đổi màu khi được chọn
export const MenuItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;

  // XỬ LÝ MÀU SẮC ĐỂ HẾT MỜ:
  // Nếu active: Màu xanh đậm, nền xanh nhạt
  // Nếu không: Màu xám đậm (#4b5563) -> Đủ đậm để đọc rõ trên nền trắng
  color: ${props => props.$active ? '#2563eb' : '#4b5563'};
  background-color: ${props => props.$active ? '#eff6ff' : 'transparent'};

  &:hover {
    background-color: ${props => props.$active ? '#eff6ff' : '#f3f4f6'};
    color: #2563eb; // Hover vào thì chuyển màu xanh
  }

  svg {
    font-size: 1.2rem;
  }
`;

// 5. Footer: Nút logout
export const Footer = styled.div`
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
`;

// Export object để dùng gọn gàng
export const Sidebar = {
  Wrapper: SidebarWrapper,
  Overlay,
  Header,
  Body,
  Footer,
  // Thêm 2 cái mới này vào để dùng bên Sidebar.tsx
  Label: MenuLabel, 
  Item: MenuItem,
};