import nodemailer from "nodemailer";
import dotenv from "dotenv";
import ejs from "ejs";
import path from "path";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Render an EJS email template
const renderEmailTemplate = async (templateName: string, data: any): Promise<string> => {
  // Giả định thư mục chứa template nằm ở src/mails hoặc tương tự
  // Bạn cần điều chỉnh đường dẫn này trỏ đúng về folder chứa file .ejs của bạn
  const templatePath = path.join(__dirname, "../mails", `${templateName}.ejs`);
  
  return await ejs.renderFile(templatePath, data);
};

// Hàm gửi email chính
export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  data: any
) => {
  try {
    const html = await renderEmailTemplate(templateName, data);

    const mailOptions = {
      from: process.env.SMTP_USER, // Hoặc một tên hiển thị: '"NextBuy Support" <email@gmail.com>'
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    // Tùy logic của bạn có muốn throw lỗi để controller bắt hay không
    throw error; 
  }
};