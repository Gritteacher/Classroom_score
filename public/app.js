const $ = selector => document.querySelector(selector);
const form = $('#search-form');
const input = $('#student-id');
const searchCard = $('.search-card');
const loading = $('#loading');
const result = $('#result');
const error = $('#error-message');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let busy = false;

function message(student) {
  if ([student.before, student.after, student.final].includes('ขาดสอบ')) return ['ยังมีเรื่องที่เราค่อย ๆ จัดการได้', 'ลองคุยกับครูเรื่องการขาดสอบนะ เธอไม่จำเป็นต้องหาทางออกเพียงลำพัง'];
  if (student.total >= 80) return ['ยินดีกับความตั้งใจของเธอด้วยนะ', 'ความพยายามทีละเล็กทีละน้อยพาเธอมาถึงตรงนี้ ให้รางวัลตัวเองด้วยรอยยิ้ม แล้วเก็บความอยากเรียนรู้ไว้ต่อไป'];
  if (student.total >= 70) return ['เก่งมากแล้ว เติบโตต่อไปในแบบของเธอ', 'ทุกสิ่งที่ได้เรียนรู้มีความหมาย ภูมิใจกับก้าวนี้ได้เลย แล้วค่อย ๆ เติมเต็มส่วนที่ยังอยากทำให้ดีขึ้น'];
  if (student.total >= 50) return ['ทุกก้าวเล็ก ๆ คือความก้าวหน้า', 'ขอบคุณที่พยายามมาถึงตรงนี้ ลองเลือกทบทวนทีละเรื่อง ความเข้าใจจะค่อย ๆ เติบโตไปพร้อมกับเธอ'];
  return ['คะแนนครั้งนี้ไม่ได้กำหนดคุณค่าของเธอ', 'พักหายใจได้ แล้วเราค่อยเริ่มใหม่ทีละนิด ลองคุยกับครูเพื่อวางแผนไปด้วยกัน เธอยังเรียนรู้และพัฒนาได้เสมอ'];
}

function clearError() { error.hidden = true; error.textContent = ''; input.removeAttribute('aria-invalid'); }
input.addEventListener('input', clearError);
function showError(text, invalid = false) { error.textContent = text; error.hidden = false; if (invalid) input.setAttribute('aria-invalid', 'true'); }

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  clearError();
  const studentId = input.value.trim().replace(/[๐-๙]/g, d => String(d.charCodeAt(0) - 3664)).replace(/[０-９]/g, d => String(d.charCodeAt(0) - 65296));
  if (!/^\d{5}$/.test(studentId)) { showError('กรอกรหัสนักเรียนเป็นตัวเลข 5 หลักให้ครบก่อนนะ', true); input.focus(); return; }
  busy = true;
  searchCard.hidden = true;
  result.hidden = true;
  loading.hidden = false;
  $('#loading-message').textContent = 'กำลังเปิดซองความพยายาม…';
  const timer = setTimeout(() => { $('#loading-message').textContent = 'อีกนิดเดียว พร้อมแล้วหรือยัง…'; }, 900);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const delay = new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 0 : 1900));
  try {
    const response = await fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId }), signal: controller.signal, cache: 'no-store' });
    await delay;
    if (!response.ok) {
      const texts = { 404: 'ยังไม่พบรหัสนี้ ลองตรวจสอบรหัสนักเรียนอีกครั้งนะ', 429: 'ค้นหาหลายครั้งติดกัน พักสัก 1 นาทีแล้วลองใหม่นะ', 400: 'กรุณาตรวจสอบรหัสนักเรียนอีกครั้ง' };
      throw new Error(texts[response.status] || 'ระบบยังไม่พร้อมในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    }
    const { student } = await response.json();
    $('#result-title').textContent = student.name;
    $('#result-id').textContent = `รหัสนักเรียน ${student.id} · สังคมศึกษา 5`;
    $('#total-score').textContent = student.total;
    $('#grade').textContent = student.grade;
    for (const key of ['before', 'after', 'final']) $(`#${key}-score`).textContent = typeof student[key] === 'number' ? `${student[key]} คะแนน` : student[key];
    $('#absence-note').hidden = ![student.before, student.after, student.final].includes('ขาดสอบ');
    const [title, body] = message(student);
    $('#quote-title').textContent = title;
    $('#quote-body').textContent = body;
    result.classList.toggle('celebrate', student.total >= 80);
    loading.hidden = true;
    result.hidden = false;
    $('#result-title').focus({ preventScroll: true });
    result.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
  } catch (e) {
    await delay;
    loading.hidden = true;
    searchCard.hidden = false;
    showError(e.name === 'AbortError' ? 'การเชื่อมต่อใช้เวลานาน ลองค้นหาอีกครั้งนะ' : e instanceof TypeError ? 'เชื่อมต่อไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่นะ' : e.message);
    input.focus();
  } finally { clearTimeout(timer); clearTimeout(timeout); busy = false; }
});

$('#reset-button').addEventListener('click', () => {
  result.hidden = true;
  for (const id of ['result-title','result-id','total-score','grade','before-score','after-score','final-score','quote-title','quote-body']) $(`#${id}`).textContent = '';
  searchCard.hidden = false;
  input.value = '';
  clearError();
  input.focus();
});
window.addEventListener('pageshow', event => { if (event.persisted) $('#reset-button').click(); });
