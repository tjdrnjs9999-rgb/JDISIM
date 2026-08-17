// robots.txt 호스트 분기 (2026-08-15 사장님: "esimpartners는 봇·크롤러가 아무것도 못 가져가게")
// esimpartners.co.kr → 전체 수집 금지 / jdisim.co.kr → 기존 정책 유지
module.exports = (req, res) => {
  const host = String(req.headers.host || '').toLowerCase();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (host.endsWith('esimpartners.co.kr')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.end('User-agent: *\nDisallow: /\n');
    return;
  }
  res.end('User-agent: *\nAllow: /\n\nSitemap: https://jdisim.co.kr/sitemap.xml\n');
};
