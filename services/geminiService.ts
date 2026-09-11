import { GoogleGenAI } from "@google/genai";
import { LessonInfo, ProcessingOptions, Subject } from "../types";
import { SYSTEM_INSTRUCTION, NLS_FRAMEWORK_DATA, SYSTEM_INSTRUCTION_ENGLISH, NLS_FRAMEWORK_DATA_ENGLISH, AI_FRAMEWORK_DATA_QD3439, AI_FRAMEWORK_DATA_QD2422, DISABILITY_SUPPORT_INSTRUCTIONS, ENGLISH_CLIL_INSTRUCTIONS, STEM_INTEGRATION_GUIDANCE, FLIPPED_CLASSROOM_GUIDANCE, QPAN_INTEGRATION_GUIDANCE } from "../constants";

// Hàm xác định mức độ NLS phù hợp theo cấp lớp
function getGradeLevelGuidance(grade: number): string {
  if (grade >= 1 && grade <= 3) {
    return `
  🎯 MỨC ĐỘ NLS PHÙ HỢP VỚI LỚP ${grade} (CẤP TIỂU HỌC ĐẦU):
  - CHỈ SỬ DỤNG mức CB1 (Cơ bản 1) và CB2 (Cơ bản 2)
  - Học sinh cần được hướng dẫn từng bước, thao tác đơn giản
  - Ví dụ phù hợp: Xem video, quan sát hình ảnh, sử dụng phần mềm học tập có hướng dẫn
  - TRÁNH: Các hoạt động yêu cầu tự tìm kiếm, đánh giá phức tạp`;
  } else if (grade >= 4 && grade <= 5) {
    return `
  🎯 MỨC ĐỘ NLS PHÙ HỢP VỚI LỚP ${grade} (CẤP TIỂU HỌC - LỚP 4-5):
  - SỬ DỤNG mức CB2 (Cơ bản 2) và TC1 (Trung cấp 1)
  - Học sinh có thể thực hiện tác vụ độc lập với hướng dẫn rõ ràng
  - Ví dụ phù hợp: Tìm kiếm thông tin đơn giản, sử dụng MTCT, tạo nội dung cơ bản
  - TRÁNH: Đánh giá độ tin cậy nguồn, lập trình phức tạp`;
  } else if (grade === 6) {
    return `
  🎯 MỨC ĐỘ NLS PHÙ HỢP VỚI LỚP ${grade} (CẤP THCS - LỚP 6 ĐẦU THCS):
  - SỬ DỤNG mức CB2 (Cơ bản 2) và TC1 (Trung cấp 1)
  - Học sinh có thể thực hiện tác vụ độc lập với hướng dẫn rõ ràng
  - Ví dụ phù hợp: Tìm kiếm thông tin đơn giản, sử dụng MTCT, tạo nội dung cơ bản
  - TRÁNH: Đánh giá độ tin cậy nguồn, lập trình phức tạp`;
  } else if (grade >= 7 && grade <= 9) {
    return `
  🎯 MỨC ĐỘ NLS PHÙ HỢP VỚI LỚP ${grade} (CẤP THCS):
  - SỬ DỤNG mức TC1 (Trung cấp 1) và TC2 (Trung cấp 2)
  - Học sinh có thể giải quyết vấn đề, lựa chọn công cụ phù hợp
  - Ví dụ phù hợp: GeoGebra, Excel cơ bản, hợp tác qua Google Docs, tìm kiếm nâng cao
  - CÓ THỂ: Bắt đầu giới thiệu mức NC1 cho học sinh giỏi`;
  } else {
    return `
  🎯 MỨC ĐỘ NLS PHÙ HỢP VỚI LỚP ${grade} (CẤP THPT):
  - SỬ DỤNG mức TC2 (Trung cấp 2) và NC1 (Nâng cao 1)
  - Học sinh có thể áp dụng linh hoạt, sáng tạo trong bối cảnh mới
  - Ví dụ phù hợp: Phân tích dữ liệu phức tạp, đánh giá nguồn tin, lập trình Python/Block-code, sử dụng AI
  - KHUYẾN KHÍCH: Hoạt động yêu cầu tư duy phản biện, sáng tạo nội dung số`;
  }
}

