// lessons-data.js - dữ liệu toàn bộ bài học, nhúng sẵn để chạy được
// kể cả khi mở bằng file:// (không cần web server).

window.LESSON_DATA = {
  nhan_biet: [
    { topic: "Màu sắc", question: "Đâu là màu ĐỎ?",       voiceText: "Con chọn màu đỏ nhé!",         answers: ["🔴","🔵","🟢","🟡"], correctAnswer: "🔴" },
    { topic: "Màu sắc", question: "Đâu là màu XANH DƯƠNG?", voiceText: "Con chọn màu xanh dương nhé!", answers: ["🟠","🔵","🟣","⚫"], correctAnswer: "🔵" },
    { topic: "Màu sắc", question: "Đâu là màu VÀNG?",     voiceText: "Con chọn màu vàng nhé!",       answers: ["🟡","🟢","🔴","🔵"], correctAnswer: "🟡" },
    { topic: "Màu sắc", question: "Đâu là màu XANH LÁ?",  voiceText: "Con chọn màu xanh lá cây nhé!", answers: ["🟢","🟡","🟣","🟤"], correctAnswer: "🟢" },
    { topic: "Màu sắc", question: "Đâu là màu TÍM?",      voiceText: "Con chọn màu tím nào!",        answers: ["🟣","🔴","🟠","⚪"], correctAnswer: "🟣" },
    { topic: "Màu sắc", question: "Đâu là màu CAM?",      voiceText: "Con chọn màu cam nhé!",        answers: ["🟠","🟡","🔴","🟢"], correctAnswer: "🟠" },

    { topic: "Hình dạng", question: "Đâu là hình TRÒN?",      voiceText: "Con tìm hình tròn nào!",      answers: ["⚪","🔺","🟦","⭐"], correctAnswer: "⚪" },
    { topic: "Hình dạng", question: "Đâu là hình VUÔNG?",     voiceText: "Con chọn hình vuông nhé!",    answers: ["⬜","⚪","🔺","💠"], correctAnswer: "⬜" },
    { topic: "Hình dạng", question: "Đâu là hình TAM GIÁC?",  voiceText: "Con chọn hình tam giác nhé!", answers: ["🔺","⚪","🟦","⭐"], correctAnswer: "🔺" },
    { topic: "Hình dạng", question: "Đâu là hình NGÔI SAO?",  voiceText: "Con chọn hình ngôi sao nào!", answers: ["⭐","❤️","🔺","⚪"], correctAnswer: "⭐" },
    { topic: "Hình dạng", question: "Đâu là hình TRÁI TIM?",  voiceText: "Con chọn trái tim nhé!",      answers: ["❤️","⭐","💠","⚪"], correctAnswer: "❤️" },

    { topic: "Đếm số", question: "Đâu là số 1?", voiceText: "Con chọn số một nhé!",  answers: ["1","7","4","9"], correctAnswer: "1" },
    { topic: "Đếm số", question: "Đâu là số 3?", voiceText: "Con chọn số ba nhé!",   answers: ["1","2","3","4"], correctAnswer: "3" },
    { topic: "Đếm số", question: "Đâu là số 5?", voiceText: "Con chọn số năm nhé!",  answers: ["2","5","8","3"], correctAnswer: "5" },
    { topic: "Đếm số", question: "Có bao nhiêu quả táo? 🍎🍎🍎",    voiceText: "Con đếm xem có bao nhiêu quả táo nhé!",   answers: ["2","3","4","5"], correctAnswer: "3" },
    { topic: "Đếm số", question: "Có bao nhiêu ngôi sao? ⭐⭐⭐⭐", voiceText: "Con đếm xem có bao nhiêu ngôi sao nhé!", answers: ["3","4","5","6"], correctAnswer: "4" },
    { topic: "Đếm số", question: "Có bao nhiêu trái bóng? ⚽⚽",    voiceText: "Con đếm xem có bao nhiêu trái bóng nhé!", answers: ["1","2","3","4"], correctAnswer: "2" },

    { topic: "Con vật", question: "Con vật nào là MÈO?", voiceText: "Con chọn con mèo nhé!", answers: ["🐶","🐱","🐷","🐮"], correctAnswer: "🐱" },
    { topic: "Con vật", question: "Con vật nào là CHÓ?", voiceText: "Con chọn con chó nhé!", answers: ["🐶","🐰","🦊","🐻"], correctAnswer: "🐶" },
    { topic: "Con vật", question: "Con vật nào là VOI?", voiceText: "Con chọn con voi nhé!", answers: ["🦁","🐘","🐯","🦒"], correctAnswer: "🐘" },
    { topic: "Con vật", question: "Con vật nào là CÁ?",  voiceText: "Con chọn con cá nhé!",  answers: ["🐟","🐔","🐸","🐢"], correctAnswer: "🐟" },
    { topic: "Con vật", question: "Con vật nào là THỎ?", voiceText: "Con chọn con thỏ nhé!", answers: ["🐭","🐰","🐿️","🦔"], correctAnswer: "🐰" },

    { topic: "Trái cây", question: "Đâu là TRÁI TÁO?",    voiceText: "Con chọn trái táo nào!",    answers: ["🍌","🍎","🍇","🍊"], correctAnswer: "🍎" },
    { topic: "Trái cây", question: "Đâu là TRÁI CHUỐI?",  voiceText: "Con chọn trái chuối nhé!",  answers: ["🍌","🍓","🍉","🍍"], correctAnswer: "🍌" },
    { topic: "Trái cây", question: "Đâu là TRÁI DƯA HẤU?",voiceText: "Con chọn trái dưa hấu nhé!",answers: ["🍉","🍇","🥭","🍑"], correctAnswer: "🍉" },
    { topic: "Trái cây", question: "Đâu là TRÁI DÂU?",    voiceText: "Con chọn trái dâu nhé!",    answers: ["🍓","🍒","🍎","🍐"], correctAnswer: "🍓" },

    { topic: "Thiên nhiên", question: "Đâu là MẶT TRỜI?",  voiceText: "Con chọn mặt trời nhé!",  answers: ["🌙","⭐","☀️","☁️"], correctAnswer: "☀️" },
    { topic: "Thiên nhiên", question: "Đâu là MẶT TRĂNG?", voiceText: "Con chọn mặt trăng nhé!", answers: ["☀️","🌙","⭐","🌈"], correctAnswer: "🌙" },
    { topic: "Thiên nhiên", question: "Đâu là CÂY XANH?",  voiceText: "Con chọn cái cây nhé!",   answers: ["🌳","🏠","🚗","🌊"], correctAnswer: "🌳" },
    { topic: "Thiên nhiên", question: "Đâu là BÔNG HOA?",  voiceText: "Con chọn bông hoa nhé!",  answers: ["🍄","🌸","🍀","🌵"], correctAnswer: "🌸" }
  ],

  tu_duy: [
    { topic: "Tìm khác biệt", question: "Chọn hình KHÁC loại?",            voiceText: "Ba cái giống nhau, một cái khác. Con chọn cái khác nhé!", answers: ["🍎","🍌","🍇","🚗"], correctAnswer: "🚗" },
    { topic: "Tìm khác biệt", question: "Cái nào KHÔNG phải con vật?",    voiceText: "Con tìm cái không phải con vật nhé!",   answers: ["🐶","🐱","🌳","🐰"], correctAnswer: "🌳" },
    { topic: "Tìm khác biệt", question: "Cái nào KHÔNG phải trái cây?",   voiceText: "Con chọn cái không phải trái cây nhé!", answers: ["🍎","🍌","🥕","🍇"], correctAnswer: "🥕" },
    { topic: "Tìm khác biệt", question: "Dãy hình: 🔺, 🔺, 🟦, 🔺. Hình nào khác?", voiceText: "Con tìm hình khác nhé!",    answers: ["🔺","🟦","🔺","🔺"], correctAnswer: "🟦" },
    { topic: "Tìm khác biệt", question: "Cái nào KHÔNG phải phương tiện?", voiceText: "Con tìm cái không phải xe cộ nhé!",    answers: ["🚗","🚲","🍎","✈️"], correctAnswer: "🍎" },

    { topic: "Dãy số", question: "Dãy số: 1, 2, 3, ?",       voiceText: "Con chọn số tiếp theo nhé!",          answers: ["4","5","1","0"], correctAnswer: "4" },
    { topic: "Dãy số", question: "Dãy số: 2, 4, 6, ?",       voiceText: "Con chọn số tiếp theo nhé!",          answers: ["7","8","10","9"], correctAnswer: "8" },
    { topic: "Dãy số", question: "Dãy số: 5, 4, 3, ?",       voiceText: "Con chọn số tiếp theo nhé! Dãy giảm dần.", answers: ["1","2","6","0"], correctAnswer: "2" },
    { topic: "Dãy số", question: "Số nào ĐỨNG SAU số 7?",   voiceText: "Con chọn số đứng sau số bảy nhé!",    answers: ["6","8","9","5"], correctAnswer: "8" },
    { topic: "Dãy số", question: "Số nào ĐỨNG TRƯỚC số 5?", voiceText: "Con chọn số đứng trước số năm nhé!",  answers: ["6","3","4","7"], correctAnswer: "4" },

    { topic: "So sánh", question: "Cái nào LỚN hơn?",   voiceText: "Con chọn cái lớn hơn nhé!",      answers: ["🐘","🐭","🐜","🐞"], correctAnswer: "🐘" },
    { topic: "So sánh", question: "Cái nào NHỎ hơn?",   voiceText: "Con chọn cái nhỏ hơn nhé!",      answers: ["🐘","🦒","🐜","🐻"], correctAnswer: "🐜" },
    { topic: "So sánh", question: "Cái nào NHANH hơn?", voiceText: "Con chọn cái chạy nhanh hơn nhé!", answers: ["🐢","🚗","🐌","🚶"], correctAnswer: "🚗" },
    { topic: "So sánh", question: "Cái nào CAO hơn?",   voiceText: "Con chọn cái cao hơn nhé!",      answers: ["🦒","🐕","🐈","🐇"], correctAnswer: "🦒" },
    { topic: "So sánh", question: "Số nào LỚN NHẤT?",   voiceText: "Con chọn số lớn nhất nhé!",      answers: ["2","5","9","1"], correctAnswer: "9" },
    { topic: "So sánh", question: "Số nào NHỎ NHẤT?",   voiceText: "Con chọn số nhỏ nhất nhé!",      answers: ["4","7","1","3"], correctAnswer: "1" },

    { topic: "Ghép cặp", question: "Chọn cặp GIỐNG nhau?",        voiceText: "Con chọn hai hình giống nhau nhé!",   answers: ["⭐","⭐","🌙","☀️"], correctAnswer: "⭐" },
    { topic: "Ghép cặp", question: "Con gì ĐI CÙNG NƯỚC? 🌊",     voiceText: "Con chọn con vật sống dưới nước nhé!", answers: ["🐟","🐶","🐔","🐴"], correctAnswer: "🐟" },
    { topic: "Ghép cặp", question: "Con gì ĐI CÙNG BẦU TRỜI? ☁️", voiceText: "Con chọn con biết bay nhé!",           answers: ["🐠","🐦","🐱","🐮"], correctAnswer: "🐦" },
    { topic: "Ghép cặp", question: "🔑 dùng để mở gì?",           voiceText: "Con chọn cái mà chìa khóa dùng để mở nhé!", answers: ["🚪","🍎","🐱","⭐"], correctAnswer: "🚪" }
  ],

  am_nhac: [
    { topic: "Nhạc cụ", question: "Nhạc cụ nào là TRỐNG?",       voiceText: "Con chọn cái trống nhé!",             answers: ["🥁","🎹","🎸","🎺"], correctAnswer: "🥁" },
    { topic: "Nhạc cụ", question: "Nhạc cụ nào là ĐÀN PIANO?",   voiceText: "Con chọn đàn piano nhé!",             answers: ["🎻","🎹","🪈","🎷"], correctAnswer: "🎹" },
    { topic: "Nhạc cụ", question: "Nhạc cụ nào là KÈN?",         voiceText: "Con chọn cây kèn nhé!",               answers: ["🎺","🎸","🥁","🎻"], correctAnswer: "🎺" },
    { topic: "Nhạc cụ", question: "Nhạc cụ nào là ĐÀN GHI-TA?",  voiceText: "Con chọn đàn ghi-ta nhé!",            answers: ["🎸","🎻","🎷","🎹"], correctAnswer: "🎸" },
    { topic: "Nhạc cụ", question: "Nhạc cụ nào là ĐÀN VĨ CẦM?",  voiceText: "Con chọn đàn vĩ cầm, hay còn gọi là violin nhé!", answers: ["🎻","🎺","🥁","🪕"], correctAnswer: "🎻" },
    { topic: "Nhạc cụ", question: "Nhạc cụ nào là KÈN SAXOPHONE?", voiceText: "Con chọn cây kèn saxophone nhé!", answers: ["🎷","🎸","🎹","🥁"], correctAnswer: "🎷" },

    { topic: "Âm thanh", question: "Cái nào dùng để NGHE nhạc?",  voiceText: "Con chọn đồ để nghe nhạc nhé!", answers: ["🎧","🧢","🧤","👟"], correctAnswer: "🎧" },
    { topic: "Âm thanh", question: "Cái nào dùng để HÁT?",        voiceText: "Con chọn micro để hát nhé!",    answers: ["🎤","🎧","📱","📺"], correctAnswer: "🎤" },
    { topic: "Âm thanh", question: "Cái nào PHÁT RA âm thanh to?", voiceText: "Con chọn cái loa nhé!",       answers: ["🔊","🔇","📷","🕯️"], correctAnswer: "🔊" },
    { topic: "Âm thanh", question: "Con gì KÊU 'Meo meo'?", voiceText: "Con vật nào kêu meo meo?", answers: ["🐱","🐶","🐮","🐔"], correctAnswer: "🐱" },
    { topic: "Âm thanh", question: "Con gì KÊU 'Ò ó o'?",   voiceText: "Con vật nào gáy ò ó o?",   answers: ["🐔","🐷","🐴","🐸"], correctAnswer: "🐔" },
    { topic: "Âm thanh", question: "Con gì KÊU 'Ụt ịt'?",   voiceText: "Con vật nào kêu ụt ịt?",   answers: ["🐷","🐑","🐒","🐰"], correctAnswer: "🐷" },

    { topic: "Nốt nhạc", question: "Biểu tượng nào là NỐT NHẠC?",      voiceText: "Con chọn hình nốt nhạc nhé!",  answers: ["🎵","⭐","❤️","🔔"], correctAnswer: "🎵" },
    { topic: "Nốt nhạc", question: "Biểu tượng nào nói về ÂM NHẠC?",   voiceText: "Con chọn biểu tượng âm nhạc nhé!", answers: ["🎶","🏀","🍎","📚"], correctAnswer: "🎶" },
    { topic: "Nốt nhạc", question: "Ai hát trên sân khấu?",             voiceText: "Con chọn ca sĩ nhé!",          answers: ["🎤","🧑‍🚀","👨‍⚕️","👷"], correctAnswer: "🎤" }
  ],

  ghep_hinh: [
    { topic: "Mảnh ghép", question: "Chọn mảnh ghép phù hợp: 🧩🧩 _ 🧩", voiceText: "Con chọn mảnh ghép còn thiếu nhé!", answers: ["🧩","⭐","🟦","🔺"], correctAnswer: "🧩" },
    { topic: "Mảnh ghép", question: "Chọn cặp GIỐNG nhau?",              voiceText: "Con chọn cái giống nhau nhé!",     answers: ["🟦","🔺","🟦","⭐"], correctAnswer: "🟦" },
    { topic: "Mảnh ghép", question: "🧩 Hình nào GIỐNG HỆT: ⭐?",         voiceText: "Con chọn hình giống hệt ngôi sao nhé!", answers: ["⭐","🌙","❤️","🔺"], correctAnswer: "⭐" },

    { topic: "Mẫu lặp", question: "Mẫu lặp: 🔺 🟦 🔺 🟦 ?", voiceText: "Con chọn hình tiếp theo theo mẫu lặp nhé!", answers: ["🔺","🟦","⭐","⚪"], correctAnswer: "🔺" },
    { topic: "Mẫu lặp", question: "Mẫu lặp: 🔴 🟡 🔴 🟡 ?", voiceText: "Con chọn hình tiếp theo nhé!",              answers: ["🔴","🟡","🟢","🔵"], correctAnswer: "🔴" },
    { topic: "Mẫu lặp", question: "Mẫu lặp: ⭐ ⚪ ⭐ ⚪ ?", voiceText: "Con chọn hình tiếp theo nhé!",              answers: ["⭐","⚪","🔺","🟦"], correctAnswer: "⭐" },
    { topic: "Mẫu lặp", question: "Mẫu lặp: 🍎 🍌 🍎 🍌 ?", voiceText: "Con chọn trái cây tiếp theo nhé!",          answers: ["🍎","🍌","🍇","🍓"], correctAnswer: "🍎" },

    { topic: "Hình khối", question: "Chọn hình KHỐI?",     voiceText: "Con chọn hình khối nhé!",    answers: ["🧊","⬜","⚪","🔺"], correctAnswer: "🧊" },
    { topic: "Hình khối", question: "Chọn hình VUÔNG?",    voiceText: "Con chọn hình vuông nhé!",   answers: ["⬜","⚪","🔺","💠"], correctAnswer: "⬜" },
    { topic: "Hình khối", question: "Chọn hình CHỮ NHẬT?", voiceText: "Con chọn hình chữ nhật nhé!", answers: ["▬","⚪","🔺","⭐"], correctAnswer: "▬" },
    { topic: "Hình khối", question: "Chọn hình THOI?",     voiceText: "Con chọn hình thoi nhé!",    answers: ["💠","⚪","⬜","🔺"], correctAnswer: "💠" },

    { topic: "Ghép đúng", question: "Vật gì đi với 🔑?",  voiceText: "Chìa khóa đi với cái gì nhỉ?",  answers: ["🚪","🍎","🎈","🐱"], correctAnswer: "🚪" },
    { topic: "Ghép đúng", question: "Vật gì đi với 🖍️?", voiceText: "Bút màu đi với cái gì nhỉ?",   answers: ["📄","🍎","⚽","🐶"], correctAnswer: "📄" },
    { topic: "Ghép đúng", question: "Vật gì đi với 🍴?",  voiceText: "Cái muỗng nĩa đi với cái gì nhỉ?", answers: ["🍽️","📚","🎈","🚗"], correctAnswer: "🍽️" }
  ],

  my_thuat: [
    { topic: "Màu sắc", question: "Chọn màu VÀNG?",           voiceText: "Con chọn màu vàng nhé!",      answers: ["🟡","🔵","🔴","🟢"], correctAnswer: "🟡" },
    { topic: "Màu sắc", question: "Chọn màu ĐỎ?",             voiceText: "Con chọn màu đỏ nhé!",        answers: ["🔴","🟢","🟣","⚫"], correctAnswer: "🔴" },
    { topic: "Màu sắc", question: "Chọn màu XANH?",           voiceText: "Con chọn màu xanh dương nhé!", answers: ["🔵","🟡","🔴","🟠"], correctAnswer: "🔵" },
    { topic: "Màu sắc", question: "Trái CHUỐI có màu gì?",   voiceText: "Trái chuối thường có màu gì nhỉ?", answers: ["🟡","🔴","🔵","⚫"], correctAnswer: "🟡" },
    { topic: "Màu sắc", question: "Trái DÂU có màu gì?",      voiceText: "Trái dâu tây có màu gì nhỉ?",  answers: ["🔴","🔵","🟢","🟣"], correctAnswer: "🔴" },
    { topic: "Màu sắc", question: "LÁ CÂY có màu gì?",        voiceText: "Lá cây thường có màu gì nhỉ?", answers: ["🟢","🟡","🔵","🔴"], correctAnswer: "🟢" },

    { topic: "Trộn màu", question: "🔴 + 🟡 = màu gì?", voiceText: "Đỏ trộn với vàng ra màu gì nhỉ?",         answers: ["🟠","🟢","🟣","🔵"], correctAnswer: "🟠" },
    { topic: "Trộn màu", question: "🔵 + 🟡 = màu gì?", voiceText: "Xanh dương trộn với vàng ra màu gì nhỉ?", answers: ["🟢","🟣","🟠","🔴"], correctAnswer: "🟢" },
    { topic: "Trộn màu", question: "🔴 + 🔵 = màu gì?", voiceText: "Đỏ trộn với xanh dương ra màu gì nhỉ?",    answers: ["🟣","🟢","🟠","🟡"], correctAnswer: "🟣" },

    { topic: "Dụng cụ vẽ", question: "Chọn dụng cụ VẼ?",        voiceText: "Con chọn dụng cụ để vẽ nhé!", answers: ["🖍️","🍴","🔧","🧽"], correctAnswer: "🖍️" },
    { topic: "Dụng cụ vẽ", question: "Chọn CỌ VẼ?",             voiceText: "Con chọn cái cọ vẽ nhé!",     answers: ["🖌️","✂️","📏","📌"], correctAnswer: "🖌️" },
    { topic: "Dụng cụ vẽ", question: "Chọn BÚT CHÌ?",           voiceText: "Con chọn cây bút chì nhé!",   answers: ["✏️","🖍️","🖌️","🔑"], correctAnswer: "✏️" },
    { topic: "Dụng cụ vẽ", question: "Chọn hình dùng để TÔ màu?", voiceText: "Con chọn hình để tô màu nhé!", answers: ["🖼️","📺","📦","🧺"], correctAnswer: "🖼️" },

    { topic: "Cảm xúc", question: "Chọn cảm xúc VUI?",         voiceText: "Con chọn khuôn mặt vui nhé!",       answers: ["😀","😢","😡","😴"], correctAnswer: "😀" },
    { topic: "Cảm xúc", question: "Chọn cảm xúc BUỒN?",        voiceText: "Con chọn khuôn mặt buồn nhé!",      answers: ["😢","😀","😂","😎"], correctAnswer: "😢" },
    { topic: "Cảm xúc", question: "Chọn cảm xúc GIẬN?",        voiceText: "Con chọn khuôn mặt giận dữ nhé!",   answers: ["😡","😴","😃","🥰"], correctAnswer: "😡" },
    { topic: "Cảm xúc", question: "Chọn cảm xúc NGẠC NHIÊN?",  voiceText: "Con chọn khuôn mặt ngạc nhiên nhé!", answers: ["😮","😀","😢","😡"], correctAnswer: "😮" },
    { topic: "Cảm xúc", question: "Chọn khuôn mặt YÊU THƯƠNG?", voiceText: "Con chọn khuôn mặt yêu thương nhé!", answers: ["🥰","😡","😴","😢"], correctAnswer: "🥰" }
  ],

  ngon_ngu: [
    { topic: "Con vật", question: "Từ nào là 'MÈO'?",      voiceText: "Con chọn từ MÈO nhé!",  answers: ["MÈO","CHÓ","CÁ","GÀ"],   correctAnswer: "MÈO" },
    { topic: "Con vật", question: "Từ nào là 'CHÓ'?",      voiceText: "Con chọn từ CHÓ nhé!",  answers: ["CHÓ","MÈO","VỊT","BÒ"],  correctAnswer: "CHÓ" },
    { topic: "Con vật", question: "Chọn từ chỉ CON VẬT",   voiceText: "Con chọn từ là con vật nhé!", answers: ["BÀN","MÈO","ÁO","SÁCH"], correctAnswer: "MÈO" },
    { topic: "Con vật", question: "🐱 đọc là gì?",         voiceText: "Con mèo đọc là gì?",    answers: ["MÈO","CÁ","GÀ","VỊT"],    correctAnswer: "MÈO" },
    { topic: "Con vật", question: "🐶 đọc là gì?",         voiceText: "Con chó đọc là gì?",    answers: ["CHÓ","MÈO","BÒ","HEO"],   correctAnswer: "CHÓ" },

    { topic: "Đồ vật", question: "Từ nào là 'XE'?",        voiceText: "Con chọn từ XE nhé!",    answers: ["CÂY","NHÀ","XE","MƯA"],    correctAnswer: "XE" },
    { topic: "Đồ vật", question: "Từ nào là 'SÁCH'?",      voiceText: "Con chọn từ SÁCH nhé!",  answers: ["BÚT","VỞ","SÁCH","CẶP"],  correctAnswer: "SÁCH" },
    { topic: "Đồ vật", question: "Chọn từ chỉ ĐỒ VẬT trong nhà", voiceText: "Con chọn từ là đồ vật trong nhà nhé!", answers: ["BÀN","MÈO","HOA","BƯỚM"], correctAnswer: "BÀN" },
    { topic: "Đồ vật", question: "🚗 đọc là gì?",          voiceText: "Đây là gì?",             answers: ["XE Ô TÔ","MÁY BAY","TÀU HỎA","XE ĐẠP"], correctAnswer: "XE Ô TÔ" },
    { topic: "Đồ vật", question: "🏠 đọc là gì?",          voiceText: "Đây là gì?",             answers: ["NHÀ","CÂY","XE","HOA"],    correctAnswer: "NHÀ" },

    { topic: "Trái cây", question: "Chọn từ chỉ TRÁI CÂY", voiceText: "Con chọn từ là trái cây nhé!", answers: ["TÁO","GHẾ","CỬA","BÚT"],  correctAnswer: "TÁO" },
    { topic: "Trái cây", question: "🍌 đọc là gì?",         voiceText: "Đây là quả gì?",        answers: ["CHUỐI","TÁO","CAM","NHO"], correctAnswer: "CHUỐI" },
    { topic: "Trái cây", question: "🍎 đọc là gì?",         voiceText: "Đây là quả gì?",        answers: ["TÁO","ỔI","LÊ","MẬN"],    correctAnswer: "TÁO" },

    { topic: "Màu sắc", question: "Từ nào là 'MÀU ĐỎ'?",   voiceText: "Con chọn từ màu đỏ nhé!", answers: ["ĐỎ","XANH","VÀNG","TÍM"], correctAnswer: "ĐỎ" },
    { topic: "Màu sắc", question: "🟡 đọc là màu gì?",      voiceText: "Đây là màu gì?",         answers: ["VÀNG","ĐỎ","XANH","TÍM"], correctAnswer: "VÀNG" },
    { topic: "Màu sắc", question: "🟢 đọc là màu gì?",      voiceText: "Đây là màu gì?",         answers: ["XANH LÁ","ĐỎ","VÀNG","CAM"], correctAnswer: "XANH LÁ" },

    { topic: "Gia đình", question: "Ai sinh ra con? 👩",     voiceText: "Người phụ nữ sinh ra con gọi là gì?", answers: ["MẸ","BÀ","CÔ","CHỊ"],   correctAnswer: "MẸ" },
    { topic: "Gia đình", question: "Cha con gọi là gì? 👨",  voiceText: "Cha của con gọi là gì nhỉ?",          answers: ["BỐ","ÔNG","ANH","CHÚ"], correctAnswer: "BỐ" },
    { topic: "Gia đình", question: "Em bé gọi là gì? 👶",    voiceText: "Đây là ai nhỉ?",                      answers: ["EM BÉ","ÔNG","BÀ","BỐ"], correctAnswer: "EM BÉ" }
  ]
};
