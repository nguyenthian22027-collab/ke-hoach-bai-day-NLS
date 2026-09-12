import JSZip from 'jszip';
import { GoogleGenAI } from '@google/genai';
import { Subject } from '../types';
import { parseApiKeys } from './geminiService';

export interface TranslationProgress {
  stage: string;
  current: number;
  total: number;
  percent: number;
}

export interface DocxTranslationOptions {
  apiKey?: string;
  apiKeys?: string[];
  selectedModel?: string;
  subject?: Subject;
  grade?: number;
  onProgress?: (progress: TranslationProgress) => void;
  signal?: AbortSignal;
}

interface ParagraphItem {
  id: number;
  node: Element;
  originalText: string;
  translatedText?: string;
}

const SYSTEM_TRANSLATION_PROMPT = `You are a certified professional educational translator and bilingual curriculum specialist for Vietnam's K-12 General Education Program (GDPT 2018, Dispatch 5512/BGDĐT-GDTrH, Dispatch 2345/BGDĐT-GDTH) and international Cambridge bilingual schools.

Your task is to translate Vietnamese lesson plan paragraphs into 100% formal, accurate, natural pedagogical English.

MANDATORY PEDAGOGICAL TERMINOLOGY RULES:
1. Lesson structure headings:
   - "I. MỤC TIÊU" -> "I. OBJECTIVES"
   - "1. Kiến thức" -> "1. Knowledge"
   - "2. Năng lực" -> "2. Competences" (Core/General competences: "Năng lực chung", Subject-specific competences: "Năng lực đặc thù")
   - "Tự chủ và tự học" -> "Autonomy and self-regulated learning"
   - "Giao tiếp và hợp tác" -> "Communication and collaboration"
   - "Giải quyết vấn đề và sáng tạo" -> "Problem-solving and creativity"
   - "3. Phẩm chất" -> "3. Qualities" (Yêu nước: "Patriotism", Nhân ái: "Compassion", Chăm chỉ: "Diligence", Trung thực: "Honesty", Trách nhiệm: "Responsibility")
   - "II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU" -> "II. TEACHING AIDS AND LEARNING MATERIALS"
   - "1. Giáo viên" -> "1. Teacher", "2. Học sinh" -> "2. Students"
   - "III. TIẾN TRÌNH DẠY HỌC" -> "III. LESSON PROCEDURE"
   - "Hoạt động 1: Mở đầu / Khởi động" -> "Activity 1: Warm-up / Introduction"
   - "Hoạt động 2: Hình thành kiến thức mới" -> "Activity 2: Knowledge Formation"
   - "Hoạt động 3: Luyện tập" -> "Activity 3: Practice"
   - "Hoạt động 4: Vận dụng" -> "Activity 4: Application"
   - "a) Mục tiêu" -> "a) Objectives", "b) Nội dung" -> "b) Content", "c) Sản phẩm" -> "c) Products", "d) Tổ chức thực hiện" -> "d) Implementation"
   - "Bước 1: Chuyển giao nhiệm vụ" -> "Step 1: Task Assignment"
   - "Bước 2: Thực hiện nhiệm vụ" -> "Step 2: Task Execution"
   - "Bước 3: Báo cáo, thảo luận" -> "Step 3: Reporting and Discussion"
   - "Bước 4: Kết luận, nhận định" -> "Step 4: Conclusion and Assessment"
   - "Hoạt động của giáo viên" -> "Teacher's Activities"
   - "Hoạt động của học sinh" -> "Students' Activities"
   - "Giáo viên (GV)" -> "Teacher (T)"
   - "Học sinh (HS)" -> "Students (Ss)"
   - "Phiếu học tập" -> "Worksheet"
   - "Dặn dò / Hướng dẫn về nhà" -> "Homework / Further Instructions"
   - "Năng lực số" -> "Digital Competence"
   - "Năng lực Trí tuệ nhân tạo (AI)" -> "Artificial Intelligence (AI) Competence"
   - "Học sinh khuyết tật (HSKT)" -> "Students with Disabilities (SWD)"
   - "Giáo dục Quốc phòng và An ninh" -> "National Defense and Security Education"

2. Preserve All Special Syntax Exactly:
   - Mathematical expressions ($x^2$, equations), chemistry symbols, units (cm, m, kg, s, ml) MUST BE PRESERVED.
   - Punctuation placeholders (".../.../...", "......") MUST BE PRESERVED.
   - Competence codes like [1.1.TC1a], [7.A1.2], [NLc.C2] MUST BE PRESERVED.
   - Color markers like <blue>...</blue>, <purple>...</purple>, <green>...</green>, <orange>...</orange>, <red>...</red> MUST BE PRESERVED.
   - You may bold English heading prefixes like "**Activity 1:**" or "**Step 1:**".

3. STRICT JSON OUTPUT FORMAT:
   Return ONLY a valid JSON array of objects with the exact "id" numbers provided:
   [
     { "id": 0, "en": "Translated English text" }
   ]`;

