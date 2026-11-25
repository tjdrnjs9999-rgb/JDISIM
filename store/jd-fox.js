/* 🦊 로미 eSIM 썸네일 정본 (2026-11-25) — index(app.js)·mobile.html 공용
 * 사장님 "자사몰 이심 썸네일 이상한데? 몇몇 나라 썸네일 바꿔줘":
 *  ① 7개국(id·kr·mx·my·sg·tr·us) 이미지를 같은 파일명으로 교체 → 브라우저 캐시에 옛 사진 → ?v= 붙임
 *  ② 다국가 상품이 '맨 앞 나라'로 매칭(글로벌 120국 = 미국 여우, 남미 = 유럽 사진) → 지역 판정
 *  ③ 여우 없는 국가(독일·노르웨이 등)는 옛 사진(images/global.jpg) → 지역 여우로 */
(function () {
  var V = '20261125';
  var SINGLE = [['중국 홍콩', 'cnhkmo'], ['홍콩', 'hkmo'], ['마카오', 'hkmo'], ['괌', 'gusp'], ['사이판', 'gusp'], ['호주 뉴질랜드', 'aunz'], ['한국 일본', 'krjp'],
    ['북미', 'nam'], ['남미', 'sam'], ['유럽', 'eu'], ['일본', 'jp'], ['베트남', 'vn'], ['태국', 'th'], ['대만', 'tw'], ['중국', 'cn'], ['미국', 'us'], ['하와이', 'us'],
    ['캐나다', 'ca'], ['멕시코', 'mx'], ['필리핀', 'ph'], ['싱가포르', 'sg'], ['말레이시아', 'my'], ['인도네시아', 'id'], ['발리', 'id'], ['캄보디아', 'kh'], ['라오스', 'la'],
    ['몽골', 'mn'], ['인도', 'in'], ['스리랑카', 'lk'], ['네팔', 'np'], ['몰디브', 'mv'], ['호주', 'au'], ['뉴질랜드', 'nz'], ['튀르키예', 'tr'], ['터키', 'tr'], ['러시아', 'ru'],
    ['사우디', 'sa'], ['오만', 'om'], ['아랍에미리트', 'ae'], ['두바이', 'ae'], ['UAE', 'ae'], ['모로코', 'ma'], ['영국', 'gb'], ['프랑스', 'fr'], ['스페인', 'es'],
    ['이탈리아', 'it'], ['스위스', 'ch'], ['체코', 'cz'], ['그리스', 'gr'], ['포르투갈', 'pt'], ['한국', 'kr'], ['대한민국', 'kr'], ['방글라데시', 'bd'], ['부탄', 'bt'],
    ['브루나이', 'bn'], ['브라질', 'br']];
  var R = {
    eu: '영국 프랑스 독일 이탈리아 스페인 그리스 네덜란드 노르웨이 덴마크 라트비아 루마니아 룩셈부르크 리투아니아 리히텐슈타인 몰타 벨기에 불가리아 스웨덴 스위스 슬로바키아 슬로베니아 아이슬란드 아일랜드 에스토니아 오스트리아 체코 크로아티아 키프로스 북키프로스 포르투갈 폴란드 핀란드 헝가리 몬테네그로 몰도바 세르비아 알바니아 우크라이나 벨라루스 모나코 바티칸 산마리노 안도라 건지 저지 맨 맨섬 지브롤터 카나리아 마데이라 아조레스 발레아레스 올란드 사르데냐 시칠리아 코르푸 크레타 키클라데스 로도스 페로 보스니아 북마케도니아 코소보 레위니옹 과들루프 마르티니크 마요트 생마르탱 생바르텔레미 프랑스령 스발바르 러시아 북아일랜드 터키 튀르키예',
    nam: '미국 캐나다 멕시코 하와이 엘살바도르 코스타리카 파나마 과테말라 니카라과 온두라스 푸에르토리코',
    sam: '브라질 아르헨티나 에콰도르 우루과이 칠레 콜롬비아 페루 파라과이 볼리비아 베네수엘라 가이아나 수리남 프랑스령 기아나',
    me: '사우디 사우디아라비아 아랍에미리트 두바이 카타르 쿠웨이트 바레인 오만 요르단 이스라엘 이라크 레바논 예멘 팔레스타인',
    af: '가나 남아프리카공화국 알제리 이집트 튀니지 모로코 케냐 탄자니아 나이지리아 우간다 르완다 잠비아 말라위 모잠비크 마다가스카르 모리셔스 세네갈 카메룬 코트디부아르 베냉 니제르 차드 가봉 말리 기니 기니비사우 콩고 콩고민주공화국 콩고공화국 보츠와나 부르키나파소 에티오피아 레소토 세이셸 시에라리온 라이베리아 토고 카보베르데 코모로 적도기니 중앙아프리카공화국 모리타니',
    asia: '일본 중국 중국 본토 베트남 태국 대만 싱가포르 홍콩 마카오 필리핀 말레이시아 인도네시아 캄보디아 라오스 몽골 인도 스리랑카 네팔 몰디브 방글라데시 부탄 브루나이 한국 대한민국 미얀마 파키스탄 우즈베키스탄 카자흐스탄 키르기스스탄 타지키스탄 아프가니스탄 조지아 아르메니아 아제르바이잔',
    oc: '호주 뉴질랜드 피지 괌 사이판 사이판·괌 북마리아나 로타 티니안 태즈메이니아 채텀'
  };
  var REG = {};
  Object.keys(R).forEach(function (k) { R[k].split(' ').forEach(function (n) { if (!REG[n]) REG[n] = k; }); });
  function norm(t) { return String(t || '').replace(/【[^】]*】/g, '').replace(/^.*[:：]\s*/, '').replace(/[.;]+$/, '').replace(/\s+(공화국|연방|섬|제도)$/, '').trim(); }
  function regionOf(n) {
    if (REG[n]) return REG[n];
    for (var k in REG) if (k.length >= 2 && n.indexOf(k) === 0) return REG[k];
    return '';
  }
  function single(c) { for (var i = 0; i < SINGLE.length; i++) if (c.indexOf(SINGLE[i][0]) === 0) return SINGLE[i][1]; return ''; }
  var REG_KEY = { eu: 'eu', nam: 'nam', sam: 'sam', me: 'me', af: 'af', asia: 'asia', oc: 'aunz' };
  function keyOf(country) {
    var c = String(country || '').trim();
    var parts = c.split(/\s*[,;]\s*/).map(norm).filter(Boolean);
    if (parts.length <= 1) {
      var s = single(c); if (s) return s;
      var r = regionOf(norm(c)); return r ? REG_KEY[r] : '';
    }
    var set = {}; parts.forEach(function (p) { set[p] = 1; });
    var only = function (arr) { return parts.every(function (p) { return arr.indexOf(p) >= 0; }); };
    if (only(['홍콩', '마카오'])) return 'hkmo';
    if (only(['중국', '중국 본토', '홍콩', '마카오'])) return 'cnhkmo';
    if (only(['일본', '한국', '대한민국'])) return 'krjp';
    if (only(['호주', '뉴질랜드'])) return 'aunz';
    if (only(['괌', '사이판', '로타', '티니안', '사이판·괌', '북마리아나 제도'])) return 'gusp';
    var cnt = {}; parts.forEach(function (p) { var r = regionOf(p) || '?'; cnt[r] = (cnt[r] || 0) + 1; });
    var best = '', bn = 0; for (var k in cnt) if (k !== '?' && cnt[k] > bn) { best = k; bn = cnt[k]; }
    if (best && bn / parts.length >= 0.75) return REG_KEY[best];   // 유럽 35개국처럼 많아도 한 지역이면 지역 썸네일
    return 'world';
  }
  window.jdFoxKey = keyOf;
  window.jdFoxThumb = function (country) { var k = keyOf(country); return k ? 'https://scoreix.co.kr/esimg/aum_' + k + '.jpg?v=' + V : ''; };
})();
