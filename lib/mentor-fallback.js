/** Trả lời mẫu tiếng Việt — dùng chung cho /api/mentor-chat */
export function localMentorReply(message) {
  const t = String(message || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const raw = String(message || "").toLowerCase();

  if (t.includes("mat troi") || raw.includes("mặt trời"))
    return "Mặt trời là hình tròn nha con! ☀️ Tròn tròn như quả bóng lớn trên trời, màu vàng ấm. Con thử vẽ một vòng tròn vàng xem!";
  if (t.includes("mat trang") || raw.includes("mặt trăng"))
    return "Mặt trăng cũng là hình tròn nha con! 🌙 Đêm nào con có nhìn trăng tròn trên trời không?";
  if (t.includes("hinh tron") || raw.includes("hình tròn") || t.includes("tron xoe"))
    return "Hình tròn giống bánh pizza, mặt trời hay quả bóng đó con! 🔵 Tròn tròn, không có góc. Con tìm thử đồng xu ở nhà nhé!";
  if ((t.includes("hinh gi") || t.includes("hinh dang")) && (t.includes("mat troi") || t.includes("bong") || t.includes("dong xu")))
    return "Đó là hình tròn nha con! ⭕ Tròn tròn, lăn được, không có góc nhọn.";
  if (t.includes("hinh vuong") || raw.includes("hình vuông"))
    return "Hình vuông có 4 cạnh bằng nhau và 4 góc vuông nha con ⬜ Giống viên gạch lát nhà! Con đếm thử 4 góc xem!";
  if (t.includes("tam giac") || raw.includes("tam giác"))
    return "Tam giác có 3 cạnh nha con! 🔺 Giống mái nhà hay miếng bánh cắt. Con thử vẽ tam giác trên giấy nhé!";
  if (t.includes("chu nhat") || raw.includes("chữ nhật"))
    return "Hình chữ nhật dài hơn hình vuông, có 4 góc vuông nha con! 📐 Giống quyển sách hay cánh cửa.";
  if (t.includes("hinh dang") || t.includes("hinh hoc") || raw.includes("hình dạng"))
    return "Hình dạng hay lắm con ơi! 🔷 Có hình tròn, vuông, tam giác, chữ nhật. Con muốn học hình nào trước?";
  if (t.includes("mau do") || raw.includes("màu đỏ"))
    return "Màu đỏ giống quả táo chín hay trái tim đó con! 🔴 Con thích màu đỏ không?";
  if (t.includes("mau xanh") || raw.includes("màu xanh"))
    return "Màu xanh giống lá cây và bầu trời! 💙💚 Con thích xanh lá hay xanh dương?";
  if (t.includes("mau vang") || raw.includes("màu vàng"))
    return "Màu vàng tươi như mặt trời và quả chuối chín! 🟡 Con thấy màu vàng ở đâu nữa?";
  if (t.includes("cau vong") || raw.includes("cầu vồng"))
    return "Cầu vồng có 7 màu: đỏ, cam, vàng, lục, lam, chàm, tím! 🌈 Con thích màu nào nhất?";
  if (t.includes("mau") || raw.includes("màu"))
    return "Màu sắc đẹp lắm con ơi! 🌈 Con thích màu nào — đỏ, xanh, vàng hay tím?";
  if (t.includes("dem") || t.includes("so ") || raw.includes("đếm") || raw.includes("số"))
    return "Cùng cô đếm nha: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10! 🔢 Con đếm theo cô thử xem!";
  if (t.includes("ke chuyen") || raw.includes("kể chuyện"))
    return "Ngày xưa có chú Gấu con siêu chăm học. Mỗi ngày chú đếm hoa: 1, 2, 3... rồi chú giỏi nhất lớp! 🐻⭐ Con cũng làm được mà!";
  if (t.includes("chao") || raw.includes("chào") || t.includes("xin chao"))
    return "Chào con! Cô là Cô Mai đây 😊 Hôm nay con muốn học hình, màu hay đếm số nào?";
  if (t.includes("cam on") || raw.includes("cảm ơn"))
    return "Không có chi con ơi! Cô rất vui khi con chăm học 🌟";
  if (t.includes("gioi") || raw.includes("giỏi") || t.includes("hoc xong"))
    return "Ồ con giỏi lắm! Cô tự hào về con ⭐ Hôm nay con học thêm bài nào nữa nhé?";
  if (t.includes("meo") || raw.includes("mèo"))
    return "Con mèo kêu meo meo, thích ăn cá và chơi! 🐱 Con thích mèo hay chó hơn?";
  if (t.includes("cho") && !t.includes("co oi"))
    return "Con chó gâu gâu, trung thành và thích chạy nhảy! 🐶 Con có thích chó không?";
  if (t.includes("qua bong") || raw.includes("quả bóng") || t.includes("bong da"))
    return "Quả bóng là hình tròn nha con! ⚽ Tròn tròn, lăn được khắp nơi!";
  if (t.includes("tao") || t.includes("chuoi") || raw.includes("táo") || raw.includes("chuối"))
    return "Táo thường màu đỏ, chuối màu vàng — đều ngon và tốt cho sức khỏe! 🍎🍌 Con thích trái nào?";

  return "Cô nghe câu hỏi của con rồi! 😊 Con thử hỏi về hình tròn, màu sắc hoặc đếm số — cô giải thích dễ hiểu lắm!";
}
