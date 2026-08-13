# 🏰 RoV Tower Siege AR

เกม AR ตีป้อม RoV สำหรับงานแข่งขัน RoV วิทยาลัย

## 🎮 วิธีเล่น

1. เปิดลิงก์ผ่านมือถือ
2. กด **"เริ่มเกม"** → อนุญาตกล้อง
3. เลือกอาวุธจากแถบด้านล่าง
4. กด **"⚔️ โจมตี!"** เพื่อตีป้อม
5. ป้อมค่อยๆ พัง → HP = 0 → ป้อมระเบิด! 💥

## 🚀 Deploy

### Vercel (แนะนำ)
1. Push repo นี้ขึ้น GitHub
2. ไปที่ [vercel.com](https://vercel.com) → Sign up ด้วย GitHub
3. กด **Import Project** → เลือก repo นี้
4. Vercel จะ detect Vite โดยอัตโนมัติ → กด **Deploy**
5. ได้ลิงก์ HTTPS ฟรี พร้อมใช้งานทันที!

### Development
```bash
npm install
npm run dev
```

## ⚔️ ฟีเจอร์
- ป้อม 3D สร้างจาก Three.js
- อาวุธ RoV 18 ชิ้น 6 ตำแหน่ง (สุ่มทุกรอบ)
- CRITICAL HIT (12% โอกาส, 2× DMG)
- 4 ระดับความเสียหาย (ปกติ → ร้าว → ไฟลุก → สั่น)
- ระเบิดป้อม + Victory Screen + สถิติ
- กล้อง AR พื้นหลัง + Haptic Feedback
- Responsive สำหรับมือถือทุกขนาด
