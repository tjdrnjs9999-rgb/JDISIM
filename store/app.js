// app.js - eSIM 스토어 핵심 프론트엔드 로직 (Premium Master Version)

// ================= [설정] 포트원 결제 연동 설정 =================
let PORTONE_MERCHANT_ID = "imp19278797";
let PORTONE_PG_PROVIDER = "kakaopay.TC0ONETIME"; 

document.addEventListener('DOMContentLoaded', async () => {
  // 1. 상태 변수 정의
  let productsData = [];
  let currentCategory = 'ALL';
  let searchQuery = '';
  let cart = []; 
  
  let activeProduct = null;
  let activeCarrier = null;
  let activeDataLimit = null;
  let activeDuration = null;
  let activeQuantity = 1;
  let activePlan = null;

  // 2. DOM 요소 캐싱
  const views = {
    home: document.getElementById('view-home'),
    store: document.getElementById('view-store'),
    orders: document.getElementById('view-orders')
  };
  
  const productGrid = document.getElementById('productGrid');
  const featuredGrid = document.getElementById('featuredGrid');
  const tabsContainer = document.getElementById('tabsContainer');
  const cartCountBadge = document.getElementById('cartCount');
  const productModal = document.getElementById('productModal');
  const modalContent = document.getElementById('modalContent');
  const checkoutModal = document.getElementById('checkoutModal');

  // --- 초기화 ---
  async function init() {
    if (window.IMP) window.IMP.init(PORTONE_MERCHANT_ID);
    if (window.PRODUCTS_DATA) productsData = window.PRODUCTS_DATA;

    bindEvents();
    loadCart();
    renderFeatured();
    renderGrid();
    setupFaqAccordion();
  }

  function bindEvents() {
    // 네비게이션
    const navLinks = document.querySelectorAll('.nav-link, .nav-item');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const target = link.getAttribute('data-target') || link.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (target) { e.preventDefault(); switchView(target); }
      });
    });

    // 검색
    const storeSearchBtn = document.getElementById('storeSearchBtn');
    const storeSearchInput = document.getElementById('storeSearchInput');
    if (storeSearchBtn) {
      storeSearchBtn.addEventListener('click', () => { searchQuery = storeSearchInput.value.trim().toLowerCase(); renderGrid(); });
      storeSearchInput.addEventListener('keyup', (e) => e.key === 'Enter' && (searchQuery = storeSearchInput.value.trim().toLowerCase(), renderGrid()));
    }

    // 모달 닫기
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    
    const headerCartBtn = document.getElementById('headerCartBtn');
    if (headerCartBtn) headerCartBtn.addEventListener('click', openCartDrawer);

    if (tabsContainer) {
      tabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        tabsContainer.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.getAttribute('data-category');
        renderGrid();
      });
    }
  }

  function switchView(viewId) {
    Object.keys(views).forEach(id => {
      if (views[id]) views[id].classList.toggle('active', id === viewId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (viewId === 'store') renderGrid();
  }

  // --- 렌더링 로직 ---
  function renderGrid() {
    if (!productGrid) return;
    productGrid.innerHTML = '';
    let filtered = productsData.filter(p => 
      (currentCategory === 'ALL' || p.category === currentCategory) &&
      (!searchQuery || p.country.toLowerCase().includes(searchQuery))
    );

    const grouped = groupProducts(filtered);
    grouped.forEach(g => productGrid.appendChild(createProductCard(g)));
    const countNum = document.getElementById('productCountNum');
    if (countNum) countNum.textContent = grouped.length;
  }

  function renderFeatured() {
    if (!featuredGrid) return;
    featuredGrid.innerHTML = '';
    const featuredCountries = ["일본", "베트남", "대만", "미국"];
    const grouped = groupProducts(productsData.filter(p => featuredCountries.includes(p.country)));
    grouped.forEach(g => featuredGrid.appendChild(createProductCard(g)));
  }

  function groupProducts(list) {
    const grouped = {};
    list.forEach(p => {
      if (!grouped[p.country]) {
        grouped[p.country] = { ...p, carriers: [p], minPrice: Math.min(...p.plans.map(pl => pl.final_price)) };
      } else {
        grouped[p.country].carriers.push(p);
        grouped[p.country].minPrice = Math.min(grouped[p.country].minPrice, ...p.plans.map(pl => pl.final_price));
      }
    });
    return Object.values(grouped);
  }

  function createProductCard(g) {
    const card = document.createElement('div');
    card.className = window.location.pathname.includes('mobile') ? 'mobile-product-card' : 'product-card';
    card.innerHTML = `
      <div class="card-img-wrap"><img src="images/${g.country === '일본' ? 'japan' : 'global'}.jpg" class="product-flag-img"></div>
      <div class="product-info">
        <div class="product-title">${g.country} eSIM</div>
        <div class="product-carrier-badge">${g.carriers.map(c => c.carrier).join('/')}</div>
      </div>
      <div class="product-price-section">
        <div class="product-price">${g.minPrice.toLocaleString()}원</div>
        <div style="font-size:0.7rem; color:#94a3b8;">부터</div>
      </div>
    `;
    card.addEventListener('click', () => openModal(g.carriers[0]));
    return card;
  }

  // ================= [핵심] 팝업창(모달) 렌더링 로직 복구 =================
  function openModal(prod) {
    activeProduct = prod;
    activeCarrier = prod;
    activePlan = prod.plans[0];
    activeDataLimit = activePlan.data_limit;
    activeDuration = activePlan.duration;
    activeQuantity = 1;
    
    renderModalContent(productsData.filter(p => p.country === prod.country));
    productModal.classList.add('active');
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    productModal.classList.remove('active');
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function renderModalContent(carrierOptions) {
    const p = activeCarrier;
    // 플랜 타입 추출 (데일리 vs 총용량)
    const types = [...new Set(p.plans.map(pl => pl.service_type || (pl.data_limit.includes('매일') ? '데일리' : '총용량')))];
    if (!window.activePlanType) window.activePlanType = types[0];

    const typeFiltered = p.plans.filter(pl => (pl.service_type || (pl.data_limit.includes('매일') ? '데일리' : '총용량')) === window.activePlanType);
    const capacities = [...new Set(typeFiltered.map(pl => pl.data_limit.replace('매일 ', '').replace('총 ', '')))];
    const cleanActiveData = activeDataLimit.replace('매일 ', '').replace('총 ', '');
    
    const durFiltered = typeFiltered.filter(pl => pl.data_limit.replace('매일 ', '').replace('총 ', '') === cleanActiveData);
    const durations = [...new Set(durFiltered.map(pl => pl.duration))].sort((a,b) => a-b);
    
    activePlan = durFiltered.find(pl => pl.duration === activeDuration) || durFiltered[0];
    const finalPrice = Math.round(activePlan.final_price + (activeQuantity - 1) * activePlan.final_price * 0.9);

    modalContent.innerHTML = `
      <div class="modal-layout" style="display:grid; grid-template-columns: 1.2fr 1fr; gap:24px;">
        <div class="modal-config">
          <div class="modal-header-mini" style="margin-bottom:20px;">
            <div style="font-size:0.8rem; color:#4f46e5; font-weight:700;">${p.category}</div>
            <h2 style="margin:4px 0; font-size:1.4rem;">${p.country} eSIM</h2>
          </div>
          
          <div class="config-item">
            <label style="font-size:0.85rem; font-weight:700; color:#64748b;">1. 통신사 선택</label>
            <select id="carrierSelect" class="styled-select">${carrierOptions.map(co => `<option value="${co.carrier}" ${co.carrier === p.carrier ? 'selected' : ''}>${co.carrier} (${co.network_speed})</option>`).join('')}</select>
          </div>

          <div class="config-item">
            <label style="font-size:0.85rem; font-weight:700; color:#64748b;">2. 플랜 타입</label>
            <div class="option-pills">${types.map(t => `<div class="pill ${t === window.activePlanType ? 'active' : ''}" onclick="window.updatePlanType('${t}')">${t}</div>`).join('')}</div>
          </div>

          <div class="config-item">
            <label style="font-size:0.85rem; font-weight:700; color:#64748b;">3. 데이터 용량</label>
            <div class="option-pills">${capacities.map(c => `<div class="pill ${c === cleanActiveData ? 'active' : ''}" onclick="window.updateCapacity('${c}')">${c}</div>`).join('')}</div>
          </div>

          <div class="config-item">
            <label style="font-size:0.85rem; font-weight:700; color:#64748b;">4. 이용 기간</label>
            <div class="option-pills">${durations.map(d => `<div class="pill ${d === activeDuration ? 'active' : ''}" onclick="window.updateDuration(${d})">${d}일</div>`).join('')}</div>
          </div>
        </div>

        <div class="modal-sidebar" style="background:#f8fafc; padding:20px; border-radius:16px;">
          <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #e2e8f0;">
            <div style="font-size:0.85rem; color:#64748b;">선택 상품</div>
            <div style="font-weight:700; color:#0f172a;">${p.country} / ${activePlan.data_limit} / ${activePlan.duration}일</div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <span style="font-size:0.85rem; font-weight:700;">구매 수량</span>
            <div class="qty-control" style="display:flex; align-items:center; gap:12px; background:white; padding:4px 12px; border-radius:30px; border:1px solid #e2e8f0;">
              <button onclick="window.updateQty(-1)" style="border:none; background:none; font-weight:800;">-</button>
              <span style="font-weight:700; color:#4f46e5;">${activeQuantity}</span>
              <button onclick="window.updateQty(1)" style="border:none; background:none; font-weight:800;">+</button>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.85rem; color:#64748b;">최종 결제 금액</div>
            <div style="font-size:1.6rem; font-weight:800; color:#4f46e5;">${finalPrice.toLocaleString()}원</div>
          </div>
          <button class="action-btn" onclick="window.addToCart()" style="width:100%; margin-top:20px; background:#4f46e5; color:white; border:none; padding:14px; border-radius:12px; font-weight:800;">🛒 장바구니 담기</button>
          <button class="action-btn" onclick="window.buyNow()" style="width:100%; margin-top:10px; background:#0f172a; color:white; border:none; padding:14px; border-radius:12px; font-weight:800;">⚡ 즉시 구매하기</button>
        </div>
      </div>
    `;

    // 드롭다운 리스너
    document.getElementById('carrierSelect').onchange = (e) => {
      activeCarrier = carrierOptions.find(o => o.carrier === e.target.value);
      activePlan = activeCarrier.plans[0];
      activeDataLimit = activePlan.data_limit;
      activeDuration = activePlan.duration;
      renderModalContent(carrierOptions);
    };
  }

  // --- 글로벌 헬퍼 함수 (onclick 대응) ---
  window.updatePlanType = (type) => { window.activePlanType = type; renderModalContent(productsData.filter(p => p.country === activeCarrier.country)); };
  window.updateCapacity = (cap) => { activeDataLimit = cap; renderModalContent(productsData.filter(p => p.country === activeCarrier.country)); };
  window.updateDuration = (dur) => { activeDuration = dur; renderModalContent(productsData.filter(p => p.country === activeCarrier.country)); };
  window.updateQty = (val) => { activeQuantity = Math.max(1, Math.min(10, activeQuantity + val)); renderModalContent(productsData.filter(p => p.country === activeCarrier.country)); };
  window.addToCart = () => { cart.push({ product: activeCarrier, plan: activePlan, quantity: activeQuantity }); saveCart(); closeModal(); openCartDrawer(); };
  window.buyNow = () => { /* 결제 로직 호출 */ };

  function loadCart() { cart = JSON.parse(localStorage.getItem('esim_cart') || '[]'); updateCartBadge(); }
  function saveCart() { localStorage.setItem('esim_cart', JSON.stringify(cart)); updateCartBadge(); }
  function updateCartBadge() { if (cartCountBadge) cartCountBadge.textContent = cart.reduce((sum, i) => sum + i.quantity, 0); }
  function openCartDrawer() { /* 드로어 로직 */ }
  function setupFaqAccordion() { /* FAQ 로직 */ }

  await init();
});