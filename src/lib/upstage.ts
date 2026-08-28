/**
 * Upstage Document Parse API
 * 역할: HWP / PDF 등 한글 공문서를 텍스트(마크다운)로 변환
 * Gemini가 읽기 전 전처리 단계로 사용
 */
export async function parseDocumentWithUpstage(params: {
  apiKey: string;
  fileBase64: string; // data URL (base64)
  fileName: string;
}): Promise<string> {
  const { apiKey, fileBase64, fileName } = params;

  // data URL → Blob 변환
  const [header, base64Data] = fileBase64.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const byteChars = atob(base64Data);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: mimeType });

  const formData = new FormData();
  formData.append('document', blob, fileName);

  const response = await fetch('https://api.upstage.ai/v1/document-digitization', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Upstage 문서 파싱 오류: ${err?.detail || `HTTP ${response.status}`}`);
  }

  const data = await response.json();
  const text = data?.content?.markdown || data?.content?.text;
  if (!text) throw new Error('Upstage가 문서 내용을 추출하지 못했습니다.');
  return text;
}
