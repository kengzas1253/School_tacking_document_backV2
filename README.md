# ระบบติดตามหนังสือราชการ API

Backend API สำหรับระบบติดตามสถานะหนังสือราชการ พัฒนาด้วย Node.js, Express และ Supabase

---

## คุณสมบัติของระบบ

- Authentication ด้วย Supabase Auth
- Authorization แยกสิทธิ์ User / Admin
- CRUD เอกสารติดตามหนังสือราชการ
- จัดการผู้ใช้งาน (Admin)
- Middleware ตรวจสอบ Token
- Middleware ตรวจสอบสิทธิ์ Admin
- รองรับสถานะเอกสาร เช่น
  - รอดำเนินการ
  - กำลังดำเนินการ
  - เสร็จสิ้น
  - ปฏิเสธเอกสาร
- รองรับเวลา Time stamp สถานะต่าง ๆ

---

# เทคโนโลยีที่ใช้

- Node.js
- Express.js
- Supabase
- Supabase Auth
- dotenv
- cors

---

# Environment Variables

สร้างไฟล์ `.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
```
 
 **Download Code:**
```bash
   git clone https://github.com/kengzas1253/School_tacking_document_backV2
```
 **ติดตั้ง dependencies ทั้งหมด:** 
```bash
   npm install
```
 **Run Project:**
```bash
   node server.js
```