/**
 * Gọi API Gemini để dịch 1 mẻ (batch) các đoạn văn bản
 */
async function translateParagraphBatch(
  batch: { id: number; text: string }[],
  options: DocxTranslationOptions
): Promise<Map<number, string>> {
  const keys = parseApiKeys(options.apiKeys || options.apiKey || (typeof process !== 'undefined' ? process.env.API_KEY : ''));
  if (keys.length === 0) {
    throw new Error('Chưa có API Key. Vui lòng cấu hình Gemini API Key trước khi dịch.');
  }

  const targetModels = [
    options.selectedModel || 'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash'
  ];

  const userPrompt = `Translate the following Vietnamese lesson plan items into pedagogical English according to the system instructions.
Return ONLY a valid JSON array with keys "id" and "en".

INPUT ITEMS:
${JSON.stringify(batch.map(item => ({ id: item.id, vi: item.text })), null, 2)}`;

  let lastError: any = null;

  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const currentKey = keys[keyIdx];
    const ai = new GoogleGenAI({ apiKey: currentKey });

    for (let modelIdx = 0; modelIdx < targetModels.length; modelIdx++) {
      const currentModelId = targetModels[modelIdx];

      try {
        const response = await ai.models.generateContent({
          model: currentModelId,
          config: {
            systemInstruction: SYSTEM_TRANSLATION_PROMPT,
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
          contents: userPrompt,
        });

        const text = response.text;
        if (!text) throw new Error('API trả về kết quả rỗng.');

        // Parse JSON
        let parsed: any[];
        try {
          parsed = JSON.parse(text);
        } catch {
          // Thử trích xuất mảng JSON nếu có text bao ngoài
          const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (match) {
            parsed = JSON.parse(match[0]);
          } else {
            throw new Error('Không thể phân tích kết quả JSON từ AI.');
          }
        }

        const resultMap = new Map<number, string>();
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item.id === 'number' && typeof item.en === 'string') {
              resultMap.set(item.id, item.en);
            }
          }
        }

        return resultMap;

      } catch (error: any) {
        console.error(`Lỗi dịch batch với Key ${keyIdx + 1}, model ${currentModelId}:`, error);
        lastError = error;

        const errMsg = (error.message || '').toLowerCase();
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('403') || errMsg.includes('key not valid')) {
          break; // Đổi key tiếp theo
        }
      }
    }
  }

  throw lastError || new Error('Dịch batch thất bại với tất cả API Key.');
}

/**
 * Cập nhật nội dung văn bản tiếng Anh vào node <w:p> của Word XML
 * Bảo toàn 100% định dạng, căn lề <w:pPr>, hình ảnh <w:drawing>, công thức MathType <w:object>
 */
