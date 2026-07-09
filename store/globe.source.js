/* =====================================================================
   JDISIM 인터랙티브 3D 지구본 (globe.js)
   - 서울에서 전 세계 목적지로 연결 아크가 뻗어나가는 시그니처 비주얼
   - 지구본 위 국가 포인트 클릭/탭 → 해당 국가 상품으로 즉시 이동
   - three.js는 지구본이 화면에 가까워질 때만 지연 로드 (초기 성능 무영향)
   사용법: <div id="..."></div> 준비 후
     JDISIM_GLOBE.mount('컨테이너ID', { mobile: true/false, onCountry: fn })
   ===================================================================== */
(function () {
  'use strict';
  // 배포 버전 확인용 (개발자도구 콘솔에서 확인 가능)
  try { console.log('%cJDISIM GLOBE v6 — 실사 지구 + 자가 진단 + CSS 폴백', 'color:#f97316;font-weight:bold'); } catch (e) {}

  var THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  // 서울(출발지)
  var ORIGIN = { name: '서울', lat: 37.5665, lng: 126.978 };

  // 목적지: label(표시명) / country(PRODUCTS_DATA 국가 문자열) / 위경도
  var DEST = [
    { c: '일본', lat: 35.68, lng: 139.69 }, { c: '중국', lat: 39.9, lng: 116.4 },
    { c: '홍콩', lat: 22.32, lng: 114.17 }, { c: '마카오', lat: 22.2, lng: 113.55 },
    { c: '대만', lat: 25.03, lng: 121.57 }, { c: '베트남', lat: 21.03, lng: 105.85 },
    { c: '태국', lat: 13.76, lng: 100.5 }, { c: '싱가포르', lat: 1.35, lng: 103.82 },
    { c: '말레이시아', lat: 3.14, lng: 101.69 }, { c: '인도네시아', lat: -8.65, lng: 115.22 },
    { c: '필리핀', lat: 14.6, lng: 120.98 }, { c: '캄보디아', lat: 11.56, lng: 104.92 },
    { c: '라오스', lat: 17.97, lng: 102.63 }, { c: '몽골', lat: 47.89, lng: 106.91 },
    { c: '인도', lat: 28.61, lng: 77.21 }, { c: '스리랑카', lat: 6.93, lng: 79.86 },
    { c: '방글라데시', lat: 23.81, lng: 90.41 }, { c: '파키스탄', lat: 33.68, lng: 73.05 },
    { c: '몰디브', lat: 4.17, lng: 73.51 }, { c: '튀르키예', lat: 41.01, lng: 28.98 },
    { c: '러시아', lat: 55.76, lng: 37.62 }, { c: '괌', lat: 13.44, lng: 144.79 },
    { c: '사이판', lat: 15.21, lng: 145.75 }, { c: '미국', lat: 34.05, lng: -118.24 },
    { c: '캐나다', lat: 43.65, lng: -79.38 }, { c: '멕시코', lat: 19.43, lng: -99.13 },
    { c: '호주', lat: -33.87, lng: 151.21 }, { c: '뉴질랜드', lat: -36.85, lng: 174.76 },
    { c: '사우디아라비아', lat: 24.71, lng: 46.68 }, { c: '아랍에미레이트 (UAE)', label: 'UAE', lat: 25.2, lng: 55.27 },
    { c: '카타르', lat: 25.29, lng: 51.53 }, { c: '쿠웨이트', lat: 29.38, lng: 47.98 },
    { c: '바레인', lat: 26.23, lng: 50.59 }, { c: '오만', lat: 23.59, lng: 58.41 },
    { c: '오렌지프랑스', label: '프랑스', lat: 48.86, lng: 2.35 },
    { c: '오렌지스페인', label: '스페인', lat: 40.42, lng: -3.7 },
    { c: '보다폰스페인', label: '바르셀로나', lat: 41.39, lng: 2.17 },
    { c: '쓰리(THREE)', label: '영국', lat: 51.51, lng: -0.13 },
    { c: '브라질', lat: -23.55, lng: -46.63 }, { c: '칠레', lat: -33.45, lng: -70.67 },
    { c: '모로코', lat: 33.57, lng: -7.59 }, { c: '남아프리카공화국', label: '남아공', lat: -33.92, lng: 18.42 },
    { c: '이집트', lat: 30.04, lng: 31.24 }, { c: '케냐', lat: -1.29, lng: 36.82 },
    { c: '나이지리아', lat: 6.52, lng: 3.38 }, { c: '튀니지', lat: 36.81, lng: 10.18 }
  ];

  // ===== 실제 대륙 윤곽 (240x120 육지 비트마스크, world.geo.json에서 생성) =====
  var MASK_W = 240, MASK_H = 120;
  var MASK_B64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAfwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPj/z////3EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/++f///w8AAPADgAEAAOADAAAAAAAAAAAAAAAg3N4f/v///wcAAB8AAAAAAAA4AAAAAAAAAAAAAAADAOAH/P///wcAAA4AAAAAAAAwAAAAAAAAAAAAAAC8cQwBAP///wcAAAAAAIAHAMD/DwDwAAAAAAAAAOAAAAAAAPz//wMAAAAAAGAAAPz/AQAAAAAAAAAAAOBdc/MDAPj//wEAAAAAABjAwP///z9gAAAAA4AAAED8A/P/AOD//wEAAAAAADjg/v///z//HwCAAPj/A0/8X4PwB/D//wAAAOA/AADh/v///////wM+A/7///8Pw56BB+D/DwAAAPz/Y+zf/f//////////N/D///////+Bf/D/AQAAAP7/x////v//////////GP7//////7/wJ+AfAH4AAD9++P//////////////AOD//////88GH8AfAAwAwJ////////////////9/APz//////wNxDIAPAAAA8M///////////////98/APzf/////wHwAwAGAAAA+M///////////////+ADAPAB+P///wHwMwAAAAAA8A//////////////ZBgAAIACgP///wPgfwAAAAAQABf///////////8fAA4AACAAAP///z/gfwAAAAAwYMf///////////8PAB8AAAQAAP7////5/wMAAABoQOj///////////8DAA8AAAAAgPz////5/wcAAADs+P////////////9/AAcAAAAAAPj////7/wMAAADg+f////////////9/AAEAAAAAAPj/////zwAAAAAw/v////////////+/AAAAAAAAAPD/////Gw4AAACg//////////////8fAAAAAAAAAOD/////HxAAAADA//////////////8fAAAAAAAAAOD//////wAAAACA//9P/vj///////8PAAAAAAAAAOD/////EwAAAACA//wHfPz////////HAAAAAAAAAOD/////AQAAAAD8g/EH8Pj////////gAAAAAAAAAOD/////AAAAAAD8Aebn+fH//////z8AAAAAAAAAAOD///9/AAAAAAD8AGT8//H//////xpgAAAAAAAAAMD///8/AAAAAAD8AMT8//H/////fzggAAAAAAAAAID///8fAAAAAABwdAD8/////////zE4AAAAAAAAAID///8fAAAAAACwfwBD/////////zA/AAAAAAAAAAD+//8PAAAAAAD4fwAA/////////wAHAAAAAAAAAAD8//8DAAAAAAD8/2OA/////////4EAAAAAAAAAAADg//8DAAAAAAD8/+///////////wEAAAAAAAAAAADo/wkCAAAAAAD+//////z//////wEAAAAAAAAAAADYfwACAAAAAID///8///n//////wEAAAAAAAAAAACgfwAWAAAAAMD///9//+H//////wAAAAAAAAAAAAAgfwAAAAAAAMD///9//jPg////fwAAAAAAAAAAAAAAfgAAAAAAAOD//////H/A////PwEAAAAAAAAAAAAAfAAIAAAAAOD//////f/A/+f/BwAAAAAAAAAAAAAAfDBwAAAAAOD/////+X8A/sN/AAAAAAAAAAAAAAAA+DgAAwAAAOD/////+T8A/oB/AwAAAAAAAAAAAAAA4B8AAAAAAOD/////8x8AfoB/AAMAAAAAAAAAAAAAgPwAAAAAAOD/////8wcAPoD+AAEAAAAAAAAAAAAAAPgBAAAAAOD/////7wEAHAD+AQEAAAAAAAAAAAAAAMAAAAAAAOD/////PwAAHAD8AQQAAAAAAAAAAAAAAICAAgAAAMD/////HwMAGADgAAoAAAAAAAAAAAAAAADBfgAAAID//////wMAGABAAAAAAAAAAAAAAAAAAADy/wAAAID//////wEAIAAGAAwAAAAAAAAAAAAAAADw/wEAAAD//////wEAIAAIAAgAAAAAAAAAAAAAAADw/x8AAAD8+P///wAAAAAZYAAAAAAAAAAAAAAAAADg/z8AAAAAwP///wAAAAAbMAAAAAAAAAAAAAAAAADw/z8AAAAAwP//fwAAAAAWfAAAAAAAAAAAAAAAAAD4/38AAAAAwP//HwAAAAAcficAAAAAAAAAAAAAAAD8//8BAAAAwP//DwAAAAAYPiABAAAAAAAAAAAAAAD8//8DAAAAwP//BwAAAAA4vgEaAAAAAAAAAAAAAAD8//8/AAAAgP//BwAAAABwEBL+AAAAAAAAAAAAAAD8////AAAAAP//AwAAAABgAADwAQAAAAAAAAAAAAD8////AQAAAP//AwAAAADABADyAwEAAAAAAAAAAAD4////AQAAAP7/AwAAAAAAHADwBgQAAAAAAAAAAADw////AAAAAP7/BwAAAAAAAAQADAAAAAAAAAAAAADw//9/AAAAAP7/BwAAAAAAAAAAAAAAAAAAAAAAAADg//9/AAAAAP7/BwAAAAAAAICHAAAAAAAAAAAAAADg//8/AAAAAP//BwEAAAAAANDHAAAAAAAAAAAAAADA//8/AAAAAP//hwMAAAAAAPjHAQAAAAAAAAAAAAAA//8/AAAAAP//4QEAAAAAAPzfAQAAAAAAAAAAAAAA/v8/AAAAAP//4AEAAAAAAP7/AwAAAAAAAAAAAAAA/v8fAAAAAP5/wAAAAAAAgP//ByAAAAAAAAAAAAAA/v8fAAAAAP7/4AAAAAAA4P//D0AAAAAAAAAAAAAA/v8HAAAAAPz/4AAAAAAA8P//HwAAAAAAAAAAAAAA/v8AAAAAAPx/YAAAAAAA8P//PwAAAAAAAAAAAAAA/v8AAAAAAPw/AAAAAAAA8P//PwAAAAAAAAAAAAAA/v8AAAAAAPw/AAAAAAAA8P//PwAAAAAAAAAAAAAA/38AAAAAAPgfAAAAAAAA4P//PwAAAAAAAAAAAAAA/z8AAAAAAPAPAAAAAAAA4P//PwAAAAAAAAAAAAAA/x8AAAAAAPAHAAAAAAAA4B/+PwAAAAAAAAAAAAAA/w8AAAAAAPABAAAAAAAA4Af0HwAAAAAAAAAAAAAA/wMAAAAAAAAAAAAAAAAAAADwDwAIAAAAAAAAAACA/wMAAAAAAAAAAAAAAAAAAADgDwAQAAAAAAAAAACA/wEAAAAAAAAAAAAAAAAAAADAAgBwAAAAAAAAAACAfwAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAACAHwAAAAAAAAAAAAAAAAAAAAAABgAQAAAAAAAAAACAHwAAAAAAAAAAAAAAAAAAAAAABgAMAAAAAAAAAADADwAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAADABwAAAAAAAAAAAAAAAAAAAAAAAIADAAAAAAAAAADADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAgwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAAAAAAAADwAAAR4Pv4HAAAAAAAAAAAAAAAACAAAAAAAAAAA4P8/4P//////BwAAAAAAAAAAAAAAPwAAAAAAAADg//8//P///////wMAAAAAAAAAAACAewAAAADI/v////8///////////8BAAAAAAAAABAAeAAAAID///////////////////8DAAAAAAAe4P//fwAAAMD//////////////////38AAADA////////BwAAAPz//////////////////x8AAEDz//////8/AAAA8P///////////////////x8AABj///////8PAIAH/////////////////////38AAADA//////8/gPAD4P///////////////////wcAAAD+////////P4Dx/////////////////////w8AAAD8//////////////////////////////////8AAPz/AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  var LAND = (function () {
    var bin = atob(MASK_B64);
    var m = new Uint8Array(MASK_W * MASK_H);
    for (var i = 0; i < m.length; i++) m[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
    return m;
  })();
  function isLand(lat, lng) {
    var gx = Math.min(MASK_W - 1, Math.max(0, Math.floor((lng + 180) / 360 * MASK_W)));
    var gy = Math.min(MASK_H - 1, Math.max(0, Math.floor((90 - lat) / 180 * MASK_H)));
    return LAND[gy * MASK_W + gx] === 1;
  }

  // ===== 현재 시각 기준 태양 직하점 (낮/밤 음영용 근사식) =====
  function subsolarPoint() {
    var now = new Date();
    var start = Date.UTC(now.getUTCFullYear(), 0, 0);
    var day = (now.getTime() - start) / 86400000;
    var decl = -23.44 * Math.cos((360 / 365) * (day + 10) * Math.PI / 180);
    var utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
    var lng = -15 * (utcH - 12);
    return { lat: decl, lng: lng };
  }

  function latLngToVec3(T, lat, lng, r) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lng + 180) * Math.PI / 180;
    return new T.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  // 마커용 원형 글로우 텍스처 생성
  function dotTexture(T, core, ring) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, core);
    g.addColorStop(0.35, core);
    g.addColorStop(0.55, ring);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    var tex = new T.CanvasTexture(cv);
    return tex;
  }

  // 최후 방어선: three.js 로드 실패/WebGL 불가 시에도 빈 화면 대신 CSS 회전 지구 표시
  function cssFallback(host, texPath, reason) {
    try {
      console.warn('GLOBE 폴백(CSS 2D):', reason);
      var size = Math.min(host.clientWidth || 300, host.clientHeight || 300) * 0.86;
      host.innerHTML = '<div style="width:' + size + 'px;height:' + size + 'px;margin:0 auto;border-radius:50%;overflow:hidden;box-shadow:0 0 60px rgba(77,125,255,0.35), inset -28px -18px 50px rgba(0,0,0,0.55);background-image:url(' + (texPath || '') + 'earth-day.jpg);background-size:auto 100%;animation:jdEarthSpin 24s linear infinite;"></div>';
      if (!document.getElementById('jdEarthSpinKf')) {
        var st = document.createElement('style');
        st.id = 'jdEarthSpinKf';
        st.textContent = '@keyframes jdEarthSpin{from{background-position:0 0}to{background-position:-200% 0}} @media (prefers-reduced-motion: reduce){[style*="jdEarthSpin"]{animation:none !important}}';
        document.head.appendChild(st);
      }
    } catch (e) { console.error('GLOBE 폴백 실패:', e); }
  }

  function loadThree(cb, onFail) {
    if (window.THREE) return cb();
    var sc = document.createElement('script');
    sc.src = THREE_CDN;
    sc.onload = cb;
    sc.onerror = function () { if (onFail) onFail('three.js CDN 로드 실패'); };
    document.head.appendChild(sc);
  }

  function mount(containerId, opts) {
    opts = opts || {};
    var host = document.getElementById(containerId);
    if (!host) return;

    // 화면에 가까워지면 그때 three.js 로드 (초기 로딩 성능 보호)
    var started = false;
    function boot() {
      if (started) return; started = true;
      loadThree(function () {
        try { build(host, opts); }
        catch (e) { console.error('globe build error:', e); cssFallback(host, opts.texPath, 'WebGL 초기화 실패: ' + e.message); }
      }, function (reason) { cssFallback(host, opts.texPath, reason); });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { boot(); io.disconnect(); } });
      }, { rootMargin: '400px' });
      io.observe(host);
    } else { boot(); }
  }

  function build(host, opts) {
    var T = window.THREE;
    if (!T) return;
    var mobile = !!opts.mobile;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var camZFinal = mobile ? 3.15 : 2.95;

    var W = host.clientWidth, H = host.clientHeight || (mobile ? 340 : 560);
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { cssFallback(host, opts.texPath, 'WebGL 미지원'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.7 : 2));
    renderer.setSize(W, H);
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.z = reduced ? camZFinal : camZFinal + 1.1;

    var globe = new T.Group();
    scene.add(globe);

    // ★ 시네마틱 등장: 우주 저편에서 다가오며 착지 → 아크 연쇄 발사
    var introT = reduced ? 1 : 0;       // 0→1 진행도 (모션 최소화 설정 시 즉시 완료)
    var introStarted = false;
    if (!reduced) {
      globe.scale.setScalar(0.4);
      host.style.opacity = '0';
      host.style.transition = 'opacity 0.7s ease';
    }
    // 아시아(서울 근처)가 정면에 오도록 초기 회전
    globe.rotation.y = -2.05;
    globe.rotation.x = 0.28;

    var R = 1;

    // ===== 실사 지구: NASA 위성 텍스처 (낮 컬러 + 밤 도시불빛 + 구름) =====
    var sun = subsolarPoint();
    var sunV = latLngToVec3(T, sun.lat, sun.lng, 1).normalize();
    var cloudMesh = null;

    function buildTexturedEarth(dayT, nightT, cloudT) {
      if (renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
        dayT.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      }
      var earth = new T.Mesh(
        new T.SphereGeometry(R, 64, 64),
        new T.ShaderMaterial({
          uniforms: {
            dayMap: { value: dayT },
            nightMap: { value: nightT },
            sunDir: { value: sunV }
          },
          vertexShader: [
            'varying vec3 vDir; varying vec2 vUv;',
            'void main() {',
            '  vDir = normalize(position);', // 지리 좌표계(오브젝트 공간) 노멀 — 자전과 무관하게 태양 고정
            '  vUv = uv;',
            '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 sunDir;',
            'varying vec3 vDir; varying vec2 vUv;',
            'void main() {',
            '  float l = dot(vDir, sunDir);',
            '  float t = smoothstep(-0.08, 0.25, l);', // 새벽/황혼 부드러운 경계
            '  vec3 day = texture2D(dayMap, vUv).rgb;',
            '  vec3 lights = texture2D(nightMap, vUv).rgb;',
            '  vec3 nightSide = lights * vec3(1.0, 0.86, 0.62) * 1.7 + day * 0.06;', // 도시 불빛 + 희미한 지형
            '  vec3 daySide = day * (0.42 + 0.72 * max(l, 0.0));',
            '  gl_FragColor = vec4(mix(nightSide, daySide, t), 1.0);',
            '}'
          ].join('\n')
        })
      );
      globe.add(earth);
      if (cloudT) {
        cloudMesh = new T.Mesh(
          new T.SphereGeometry(R * 1.012, 48, 48),
          new T.MeshBasicMaterial({ map: cloudT, transparent: true, opacity: 0.32, depthWrite: false })
        );
        globe.add(cloudMesh);
      }
      try { console.log('%cGLOBE: 실사 지구 모드 (위성 텍스처 로드 성공)', 'color:#22c55e'); } catch (e) {}
    }

    // 텍스처 로드 실패 시 폴백: 대륙 점묘 지구
    function buildDottedEarth() {
      try { console.log('%cGLOBE: 텍스처 로드 실패 → 점묘 지구 폴백 (earth-*.jpg/png 업로드 확인 필요)', 'color:#f59e0b'); } catch (e) {}
      var core = new T.Mesh(
        new T.SphereGeometry(R * 0.985, 48, 48),
        new T.MeshBasicMaterial({ color: 0x0c1226 })
      );
      globe.add(core);
      var sample = mobile ? 6500 : 10500;
      var landPos = [], landCol = [];
      var golden = Math.PI * (3 - Math.sqrt(5));
      var cDay = new T.Color(0xb8c7ff), cNight = new T.Color(0x222b4d);
      for (var i = 0; i < sample; i++) {
        var y = 1 - (i / (sample - 1)) * 2;
        var rad = Math.sqrt(1 - y * y);
        var th = golden * i;
        var vx = Math.cos(th) * rad, vz = Math.sin(th) * rad;
        var lat = 90 - Math.acos(y) * 180 / Math.PI;
        var lng = Math.atan2(vz, -vx) * 180 / Math.PI - 180;
        if (lng < -180) lng += 360;
        if (!isLand(lat, lng)) continue;
        landPos.push(vx * R * 1.002, y * R * 1.002, vz * R * 1.002);
        var d = vx * sunV.x + y * sunV.y + vz * sunV.z;
        var tt = Math.max(0, Math.min(1, (d + 0.12) / 0.24));
        tt = tt * tt * (3 - 2 * tt);
        var c = cNight.clone().lerp(cDay, tt);
        landCol.push(c.r, c.g, c.b);
      }
      var dotGeo = new T.BufferGeometry();
      dotGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(landPos), 3));
      dotGeo.setAttribute('color', new T.BufferAttribute(new Float32Array(landCol), 3));
      globe.add(new T.Points(dotGeo, new T.PointsMaterial({
        vertexColors: true, size: mobile ? 0.015 : 0.016, transparent: true, opacity: 1, sizeAttenuation: true
      })));
    }

    // 텍스처 로드 (같은 폴더의 earth-day.jpg / earth-night.png / earth-clouds.png)
    var texBase = opts.texPath || '';
    var loader = new T.TextureLoader();
    var texs = {}, pendingCore = 2, coreFailed = false;
    function coreDone() {
      pendingCore--;
      if (pendingCore > 0) return;
      if (coreFailed) buildDottedEarth();
      else buildTexturedEarth(texs.day, texs.night, texs.cloud || null);
    }
    loader.load(texBase + 'earth-clouds.png', function (t) { texs.cloud = t; }, undefined, function () { texs.cloud = null; });
    loader.load(texBase + 'earth-day.jpg', function (t) { texs.day = t; coreDone(); }, undefined, function () { coreFailed = true; coreDone(); });
    loader.load(texBase + 'earth-night.png', function (t) { texs.night = t; coreDone(); }, undefined, function () { coreFailed = true; coreDone(); });

    // --- 대기권 글로우 (프레넬 셰이더, 뒷면 렌더) ---
    var atmo = new T.Mesh(
      new T.SphereGeometry(R * 1.15, 48, 48),
      new T.ShaderMaterial({
        transparent: true,
        blending: T.AdditiveBlending,
        side: T.BackSide,
        depthWrite: false,
        uniforms: { glowColor: { value: new T.Color(0x4d7dff) } },
        vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = (modelViewMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 glowColor; varying vec3 vN; varying vec3 vP; void main(){ float f = pow(max(0.0, 0.72 - dot(vN, normalize(-vP))), 3.5); gl_FragColor = vec4(glowColor, clamp(f, 0.0, 0.85)); }'
      })
    );
    scene.add(atmo);

    // --- 마커 ---
    var texDest = dotTexture(T, 'rgba(249,115,22,1)', 'rgba(249,115,22,0.35)');
    var texSeoul = dotTexture(T, 'rgba(255,255,255,1)', 'rgba(99,102,241,0.55)');
    var markers = [];
    function addMarker(item, isOrigin) {
      var sp = new T.Sprite(new T.SpriteMaterial({
        map: isOrigin ? texSeoul : texDest, transparent: true, depthWrite: false
      }));
      var v = latLngToVec3(T, item.lat, item.lng, R * 1.02);
      sp.position.copy(v);
      var base = isOrigin ? (mobile ? 0.085 : 0.09) : (mobile ? 0.052 : 0.056);
      sp.scale.set(base, base, 1);
      sp.userData = { country: item.c, label: item.label || item.c, base: base, phase: Math.random() * Math.PI * 2, origin: isOrigin };
      globe.add(sp);
      markers.push(sp);
      return sp;
    }
    var seoulSp = addMarker({ c: '한국', label: ORIGIN.name, lat: ORIGIN.lat, lng: ORIGIN.lng }, true);
    DEST.forEach(function (d) { addMarker(d, false); });

    // --- 연결 아크 (서울 → 목적지, 순환 애니메이션) ---
    var seoulV = latLngToVec3(T, ORIGIN.lat, ORIGIN.lng, R * 1.02);
    var ARC_SEG = 72;
    var concurrent = mobile ? 5 : 8;
    var arcs = [];
    function makeArcGeo(endV) {
      var dist = seoulV.distanceTo(endV);
      var mid = seoulV.clone().add(endV).multiplyScalar(0.5).normalize().multiplyScalar(R * (1 + dist * 0.38));
      var curve = new T.QuadraticBezierCurve3(seoulV.clone(), mid, endV.clone());
      var pts = curve.getPoints(ARC_SEG);
      var geo = new T.BufferGeometry().setFromPoints(pts);
      // 정점 색: 주황 → 인디고 그라데이션
      var colors = new Float32Array((ARC_SEG + 1) * 3);
      var c1 = new T.Color(0xf97316), c2 = new T.Color(0x818cf8);
      for (var k = 0; k <= ARC_SEG; k++) {
        var c = c1.clone().lerp(c2, k / ARC_SEG);
        colors[k * 3] = c.r; colors[k * 3 + 1] = c.g; colors[k * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new T.BufferAttribute(colors, 3));
      return geo;
    }
    var destOrder = DEST.slice();
    for (var a = 0; a < concurrent; a++) {
      var mat = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
      var ln = new T.Line(new T.BufferGeometry(), mat);
      globe.add(ln);
      arcs.push({ line: ln, t: reduced ? -(a / concurrent) : -(0.55 + a * 0.09), idx: a % destOrder.length });
      resetArc(arcs[a]);
    }
    function resetArc(arc) {
      arc.idx = (arc.idx + concurrent) % destOrder.length;
      var endV = latLngToVec3(T, destOrder[arc.idx].lat, destOrder[arc.idx].lng, R * 1.02);
      arc.line.geometry.dispose();
      arc.line.geometry = makeArcGeo(endV);
      arc.line.geometry.setDrawRange(0, 0);
    }

    // --- 인터랙션: 드래그 회전 + 클릭/탭 → 국가 이동 ---
    var dragging = false, lastX = 0, lastY = 0, moved = 0, vel = 0;
    var autoSpeed = reduced ? 0 : 0.0016;
    var el = renderer.domElement;
    el.style.cursor = 'grab';
    el.style.touchAction = 'pan-y'; // 세로 스크롤은 페이지에 양보

    function pDown(x, y) { dragging = true; moved = 0; lastX = x; lastY = y; el.style.cursor = 'grabbing'; }
    function pMove(x, y) {
      if (!dragging) return;
      var dx = x - lastX, dy = y - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      globe.rotation.y += dx * 0.005;
      globe.rotation.x = Math.max(-0.9, Math.min(0.9, globe.rotation.x + dy * 0.003));
      vel = dx * 0.00012;
      lastX = x; lastY = y;
    }
    function pUp() { dragging = false; el.style.cursor = 'grab'; }

    el.addEventListener('mousedown', function (e) { pDown(e.clientX, e.clientY); });
    window.addEventListener('mousemove', function (e) { pMove(e.clientX, e.clientY); });
    window.addEventListener('mouseup', pUp);
    el.addEventListener('touchstart', function (e) { var t = e.touches[0]; pDown(t.clientX, t.clientY); }, { passive: true });
    el.addEventListener('touchmove', function (e) { var t = e.touches[0]; pMove(t.clientX, t.clientY); }, { passive: true });
    el.addEventListener('touchend', pUp);

    // 레이캐스트 픽킹
    var ray = new T.Raycaster();
    ray.params.Sprite = { threshold: 0.05 };
    var mouse = new T.Vector2();
    var tooltip = document.createElement('div');
    tooltip.style.cssText = 'position:absolute;pointer-events:none;padding:6px 12px;border-radius:20px;background:rgba(15,23,42,0.92);color:#fff;font-size:12px;font-weight:800;white-space:nowrap;transform:translate(-50%,-140%);opacity:0;transition:opacity .15s;z-index:5;box-shadow:0 4px 14px rgba(0,0,0,0.35);';
    host.style.position = 'relative';
    host.appendChild(tooltip);

    function pick(clientX, clientY) {
      var rect = el.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      var hits = ray.intersectObjects(markers);
      // 지구 뒷면 마커 제외 (카메라 방향과 노멀 내적)
      for (var h = 0; h < hits.length; h++) {
        var m = hits[h].object;
        var world = m.position.clone().applyMatrix4(globe.matrixWorld);
        if (world.dot(camera.position.clone().sub(world).normalize()) > -0.15 && world.z > -0.15) return m;
      }
      return null;
    }
    el.addEventListener('mousemove', function (e) {
      if (dragging) { tooltip.style.opacity = '0'; return; }
      var m = pick(e.clientX, e.clientY);
      if (m && !m.userData.origin) {
        var rect = el.getBoundingClientRect();
        tooltip.textContent = m.userData.label + ' eSIM 보러가기 →';
        tooltip.style.left = (e.clientX - rect.left) + 'px';
        tooltip.style.top = (e.clientY - rect.top) + 'px';
        tooltip.style.opacity = '1';
        el.style.cursor = 'pointer';
      } else {
        tooltip.style.opacity = '0';
        el.style.cursor = dragging ? 'grabbing' : 'grab';
      }
    });
    function tryGo(x, y) {
      if (moved > 8) return; // 드래그였으면 무시
      var m = pick(x, y);
      if (m && !m.userData.origin && typeof opts.onCountry === 'function') {
        opts.onCountry(m.userData.country, m.userData.label);
      }
    }
    el.addEventListener('click', function (e) { tryGo(e.clientX, e.clientY); });

    // --- 렌더 루프 (화면 밖/탭 전환 시 정지) ---
    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { visible = e.isIntersecting; }); }).observe(host);
    }
    document.addEventListener('visibilitychange', function () { visible = !document.hidden && visible; });

    var clock = new T.Clock();
    function tick() {
      requestAnimationFrame(tick);
      if (!visible) return;
      var t = clock.getElapsedTime();
      // 등장 시퀀스 (처음 화면에 보인 순간부터)
      if (!introStarted && visible) { introStarted = true; host.style.opacity = '1'; clock.start(); }
      if (introStarted && introT < 1) {
        introT = Math.min(1, introT + 0.011);
        var e = 1 - Math.pow(1 - introT, 3); // ease-out cubic
        globe.scale.setScalar(0.4 + 0.6 * e);
        camera.position.z = camZFinal + 1.1 * (1 - e);
        globe.rotation.y += 0.012 * (1 - e); // 다가오며 살짝 빠른 회전 → 착지하며 감속
      }
      if (!dragging) {
        globe.rotation.y += autoSpeed + vel;
        vel *= 0.95;
      }
      if (cloudMesh && !reduced) cloudMesh.rotation.y += 0.00035; // 구름은 지구보다 살짝 빠르게
      if (!reduced) {
        markers.forEach(function (m) {
          var s = m.userData.base * (1 + Math.sin(t * 2.2 + m.userData.phase) * 0.18);
          m.scale.set(s, s, 1);
        });
        arcs.forEach(function (arc) {
          arc.t += 0.0065;
          if (arc.t < 0) return;
          if (arc.t <= 1) {
            arc.line.geometry.setDrawRange(0, Math.floor(arc.t * ARC_SEG) + 1);
            arc.line.material.opacity = 0.9;
          } else if (arc.t <= 1.45) {
            arc.line.material.opacity = 0.9 * (1 - (arc.t - 1) / 0.45);
          } else {
            arc.t = -0.1;
            resetArc(arc);
          }
        });
      } else {
        // 모션 최소화: 아크 전체 정적 표시
        arcs.forEach(function (arc) { arc.line.geometry.setDrawRange(0, ARC_SEG + 1); arc.line.material.opacity = 0.5; });
      }
      renderer.render(scene, camera);
    }
    tick();

    // 리사이즈
    window.addEventListener('resize', function () {
      var w = host.clientWidth, h = host.clientHeight || H;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }

  window.JDISIM_GLOBE = { mount: mount, version: 'v6' };
})();