// Hàm lấy chuẩn Năng lực AI theo QĐ 3439/QĐ-BGDĐT chính xác cho từng khối lớp (Lớp 1 - 12)
function getAIGradeGuidance(grade: number): string {
  switch (grade) {
    case 1:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 1 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1: Nhận biết con người có cảm xúc, AI không có cảm xúc (AI mô phỏng cảm xúc do con người lập trình). Nhận diện AI trong đời sống (loa thông minh, trợ lý ảo, robot).
  - NLb.B1/B3: Nhận biết hành vi dùng AI tốt/xấu; máy thông minh làm việc tốt; không dùng AI làm hại người khác.
  - NLc.C1: Nhận biết camera là "mắt", micro là "tai" của thiết bị AI; trò chuyện theo kịch bản định sẵn.
  - NLd.D1: Nhận biết máy thông minh học từ ví dụ (AI học nhận biết con mèo, quả táo...).`;

    case 2:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 2 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A2: Nhận biết khi nào nên/không nên dùng AI; AI làm việc dưới sự giám sát của con người; nhận diện thiết bị AI trong gia đình (loa thông minh, tivi gợi ý).
  - NLb.B1/B3: Nhận biết AI có thể thiên vị nếu dữ liệu không đa dạng; quyền sở hữu với sản phẩm do con người/AI tạo ra.
  - NLc.C1/C3: So sánh cách học của con người và AI; làm quen ứng dụng phân loại đồ vật bằng Teachable Machine hoặc Scratch AI.
  - NLd.D1/D2: Máy thông minh giúp giải quyết vấn đề quanh em; hiểu vai trò của dữ liệu trong việc "dạy" AI.`;

    case 3:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 3 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A2/A3: Sử dụng AI hỗ trợ học tập (trợ lý học tập thông minh); không phụ thuộc hoàn toàn vào AI; suy nghĩ kỹ trước khi dùng; kiểm tra và phản biện kết quả của AI.
  - NLb.B2/B3: Phân biệt thật và giả (ảnh/tin do AI tạo); không tạo ra hoặc sử dụng AI để lừa đảo, bắt nạt.
  - NLc.C4/C5: Hiểu dữ liệu học máy; kỹ thuật AI dựa trên luật (nếu... thì...); kỹ thuật học máy.
  - NLd.D1: Trình bày quy trình đơn giản để huấn luyện máy thông minh (thu thập ví dụ -> dạy máy học).`;

    case 4:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 4 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A2/A3: AI hỗ trợ công việc hằng ngày; AI hỗ trợ con người suy nghĩ (tra cứu, gợi ý ý tưởng, sửa lỗi); con người quyết định khi dùng AI.
  - NLb.B2: Bảo vệ thông tin cá nhân (họ tên, SĐT, địa chỉ, ảnh riêng tư) không chia sẻ cho AI.
  - NLc.C2/C5: Một số ứng dụng AI quen thuộc trong bối cảnh Việt Nam (nông nghiệp, y tế, dự báo lũ, dịch ngôn ngữ); làm quen Teachable Machine hoặc "ML for Kids" tích hợp trong Scratch.
  - NLd.D1/D2: Từ vấn đề đến ý tưởng AI; liên tục cải tiến hệ thống AI bằng cách bổ sung dữ liệu.`;

    case 5:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 5 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A2/A3: AI thay thế việc lặp đi lặp lại/nguy hiểm nhưng con người chịu trách nhiệm cuối cùng; AI không thay thế con người; AI phục vụ lợi ích chung.
  - NLb.B1/B2: Hệ thống AI công bằng; giúp AI hoạt động công bằng, không phân biệt đối xử.
  - NLc.C4/C5: Thuật toán AI dựa trên luật; sử dụng công cụ học máy trực quan.
  - NLd.D1/D2: Quy trình huấn luyện AI (xác định vấn đề, thu thập dữ liệu, dạy máy học, kiểm tra quết quả); cải tiến sản phẩm AI bằng dữ liệu.`;

    case 6:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 6 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A3: Con người tạo và điều khiển AI; AI hoạt động theo lập trình; học hỏi và phát triển với AI; bảo vệ quyền riêng tư và thông tin cá nhân trong thời đại AI.
  - NLb.B1/B2: Phân tích mặt tốt và mặt xấu của tính năng AI; nếu các câu hỏi kiểm tra tính an toàn khi sử dụng AI.
  - NLc.C1/C2/C3: Các thành phần cơ bản trong kiến trúc AI (Dữ liệu + Thuật toán); tác động tích cực/tiêu cực; kể tên công nghệ AI quen thuộc.
  - NLd.D1/D2: Trình bày ý kiến về việc nên hay không nên sử dụng AI trong tình huống thực tế; khi nào không nên dùng AI.`;

    case 7:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 7 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A2/A3: Quyền ra quyết định thuộc về con người; xác thực kết quả AI; phân tích tác hại khi AI tự quyết định; quyền tự chủ của con người và AI.
  - NLb.B2/B3: Đánh giá hành động vì một môi trường AI tốt đẹp; thể hiện thái độ và cam kết sử dụng AI có trách nhiệm.
  - NLc.C4/C5: Khía cạnh đạo đức dữ liệu huấn luyện (dữ liệu thiếu đa dạng); 3 phương pháp học máy (có giám sát, không giám sát, học tăng cường).
  - NLd.D1/D2: Ý tưởng dự án AI từ thực tiễn; lập kế hoạch và phát triển dự án sản phẩm đơn giản từ AI.`;

    case 8:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 8 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A2/A3: AI không thay thế con người (trong giáo dục, y tế, nghệ thuật); rủi ro khi lạm dụng AI (suy giảm tư duy phản biện & sáng tạo); nguy cơ bị AI kiểm soát; trách nhiệm pháp lý và giải trình.
  - NLb.B1/B2/B3: Rủi ro an toàn AI; phòng tránh rủi ro dữ liệu; trách nhiệm khi phát triển sản phẩm AI.
  - NLc.C1/C5: Trình bày cách AI thực hiện chức năng "đọc", "nghe", "nhìn"; cách AI nhận diện cảm xúc (nét mặt, từ khóa, ngữ điệu).
  - NLd.D1/D2: Lập kế hoạch dự án AI; xây dựng kịch bản hội thoại (chatbot/trợ lý ảo) và trải nghiệm người dùng UX.`;

    case 9:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 9 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A2/A3: Thách thức xã hội trong kỷ nguyên AI; thiên vị và thành kiến trong AI; định hướng học tập trong thế giới AI; AI giúp thể hiện bản thân & nghề nghiệp tương lai.
  - NLb.B2/B3: Trách nhiệm người sử dụng trong kiểm soát kết quả AI; kiến tạo hệ thống AI công bằng.
  - NLc.C2/C3: Thực hành vận dụng AI giải quyết vấn đề, tạo sản phẩm đơn giản (chatbot, nhận dạng hình ảnh với Teachable Machine, QuickDraw, CoSpaces); cải thiện bộ dữ liệu AI.
  - NLd.D1/D2: Con người dẫn dắt AI; kiểm thử, đánh giá và cải tiến sản phẩm AI.`;

    case 10:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 10 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A2/A3: Con người trong hệ thống AI; con người cần kiểm soát AI; phân tích rủi ro của sản phẩm AI; luật pháp về AI (Luật An ninh mạng, Luật Bảo vệ dữ liệu).
  - NLb.B2/B3: Tuân thủ quy định pháp luật khi sử dụng AI; các vấn đề đạo đức trong vận hành và sáng tạo AI (thiên vị dữ liệu, quyền riêng tư).
  - NLc.C2/C3/C4: Ứng dụng AI trong bối cảnh Việt Nam (nông nghiệp, y tế, dân tộc thiểu số); kỹ thuật đặt prompt phù hợp mục tiêu cụ thể; ảnh hưởng của chất lượng dữ liệu huấn luyện.
  - NLd.D1/D2: Ý tưởng hệ thống AI; mô tả các thành phần cơ bản của hệ thống AI (dữ liệu, mô hình, thuật toán, đầu ra, phản hồi).`;

    case 11:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 11 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A2/A3: Xây dựng quy trình sử dụng AI an toàn; AI nâng cao năng lực con người; tính bền vững và công bằng của AI; quyền của người dùng dữ liệu.
  - NLb.B2/B3: Phòng tránh rủi ro khi sử dụng AI; sơ đồ hóa các vấn đề đạo đức trong từng bước thiết kế AI.
  - NLc.C2/C3/C4/C5: Cách đặt prompt nâng cao; khám phá cách thức vận hành hệ thống AI; kiến thức cơ bản về Mạng nơ-ron nhân tạo (Artificial Neural Networks) và thuật toán phân cụm/phân lớp.
  - NLd.D1/D2: Thiết kế và vận hành tổng thể hệ thống AI; phương pháp tối ưu hóa hiệu quả hoạt động của hệ thống AI.`;

    case 12:
    default:
      return `
  🤖 KHUNG NĂNG LỰC AI LỚP 12 (QĐ 3439/QĐ-BGDĐT):
  - NLa.A1/A2/A3: Quyền kiểm soát của con người trong suốt vòng đời dự án AI; trách nhiệm giải trình theo quy định địa phương/quốc tế; soạn thảo Bộ nguyên tắc đạo đức cá nhân khi làm việc với AI; trách nhiệm công dân số.
  - NLb.B1/B2/B3: Phân tích nguyên nhân dẫn đến sự cố đạo đức/sai lệch AI; đánh giá mức độ rủi ro trong hệ sinh thái AI; đề xuất quy định liên quan đến AI.
  - NLc.C2/C3/C4: Tùy chỉnh công cụ AI hỗ trợ học tập & xã hội; thử nghiệm công cụ mã nguồn mở/miễn phí (Teachable Machine, ML5.js, TensorFlow.js, MIT App Inventor); thu thập, số hóa & cải thiện bộ dữ liệu.
  - NLd.D1/D2: Phân tích phương án thiết kế hệ thống AI đa chuyên môn; giải quyết phát sinh để hệ thống vận hành ổn định, bền vững.`;
  }
}

// Hàm lấy YCCĐạt Năng lực AI theo QĐ 2422/QĐ-BGDĐT chính xác cho từng lớp (Lớp 1-12)
function getAIGradeGuidanceQD2422(grade: number): string {
  // Lọc các dòng YCCĐạt đúng lớp từ constant AI_FRAMEWORK_DATA_QD2422
  const lines = AI_FRAMEWORK_DATA_QD2422.split('\n');
  const gradeHeader = `--- LỚP ${grade} ---`;
  const gradeHeaderNext = grade < 12 ? `--- LỚP ${grade + 1} ---` : null;
  
  let inSection = false;
  const result: string[] = [];
  
  for (const line of lines) {
    if (line.includes(gradeHeader)) {
      inSection = true;
      result.push(line);
      continue;
    }
    if (inSection) {
      if (gradeHeaderNext && line.includes(gradeHeaderNext)) break;
      if (line.startsWith('═══')) break;
      result.push(line);
    }
  }
  
  if (result.length === 0) {
    return `\n  🤖 KHUNG NĂNG LỰC AI LỚP ${grade} (QĐ 2422/QĐ-BGDĐT - 2026-2027):\n  Xem dữ liệu trong AI_FRAMEWORK_DATA_QD2422 cho lớp ${grade}.`;
  }
  
  return `\n  🤖 KHUNG NĂNG LỰC AI LỚP ${grade} (QĐ 2422/QĐ-BGDĐT - Chính thức từ 2026-2027):\n  CÁC YCCĐạt CỐT LÕI PHẢI ÁP DỤNG CHO LỚP ${grade}:\n  (Chọn 1-3 YCCĐạt phù hợp nhất với nội dung bài học, KHÔNG chèn tất cả)\n${result.filter(l => l.trim().startsWith('[')).map(l => '  ' + l).join('\n')}`;
}

// Hàm phân tích đặc thù môn học và đưa ra hướng dẫn NLS phù hợp
function getSubjectGuidance(subject: Subject): string {
  switch (subject) {
    case Subject.TOAN:
      return `
📚 ĐẶC THÙ MÔN TOÁN - HƯỚNG DẪN NLS (LỚP 1 - 12):
- ƯU TIÊN CÔNG CỤ THEO MẠCH BÀI:
  + Mạch Đồ thị / Tập nghiệm / Hình học: GeoGebra / Desmos (Mã 5.3.NC1a hoặc 5.2.NC1a)
  + Mạch Bài toán thực tế / Mô hình hóa toán học: Google / YouTube (Mã 1.1.NC1b hoặc 1.1.TC1a)
  + Mạch Ôn tập / Trắc nghiệm củng cố: Quizizz / Kahoot (Mã 2.1.TC1a)
  + Mạch Tính toán số / Kiểm tra nghiệm: Máy tính cầm tay Casio / Excel (Mã 5.2.NC1a hoặc 5.2.TC1a)
  + Mạch Kiểm tra lời giải / Phân tích các bước: AI Toán học (Photomath, ChatGPT, Gemini) (Mã NLc.C2 hoặc NLa.A3)

- PHÂN TẦNG CÔNG CỤ THEO KHỐI LỚP:
  + Lớp 1-3 (CB1, CB2 | AI: NLa.A1-A2, NLc.C1): Slide trình chiếu trực quan, game Toán hình ảnh (Matific, Blooket, Quizizz đơn giản), que tính/hình khối 3D ảo trên màn hình TV, MTCT đơn giản (Lớp 2-3).
  + Lớp 4-5 (CB2, TC1 | AI: NLa.A1-A3, NLc.C1-C2): MTCT cơ bản, Scratch AI nhận diện hình khối, Quizizz hình ảnh, Google tìm số liệu thực tế đơn giản.
  + Lớp 6-7 (CB2, TC1 | AI: NLa.A1-A3, NLc.C1-C4): GeoGebra vẽ đường thẳng/hình học phẳng, MTCT Casio, Excel bảng thống kê đơn giản, Google tra cứu ứng dụng thực tế.
  + Lớp 8-9 (TC1, TC2 | AI: NLa.A1-A3, NLc.C2-C4): GeoGebra biểu diễn hệ phương trình / đường tròn / tam giác đồng dạng, MTCT Casio 580VN X giải phương trình/hệ phương trình, Excel biểu đồ thống kê, Quizizz ôn tập, AI (Photomath/ChatGPT) kiểm tra lời giải.
  + Lớp 10-12 (TC2, NC1 | AI: NLa, NLb, NLc, NLd): GeoGebra 3D khảo sát hàm số/đạo hàm/tích phân/Oxyz, MTCT Casio 880BTG số phức/ma trận/thống kê nâng cao, Excel/Python quy hoạch tuyến tính, AI Prompting kiểm tra chứng minh toán học và phân tích thiên vị dữ liệu thống kê (NLb.B2).

- QUY TẮC 2 VỊ TRÍ CHÈN ĐẶC THÙ MÔN TOÁN:
  + VỊ TRÍ 1 (Ngay dưới d. Tổ chức thực hiện, trước Bước 1): Áp dụng khi GV dùng Slide trình chiếu, tổ chức Quizizz/Kahoot tổng kết, hoặc HS hợp tác nhóm trực tuyến. Viết theo VẾ ĐƠN tập trung chủ thể HS.
  + VỊ TRÍ 2 (Xen kẽ ngay sau từng Ví dụ/Luyện tập/HĐ khám phá CỤ THỂ trong Bước 1 hoặc Cột HĐ GV-HS): Áp dụng khi GV hướng dẫn sử dụng GeoGebra/Desmos/MTCT/AI cho bài tập cụ thể. Viết theo VẾ KÉP: [GV hướng dẫn sử dụng Công cụ + Mã NLS] → [HS thực hiện thao tác / tạo sản phẩm số].
  + Một hoạt động CÓ THỂ có cả VỊ TRÍ 1 VÀ VỊ TRÍ 2 nếu có cả 2 tình huống trên.

- NLS HÀNG ĐẦU CHO MÔN TOÁN: 5.3 (Sử dụng sáng tạo công cụ số), 5.2 (Xác định nhu cầu & giải pháp công nghệ), 1.1 (Tìm kiếm dữ liệu / Mô hình hóa thực tế), 2.1 (Tương tác trắc nghiệm số), NLc.C2 (Ứng dụng AI hỗ trợ học Toán), NLa.A3 (Phản biện kết quả AI Toán).
- CHÚ Ý ĐỊNH DẠNG: Công thức toán học PHẢI viết dạng LaTeX trong dấu $ (VD: $x^2 + y = 0$, $\\begin{cases} ax+by=c \\\\ dx+ey=f \\end{cases}$). Không dùng unicode hay ký tự đặc biệt thay LaTeX.`;

    case Subject.VAN:
      return `
📚 ĐẶC THÙ MÔN NGỮ VĂN - HƯỚNG DẪN NLS:
- ƯU TIÊN: Khai thác thông tin, sáng tạo nội dung, giao tiếp hợp tác
- NLS PHÙ HỢP: 1.1, 1.2 (Tìm kiếm, đánh giá thông tin), 2.2, 2.4 (Chia sẻ, hợp tác), 3.1 (Sáng tạo nội dung)
- VÍ DỤ: Tìm kiếm tài liệu văn học trực tuyến, viết bài trên Google Docs, thảo luận nhóm qua Padlet
- CHÚ Ý: Đánh giá độ tin cậy nguồn tư liệu văn học, tránh thông tin sai lệch`;

    case Subject.LY:
    case Subject.HOA:
    case Subject.SINH:
    case Subject.KHTN:
    case Subject.KHOA_HOC:
    case Subject.TNXH:
      return `
📚 ĐẶC THÙ MÔN KHOA HỌC TỰ NHIÊN (${subject}) - HƯỚNG DẪN NLS & AI:
- ƯU TIÊN: Mô phỏng thí nghiệm (PhET), thu thập dữ liệu, phân tích kết quả, ứng dụng AI nhận diện đối tượng tự nhiên
- NLS/AI PHÙ HỢP: 5.2 (Công cụ giải quyết vấn đề), 1.1, 1.2 (Tìm kiếm dữ liệu), NLc.C1/C2 (Nhận diện hình ảnh/dữ liệu tự nhiên bằng AI)
- VÍ DỤ: Sử dụng phần mềm mô phỏng thí nghiệm (PhET), vẽ biểu đồ bằng Excel, tra cứu dữ liệu khoa học, phân loại đồ vật/sinh vật bằng AI
- CHÚ Ý: Xác minh tính chính xác của dữ liệu khoa học từ các nguồn đáng tin cậy`;

    case Subject.ANH:
      return `
📚 ĐẶC THÙ MÔN TIẾNG ANH - HƯỚNG DẪN NLS & AI:
- ƯU TIÊN: Công cụ học ngôn ngữ, giao tiếp trực tuyến, sáng tạo nội dung đa phương tiện, Chatbot AI học ngoại ngữ
- NLS/AI PHÙ HỢP: 2.1, 2.4 (Tương tác, hợp tác), 1.1 (Tìm kiếm), 3.1 (Sáng tạo nội dung), NLc.C2 (Trợ lý ngôn ngữ AI)
- VÍ DỤ: Sử dụng từ điển trực tuyến, luyện phát âm qua app, tạo video bài thuyết trình, thực hành hội thoại tiếng Anh với Chatbot AI
- CHÚ Ý: Khuyến khích sử dụng các nền tảng học tiếng Anh (Duolingo, Quizlet, Kahoot, AI Tutor)`;

    case Subject.SU:
    case Subject.DIA:
    case Subject.KHXH:
    case Subject.LSDIA:
      return `
📚 ĐẶC THÙ MÔN KHOA HỌC XÃ HỘI (${subject}) - HƯỚNG DẪN NLS & AI:
- ƯU TIÊN: Khai thác tư liệu số, bản đồ số, phân tích sự kiện, phản biện thông tin số
- NLS/AI PHÙ HỢP: 1.1, 1.2 (Tìm kiếm và đánh giá thông tin số), 2.2 (Chia sẻ kiến thức), NLa.A3 (Phản biện tin giả, xác thực thông tin)
- VÍ DỤ: Sử dụng Google Earth, bản đồ số, tra cứu tư liệu lịch sử qua bảo tàng ảo, thảo luận sự kiện xã hội
- CHÚ Ý: Rèn luyện tư duy phản biện, đánh giá nguồn tin số đa chiều`;

    case Subject.TIN:
      return `
📚 ĐẶC THÙ MÔN TIN HỌC - HƯỚNG DẪN NLS:
- ƯU TIÊN: Lập trình, an toàn thông tin, giải quyết lỗi kỹ thuật
- NLS PHÙ HỢP: 3.4 (Lập trình), 4.1, 4.2 (An toàn, bảo mật), 5.1 (Giải quyết lỗi), 6.2 (Sử dụng AI)
- VÍ DỤ: Viết code Python/Scratch, thiết lập bảo mật tài khoản, debug chương trình
- CHÚ Ý: Môn này là trọng tâm của NLS, tích hợp tự nhiên vào mọi hoạt động`;

    case Subject.GDCD:
      return `
📚 ĐẶC THÙ MÔN GDCD - HƯỚNG DẪN NLS:
- ƯU TIÊN: Tham gia công dân số, văn hóa mạng, bảo vệ quyền riêng tư
- NLS PHÙ HỢP: 2.3 (Công dân số), 2.5 (Văn hóa mạng), 4.2 (Bảo vệ dữ liệu), 1.2 (Đánh giá tin giả)
- VÍ DỤ: Nhận diện thông tin sai lệch, ứng xử văn minh trên mạng, bảo vệ thông tin cá nhân
- CHÚ Ý: Giáo dục ý thức công dân số có trách nhiệm`;

    case Subject.GDQPAN:
      return `
📚 ĐẶC THÙ MÔN GDQP-AN - HƯỚNG DẪN NLS:
- ƯU TIÊN: An ninh mạng, bảo vệ thông tin quốc phòng, nhận diện thông tin xấu độc
- NLS PHÙ HỢP: 4.1, 4.2 (Bảo vệ thiết bị, dữ liệu), 2.3 (Trách nhiệm công dân), 1.2 (Đánh giá thông tin)
- VÍ DỤ: Nhận diện và phòng chống thông tin xấu độc trên mạng, bảo mật thông tin cá nhân và quốc phòng
- CHÚ Ý ĐẶC BIỆT: 
  + Tích hợp giáo dục an ninh mạng, phòng chống tội phạm công nghệ cao
  + Nhận biết các thủ đoạn lừa đảo, tuyên truyền xuyên tạc trên không gian mạng
  + Bảo vệ bí mật quốc gia, thông tin nhạy cảm về quốc phòng an ninh
  + Ý thức trách nhiệm bảo vệ chủ quyền số quốc gia`;

    case Subject.GDDP:
      return `
📚 ĐẶC THÙ MÔN GIÁO DỤC ĐỊA PHƯƠNG - HƯỚNG DẪN NLS:
- ƯU TIÊN: Khai thác thông tin địa phương, sáng tạo nội dung quảng bá văn hóa, hợp tác cộng đồng
- NLS PHÙ HỢP: 1.1 (Tìm kiếm thông tin), 2.2, 2.4 (Chia sẻ, hợp tác), 3.1 (Sáng tạo nội dung)
- VÍ DỤ: Tìm hiểu di sản văn hóa địa phương qua các nguồn số, tạo video giới thiệu quê hương
- CHÚ Ý ĐẶC BIỆT:
  + Sử dụng công nghệ số để tìm hiểu, lưu giữ và quảng bá văn hóa địa phương
  + Tạo bản đồ số về các địa điểm du lịch, di tích lịch sử địa phương
  + Sưu tầm và số hóa các tài liệu về lịch sử, văn hóa, con người địa phương
  + Kết nối cộng đồng qua các nền tảng số để bảo tồn và phát triển giá trị địa phương`;

    case Subject.CONG_NGHE:
      return `
📚 ĐẶC THÙ MÔN CÔNG NGHỆ - HƯỚNG DẪN NLS:
- ƯU TIÊN: Thiết kế kỹ thuật số, mô phỏng quy trình, giải quyết vấn đề công nghệ
- NLS PHÙ HỢP: 5.2 (Xác định giải pháp công nghệ), 3.1 (Sáng tạo nội dung), 5.3 (Sử dụng sáng tạo)
- VÍ DỤ: Vẽ thiết kế bằng phần mềm CAD, mô phỏng quy trình sản xuất, tìm hiểu công nghệ mới
- CHÚ Ý: Kết hợp thực hành với công cụ số để nâng cao hiệu quả`;

    case Subject.THE_DUC:
      return `
📚 ĐẶC THÙ MÔN THỂ DỤC - HƯỚNG DẪN NLS:
- ƯU TIÊN: Theo dõi sức khỏe, học kỹ thuật qua video, bảo vệ sức khỏe số
- NLS PHÙ HỢP: 4.3 (Bảo vệ sức khỏe), 1.1 (Tìm kiếm thông tin), 2.2 (Chia sẻ)
- VÍ DỤ: Xem video hướng dẫn kỹ thuật, sử dụng app theo dõi sức khỏe, chia sẻ thành tích
- CHÚ Ý: Cân bằng thời gian sử dụng thiết bị số và hoạt động thể chất`;

    case Subject.NQTN:
      return `
📚 ĐẶC THÙ MÔN NGHỆ THUẬT - HƯỚNG DẪN NLS:
- ƯU TIÊN: Sáng tạo nghệ thuật số, chia sẻ tác phẩm, bản quyền sáng tạo
- NLS PHÙ HỢP: 3.1 (Sáng tạo nội dung), 3.3 (Bản quyền), 2.2 (Chia sẻ)
- VÍ DỤ: Vẽ tranh số, chỉnh sửa ảnh/video, tạo nhạc số, triển lãm trực tuyến
- CHÚ Ý: Giáo dục về bản quyền tác phẩm nghệ thuật`;

    case Subject.HDKH:
      return `
📚 ĐẶC THÙ MÔN HOẠT ĐỘNG TRẢI NGHIỆM - HƯỚNG DẪN NLS:
- ƯU TIÊN: Hợp tác nhóm trực tuyến, quản lý dự án, giao tiếp số
- NLS PHÙ HỢP: 2.4 (Hợp tác), 2.1 (Tương tác), 3.1 (Sáng tạo nội dung), 1.3 (Quản lý dữ liệu)
- VÍ DỤ: Lập kế hoạch dự án trên Trello, họp nhóm qua Google Meet, báo cáo bằng slide
- CHÚ Ý: Phát triển kỹ năng làm việc nhóm và quản lý dự án số`;

    default:
      return `
📚 HƯỚNG DẪN NLS CHUNG:
- Tích hợp các năng lực số phù hợp với nội dung bài học
- Ưu tiên các năng lực: Tìm kiếm thông tin, Sáng tạo nội dung, Hợp tác trực tuyến
- Chú ý bảo vệ an toàn thông tin và văn hóa mạng`;
  }
}

// Define the hierarchy of models for fallback
const MODELS = [
  "gemini-3-flash-preview",  // Priority 1: Default - Fast & Good quality
  "gemini-3-pro-preview",    // Priority 2: Deep thinking / Best quality
  "gemini-2.5-flash"         // Priority 3: Fallback stable
];

// Helper phân tách và làm sạch danh sách API Keys
export function parseApiKeys(input?: string | string[]): string[] {
  if (!input) return [];
  let rawKeys: string[] = [];
  if (Array.isArray(input)) {
    rawKeys = input;
  } else if (typeof input === 'string') {
    // Tách theo dấu xuống dòng hoặc dấu phẩy
    rawKeys = input.split(/[\n,]+/);
  }
  
  const parsed = rawKeys
    .map(k => k.trim())
    .filter(k => k.length > 0 && !k.startsWith('#'));
  
  // Loại bỏ trùng lặp
  return Array.from(new Set(parsed));
}

// Interface kết quả kiểm tra API Key
export interface TestKeyResult {
  ok: boolean;
  msg: string;
  testedCount: number;
  validCount: number;
  details?: { key: string; ok: boolean; msg: string }[];
}

// Hàm kiểm tra kết nối API Key
export const testApiKey = async ({
  apiKey,
  model = 'gemini-2.5-flash'
}: {
  apiKey: string;
  model?: string;
}): Promise<TestKeyResult> => {
  const keys = parseApiKeys(apiKey);
  if (keys.length === 0) {
    return { ok: false, msg: "Chưa nhập API Key nào.", testedCount: 0, validCount: 0 };
  }

  const results: { key: string; ok: boolean; msg: string }[] = [];
  let validCount = 0;

  // Sử dụng model được chọn hoặc fallback gemini-2.5-flash
  const testModel = (model && model !== 'auto' && !model.includes('Tự động')) ? model : 'gemini-2.5-flash';

  for (const key of keys) {
    const masked = key.length > 8 ? `${key.slice(0, 6)}...${key.slice(-4)}` : key;
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: testModel,
        contents: "Trả lời đúng một từ: OK",
      });
      const text = response.text || '';
      if (text.length > 0) {
        validCount++;
        results.push({ key: masked, ok: true, msg: "Kết nối thành công! Key hoạt động tốt." });
      } else {
        results.push({ key: masked, ok: false, msg: "API phản hồi rỗng." });
      }
    } catch (err: any) {
      console.error(`Test Key Error [${masked}]:`, err);
      let msg = err.message || "Lỗi không xác định";
      if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("resource_exhausted")) {
        msg = "Hết ngạch hạn (Quota Exceeded - 429)";
      } else if (msg.includes("400") || msg.toLowerCase().includes("api key not valid")) {
        msg = "API Key không hợp lệ (400)";
      } else if (msg.includes("403")) {
        msg = "Bị từ chối truy cập (403)";
      }
      results.push({ key: masked, ok: false, msg });
    }
  }

  const summaryMsg = validCount > 0
    ? `Kết nối thành công! (${validCount}/${keys.length} Key hoạt động tốt)`
    : `Kiểm tra thất bại. Không có Key nào hoạt động (${results[0]?.msg || 'Lỗi kết nối'})`;

  return {
    ok: validCount > 0,
    msg: summaryMsg,
    testedCount: keys.length,
    validCount,
    details: results
  };
};

export const generateNLSLessonPlan = async (
  info: LessonInfo,
  options: ProcessingOptions
): Promise<string> => {

  // Lấy danh sách API Keys
  const keys = parseApiKeys(options.apiKeys || options.apiKey || process.env.API_KEY);
  if (keys.length === 0) {
    throw new Error("Missing API_KEY. Vui lòng nhập Gemini API Key trong phần cài đặt.");
  }

  // Danh sách Models
  let targetModels = [...MODELS];
  if (options.selectedModel && options.selectedModel !== 'auto' && !options.selectedModel.includes('Tự động')) {
    // Đưa model được chọn lên đầu tiên
    targetModels = [options.selectedModel, ...MODELS.filter(m => m !== options.selectedModel)];
  }

  let distributionContext = "";
  if (info.distributionContent && info.distributionContent.trim().length > 0) {
    distributionContext = `
      =========================================================
      🚨 QUY TẮC TỐI THƯỢNG (KHI CÓ PPCT - STRICT MODE):
      Người dùng ĐÃ CUNG CẤP nội dung Phân phối chương trình (PPCT).
      Đây là văn bản pháp quy, bạn phải tuân thủ TUYỆT ĐỐI các yêu cầu sau:

      BƯỚC 1: Đọc tên bài học trong "NỘI DUNG GIÁO ÁN GỐC".
      BƯỚC 2: Tìm ĐÚNG HÀNG của bài học đó trong bảng PPCT.
      BƯỚC 3: Trích xuất NGUYÊN VĂN, CHÍNH XÁC nội dung từ cột "Năng lực số phát triển" (hoặc "YCCĐ năng lực số", "Năng lực số") của hàng đó.
      BƯỚC 4: Đưa nội dung trích xuất vào phần Mục tiêu Năng lực số - GIỮ NGUYÊN MÃ SỐ VÀ NỘI DUNG.
      BƯỚC 5 (ĐỐI VỚI HỌC SINH KHUYẾT TẬT - NẾU BẬT CHẾ ĐỘ HSKT):
      - Kiểm tra xem trong hàng của bài học đó trên bảng PPCT có cột liên quan đến HSKT hay không (tiêu đề cột thường chứa: "Yêu cầu cần đạt đối với học sinh khuyết tật", "YCCĐ HSKT", "Điều chỉnh cho HSKT", "Học sinh khuyết tật", "Mục tiêu hòa nhập", "HSKT"...).
      - Nếu tìm thấy nội dung: Trích xuất NGUYÊN VĂN, CHÍNH XÁC nội dung đó và đưa vào mục Mục tiêu:
        <green>* Điều chỉnh mục tiêu đối với Học sinh Khuyết tật (HSKT) (theo PPCT):</green>
        <green>- [Nội dung nguyên văn trích từ cột HSKT trong bảng PPCT]</green>
      - ĐỒNG THỜI: Các câu <green>[Hỗ trợ HSKT: ...]</green> trong các hoạt động dạy học BẮT BUỘC PHẢI BÁM SÁT đúng YCCĐ này để hỗ trợ HSKT đạt được yêu cầu của nhà trường.

      📋 VÍ DỤ TRÍCH XUẤT ĐÚNG:
      Nếu trong PPCT có:
      | Bài 17 | ... | 1.1.TC1a: Tìm kiếm thông tin, quy tắc. 3.4.NC1a: Sử dụng MTCT để giải |
      
      Thì phần Mục tiêu phải ghi:
      ===NLS_MỤC_TIÊU===
      <blue>* Năng lực số</blue>
      <blue>- 1.1.TC1a: Tìm kiếm thông tin, quy tắc.</blue>
      <blue>- 3.4.NC1a: Sử dụng MTCT để giải.</blue>
      ===END===
      
      ⛔️ CÁC ĐIỀU CẤM (STRICTLY PROHIBITED):
      - CẤM TUYỆT ĐỐI việc tự ý thêm bất kỳ năng lực số nào khác không có trong PPCT của bài học này.
      - CẤM thay đổi mã số hay nội dung. VD: 1.1.TC1a phải giữ nguyên.
      - CẤM chèn Năng lực số vào các mục "a) Mục tiêu", "b) Nội dung", "c) Sản phẩm" của các hoạt động. CHỈ CHÈN VÀO "d) Tổ chức thực hiện".
      - Nếu cột năng lực số trong PPCT để trống, thì mục tiêu NLS ghi là: "* Năng lực số: Không có (theo PPCT)".

      NỘI DUNG PPCT:
      ${info.distributionContent}
      =========================================================
      `;
  }

  // Determine if the subject is English to use English instructions
  const isEnglishSubject = info.subject === Subject.ANH;

  // Select appropriate framework and instructions based on subject
  const frameworkData = (options.integrationMode === 'NONE') ? "" : (isEnglishSubject ? NLS_FRAMEWORK_DATA_ENGLISH : NLS_FRAMEWORK_DATA);
  const systemInstruction = isEnglishSubject ? SYSTEM_INSTRUCTION_ENGLISH : SYSTEM_INSTRUCTION;

  // Lấy hướng dẫn mức độ NLS theo cấp lớp
  const gradeLevelGuidance = (options.integrationMode === 'NONE') ? "" : getGradeLevelGuidance(info.grade);

  // Lấy hướng dẫn đặc thù môn học
  const subjectGuidance = getSubjectGuidance(info.subject);

  // TÍCH HỢP KHUNG NĂNG LỰC AI THEO QĐ 3439/QĐ-BGDĐT
  const modeText = options.integrationMode === 'NONE'
    ? "CHẾ ĐỘ TÍCH HỢP: KHÔNG TÍCH HỢP NĂNG LỰC SỐ HAY AI. CHỈ GIỮ NGUYÊN HOẶC ĐỊNH DẠNG/CHÈN TIẾNG ANH/HSKT."
    : options.integrationMode === 'AI' 
    ? "CHẾ ĐỘ TÍCH HỢP: CHỈ TÍCH HỢP NĂNG LỰC TRÍ TUỆ NHÂN TẠO (AI) THEO QĐ 3439/QĐ-BGDĐT." 
    : options.integrationMode === 'NLS'
    ? "CHẾ ĐỘ TÍCH HỢP: CHỈ TÍCH HỢP NĂNG LỰC SỐ THEO THÔNG TƯ 02/2025/TT-BGDĐT."
    : "CHẾ ĐỘ TÍCH HỢP: TÍCH HỢP SONG SONG CẢ NĂNG LỰC SỐ (TT 02/2025) VÀ NĂNG LỰC AI (QĐ 3439/QĐ-BGDĐT).";

  const needAI = options.integrationMode === 'AI' || options.integrationMode === 'BOTH';

  // Chọn đúng Khung AI theo phiên bản GV chọn (mặc định QĐ 2422)
  const useQD2422 = (options.aiFrameworkVersion ?? 'QD2422') === 'QD2422';

  // Lấy hướng dẫn NL AI theo lớp cụ thể
  const aiGradeGuidance = needAI
    ? (useQD2422 ? getAIGradeGuidanceQD2422(info.grade) : getAIGradeGuidance(info.grade))
    : "";
  // Luôn kèm hướng dẫn QĐ 3439 làm tham khảo bổ sung khi dùng QĐ 2422
  const aiGradeGuidanceLegacy = (needAI && useQD2422) ? getAIGradeGuidance(info.grade) : "";

  // Dữ liệu Khung AI đưa vào prompt
  const aiFrameworkPrompt = needAI
    ? (useQD2422
        ? `\n    === KHUNG NĂNG LỰC AI QĐ 2422 (CHÍNH THỨC TỪ 2026-2027 — ÁP DỤNG BẮT BUỘC) ===\n    ${AI_FRAMEWORK_DATA_QD2422}\n\n    === KHUNG NL AI QĐ 3439 (THAM KHẢO BỔ SUNG) ===\n    ${AI_FRAMEWORK_DATA_QD3439}\n`
        : `\n    ${AI_FRAMEWORK_DATA_QD3439}\n`)
    : "";

  // Xử lý danh sách các dạng khuyết tật được chọn (Hỗ trợ đa chọn nhiều đối tượng)
  const selectedDisabilityTypes = (options.disabilityTypes && options.disabilityTypes.length > 0)
    ? options.disabilityTypes
    : (options.disabilityType ? [options.disabilityType] : ['GENERAL']);

  const disabilityLabelMap: Record<string, string> = {
    INTELLECTUAL: 'Khuyết tật Trí tuệ / Khó khăn học tập (cần đơn giản hóa nhiệm vụ, chia nhỏ từng thao tác, tăng cường trực quan, giao bạn hỗ trợ)',
    VISUAL: 'Khuyết tật Thị giác / Nhìn kém (cần thuyết minh rõ bằng lời nói, tài liệu chữ lớn / hình ảnh phóng to, nhờ bạn đọc giúp)',
    HEARING: 'Khuyết tật Thính giác / Nghe kém (cần kênh hình ảnh trực quan, chữ viết trên bảng, ký hiệu, phân công bạn giao tiếp hỗ trợ)',
    MOTOR: 'Khuyết tật Vận động (cần bố trí chỗ ngồi thuận tiện, phân công bạn hỗ trợ chuẩn bị đồ dùng và thực hiện thao tác)',
    GENERAL: 'Hòa nhập tổng hợp (động viên, giao nhiệm vụ vừa sức, phân công Đôi bạn cùng tiến giúp đỡ hòa nhập)'
  };

  const disabilityNames = selectedDisabilityTypes.map(t => disabilityLabelMap[t] || t).join('\n    + ');
  // Yêu cầu cần đạt HSKT nhập tay hoặc chỉ định riêng (Ưu tiên số 1)
  const customTargetInstruction = (options.disabilityCustomTarget && options.disabilityCustomTarget.trim().length > 0)
    ? `\n    🎯 YÊU CẦU CẦN ĐẠT ĐỐI VỚI HỌC SINH KHUYẾT TẬT ĐƯỢC CHỈ ĐỊNH (ƯU TIÊN TUYỆT ĐỐI SỐ 1):
    "${options.disabilityCustomTarget.trim()}"
    -> BẮT BUỘC ghi nguyên văn vào mục Mục tiêu:
       <green>* Điều chỉnh mục tiêu đối với Học sinh Khuyết tật (HSKT):</green>
       <green>- ${options.disabilityCustomTarget.trim()}</green>
    -> BẮT BUỘC: Mọi biện pháp hỗ trợ trong thẻ <green>[Hỗ trợ HSKT: ...]</green> tại các bước dạy học PHẢI BÁM SÁT VÀ HỖ TRỢ HSKT ĐẠT ĐƯỢC ĐÚNG YÊU CẦU TRÊN.\n`
    : "";


  const disabilityPrompt = options.includeDisabilitySupport
    ? `\n    ${DISABILITY_SUPPORT_INSTRUCTIONS}\n    DẠNG KHUYẾT TẬT CẦN HỖ TRỢ TRONG LỚP (GỒM ${selectedDisabilityTypes.length} ĐỐI TƯỢNG CỤ THỂ):
    + ${disabilityNames}${customTargetInstruction}
    ⚠️ LƯU Ý BẮT BUỘC KHI LỚP CÓ NHIỀU ĐỐI TƯỢNG HSKT:
    - Trong mục Mục tiêu: Nêu rõ mục tiêu điều chỉnh vừa sức cho các đối tượng HSKT trong lớp.
    - Trong các câu <green>[Hỗ trợ HSKT: ...]</green> tại các hoạt động: Đưa ra biện pháp hỗ trợ phối hợp hoặc cụ thể cho từng đối tượng (ví dụ: vừa dùng hình ảnh/chữ viết cho HS khiếm thính, vừa chia nhỏ thao tác cho HS khó khăn học tập; phân công Đôi bạn cùng tiến cho từng em), đảm bảo quan tâm đầy đủ các đối tượng được chọn, không bỏ sót đối tượng nào.\n`
    : "";

  const englishPrompt = options.includeEnglishIntegration
    ? `\n    ${ENGLISH_CLIL_INSTRUCTIONS}\n    CẤP ĐỘ TÍCH HỢP TIẾNG ANH (CLIL): ${options.englishIntegrationLevel}\n`
    : "";

  // TÍCH HỢP STEM VÀO HOẠT ĐỘNG VẬN DỤNG (MÔ HÌNH A)
  const stemPrompt = options.enableStem
    ? `\n    === TÍCH HỢP GIÁO DỤC STEM (BẬT) ===\n    ${STEM_INTEGRATION_GUIDANCE}\n    TRẠNG THÁI STEM: BẬT → BẮT BUỘC đồng bộ hóa STEM vào 3 vị trí:\\n    (1) PHẦN I. MỤC TIÊU: Bổ sung chỉ báo Năng lực Giáo dục STEM với yêu cầu đề xuất ≥2 phương án và cải tiến.\\n    (2) PHẦN II. THIẾT BỊ DẠY HỌC: BẮT BUỘC tạo 2 khối Marker riêng biệt: ===NLS_THIẾT_BỊ_GV=== (chèn trước dòng 2. Học sinh:) và ===NLS_THIẾT_BỊ_HS=== (chèn trước dòng III. Tiến trình dạy học) với nội dung bọc trong thẻ <blue>...</blue> theo đúng hướng dẫn.\\n    (3) PHẦN III. HOẠT ĐỘNG VẬN DỤNG: BẮT BUỘC tạo ĐỦ 4 KHỐI MARKER (BƯỚC 1, 2, 3, 4) cho Hoạt động 4: ===NLS_HOẠT_ĐỘNG_4_BƯỚC_1=== (giao nhiệm vụ STEM mini tiếp nối câu hỏi gốc + công bố Rubric), ===NLS_HOẠT_ĐỘNG_4_BƯỚC_2=== (HS thực hiện, đo đạc >=3 lần), ===NLS_HOẠT_ĐỘNG_4_BƯỚC_3=== (báo cáo Padlet/Zalo + KWLH), ===NLS_HOẠT_ĐỘNG_4_BƯỚC_4=== (đánh giá theo Rubric 3 tiêu chí). Giữ nguyên 100% cấu trúc và nội dung tất cả các hoạt động còn lại.\n\n    (4) PHẦN CUỐI GIÁO ÁN (TRƯỚC DẶN DÒ): BẮT BUỘC tạo marker ===NLS_RUBRIC_STEM=== chứa toàn bộ Bảng Rubric 3 tiêu chí dạng bảng Markdown (4 hàng × 4 cột) để hệ thống tự động chèn bảng kẻ ô Word ngay TRƯỚC phần Dặn dò / Hướng dẫn về nhà của giáo án.`
    : `\n    TRẠNG THÁI STEM: TẮT → TUYỆT ĐỐI KHÔNG thêm bất kỳ nội dung STEM nào vào giáo án.\n`;

  // BẢNG TỔNG HỢP HOẠT ĐỘNG NLS & AI (TÙY CHỌN)
  const summaryTablePrompt = options.enableSummaryTable
    ? `\n    === BẢNG TỔNG HỢP HOẠT ĐỘNG NLS & AI (BẬT) ===\n    BẮT BUỘC tạo marker sau ở CUỐI BÀI (NGAY SAU phần Dặn dò / Hướng dẫn về nhà):\n    ===NLS_BẢNG_TỔNG_HỢP_HĐ|VITRI: Cuối giáo án > Sau phần Dặn dò / Hướng dẫn về nhà===\n    | Hoạt động | NLS/AI tích hợp | Công cụ | Sản phẩm/minh chứng |\n    |:--|:--|:--|:--|\n    | Hoạt động 1: [Tên HĐ 1] | [Mã NLS/AI đã chèn vào HĐ1] | [Công cụ từ câu chỉ báo HĐ1] | [Sản phẩm từ câu chỉ báo HĐ1] |\n    | Hoạt động 2: [Tên HĐ 2] | [Mã NLS/AI đã chèn vào HĐ2] | [Công cụ từ câu chỉ báo HĐ2] | [Sản phẩm từ câu chỉ báo HĐ2] |\n    | Hoạt động 3: [Tên HĐ 3] | [Mã NLS/AI đã chèn vào HĐ3] | [Công cụ từ câu chỉ báo HĐ3] | [Sản phẩm từ câu chỉ báo HĐ3] |\n    | Hoạt động 4: [Tên HĐ 4] | [Mã NLS/AI đã chèn vào HĐ4] | [Công cụ từ câu chỉ báo HĐ4] | [Sản phẩm từ câu chỉ báo HĐ4] |\n    ===END===\n\n    NGUYÊN TẮC KHỚP CHÍNH XÁC — BẮT BUỘC TUYỆT ĐỐI:\n    1. DUYỆT LẠI toàn bộ nội dung vừa sinh ở HĐ 1 → HĐ 4. Với mỗi hoạt động:\n       Liệt kê CHÍNH XÁC các mã NLS (x.x.TCxa) và AI ([7.X.x]) đã xuất hiện trong phần d. Tổ chức thực hiện.\n    2. CHỈ đưa vào bảng các mã ĐÃ THỰC SỰ XUẤT HIỆN — TUYỆT ĐỐI CẤM thêm mã mới không có trong giáo án.\n    3. TUYỆT ĐỐI CẤM gộp mã của hoạt động này sang hoạt động khác.\n    4. Cột Công cụ và Sản phẩm/minh chứng PHẢI BÁM SÁT câu chỉ báo NLS/AI đã viết.\n    5. Nếu một hoạt động không có NLS/AI → ghi Không có vào cột NLS/AI tích hợp.\n    6. Tên hoạt động trong cột Hoạt động PHẢI KHỚP với tên thực tế trong giáo án.\n`
    : `\n    BẢNG TỔNG HỢP NLS & AI: TẮT → Không tạo marker ===NLS_BẢNG_TỔNG_HỢP_HĐ===.\n`;

  // LỒNG GHÉP GIÁO DỤC QUỐC PHÒNG VÀ AN NINH (THÔNG TƯ 08/2024/TT-BGDĐT)
  const isQpanActive = !!options.includeQPAN;
  const qpanPrompt = isQpanActive
    ? `\n    === LỒNG GHÉP GIÁO DỤC QUỐC PHÒNG VÀ AN NINH (BẬT) ===\n    ${QPAN_INTEGRATION_GUIDANCE}\n    TRẠNG THÁI GIÁO DỤC QPAN: BẬT → BẮT BUỘC thực hiện đúng 2 vị trí:\n    (1) PHẦN I. MỤC TIÊU (trong ===NLS_MỤC_TIÊU===): Thêm 1 gạch đầu dòng vào mục Phẩm chất trong thẻ <red>...</red>:\n        <red>- Giáo dục Quốc phòng và An ninh (TT 08/2024/TT-BGDĐT): Bồi dưỡng lòng yêu nước, niềm tự hào dân tộc, ý thức [chủ đề cụ thể phù hợp với lớp ${info.grade} và bài học].</red>\n    (2) PHẦN III. TIẾN TRÌNH DẠY HỌC (d. Tổ chức thực hiện): Chọn đúng 1-2 hoạt động phù hợp nhất trong bài (thường ở Hoạt động 1 Khởi động khi liên hệ hình ảnh/tư liệu thực tế, hoặc Hoạt động 2/3/4 khi liên hệ thực tiễn/trách nhiệm công dân/chủ quyền/an toàn mạng). Chèn câu lồng ghép trên DÒNG RIÊNG bọc trong thẻ <red>[Lồng ghép QPAN - TT 08/2024]: ...</red>. Lồng ghép ngắn gọn, truyền cảm, có trọng tâm; tuyệt đối không gượng ép dàn trải.\n`
    : `\n    GIÁO DỤC QUỐC PHÒNG VÀ AN NINH: TẮT → CẤM TUYỆT ĐỐI chèn nội dung QPAN, CẤM DÙNG THẺ <red>.\n`;

  // MÔ HÌNH LỚP HỌC ĐẢO NGƯỢC (FLIPPED CLASSROOM)
  const isFlipped = options.teachingEnvironment === 'FLIPPED_CLASSROOM';

  // Xây dựng thông tin bài học tiếp theo (Waterfall 3 cấp)
  let nextLessonInfo = '';
  if (isFlipped) {
    if (options.nextLessonContent && options.nextLessonContent.trim().length > 50) {
      // Cấp 1: Đã có nội dung file bài sau (trích đoạn đầu đủ để AI đọc)
      const snippet = options.nextLessonContent.trim().slice(0, 2000);
      nextLessonInfo = `\n    THÔNG TIN BÀI HỌC TIẾP THEO (Đọc từ file giáo án bài sau — Dùng để viết Dặn dò):\n    ${snippet}\n`;
    } else if (options.nextLessonTitle || options.nextLessonSummary) {
      // Cấp 2: Giáo viên nhập tay tên bài + tóm tắt
      nextLessonInfo = `\n    THÔNG TIN BÀI HỌC TIẾP THEO (Nhập thủ công — Dùng để viết Dặn dò):\n    - Tên bài: ${options.nextLessonTitle || '(chưa cung cấp)'}\n    - Nội dung chính: ${options.nextLessonSummary || '(chưa cung cấp)'}\n`;
    }
    // Cấp 3: Fallback — không có nextLessonInfo, AI tự suy luận theo môn học
  }

  const flippedPrompt = isFlipped
    ? `\n    === MÔ HÌNH LỚP HỌC ĐẢO NGƯỢC (BẬT) ===\n    ${FLIPPED_CLASSROOM_GUIDANCE}\n    ${nextLessonInfo}\n    TRẠNG THÁI LỚP HỌC ĐẢO NGƯỢC: BẬT →\n    (1) Các hoạt động HĐ 1, HĐ 2: Diễn đạt theo mô hình Lớp học đảo ngược:
       - Tại Bước 2 (Thực hiện nhiệm vụ — Thảo luận nhóm trong lớp): Mọi câu chỉ báo tra cứu NLS (1.1, 1.2...) hoặc tra cứu AI ([...A1...]) PHẢI viết dạng "HS sử dụng tài liệu/thông tin số và kết quả tra cứu Internet/AI Chatbot đã chuẩn bị ở nhà kết hợp đối chiếu với SGK để thảo luận nhóm và hoàn thành phiếu học tập". TUYỆT ĐỐI CẤM viết "HS mở điện thoại tra cứu trên lớp" hay "HS dùng AI tra cứu trực tiếp trong giờ học".
       - Tại Bước 3 (Báo cáo): Đại diện nhóm sử dụng MÁY TÍNH CỦA GV để trình chiếu slide/bài báo cáo (Canva/PowerPoint đã chuẩn bị trước ở nhà) lên màn hình tivi.\n    (2) HĐ 3 (Luyện tập): HS làm vở/giấy; 1-2 HS đại diện thao tác trực tiếp trên máy tính GV.\n    (3) HĐ 4 (Vận dụng): Giao nhiệm vụ về nhà cụ thể, nộp qua Padlet/Zalo để báo cáo tiết sau.\n    (4) BẮT BUỘC TẠO MARKER ===NLS_DẶN_DÒ_TIẾT_SAU=== để chèn câu Dặn dò thông minh vào phần Hướng dẫn tự học/Dặn dò cuối bài. Nội dung câu Dặn dò phải bám sát thông tin bài học tiếp theo đã cung cấp (nếu có) hoặc theo định hướng môn học chung.\n    Cấu trúc Marker Dặn dò:\n    ===NLS_DẶN_DÒ_TIẾT_SAU|VITRI: Phần Hướng dẫn tự học / Dặn dò > Cuối bài===\n    <blue>- Nhiệm vụ số chuẩn bị cho bài học tiếp theo [Tên bài nếu có]: HS sử dụng Internet hoặc AI Chatbot để tìm hiểu trước [Nội dung cụ thể bám sát bài học tiếp theo]; ghi lại kết quả vào vở và tải lên Padlet/Zalo nhóm lớp. Trong tiết học tới, đại diện nhóm sẽ trình chiếu và báo cáo kết quả trước lớp qua máy tính của GV.</blue>\n    ===END===\n`
    : `\n    TRẠNG THÁI LỚP HỌC ĐẢO NGƯỢC: TẮT → Giữ nguyên phong cách diễn đạt hoạt động trực tiếp trên lớp như hiện tại. KHÔNG tạo Marker ===NLS_DẶN_DÒ_TIẾT_SAU===.\n`;

  // Tạo các câu quy tắc động theo đúng trạng thái Checkbox của người dùng
  const mode = options.integrationMode || 'BOTH';
  const isDigitalNLSActive = mode === 'NLS' || mode === 'BOTH';
  const isAINLActive = mode === 'AI' || mode === 'BOTH';
  const isNlsActive = isDigitalNLSActive || isAINLActive;
  const isDisabilityActive = !!options.includeDisabilitySupport;
  const isEnglishActive = !!options.includeEnglishIntegration;

  let nlsStatusInstruction = "";
  if (isDigitalNLSActive && isAINLActive) {
    nlsStatusInstruction = "1. NĂNG LỰC SỐ (<blue>) & AI (<purple>): BẬT CẢ HAI -> BẮT BUỘC chèn NLS màu xanh dương trong thẻ <blue>...</blue> VÀ Năng lực AI trong thẻ <purple>...</purple>, đồng thời tạo BẢNG TỔNG HỢP NLS & AI ở cuối bài.";
  } else if (isDigitalNLSActive) {
    nlsStatusInstruction = "1. NĂNG LỰC SỐ (<blue>): CHỈ BẬT NLS -> BẮT BUỘC chèn NLS màu xanh dương trong thẻ <blue>...</blue> và tạo BẢNG TỔNG HỢP NLS ở cuối bài. CẤM TUYỆT ĐỐI dùng thẻ <purple> (màu tím), CẤM chèn bất kỳ mã Năng lực AI (NLa, NLb, NLc, NLd).";
  } else if (isAINLActive) {
    nlsStatusInstruction = "1. NĂNG LỰC AI (<purple>): CHỈ BẬT AI -> BẮT BUỘC chèn Năng lực AI màu tím trong thẻ <purple>...</purple> và tạo BẢNG TỔNG HỢP AI ở cuối bài. CẤM TUYỆT ĐỐI dùng thẻ <blue> (màu xanh dương), CẤM chèn các mã NLS thông thường (1.x, 2.x, 3.x, 4.x, 5.x).";
  } else {
    nlsStatusInstruction = "1. NĂNG LỰC SỐ & AI: TẮT -> CẤM TUYỆT ĐỐI chèn chữ màu xanh dương (<blue>) hoặc màu tím (<purple>), CẤM tạo Bảng tổng hợp NLS cuối bài.";
  }

  if (isEnglishActive) {
    nlsStatusInstruction += "\n    LƯU Ý ĐỒNG THỜI: Tích hợp Tiếng Anh (<orange>) đang BẬT. Giữ <blue>/<purple> NLS/AI trên DÒNG RIÊNG, <orange> Tiếng Anh trên DÒNG RIÊNG. TUYỆT ĐỐI không gộp lẫn các thẻ trong cùng 1 câu.";
  }
  if (isDisabilityActive) {
    nlsStatusInstruction += "\n    LƯU Ý ĐỒNG THỜI: Hỗ trợ HSKT (<green>) đang BẬT. Giữ <blue>/<purple> NLS/AI trên DÒNG RIÊNG, <green> HSKT trên DÒNG RIÊNG. TUYỆT ĐỐI không gộp lẫn các thẻ trong cùng 1 câu.";
  }

  const disabilityStatusInstruction = isDisabilityActive
    ? "2. HỖ TRỢ HSKT (<green>): BẬT -> BẮT BUỘC chèn câu hỗ trợ HSKT màu xanh lá trong thẻ <green>[Hỗ trợ HSKT: ...]</green> (trọng tâm Bước 1 & Bước 2, tối đa 1 câu/bước)."
    : "2. HỖ TRỢ HSKT (<green>): TẮT -> CẤM TUYỆT ĐỐI chèn bất kỳ nội dung HSKT nào, CẤM DÙNG THẺ <green>. Không được tự ý đưa HSKT vào.";

  const englishStatusInstruction = isEnglishActive
    ? "3. TÍCH HỢP TIẾNG ANH (<orange>): BẬT -> BẮT BUỘC chèn nội dung tiếng Anh màu cam trong thẻ <orange>...</orange>."
    : "3. TÍCH HỢP TIẾNG ANH (<orange>): TẮT -> CẤM TUYỆT ĐỐI chèn bất kỳ từ vựng hay câu lệnh Tiếng Anh nào, CẤM DÙNG THẺ <orange>. Không được tự ý đưa Tiếng Anh vào.";

  const qpanStatusInstruction = isQpanActive
    ? "4. GIÁO DỤC QUỐC PHÒNG VÀ AN NINH (<red>): BẬT -> BẮT BUỘC chèn nội dung lồng ghép QPAN màu đỏ trong thẻ <red>[Lồng ghép QPAN - TT 08/2024: ...]</red> theo Thông tư 08/2024/TT-BGDĐT (1 dòng mục tiêu và 1-2 điểm trong tiến trình dạy học)."
    : "4. GIÁO DỤC QUỐC PHÒNG VÀ AN NINH: TẮT -> CẤM TUYỆT ĐỐI chèn bất kỳ nội dung QPAN nào, CẤM DÙNG THẺ <red>.";

  const needMarkersForSubFeatures = !isNlsActive && (isDisabilityActive || isEnglishActive);

  // ====== CHẾ ĐỘ BỔ SUNG (SUPPLEMENT MODE) ======
  // Khi file giáo án đã có NLS → chỉ thêm AI/HSKT/Tiếng Anh, GIỮ NGUYÊN NLS đã có
  const isSupplementMode = options.hasExistingNLS === true;

  // Xây dựng danh sách nhiệm vụ bổ sung
  const supplementTasks: string[] = [];
  if (isAINLActive) supplementTasks.push(`Bổ sung NĂNG LỰC AI (<purple>...</purple>) vào phần "d. Tổ chức thực hiện" của các hoạt động phù hợp`);
  if (isDisabilityActive) supplementTasks.push(`Bổ sung HỖ TRỢ HSKT (<green>[Hỗ trợ HSKT: ...]</green>) vào Bước 1 (điều chỉnh giao nhiệm vụ) và Bước 2 (hỗ trợ thực hiện) của 1-2 hoạt động trọng tâm`);
  if (isEnglishActive) supplementTasks.push(`Bổ sung TIẾNG ANH (<orange>...</orange>) dạng song ngữ cho các khái niệm/thuật ngữ kỹ thuật quan trọng trong phần d. Tổ chức thực hiện`);
  if (isQpanActive) supplementTasks.push(`Lồng ghép GIÁO DỤC QUỐC PHÒNG VÀ AN NINH (<red>[Lồng ghép QPAN - TT 08/2024: ...]</red>) vào 1-2 hoạt động phù hợp theo Thông tư 08/2024`);

  const supplementModePrompt = isSupplementMode ? `
=== CHẾ ĐỘ BỔ SUNG (SUPPLEMENT MODE) — ĐÃ PHÁT HIỆN GIÁO ÁN CÓ NLS ===

PHÁT HIỆN: File giáo án này ĐÃ CÓ Năng lực số (NLS) được chèn sẵn dưới dạng [...] hoặc <blue>.

NGUYÊN TẮC BẤT DI BẤT DỊCH — TUYỆT ĐỐI TUÂN THỦ:
✅ GIỮ NGUYÊN 100%: Tất cả NLS đã có trong ngoặc vuông [...] hoặc thẻ <blue>...<\/blue>. KHÔNG được tái sinh, thay thế, hay viết lại chúng.
✅ GIỮ NGUYÊN 100%: Toàn bộ nội dung, cấu trúc, 4 bước và thứ tự các hoạt động.
❌ TUYỆT ĐỐI KHÔNG: Tái sinh NLS mới (<blue>) vì NLS đã đủ và đã được giáo viên chèn sẵn.
❌ TUYỆT ĐỐI KHÔNG: Xóa, bình luận, hay thay đổi bất kỳ NLS bracket [...] nào đã có.
❌ TUYỆT ĐỐI KHÔNG: Chèn thẻ màu vào giữa danh sách câu hỏi (1., 2., 3., ...) hay đáp án (A., B., C., D.).
❌ TUYỆT ĐỐI KHÔNG: Đẩy thẻ thừa ra cuối file — nếu không tìm được vị trí phù hợp, bỏ qua.

NHIỆM VỤ DUY NHẤT — CHỈ BỔ SUNG CÁC THÀNH PHẦN SAU:
${supplementTasks.length > 0 ? supplementTasks.map((t, i) => `${i + 1}. ${t}`).join('\n') : '(Không có hạng mục nào được bật — giữ nguyên toàn bộ giáo án.)'}

QUY TẮC VỊ TRÍ CHÈN (CHỈ TRONG CHẾ ĐỘ BỔ SUNG):
- CHỈ CHÈN vào "d. Tổ chức thực hiện" (Bước 1, 2, 3, 4).
- TUYỆT ĐỐI KHÔNG chèn vào: a. Mục tiêu, b. Nội dung, c. Sản phẩm của hoạt động.
- AI (<purple>): Chèn cuối Bước 1 (khi GV giao nhiệm vụ có AI) hoặc cuối Bước 2 (HS thực hành AI). Phân bổ 1-3 điểm cho cả bài.
- HSKT (<green>): Bước 1 (1 câu GV điều chỉnh nhiệm vụ) + Bước 2 (1 câu GV hỗ trợ trực tiếp). Áp dụng cho 1-2 hoạt động.
- Tiếng Anh (<orange>): Song ngữ khái niệm kỹ thuật, ngay sau lần xuất hiện đầu tiên trong Bước 1/2. Tối đa 3-5 khái niệm/bài.
- QPAN (<red>): Chèn 1 câu lệnh/câu hỏi liên hệ trong Bước 1 hoặc Bước 2 của 1-2 hoạt động trọng tâm theo Thông tư 08/2024.

` : '';

  // User prompt
  const userPrompt = isEnglishSubject ? `
    DIGITAL COMPETENCE FRAMEWORK REFERENCE DATA:
    ${frameworkData}
    ${aiFrameworkPrompt}
    ${disabilityPrompt}
    ${englishPrompt}
    ${stemPrompt}
    ${summaryTablePrompt}
    ${qpanPrompt}

    LESSON PLAN INPUT INFORMATION:
    - Subject: ${info.subject}
    - Grade: ${info.grade}
    - Mode: ${modeText}
    ${gradeLevelGuidance}
    ${aiGradeGuidance}
    ${subjectGuidance}
    
    ${distributionContext}

    PROCESSING REQUIREMENTS & FEATURE ON/OFF STATUS (MANDATORY TO FOLLOW):
    ${nlsStatusInstruction}
    ${disabilityStatusInstruction}
    ${englishStatusInstruction}
    ${qpanStatusInstruction}

    ${options.analyzeOnly ? "- Analyze only, do not edit in detail." : needMarkersForSubFeatures ? "- DO NOT insert Digital Competence in blue (<blue>) or AI Competence in purple (<purple>). DO NOT generate DC summary tables.\n    - BUT YOU MUST STILL OUTPUT THE STRUCTURED MARKERS ===DC_OBJECTIVES=== AND ===DC_ACTIVITY_X_ORGANIZATION=== to wrap <green>Disability Support</green> and/or <orange>English Integration</orange> content for automated Word DOCX injection." : isNlsActive ? "- Edit the lesson plan and INTEGRATE ALL ENABLED COMPETENCIES (Digital Competence / AI / Disability Support / English) evenly across activities." : "- Keep lesson plan structure and only process enabled items."}
    ${options.detailedReport ? "- Include a detailed explanation table of selected competence codes at the end." : ""}
    
    FORMAT REQUIREMENTS (MANDATORY):
    1. PRESERVE ORIGINAL FORMATTING: You must keep bold (**text**), italic (*text*) formatting from the original text.
    2. TABLES: Use standard Markdown Table.
    ${isDigitalNLSActive && isAINLActive ? "3. DC & AI ADDITIONS: Use <blue>...</blue> tags for digital competence and <purple>...</purple> for AI competence. Include indicator codes (e.g. 1.1.TC1a: or NLc.C2:)." : isDigitalNLSActive ? "3. DC ADDITIONS: ONLY use <blue>...</blue> tags for digital competence (e.g. 1.1.TC1a:). ABSOLUTELY DO NOT use <purple> tags or AI codes." : isAINLActive ? "3. AI ADDITIONS: ONLY use <purple>...</purple> tags for AI competence (e.g. NLc.C2:). ABSOLUTELY DO NOT use <blue> tags or standard DC codes." : "3. DC & AI ADDITIONS: DISABLED. DO NOT use <blue> or <purple> tags."}
    ${isDisabilityActive ? "4. DISABILITY SUPPORT: Use <green>[Hỗ trợ HSKT: ...]</green> to mark inclusive education support in green." : "4. DISABILITY SUPPORT: DISABLED. ABSOLUTELY DO NOT use <green> tags or disability support."}
    ${isEnglishActive ? "5. ENGLISH INTEGRATION: Use <orange>[EN Instruction: ...]</orange> or similar tags based on the level in orange." : "5. ENGLISH INTEGRATION: DISABLED. ABSOLUTELY DO NOT use <orange> tags or English content."}
    6. LOCATION: Insert in Objectives under "2. Competence". For activities, ONLY insert into section "d) Organization" (or steps under Organization). DO NOT insert into Content, Outcomes, or Objectives of activities.
    ${supplementModePrompt}
    ORIGINAL LESSON PLAN:
    ${info.content}
  ` : `
    ${modeText}

    DỮ LIỆU THAM CHIẾU KHUNG NĂNG LỰC SỐ & NĂNG LỰC AI (QĐ 3439 & TT 02):
    ${frameworkData}
    ${aiFrameworkPrompt}
    ${disabilityPrompt}
    ${englishPrompt}
    ${stemPrompt}
    ${flippedPrompt}
    ${summaryTablePrompt}
    ${qpanPrompt}

    THÔNG TIN GIÁO ÁN ĐẦU VÀO:
    - Môn học: ${info.subject}
    - Khối lớp: ${info.grade}
    ${gradeLevelGuidance}
    ${aiGradeGuidance}
    ${aiGradeGuidanceLegacy}
    ${subjectGuidance}
    
    ${distributionContext}

    TÌNH TRẠNG BẬT/TẮT CÁC HẠNG MỤC TÍCH HỢP (BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI):
    ${nlsStatusInstruction}
    ${disabilityStatusInstruction}
    ${englishStatusInstruction}
    ${qpanStatusInstruction}

    YÊU CẦU XỬ LÝ NỘI DUNG:
    ${options.analyzeOnly ? "- Chỉ phân tích, không chỉnh sửa chi tiết." : needMarkersForSubFeatures ? "- KHÔNG chèn Năng lực số màu xanh (<blue>) hay Năng lực AI màu tím (<purple>), KHÔNG tạo Bảng tổng hợp NLS ở cuối bài.\n    - NHƯNG BẮT BUỘC PHẢI TẠO CÁC MARKER ===NLS_MỤC_TIÊU=== VÀ ===NLS_HOẠT_ĐỘNG_X_TỔ_CHỨC=== (hoặc ===NLS_HOẠT_ĐỘNG_X_BƯỚC_Y===) để bọc nội dung được BẬT (HSKT hoặc Tiếng Anh) phục vụ chèn tự động vào file Word (.docx)." : (() => {
        const tasks: string[] = [];
        if (isDigitalNLSActive && isAINLActive) tasks.push("TÍCH HỢP SONG SONG cả Năng lực số (<blue>) và Năng lực AI (<purple>) vào phần d. Tổ chức thực hiện");
        else if (isDigitalNLSActive) tasks.push("TÍCH HỢP NĂNG LỰC SỐ (<blue>) vào phần d. Tổ chức thực hiện (CẤM dùng thẻ <purple> hay mã AI)");
        else if (isAINLActive) tasks.push("TÍCH HỢP NĂNG LỰC AI (<purple>) vào phần d. Tổ chức thực hiện (CẤM dùng thẻ <blue> hay mã NLS thông thường)");
        if (isDisabilityActive) tasks.push("ĐỒNG THỜI chèn câu HỖ TRỢ HSKT (<green>) vào đúng các bước của hoạt động (trọng tâm Bước 1 & Bước 2, tối đa 1 câu/bước)");
        if (isEnglishActive) tasks.push("ĐỒNG THỜI chèn nội dung TÍCH HỢP TIẾNG ANH (<orange>) vào các hoạt động theo đúng cấp độ");
        if (isQpanActive) tasks.push("ĐỒNG THỜI lồng ghép GIÁO DỤC QUỐC PHÒNG VÀ AN NINH (<red>) theo Thông tư 08/2024/TT-BGDĐT vào 1-2 hoạt động phù hợp nhất");
        if (tasks.length === 0) return "- Giữ nguyên khung bài dạy, chỉ xử lý định dạng.";
        return "- Chỉnh sửa giáo án, THỰC HIỆN SONG SONG ĐẦY ĐỦ CÁC MỤC ĐƯỢC BẬT:\n" + tasks.map(t => "      + " + t).join("\n");
      })()}
    ${options.detailedReport ? "- Kèm theo bảng giải thích chi tiết mã năng lực đã chọn ở cuối bài." : ""}
    
    YÊU CẦU VỀ ĐỊNH DẠNG VÀ VỊ TRÍ TRÍCH DẪN (BẮT BUỘC):
    1. GIỮ NGUYÊN ĐỊNH DẠNG GỐC: Bạn phải giữ nguyên các đoạn in đậm (**text**), in nghiêng (*text*) của văn bản gốc. Không được làm mất định dạng này.
    2. TOÁN HỌC: Tất cả công thức toán phải viết dạng LaTeX trong dấu $. Ví dụ: $x^2$. Không dùng unicode.
    3. BẢNG: Sử dụng Markdown Table chuẩn.
    4. THẺ MÀU & ĐÁNH DẤU:
       ${isDigitalNLSActive && isAINLActive ? "- Dùng thẻ <blue>...</blue> để đánh dấu màu xanh dương NLS, thẻ <purple>...</purple> cho AI." : isDigitalNLSActive ? "- CHỈ dùng thẻ <blue>...</blue> cho NLS. CẤM dùng thẻ <purple>." : isAINLActive ? "- CHỈ dùng thẻ <purple>...</purple> cho AI. CẤM dùng thẻ <blue>." : "- NLS & AI: TẮT."}
       ${isDisabilityActive ? "- HỖ TRỢ HSKT: Dùng thẻ <green>...</green> màu xanh lá." : "- HỖ TRỢ HSKT: TẮT."}
       ${isEnglishActive ? "- TIẾNG ANH: Dùng thẻ <orange>...</orange> màu cam." : "- TIẾNG ANH: TẮT."}
       ${isQpanActive ? "- GIÁO DỤC QPAN (TT 08/2024/TT-BGDĐT): Dùng thẻ <red>[Lồng ghép QPAN - TT 08/2024]: ...</red> màu đỏ cờ." : "- GIÁO DỤC QPAN: TẮT."}
    5. QUY TẮC BẮT BUỘC CHO MỤC TIÊU (===NLS_MỤC_TIÊU===):
       - Chèn ở cuối mục "2. Năng lực" (trước mục 3. Phẩm chất).
       - Tiêu đề NLS: <blue>* Năng lực số</blue>
       - Tiêu đề Năng lực AI: <blue>* Năng lực Trí tuệ nhân tạo (AI)</blue> (hoặc thẻ <purple>...</purple>)
       - Tiêu đề HSKT: <green>* Điều chỉnh mục tiêu đối với Học sinh Khuyết tật (HSKT):</green>
       - Tiêu đề Tiếng Anh: <orange>* Tích hợp Tiếng Anh (English Integration):</orange>
       - Lồng ghép QPAN: <red>* Lồng ghép Giáo dục Quốc phòng và An ninh (TT 08/2024/TT-BGDĐT):</red>
       - TẤT CẢ CÁC Ý CHỈ BÁO NĂNG LỰC BẮT BUỘC PHẢI CÓ DẤU GẠCH ĐẦU DÒNG ("- ") ở đầu mỗi dòng (ví dụ: <blue>- 1.1.TC1a: ...</blue>, <purple>- [7.A1.2]: ...</purple>).
     5b. QUY TẮC BẮT BUỘC CHO THIẾT BỊ DẠY HỌC STEM (===NLS_THIẾT_BỊ_GV=== VÀ ===NLS_THIẾT_BỊ_HS===):
        Khi bật STEM, BẮT BUỘC tạo 2 khối Marker riêng biệt cho mục II. Thiết bị:
        - Marker Thiết bị Giáo viên:
          ===NLS_THIẾT_BỊ_GV|VITRI: Mục II. Thiết bị dạy học và học liệu > 1. Giáo viên (Trước dòng "2. Học sinh:" hoặc "2.Học sinh:")===
          <blue>- Thiết bị & Học liệu STEM: Máy tính, tivi kết nối Internet; Bảng tiêu chí đánh giá sản phẩm (Rubric mini 3 tiêu chí); Phiếu hướng dẫn nhiệm vụ STEM mini; đường link Padlet/Azota để HS nộp sản phẩm.</blue>
          ===END===
        - Marker Thiết bị Học sinh:
          ===NLS_THIẾT_BỊ_HS|VITRI: Mục II. Thiết bị dạy học và học liệu > 2. Học sinh (Trước dòng "III. Tiến trình dạy học")===
          <blue>- Phiếu học tập STEM: Phiếu 1-KWLH (Đã biết – Muốn biết – Cách tìm hiểu – Đã học được); Phiếu 2-Thiết kế thực nghiệm; Phiếu 3-Thu thập & phân tích số liệu (đo ≥3 lần, tính trung bình).</blue>
          <blue>- Thiết bị số: Điện thoại/máy tính để chụp ảnh minh chứng từng giai đoạn, nhập số liệu Google Sheets.</blue>
          <blue>- Vật liệu thực hành STEM: [Liệt kê cụ thể vật liệu dễ tìm/tái chế bám sát 100% bài học và Hoạt động 4].</blue>
          ===END===
    6. ⭐ QUY TẮC 100% CHỦ THỂ HỌC SINH (STUDENT-CENTRIC):
       - NLS (<blue>) VÀ NĂNG LỰC AI (<purple>) LUÔN LUÔN LÀ NĂNG LỰC CỦA HỌC SINH (HS).
       - MỌI CÂU CHỈ BÁO NLS/AI PHẢI BẮT ĐẦU BẰNG "HS [Hành động số / AI cụ thể] để [Mục đích học tập]".
       - 🚫 CẤM TUYỆT ĐỐI dùng: "GV hướng dẫn HS...", "GV yêu cầu HS...". Câu chỉ báo chỉ mô tả hành động và năng lực thực tế của Học sinh.
    7. ⭐ QUY TẮC PHÂN BỔ TRẢI ĐỀU NLS VÀ NL AI QUA TẤT CẢ CÁC HOẠT ĐỘNG (CHUẨN CV 5512):
       - Trải đều: MỌI HOẠT ĐỘNG (HĐ 1 Khởi động, HĐ 2 Khám phá/HTKM, HĐ 3 Luyện tập, HĐ 4 Vận dụng/STEM) đều cần được tích hợp NLS và/hoặc NL AI phù hợp, thiết thực.
       - Bước 1 (Giao nhiệm vụ): ❌ Mặc định KHÔNG chèn.
       - Bước 2 (Thực hiện nhiệm vụ): ✅ ĐÂY LÀ VỊ TRÍ CHÈN TRỌNG TÂM cho từng hoạt động khi HS trực tiếp thao tác công cụ số/AI (tra cứu, bấm MTCT, vẽ GeoGebra, thí nghiệm ảo PhET, nhập Excel, làm bài trắc nghiệm Quizizz/Kahoot, đối chiếu câu trả lời AI với SGK).
       - Bước 3 (Báo cáo): ✅ Chèn khi HS thực sự nộp/trình chiếu file số qua Padlet/Google Slides/máy chiếu.
       - Bước 4 (Kết luận): ❌ Mặc định KHÔNG chèn.
       - 🚫 KHÓA CHẶT: TUYỆT ĐỐI CẤM chèn bất kỳ thẻ màu nào vào mục "a. Mục tiêu", "b. Nội dung", "c. Sản phẩm" của các hoạt động. CHỈ CHÈN VÀO "d. Tổ chức thực hiện".
    8. ⭐ NGUYÊN TẮC TÍCH HỢP AI THỰC TẾ & BÁM SÁT BÀI HỌC:
       - Cấp THCS (Lớp 6-9): AI chỉ dừng ở mức vừa sức (HS tra cứu mở rộng bằng Chatbot, đối chiếu thông tin AI với SGK, thảo luận tính đúng/sai). 🚫 CẤM TUYỆT ĐỐI yêu cầu HS cấp THCS "huấn luyện mô hình AI", "gán nhãn dữ liệu Machine Learning", "lập trình AI".
       - BÁM SÁT 100% NỘI DUNG BÀI HỌC: NLS/AI/STEM chèn vào BẮT BUỘC PHẢI PHỤC VỤ TRỰC TIẾP cho kiến thức bài học đang dạy. 🚫 CẤM TUYỆT ĐỐI tự ý "bịa" ra nhiệm vụ lạc đề (ví dụ: bài học về thực vật thoát hơi nước thì CẤM đổi thành "tính BMR trên Excel" hay "làm thực đơn ăn kiêng"; bài tập Toán hình học thì CẤM đổi thành "vẽ Canva sơ đồ tư duy").
    9. VỊ TRÍ TRÍCH DẪN DÒNG LIỀN TRƯỚC:
       - Mỗi Marker '===NLS_...===' PHẢI đính kèm thông tin '|VITRI:...' trích dẫn chính xác dòng/câu liền trước trong giáo án gốc của giáo viên.
       - Ví dụ Marker: '===NLS_HOẠT_ĐỘNG_1_BƯỚC_2|VITRI: Hoạt động 1 > d. Tổ chức thực hiện > Bước 2 > Sau dòng: "GV yêu cầu HS quan sát..."==='    
    
    ĐỊNH DẠNG ĐẦU RA:
    - Trả về toàn bộ nội dung giáo án đã chỉnh sửa dưới dạng Markdown.
    
    ${supplementModePrompt}NỘI DUNG GIÁO ÁN GỐC:
    ${info.content}
  `;

  // Fallback Logic: Try each Key and Model sequence
  let lastError = null;

  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const currentKey = keys[keyIdx];
    const ai = new GoogleGenAI({ apiKey: currentKey });

    for (let modelIdx = 0; modelIdx < targetModels.length; modelIdx++) {
      const currentModelId = targetModels[modelIdx];
      console.log(`Attempting generation with Key ${keyIdx + 1}/${keys.length} and model: ${currentModelId}...`);

      try {
        const response = await ai.models.generateContent({
          model: currentModelId,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.1,
          },
          contents: userPrompt,
        });

        const text = response.text;
        if (!text) {
          throw new Error("API trả về kết quả rỗng (Empty Response).");
        }
        return text; // Success!

      } catch (error: any) {
        console.error(`Error with Key ${keyIdx + 1} and model ${currentModelId}:`, error);

        let errorMessage = error.message || "";
        if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('{')) {
          try {
            const errorObj = JSON.parse(errorMessage);
            if (errorObj.error && errorObj.error.message) {
              errorMessage = errorObj.error.message;
            }
          } catch (e) { /* ignore */ }
        }

        error.message = errorMessage;
        lastError = error;

        // Nếu gặp lỗi 429 Quota Exceeded hoặc Key hỏng, lập tức chuyển sang Key tiếp theo nếu còn
        const isQuotaOrKeyError = errorMessage.includes("429") || 
                                  errorMessage.toLowerCase().includes("quota") ||
                                  errorMessage.includes("403") ||
                                  errorMessage.includes("API key not valid");

        if (isQuotaOrKeyError && keyIdx < keys.length - 1) {
          console.warn(`Key ${keyIdx + 1} encountered rate limit / auth issue (${errorMessage}). Switching to next API key...`);
          break; // Thoát vòng lặp model để chuyển sang Key tiếp theo trong keys
        }
      }
    }
  }

  // If all keys and models failed
  if (lastError) {
    throw lastError;
  }

  throw new Error("Tất cả các API Key hoặc Model đều thất bại. Vui lòng kiểm tra lại cấu hình API Key trong phần cài đặt.");
};