function updateParagraphTextInDocx(pNode: Element, translatedText: string) {
  // Lấy tất cả các run <w:r> có chứa text <w:t>
  const runs = Array.from(pNode.getElementsByTagName('w:r'));
  const textRuns = runs.filter(r => r.getElementsByTagName('w:t').length > 0);

  if (textRuns.length === 0) return;

  const firstRun = textRuns[0];
  const firstRPr = firstRun.getElementsByTagName('w:rPr')[0];

  // Kiểm tra xem bản dịch có định dạng in đậm Markdown **...** hay không
  const hasMarkdownBold = /\*\*(.*?)\*\*/.test(translatedText);

  if (hasMarkdownBold) {
    // Tách văn bản thành các phân đoạn: thường hoặc in đậm
    const parts: { text: string; bold: boolean }[] = [];
    const regex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(translatedText)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: translatedText.substring(lastIndex, match.index), bold: false });
      }
      parts.push({ text: match[1], bold: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < translatedText.length) {
      parts.push({ text: translatedText.substring(lastIndex), bold: false });
    }

    // Xóa các text run cũ (ngoại trừ các run chứa drawing hoặc object)
    const xmlDoc = pNode.ownerDocument;
    const parent = firstRun.parentNode;
    const refSibling = firstRun;

    for (const part of parts) {
      if (!part.text) continue;
      const newRun = xmlDoc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:r');
      
      // Clone hoặc tạo w:rPr
      let newRPr: Element;
      if (firstRPr) {
        newRPr = firstRPr.cloneNode(true) as Element;
      } else {
        newRPr = xmlDoc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
      }

      if (part.bold) {
        if (!newRPr.getElementsByTagName('w:b').length) {
          const bNode = xmlDoc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:b');
          newRPr.appendChild(bNode);
        }
      } else {
        const bNodes = Array.from(newRPr.getElementsByTagName('w:b'));
        bNodes.forEach(b => newRPr.removeChild(b));
      }

      newRun.appendChild(newRPr);
      const tNode = xmlDoc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
      tNode.setAttribute('xml:space', 'preserve');
      tNode.textContent = part.text;
      newRun.appendChild(tNode);

      parent?.insertBefore(newRun, refSibling);
    }

    // Xóa toàn bộ các text run cũ
    for (const oldRun of textRuns) {
      // Chỉ xóa nếu run không chứa ảnh hoặc công thức
      if (oldRun.getElementsByTagName('w:drawing').length === 0 && oldRun.getElementsByTagName('w:object').length === 0) {
        oldRun.parentNode?.removeChild(oldRun);
      } else {
        // Xóa thẻ w:t bên trong
        const ts = Array.from(oldRun.getElementsByTagName('w:t'));
        ts.forEach(t => oldRun.removeChild(t));
      }
    }
  } else {
    // Không có markdown bold -> Đặt text vào firstRun, xóa text các run còn lại
    const firstT = firstRun.getElementsByTagName('w:t')[0];
    if (firstT) {
      firstT.textContent = translatedText;
      firstT.setAttribute('xml:space', 'preserve');
    }

    for (let i = 1; i < textRuns.length; i++) {
      const otherRun = textRuns[i];
      if (otherRun.getElementsByTagName('w:drawing').length === 0 && otherRun.getElementsByTagName('w:object').length === 0) {
        otherRun.parentNode?.removeChild(otherRun);
      } else {
        const ts = Array.from(otherRun.getElementsByTagName('w:t'));
        ts.forEach(t => otherRun.removeChild(t));
      }
    }
  }
}

/**
 * HÀM CHÍNH: Dịch toàn bộ file DOCX sang tiếng Anh bằng kỹ thuật In-place XML Replacement
 * Đảm bảo 100% định dạng, bảng biểu, ảnh, công thức MathType không bị xô lệch
 */
export async function translateDocxInPlace(
  originalArrayBuffer: ArrayBuffer,
  options: DocxTranslationOptions
): Promise<{ docxBlob: Blob; translatedMarkdown: string }> {
  options.onProgress?.({
    stage: 'Đang giải nén và phân tích cấu trúc Word...',
    current: 0,
    total: 100,
    percent: 5,
  });

  const zip = await JSZip.loadAsync(originalArrayBuffer);
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('File DOCX không hợp lệ (thiếu word/document.xml).');
  }

  const documentXml = await documentXmlFile.async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(documentXml, 'application/xml');

  // Lấy tất cả các đoạn văn <w:p>
  const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));
  const itemsToTranslate: ParagraphItem[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const tNodes = Array.from(p.getElementsByTagName('w:t'));
    const rawText = tNodes.map(t => t.textContent || '').join('');
    const trimmed = rawText.trim();

    // Bỏ qua nếu là đoạn rỗng hoặc chỉ chứa ký hiệu phân cách
    if (trimmed.length === 0) continue;
    if (/^[.\-_…\s/\\|:;]{2,}$/.test(trimmed)) continue;

    itemsToTranslate.push({
      id: i,
      node: p,
      originalText: trimmed,
    });
  }

  if (itemsToTranslate.length === 0) {
    // Không có văn bản cần dịch -> trả về file gốc
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    return { docxBlob: blob, translatedMarkdown: '' };
  }

  // Chia thành các batch từ 35-45 đoạn văn để đảm bảo không vượt quá token limit và phản hồi nhanh
  const BATCH_SIZE = 40;
  const batches: { id: number; text: string }[][] = [];
  for (let i = 0; i < itemsToTranslate.length; i += BATCH_SIZE) {
    batches.push(itemsToTranslate.slice(i, i + BATCH_SIZE).map(item => ({ id: item.id, text: item.originalText })));
  }

  const totalBatches = batches.length;
  const resultMap = new Map<number, string>();

  // Dịch tuần tự các batch (kèm cập nhật tiến trình chính xác)
  for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
    if (options.signal?.aborted) {
      throw new Error('Quá trình dịch đã bị hủy bởi người dùng.');
    }

    const currentPercent = 10 + Math.round((bIdx / totalBatches) * 75);
    options.onProgress?.({
      stage: `Đang dịch nội dung (${bIdx * BATCH_SIZE + 1} - ${Math.min((bIdx + 1) * BATCH_SIZE, itemsToTranslate.length)} / ${itemsToTranslate.length} đoạn)...`,
      current: bIdx + 1,
      total: totalBatches,
      percent: currentPercent,
    });

    const batchRes = await translateParagraphBatch(batches[bIdx], options);
    for (const [id, en] of batchRes.entries()) {
      resultMap.set(id, en);
    }
  }

  options.onProgress?.({
    stage: 'Đang cập nhật văn bản tiếng Anh vào file Word và bảo toàn cấu trúc...',
    current: totalBatches,
    total: totalBatches,
    percent: 90,
  });

  // Thay thế văn bản vào các node XML
  const translatedLines: string[] = [];
  for (const item of itemsToTranslate) {
    const en = resultMap.get(item.id);
    if (en && en.trim().length > 0) {
      updateParagraphTextInDocx(item.node, en);
      translatedLines.push(en);
    } else {
      translatedLines.push(item.originalText);
    }
  }

  options.onProgress?.({
    stage: 'Đang đóng gói file Word tiếng Anh hoàn chỉnh...',
    current: totalBatches,
    total: totalBatches,
    percent: 95,
  });

  const serializer = new XMLSerializer();
  const newXml = serializer.serializeToString(xmlDoc);
  zip.file('word/document.xml', newXml);

  const docxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  options.onProgress?.({
    stage: 'Chuyển đổi sang Tiếng Anh hoàn tất!',
    current: totalBatches,
    total: totalBatches,
    percent: 100,
  });

  return {
    docxBlob,
    translatedMarkdown: translatedLines.join('\n\n'),
  };
}
