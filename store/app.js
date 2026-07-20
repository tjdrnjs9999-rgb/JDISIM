// app.js - eSIM 스토어 핵심 프론트엔드 로직

// ================= [설정] 포트원 결제 연동 설정 =================
// 보안을 위해 프로젝트 루트 폴더의 .env 파일에 키를 작성하여 관리할 수 있습니다.
// .env 파일이 없거나 로드에 실패할 시 아래 기본 가상 테스트 코드가 적용됩니다.
let PORTONE_MERCHANT_ID = "imp19278797";
    let PORTONE_STORE_ID = "";
    let PORTONE_CHANNEL_KEY = ""; 
let PORTONE_PG_PROVIDER = "kakaopay.TC0ONETIME"; 
// 신용·체크카드 일반결제 PG (현재 KG이니시스 테스트 채널 - 실계약 후 실채널 코드로 교체)
let CARD_PG_PROVIDER = "html5_inicis.INIpayTest";
// 네이버 스마트스토어 대체 구매 링크 (URL 입력 시 구매 버튼 자동 노출, PG 오픈 전 임시 판매 경로)
let SMARTSTORE_URL = "https://smartstore.naver.com/butt_on";
// =============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. 상태 변수 정의
  let productsData = [];
  let currentCategory = 'ALL';
  let searchQuery = '';
  let cartCount = 0;
  let cart = []; // 장바구니 상태 배열
  let checkoutItems = []; // 결제 예정 품목들
  
  // 모달 제어용 상태
  let activeProduct = null;
  let activeCarrier = null;
  let activeDataLimit = null;
  let activeDuration = null;
  let activeQuantity = 1;
  let activePlan = null;

  // 장바구니 드로어 관련 DOM
  const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
  const cartDrawerCloseBtn = document.getElementById('cartDrawerCloseBtn');
  const cartDrawerBody = document.getElementById('cartDrawerBody');
  const cartSummaryQty = document.getElementById('cartSummaryQty');
  const cartSummaryTotalPrice = document.getElementById('cartSummaryTotalPrice');
  const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');
  const checkoutItemsList = document.getElementById('checkoutItemsList');
  const receiptItemsContainer = document.getElementById('receiptItemsContainer');

  function updateCartBadge() {
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount = totalQty;
    cartCountBadge.textContent = totalQty;
  }

  function saveCart() {
    localStorage.setItem('esim_cart', JSON.stringify(cart));
    updateCartBadge();
  }

  function loadCart() {
    try {
      const saved = localStorage.getItem('esim_cart');
      if (saved) {
        cart = JSON.parse(saved);
      } else {
        cart = [];
      }
      updateCartBadge();
    } catch (e) {
      console.error("Failed to load cart", e);
      cart = [];
    }
  }

  function openCartDrawer() {
    renderCartDrawer();
    cartDrawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    cartDrawerOverlay.classList.remove('active');
    if (!productModal.classList.contains('active') && !checkoutModal.classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }

  function renderCartDrawer() {
    cartDrawerBody.innerHTML = '';
    
    if (cart.length === 0) {
      cartDrawerBody.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon">🛒</div>
          <div class="cart-empty-text">장바구니가 비어 있습니다.<br>원하는 요금제를 담아보세요!</div>
        </div>
      `;
      cartSummaryQty.textContent = '0개';
      cartSummaryTotalPrice.textContent = '0원';
      cartCheckoutBtn.disabled = true;
      cartCheckoutBtn.style.opacity = '0.5';
      cartCheckoutBtn.style.cursor = 'not-allowed';
      return;
    }
    
    cartCheckoutBtn.disabled = false;
    cartCheckoutBtn.style.opacity = '1';
    cartCheckoutBtn.style.cursor = 'pointer';
    
    let totalQuantity = 0;
    let totalCartPrice = 0;
    
    cart.forEach((item, index) => {
      const basePrice = item.plan.final_price;
      let itemPrice = Math.round(basePrice + (item.quantity - 1) * basePrice * 0.9);
      if (item.addon) {
        itemPrice += 1900;
      }
      
      totalQuantity += item.quantity;
      totalCartPrice += itemPrice;
      
      const card = document.createElement('div');
      card.className = 'cart-item-card';
      card.innerHTML = `
        <div class="cart-item-info">
          <div>
            <div class="cart-item-title">
              ${item.product.country} eSIM
              <span class="cart-item-carrier">${item.product.carrier}</span>
            </div>
            <div class="cart-item-desc">
              ${item.plan.data_limit} / ${item.plan.duration}일 (${item.plan.service_type})
            </div>
          </div>
          <button class="cart-item-delete" data-index="${index}" aria-label="삭제">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
        
        <div class="cart-item-controls">
          <div class="cart-item-qty">
            <button class="cart-qty-btn minus" data-index="${index}">-</button>
            <span style="font-weight: 700; color: var(--accent); min-width: 14px; text-align: center;">${item.quantity}</span>
            <button class="cart-qty-btn plus" data-index="${index}">+</button>
          </div>
          <div class="cart-item-price">${itemPrice.toLocaleString()}원</div>
        </div>
      `;
      
      card.querySelector('.cart-item-delete').addEventListener('click', () => {
        cart.splice(index, 1);
        saveCart();
        renderCartDrawer();
      });
      
      
      card.querySelector('.cart-qty-btn.minus').addEventListener('click', () => {
        if (cart[index].quantity > 1) {
          cart[index].quantity -= 1;
          saveCart();
          renderCartDrawer();
        }
      });
      
      card.querySelector('.cart-qty-btn.plus').addEventListener('click', () => {
        if (cart[index].quantity < 10) {
          cart[index].quantity += 1;
          saveCart();
          renderCartDrawer();
        }
      });
      
      cartDrawerBody.appendChild(card);
    });
    
    cartSummaryQty.textContent = `${totalQuantity}개`;
    cartSummaryTotalPrice.textContent = `${totalCartPrice.toLocaleString()}원`;
  }

  // 2. DOM 요소 캐싱
  const viewHome = document.getElementById('view-home');
  const viewStore = document.getElementById('view-store');
  const viewOrders = document.getElementById('view-orders');
  const viewTerms = document.getElementById('view-terms');
  const viewPrivacy = document.getElementById('view-privacy');
  const viewRefunds = document.getElementById('view-refunds');
  const viewPartnership = document.getElementById('view-partnership');
  const navDesktop = document.getElementById('navDesktop');
  
  const productGrid = document.getElementById('productGrid');
  const featuredGrid = document.getElementById('featuredGrid');
  const tabsContainer = document.getElementById('tabsContainer');
  
  // 검색 요소
  const homeSearchInput = document.getElementById('homeSearchInput');
  const homeSearchBtn = document.getElementById('homeSearchBtn');
  const storeSearchInput = document.getElementById('storeSearchInput');
  const storeSearchBtn = document.getElementById('storeSearchBtn');
  
  const productCountNum = document.getElementById('productCountNum');
  const cartCountBadge = document.getElementById('cartCount');
  
  // 모달 관련 DOM
  const productModal = document.getElementById('productModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalContent = document.getElementById('modalContent');
  
  // 결제 관련 DOM
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutStepInput = document.getElementById('checkoutStepInput');
  const checkoutStepReceipt = document.getElementById('checkoutStepReceipt');
  const checkoutNameInput = document.getElementById('checkoutName');
  const checkoutEmailInput = document.getElementById('checkoutEmail');
  const checkoutPhoneInput = document.getElementById('checkoutPhone');
  const paySubmitBtn = document.getElementById('paySubmitBtn');
  const checkoutBackBtn = document.getElementById('checkoutBackBtn');
  const receiptCloseBtn = document.getElementById('receiptCloseBtn');
  
  // 영수증 데이터 DOM
  const receiptCountry = document.getElementById('receiptCountry');
  const receiptPlan = document.getElementById('receiptPlan');
  const receiptEmail = document.getElementById('receiptEmail');
  const receiptOrderNum = document.getElementById('receiptOrderNum');
  const receiptPrice = document.getElementById('receiptPrice');
  
  // 부가상품 관련 DOM
  const checkoutAddon = document.getElementById('checkoutAddon');
  const checkoutAddonLabel = document.getElementById('checkoutAddonLabel');
  const receiptAddonRow = document.getElementById('receiptAddonRow');
  const receiptAddonName = document.getElementById('receiptAddonName');
  
  // 개통 희망일 관련 DOM
  const checkoutActivationDateGroup = document.getElementById('checkoutActivationDateGroup');
  const checkoutActivationDate = document.getElementById('checkoutActivationDate');
  const receiptActivationDateRow = document.getElementById('receiptActivationDateRow');
  const receiptActivationDateVal = document.getElementById('receiptActivationDateVal');
  
  // 수량 및 요약 관련 DOM
  const checkoutSelectedPlanName = document.getElementById('checkoutSelectedPlanName');
  const checkoutSelectedQty = document.getElementById('checkoutSelectedQty');
  const receiptQty = document.getElementById('receiptQty');

  // 주의사항 관련 DOM
  const precautionModal = document.getElementById('precautionModal');
  const precautionAgreeCheck = document.getElementById('precautionAgreeCheck');
  const precautionCancelBtn = document.getElementById('precautionCancelBtn');
  const precautionConfirmBtn = document.getElementById('precautionConfirmBtn');
  const softbankPrecaution = document.getElementById('softbankPrecaution');

  // 3. 데이터 로드 및 초기화
  async function init() {
    // 프로젝트 루트의 .env 파일 동적 로드 및 파싱 시도
    try {
      const response = await fetch('.env');
      if (response.ok) {
        const text = await response.text();
        text.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const parts = trimmed.split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            if (key === 'PORTONE_MERCHANT_ID') PORTONE_MERCHANT_ID = val;
            if (key === 'PORTONE_PG_PROVIDER') PORTONE_PG_PROVIDER = val;
            if (key === 'PORTONE_STORE_ID') PORTONE_STORE_ID = val;
            if (key === 'PORTONE_CHANNEL_KEY') PORTONE_CHANNEL_KEY = val;
          }
        });
      }
    } catch (e) {
      console.warn("로컬 .env 파일을 로드하지 못했습니다. (CORS 또는 파일 없음) 기본 테스트 모드로 작동합니다.", e);
    }

    // 포트원 결제 모듈 초기화 (설정된 가맹점 식별코드 사용)
    if (window.IMP) {
      window.IMP.init(PORTONE_MERCHANT_ID);
    }

    if (window.PRODUCTS_DATA && Array.isArray(window.PRODUCTS_DATA)) {
      productsData = window.PRODUCTS_DATA;
    } else {
      console.error('products.js 데이터 로드 실패');
      productGrid.innerHTML = `<div class="no-results"><div class="no-results-icon">⚠️</div>데이터를 불러올 수 없습니다. products.js 파일의 데이터 정의를 확인하세요.</div>`;
      return;
    }
    
    // 네비게이션 뷰 전환 바인딩
    navDesktop.addEventListener('click', (e) => {
      const link = e.target.closest('.nav-link');
      if (!link) return;
      
      e.preventDefault();
      const target = link.getAttribute('data-target');
      
      if (target === 'home') {
        switchView('home');
        window.scrollTo(0, 0);
      } else if (target === 'store') {
        switchView('store');
        window.scrollTo(0, 0);
      } else if (target === 'orders') {
        switchView('orders');
        window.scrollTo(0, 0);
        document.getElementById('lookupEmail').value = '';
        document.getElementById('lookupPhone').value = '';
        document.getElementById('orderLookupResults').style.display = 'none';
      } else if (target === 'faq') {
        switchView('home');
        setTimeout(() => {
          document.getElementById('precautions-section').scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    });

    // 로고 클릭 시 홈 뷰 전환
    document.getElementById('logoLink').addEventListener('click', (e) => {
      e.preventDefault();
      switchView('home');
      window.scrollTo(0, 0);
    });

    // 홈 화면에서 전체보기 CTA 클릭 시 스토어로 전환
    document.getElementById('homeCtaBtn').addEventListener('click', () => {
      switchView('store');
      window.scrollTo(0, 0);
    });

    // 홈 검색 처리기 (홈 검색 영역이 존재하는 경우에만 연동)
    if (homeSearchBtn && homeSearchInput) {
      homeSearchBtn.addEventListener('click', () => handleHomeSearch());
      homeSearchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleHomeSearch();
      });
    }

    // 스토어 검색 처리기
    storeSearchBtn.addEventListener('click', () => handleStoreSearch());
    storeSearchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') handleStoreSearch();
    });
    
    // 카테고리 탭 이벤트 리스너 연동
    tabsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      
      tabsContainer.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      
      // 카테고리 변경 시 기존 검색 필터를 초기화하여 전체 상품을 편안하게 볼 수 있게 개선
      searchQuery = '';
      storeSearchInput.value = '';
      
      currentCategory = btn.getAttribute('data-category');
      renderGrid();
    });
    
    // 모달 닫기 리스너
    modalCloseBtn.addEventListener('click', closeModal);
    productModal.addEventListener('click', (e) => {
      if (e.target === productModal) closeModal();
    });
    
    // 결제 닫기 및 네비게이션 리스너
    checkoutBackBtn.addEventListener('click', closeCheckout);

    // 약관 동의 블록: 체크 전 결제 버튼 잠금 + 자세히 보기 토글
    const consentBox = document.getElementById('consentBox');
    const consentCheck = document.getElementById('consentAgreeCheck');
    if (consentBox && consentCheck) {
      const syncPayBtn = () => {
        if (!paySubmitBtn) return;
        paySubmitBtn.disabled = !consentCheck.checked;
        paySubmitBtn.style.opacity = consentCheck.checked ? '1' : '0.5';
        paySubmitBtn.style.cursor = consentCheck.checked ? 'pointer' : 'not-allowed';
      };
      consentCheck.addEventListener('change', syncPayBtn);
      window.resetConsent = () => { consentCheck.checked = false; syncPayBtn(); };
      consentBox.addEventListener('click', (e) => {
        const btn = e.target.closest('.consent-detail-btn');
        if (!btn) return;
        const detail = document.getElementById('consent-detail-' + btn.getAttribute('data-detail'));
        if (detail) {
          detail.classList.toggle('open');
          btn.textContent = detail.classList.contains('open') ? '접기' : '자세히 보기';
        }
      });
    }
    paySubmitBtn.addEventListener('click', startPaymentProcess);
    receiptCloseBtn.addEventListener('click', completeCheckoutFlow);
    document.getElementById('orderLookupBtn').addEventListener('click', handleOrderLookup);


    // 주의사항 동의 체크박스 체인지 리스너 (모달이 돔에 존재하는 경우에만 활성화)
    if (typeof precautionAgreeCheck !== 'undefined' && precautionAgreeCheck) {
      precautionAgreeCheck.addEventListener('change', () => {
        const isChecked = precautionAgreeCheck.checked;
        if (precautionConfirmBtn) {
          precautionConfirmBtn.disabled = !isChecked;
          if (isChecked) {
            precautionConfirmBtn.style.opacity = '1';
            precautionConfirmBtn.style.cursor = 'pointer';
          } else {
            precautionConfirmBtn.style.opacity = '0.5';
            precautionConfirmBtn.style.cursor = 'not-allowed';
          }
        }
      });
    }

    // 주의사항 취소 버튼 리스너
    if (typeof precautionCancelBtn !== 'undefined' && precautionCancelBtn) {
      precautionCancelBtn.addEventListener('click', () => {
        closePrecautionModal();
      });
    }

    // 주의사항 동의하고 구매하기 버튼 리스너
    if (typeof precautionConfirmBtn !== 'undefined' && precautionConfirmBtn) {
      precautionConfirmBtn.addEventListener('click', () => {
        closePrecautionModal();
        openCheckoutFlow(checkoutItems);
      });
    }

    document.getElementById('headerCartBtn').addEventListener('click', (e) => {
      e.preventDefault();
      openCartDrawer();
    });

    document.getElementById('navDeviceCheckBtn').addEventListener('click', (e) => {
      e.preventDefault();
      openDeviceModal();
    });

    // Cart Drawer close button and overlay click
    document.getElementById('cartDrawerCloseBtn').addEventListener('click', closeCartDrawer);
    document.getElementById('cartDrawerOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('cartDrawerOverlay')) {
        closeCartDrawer();
      }
    });

    // Cart Checkout button listener
    document.getElementById('cartCheckoutBtn').addEventListener('click', () => {
      if (cart.length > 0) {
        openCheckoutFlow(cart); // Buy Flow v3: 확인+입력 단일 화면 직행 (중복 게이트 제거)
      }
    });

    // Load cart items from localStorage on startup
    loadCart();
    setupDeviceDiagnosticsListeners();
    setupSimulatorListeners();
    
    // 초기 렌더링
    renderFeatured();
    renderGrid();
    initReviewToggles();
  }

  // 4. 뷰 전환 제어 함수
  let suppressHistory = false;
  function switchView(viewId) {
    // 브라우저 히스토리 기록 (뒤로가기 지원)
    if (!suppressHistory && location.hash !== '#' + viewId) {
      history.pushState({ view: viewId }, '', '#' + viewId);
    }
    // 네비게이션 링크 스타일 업데이트
    navDesktop.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-target') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // 풀페이지 스냅은 홈에서만 (다른 뷰에서 스크롤 락 방지)
    document.documentElement.classList.toggle('snap-on', viewId === 'home');
    // 뷰 전환 시 항상 맨 위에서 시작
    window.scrollTo(0, 0);

    // 모든 뷰 숨기기 (안전 가드 처리)
    const allViews = [viewHome, viewStore, viewOrders, viewTerms, viewPrivacy, viewRefunds, viewPartnership];
    allViews.forEach(v => {
      if (v) v.classList.remove('active');
    });

    // 선택한 뷰 활성화
    if (viewId === 'home') {
      if (viewHome) viewHome.classList.add('active');
      // 지구본에서 걸었던 검색은 홈 복귀 시 초기화 (뒤로가기 잔상 방지)
      if (window.__globeSearch) {
        window.__globeSearch = false;
        const si = document.getElementById('storeSearchInput');
        if (si) si.value = '';
        searchQuery = '';
      }
    } else if (viewId === 'store') {
      if (viewStore) {
        viewStore.classList.add('active');
        renderGrid();
      }
    } else if (viewId === 'orders') {
      if (viewOrders) viewOrders.classList.add('active');
    } else if (viewId === 'terms') {
      if (viewTerms) viewTerms.classList.add('active');
    } else if (viewId === 'privacy') {
      if (viewPrivacy) viewPrivacy.classList.add('active');
    } else if (viewId === 'refunds') {
      if (viewRefunds) viewRefunds.classList.add('active');
    } else if (viewId === 'partnership') {
      if (viewPartnership) viewPartnership.classList.add('active');
    }
    
    // 페이지 전환 시 부드럽게 맨 위로 스크롤 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 5. 홈 검색 -> 스토어 검색 연동
  function handleHomeSearch() {
    const val = homeSearchInput.value.trim();
    if (!val) return;
    
    searchQuery = val.toLowerCase();
    storeSearchInput.value = val; // 스토어 검색창에도 동기화
    
    // 전체 카테고리로 리셋
    currentCategory = 'ALL';
    tabsContainer.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    tabsContainer.querySelector('[data-category="ALL"]').classList.add('active');
    
    switchView('store');
    if (viewStore) { viewStore.scrollIntoView({ behavior: 'smooth' }); }
  }

  // 6. 스토어 검색
  function handleStoreSearch() {
    searchQuery = storeSearchInput.value.trim().toLowerCase();
    renderGrid();
  }

  // 7. 홍콩 리셋 시간을 현지 국가 시간으로 계산하여 직접 반환하는 함수
  function convertResetTime(resetStr, country) {
    if (!resetStr) return 'N/A';
    
    // 홍콩 00:00 기준 변경 문구가 들어가 있는 경우 현지 시차 최종 시간만 리턴
    if (resetStr.includes('홍콩') && resetStr.includes('00:00')) {
      if (country.includes('일본') || country.includes('한국') || country.includes('대한민국')) {
        return '매일 현지 시간 01:00';
      } else if (country.includes('베트남') || country.includes('태국') || country.includes('라오스') || country.includes('캄보디아')) {
        return '매일 현지 시간 23:00 (전날)';
      } else if (country.includes('중국') || country.includes('대만') || country.includes('필리핀') || country.includes('싱가포르') || country.includes('말레이시아') || country.includes('홍콩') || country.includes('마카오')) {
        return '매일 현지 시간 00:00';
      } else if (country.includes('몰디브')) {
        return '매일 현지 시간 21:00 (전날)';
      } else if (country.includes('괌') || country.includes('사이판') || country.includes('호주')) {
        return '매일 현지 시간 02:00';
      } else if (country.includes('뉴질랜드')) {
        return '매일 현지 시간 04:00';
      } else if (country.includes('유럽')) {
        return '매일 현지 시간 17:00 (전날)';
      } else if (country.includes('미국')) {
        return '매일 현지 시간 11:00 (동부) / 08:00 (서부) (전날)';
      } else {
        return '매일 현지 시간 00:00 (시차 반영)';
      }
    }
    
    // 타 국가 기준 00:00인 경우도 현지 시간 기준으로 깔끔하게 정돈
    if (resetStr.includes('00:00') && resetStr.includes('변경')) {
      return '매일 현지 시간 00:00';
    }
    
    return resetStr;
  }

  // 8. 카드 배경 그라데이션 가져오기
  function getCardBackground(category, country) {
    const gradients = {
      '일본': 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
      '베트남': 'linear-gradient(135deg, #f1c40f 0%, #e67e22 100%)',
      '중국': 'linear-gradient(135deg, #d35400 0%, #c0392b 100%)',
      '대만': 'linear-gradient(135deg, #16a085 0%, #27ae60 100%)',
      '태국': 'linear-gradient(135deg, #8e44ad 0%, #2c3e50 100%)',
      '싱가포르': 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
      '미국': 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
      '유럽': 'linear-gradient(135deg, #1e272c 0%, #34495e 100%)',
      '호주': 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)'
    };

    for (const key in gradients) {
      if (country.includes(key)) return gradients[key];
    }
    
    switch (category) {
      case '아시아':
        return 'linear-gradient(135deg, #ff4e50 0%, #f9d423 100%)';
      case '유럽':
        return 'linear-gradient(135deg, #1f4068 0%, #162447 100%)';
      case '북미괌사이판':
        return 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)';
      case '호주뉴질랜드':
        return 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
      case '중동':
        return 'linear-gradient(135deg, #e65c00 0%, #f9d423 100%)';
      case '아프리카':
        return 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)';
      case '남미':
        return 'linear-gradient(135deg, #0575e6 0%, #00f260 100%)';
      default:
        return 'linear-gradient(135deg, #3a6073 0%, #3a7bd5 100%)';
    }
  }

  // 8.05 나라별 이미지 URL 매핑 함수
  function getCountryImageUrl(country) {
    const nameMap = {
      '일본': 'images/japan.jpg',
      '베트남': 'images/vietnam.jpg',
      '태국': 'images/thailand.jpg',
      '대만': 'images/taiwan.jpg',
      '미국': 'images/usa.jpg',
      '북미': 'images/usa.jpg',
      '유럽': 'images/europe.jpg',
      '스페인': 'images/europe.jpg',
      '프랑스': 'images/europe.jpg',
      '보다폰': 'images/europe.jpg',
      '오렌지': 'images/europe.jpg',
      '몰디브': 'images/maldives.jpg',
      '몽골': 'images/mongolia.jpg',
      '한국': 'images/korea.jpg',
      '대한민국': 'images/korea.jpg',
      '캐나다': 'images/canada.jpg',
      '호주': 'images/australia.jpg',
      '뉴질랜드': 'images/newzealand.jpg',
      '인도': 'images/india.jpg',
      '러시아': 'images/russia.jpg',
      '사우디': 'images/saudi.jpg',
      '아랍': 'images/uae.jpg',
      'UAE': 'images/uae.jpg',
      '오만': 'images/oman.jpg',
      '카타르': 'images/qatar.jpg',
      '쿠웨이트': 'images/kuwait.jpg',
      '바레인': 'images/bahrain.jpg',
      '걸프': 'images/middle_east.jpg',
      '중동': 'images/middle_east.jpg',
      '나이지리아': 'images/africa.jpg',
      '남아프리카': 'images/africa.jpg',
      '남아공': 'images/africa.jpg',
      '모로코': 'images/africa.jpg',
      '알제리': 'images/africa.jpg',
      '케냐': 'images/africa.jpg',
      '아프리카': 'images/africa.jpg',
      '멕시코': 'images/south_america.jpg',
      '브라질': 'images/south_america.jpg',
      '칠레': 'images/south_america.jpg',
      '남미': 'images/south_america.jpg',
      '라오스': 'images/southeast_asia.jpg',
      '캄보디아': 'images/southeast_asia.jpg',
      '방글라데시': 'images/southeast_asia.jpg',
      '스리랑카': 'images/southeast_asia.jpg',
      '파키스탄': 'images/southeast_asia.jpg',
      '필리핀': 'images/philippines.jpg',
      '싱가포르': 'images/singapore.jpg',
      '싱가폴': 'images/singapore.jpg',
      '말레이': 'images/malaysia.jpg',
      '인도네시아': 'images/indonesia.jpg',
      '괌': 'images/guam.jpg',
      '사이판': 'images/saipan.jpg',
      '중국': 'images/china.jpg',
      '홍콩': 'images/hongkong.jpg',
      '마카오': 'images/macau.jpg',
      '튀르키예': 'images/turkey.jpg',
      '복수국가': 'images/global.jpg',
      '쓰리': 'images/global.jpg',
      'THREE': 'images/global.jpg',
      '중화권': 'images/global.jpg',
      '월드와이드': 'images/global.jpg'
    };
    
    for (const key in nameMap) {
      if (country.includes(key)) return nameMap[key];
    }
    return 'images/global.jpg'; // 100% 전 국가 실물 이미지 대응
  }

  // 8.1 상품 데이터를 국가 기준으로 그룹화하는 헬퍼 함수
  function groupProductsByCountry(list) {
    const grouped = {};
    list.forEach(p => {
      if (!grouped[p.country]) {
        grouped[p.country] = {
          category: p.category,
          country: p.country,
          carriers: [],
          minPrice: Infinity,
          network_speeds: new Set(),
          network_types: new Set(),
          calls_options: new Set(),
          has_unlimited: false
        };
      }
      const g = grouped[p.country];
      g.carriers.push(p);
      
      if (p.plans && p.plans.length) {
        p.plans.forEach(pl => {
          if (pl.final_price < g.minPrice) {
            g.minPrice = pl.final_price;
          }
          // 무제한 정직 표기: 진짜 무제한(속도제한 없음, speed-truth.js 실측)일 때만 배지
          if (pl.data_limit === '무제한' && window.JD_UNL && window.JD_UNL.isTrue(pl.product_code)) {
            g.has_unlimited = true;
          }
        });
      } else {
        // 요약 데이터(2단 로딩의 1단계) 폴백
        if (typeof p.min_price === 'number' && p.min_price < g.minPrice) g.minPrice = p.min_price;
        if (p.has_unlimited) g.has_unlimited = true;
      }
      g.network_speeds.add(p.network_speed);
      g.network_types.add(p.network_type);
      g.calls_options.add(p.calls);
    });
    return Object.values(grouped);
  }

  // 9. 홈화면 실시간 인기 상품 렌더링 (국가 기준으로 그룹화하여 4개 추출)
  function renderFeatured() {
    featuredGrid.innerHTML = '';
    
    const allGrouped = groupProductsByCountry(productsData);
    const targets = ['일본', '베트남', '대만', '미국'];
    let selected = [];
    
    targets.forEach(t => {
      const match = allGrouped.find(g => g.country === t);
      if (match) selected.push(match);
    });
    
    if (selected.length < 4) {
      selected = allGrouped.slice(0, 4);
    }
    
    selected.forEach(g => {
      const cardBg = getCardBackground(g.category, g.country);
      const carriersStr = g.carriers.map(c => c.carrier).join(' / ');
      const speedsStr = Array.from(g.network_speeds).join('/');
      const callsStr = g.carriers.some(c => c.calls === '가능') ? '통화가능' : '데이터전용';
      
      const imgUrl = getCountryImageUrl(g.country);
      const imgHTML = imgUrl 
        ? `<img src="${imgUrl}" class="card-img" alt="${g.country} 여행지 이미지">`
        : `<div style="font-size: 2rem; font-weight: 900; color: rgba(255, 255, 255, 0.15); text-transform: uppercase; letter-spacing: 2px; text-align: center; pointer-events: none;">${g.country}</div>`;

      const card = document.createElement('article');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="card-img-wrap" style="background: ${cardBg}; display: flex; align-items: center; justify-content: center; position: relative;">
          ${imgHTML}
          <div class="card-tags">
            <span class="card-tag hot">인기 상품</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">
            <span>${g.country}</span>
            <span class="card-carrier" style="font-size: 0.75rem;">${carriersStr}</span>
          </div>
          <div class="card-specs">
            <div class="card-spec-item">📶 ${speedsStr}</div>
            <div class="card-spec-item">📞 ${callsStr}</div>
            ${actChipHtml(g)}
          </div>
          <div class="card-footer">
            <div>
              <span class="card-price-label">최저가 요금</span>
              <div class="card-price">${g.minPrice.toLocaleString()}<span>원 부터</span></div>
            </div>
          </div>
        </div>
      `;
      
      card.addEventListener('click', () => {
        switchView('store');
        // 최저가인 캐리어(통신사) 상품을 찾아서 기본값으로 선택 후 모달 오픈
        let bestCarrier = g.carriers[0];
        let absoluteMin = Infinity;
        g.carriers.forEach(c => {
          if (c.plans && c.plans.length) {
            c.plans.forEach(pl => {
              if (pl.final_price < absoluteMin) {
                absoluteMin = pl.final_price;
                bestCarrier = c;
              }
            });
          } else if (typeof c.min_price === 'number' && c.min_price < absoluteMin) {
            absoluteMin = c.min_price;
            bestCarrier = c;
          }
        });
        openModal(bestCarrier, card);
      });
      featuredGrid.appendChild(card);
    });
  }

  // 10. 스토어 요금제 리스트 그리드 렌더링 (국가 기준으로 그룹화하여 중복 방지)
  function renderGrid() {
    productGrid.innerHTML = '';
    
    // 먼저 필터링
    let filteredRaw = productsData.filter(p => {
      const matchCat = (currentCategory === 'ALL' || p.category === currentCategory);
      const isSingaporeSearch = searchQuery && (searchQuery.includes('싱가폴') || searchQuery.includes('싱가포르'));
      const matchesSingapore = isSingaporeSearch && (p.country.includes('싱가폴') || p.country.includes('싱가포르'));
      const matchSearch = (!searchQuery || 
                           matchesSingapore ||
                           p.country.toLowerCase().includes(searchQuery) || 
                           p.carrier.toLowerCase().includes(searchQuery));
      return matchCat && matchSearch;
    });

    // 국가 단위 그룹화 적용
    const filteredCountries = groupProductsByCountry(filteredRaw);

    // 인기 국가 우선순위 정렬 적용 (한국인이 많이 방문하는 인기 여행지 기준 상위 배치)
    const POPULAR_COUNTRIES = [
      "일본", "베트남", "태국", "대만", "필리핀", "싱가포르", "말레이시아", "인도네시아", 
      "미국", "괌", "사이판", "중국", "홍콩", "마카오", "복수국가", "쓰리(THREE)", 
      "오렌지월드와이드", "호주", "뉴질랜드", "튀르키예", "캐나다"
    ];

    filteredCountries.sort((a, b) => {
      let idxA = POPULAR_COUNTRIES.indexOf(a.country);
      let idxB = POPULAR_COUNTRIES.indexOf(b.country);
      if (idxA === -1) idxA = 9999;
      if (idxB === -1) idxB = 9999;
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      return a.country.localeCompare(b.country, 'ko');
    });

    productCountNum.textContent = filteredCountries.length;

    if (filteredCountries.length === 0) {
      productGrid.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          조건에 맞는 국가를 찾지 못했습니다.<br>국가 이름을 다시 확인해 보시거나, 대륙 탭을 클릭하여 요금제를 탐색해 보세요!
        </div>`;
      return;
    }

    filteredCountries.forEach(g => {
      const cardBg = getCardBackground(g.category, g.country);
      const carriersStr = g.carriers.map(c => c.carrier).join(' / ');
      const speedsStr = Array.from(g.network_speeds).join('/');
      const callsStr = g.carriers.some(c => c.calls === '가능') ? '통화가능' : '데이터전용';
      const mainNetworkType = g.network_types.has('로컬망') ? '로컬망' : '로밍망';
      
      const imgUrl = getCountryImageUrl(g.country);
      const imgHTML = imgUrl 
        ? `<img src="${imgUrl}" class="card-img" alt="${g.country} 여행지 이미지">`
        : `<div style="font-size: 2.2rem; font-weight: 900; color: rgba(255, 255, 255, 0.15); text-transform: uppercase; letter-spacing: 2px; text-align: center; pointer-events: none; padding: 0 10px;">${g.country}</div>`;

      const card = document.createElement('article');
      card.className = 'product-card';
      
      card.innerHTML = `
        <div class="card-img-wrap" style="background: ${cardBg}; display: flex; align-items: center; justify-content: center; position: relative;">
          ${imgHTML}
          <div class="card-tags">
            <span class="card-tag ${mainNetworkType === '로컬망' ? 'local' : 'roaming'}">${mainNetworkType}</span>
            ${g.has_unlimited ? '<span class="card-tag best">무제한</span>' : ''}
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">
            <span>${g.country}</span>
            <span class="card-carrier" style="font-size: 0.75rem;">${carriersStr}</span>
          </div>
          <div class="card-specs">
            <div class="card-spec-item">📶 ${speedsStr}</div>
            <div class="card-spec-item">📞 ${callsStr}</div>
            ${actChipHtml(g)}
          </div>
          <div class="card-footer">
            <div>
              <span class="card-price-label">최저가 요금</span>
              <div class="card-price">${g.minPrice.toLocaleString()}<span>원 부터</span></div>
            </div>
          </div>
        </div>
      `;
      
      card.addEventListener('click', () => {
        // 최저가인 캐리어 찾기
        let bestCarrier = g.carriers[0];
        let absoluteMin = Infinity;
        g.carriers.forEach(c => {
          if (c.plans && c.plans.length) {
            c.plans.forEach(pl => {
              if (pl.final_price < absoluteMin) {
                absoluteMin = pl.final_price;
                bestCarrier = c;
              }
            });
          } else if (typeof c.min_price === 'number' && c.min_price < absoluteMin) {
            absoluteMin = c.min_price;
            bestCarrier = c;
          }
        });
        openModal(bestCarrier, card);
      });
      
      productGrid.appendChild(card);
    });
  }

  // 11. 모달창 열기 및 데이터 연동

  // ===== 드롭다운 현대화: select를 숨기고 알약/카드 UI로 변환 =====
  // 표시용 통신사명 정리: 괄호 수식어 제거 (내부 값은 원본 유지)
  function cleanCarrierName(name) {
    return String(name).replace(/\s*\([^)]*(망|티어|다이렉트|현지)[^)]*\)/g, '').trim();
  }
  window.cleanCarrierName = cleanCarrierName;

  function enhanceOptionSelects(scope) {
    const KIND = { carrierSelect: 'cards', planTypeSelect: 'seg', capacitySelect: 'pills', durationSelect: 'pills', daysSelect: 'pills' };
    scope.querySelectorAll('select').forEach(sel => {
      const kind = KIND[sel.id];
      if (!kind || sel.options.length === 0) return;
      // 기존 변환 UI 제거 후 재생성
      const prev = sel.parentElement.querySelector('.opt-group[data-for="' + sel.id + '"]');
      if (prev) prev.remove();
      // 옵션이 많으면(9개 이상) 칩 대신 모던 드롭다운으로 표시 (예: 1~30일 상품)
      if (kind === 'pills' && sel.options.length > 8) {
        sel.classList.remove('opt-hidden-select');
        sel.classList.add('opt-select-modern');
        sel.style.cssText = '';
        return;
      }
      sel.classList.remove('opt-select-modern');
      sel.classList.add('opt-hidden-select');
      const wrap = document.createElement('div');
      wrap.className = 'opt-group opt-' + kind;
      wrap.setAttribute('data-for', sel.id);
      [...sel.options].forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opt-item' + (opt.selected || opt.value === sel.value ? ' selected' : '');
        if (kind === 'cards') {
          // 통신사명 + 망종류/속도 배지 (data 속성 우선, 없으면 텍스트 정리)
          const net = opt.getAttribute('data-net') || '';
          const speed = opt.getAttribute('data-speed') || '';
          const label = cleanCarrierName(opt.getAttribute('data-name') || opt.textContent);
          const netClass = net === '로컬망' ? 'opt-net-local' : 'opt-net-roaming';
          const subHTML = (net || speed)
            ? '<span class="opt-sub">' + (net ? '<em class="opt-net ' + netClass + '">' + net + '</em>' : '') + (speed ? '<em class="opt-speed">' + speed + '</em>' : '') + '</span>'
            : '';
          btn.innerHTML = '<span class="opt-main">' + label + '</span>' + subHTML;
        } else {
          btn.textContent = opt.textContent.trim();
        }
        btn.addEventListener('click', () => {
          if (sel.value === opt.value) return;
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          // 재렌더되지 않는 환경 대비 선택 표시 즉시 갱신
          wrap.querySelectorAll('.opt-item').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
        wrap.appendChild(btn);
      });
      sel.insertAdjacentElement('afterend', wrap);
    });
  }
  window.enhanceOptionSelects = enhanceOptionSelects;

  // (리팩토링 2026-07-19: attachTripDatePicker 제거 — PC는 pcTripCal 방식, 이 함수는 무대상 잔재)
  

  // lite/full 통신사명 불일치로 병합이 빠진 상품 구제: 국가(+통신망)로 full에서 plans 복구
  function ensurePlans(carrier) {
    if (!carrier) return [];
    if (carrier.plans && carrier.plans.length) return carrier.plans;
    const full = window.PRODUCTS_DATA || [];
    const cand = full.filter(f => f.country === carrier.country && f.plans && f.plans.length);
    const byNet = cand.filter(f => f.network_type === carrier.network_type);
    const pool = byNet.length ? byNet : cand;
    const seen = {}, merged = [];
    pool.forEach(f => f.plans.forEach(pl => {
      const k = pl.product_code || (pl.data_limit + '|' + pl.duration);
      if (!seen[k]) { seen[k] = 1; merged.push(pl); }
    }));
    carrier.plans = merged;
    return merged;
  }

  // PC 앵커 팝업 (2026-07-20 사장님 지시): 클릭한 카드 옆에 컴팩트 팝업, 카드만 선명(스포트라이트)
  function anchorModal() {
    const box = productModal.querySelector('.modal-container');
    productModal.classList.remove('anchored');
    if (box) { box.style.left = ''; box.style.top = ''; box.style.maxHeight = ''; }
    document.querySelectorAll('.jd-spotlight').forEach(el => el.classList.remove('jd-spotlight'));
    const a = window.__modalAnchor;
    if (!a || !a.getBoundingClientRect || !box || window.innerWidth < 1024) return; // 좁은 화면은 기존 중앙 모달
    const r = a.getBoundingClientRect();
    const W = 470, GAP = 14, M = 12;
    let left = null;
    if (r.right + GAP + W + M <= window.innerWidth) left = r.right + GAP;
    else if (r.left - GAP - W >= M) left = r.left - GAP - W;
    if (left == null) return; // 옆 공간이 없으면 중앙 폴백
    productModal.classList.add('anchored');
    const H = Math.min(window.innerHeight - 2 * M, 660);
    const top = Math.max(M, Math.min(r.top, window.innerHeight - H - M));
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    box.style.maxHeight = H + 'px';
    a.classList.add('jd-spotlight');
  }
  function openModal(prod, anchorEl) {
    if (anchorEl !== undefined) window.__modalAnchor = anchorEl;
    if (!window.__fullReady && (!prod.plans || !prod.plans.length)) {
      document.body.style.cursor = 'progress';
      window.ensureFullProducts(function () {
        document.body.style.cursor = '';
        openModal(prod);
      });
      return;
    }
    activeProduct = prod;

    // 동일 국가의 다른 캐리어(통신사)가 있는지 확인
    const sameCountryProducts = productsData.filter(p => p.country === prod.country);
    activeCarrier = prod;
    ensurePlans(activeCarrier);   // 병합 누락분 plans 복구

    // PC 위저드 초기화 (2026-07-20): 저장된 여행 날짜가 유효하면 일수 자동 계산 → 스타일 스텝부터
    window.__pcwStep = 1; window.__pcwDays = null; window.__pcwStyle = null; window.__pcwPlan = null;
    try {
      const t = JSON.parse(localStorage.getItem('jd_trip_dates') || 'null');
      if (t && t.dep && t.ret && new Date(t.dep + 'T00:00:00') >= new Date(new Date().toDateString())) {
        const uni = pcwDursUnion(sameCountryProducts);
        const trip = Math.round((new Date(t.ret) - new Date(t.dep)) / 86400e3) + 1;
        const pick = uni.find(d => d >= trip) || uni[uni.length - 1];
        if (pick) { window.__pcwDays = pick; window.__pcwStep = 2; }
      }
    } catch (e) {}

    // 데이터 및 기간 초기화
    const firstPlan = activeCarrier.plans && activeCarrier.plans[0];
    if (!firstPlan) { alert('이 상품의 요금제를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'); return; }
    activeDataLimit = firstPlan.data_limit;
    activeDuration = firstPlan.duration;
    activeQuantity = 1; // 수량 초기화

    renderModalContent(sameCountryProducts);
    
    productModal.classList.add('active');
    anchorModal(); // 카드 옆 앵커 + 스포트라이트 (공간 없으면 중앙 폴백)
    document.body.style.overflow = 'hidden'; // 스크롤 락
    history.pushState({ modal: true }, '', location.hash || '#home');
  }

  // ── PC 위저드 v5 (2026-07-20 사장님 지시: 모바일 구조 그대로 — 캘린더→스타일→전 통신사 통합 리스트→구매) ──
  const STYLE_META_PC = {
    '마음껏': { ic: '🎬', t: '마음껏', s: '무제한·3GB↑·대용량 — 유튜브·핫스팟 자유' },
    '보통':   { ic: '📱', t: '보통',   s: '매일 1~2GB — SNS·지도·검색 위주' },
    '가볍게': { ic: '💬', t: '가볍게', s: '1GB 미만 소용량 — 메신저·지도 정도' },
    '전체':   { ic: '🗂', t: '전체 상품 보기', s: '모든 상품을 직접 비교' }
  };
  function pcPlanCap(pl) { return String(pl.data_limit || '').replace('매일 ', '').replace('총 ', '').trim(); }
  function pcStyleOf(pl) { // 모바일 styleOf 정본과 동일 규칙
    const cap = pcPlanCap(pl);
    if (cap === '무제한') return '마음껏';
    if (/^[\d.]+\s*Mbps$/i.test(cap)) return '마음껏';
    const fup = /^([\d.]+)(GB|MB)\+/i.exec(cap);
    if (fup) { const gb = fup[2].toUpperCase() === 'GB' ? parseFloat(fup[1]) : parseFloat(fup[1]) / 1024; return gb >= 3 ? '마음껏' : (gb >= 1 ? '보통' : '가볍게'); }
    const m = /^([\d.]+)(GB|MB)$/i.exec(cap);
    if (!m) return '보통';
    const gb = m[2].toUpperCase() === 'GB' ? parseFloat(m[1]) : parseFloat(m[1]) / 1024;
    if (pl.service_type === '데일리' || pl.service_type === '무제한') return gb >= 3 ? '마음껏' : (gb >= 1 ? '보통' : '가볍게');
    return gb <= 3 ? '가볍게' : (gb > 10 ? '마음껏' : '보통');
  }
  function pcCapMB(pl) { const s = pcPlanCap(pl); if (s === '무제한') return Infinity; const m = /^([\d.]+)\s*(GB|MB)/i.exec(s); return m ? parseFloat(m[1]) * (m[2].toUpperCase() === 'GB' ? 1024 : 1) : 1e9; }
  function pcwDursUnion(opts) {
    const set = new Set();
    opts.forEach(g => { ensurePlans(g); (g.plans || []).forEach(pl => set.add(parseInt(pl.duration, 10))); });
    return Array.from(set).filter(Boolean).sort((a, b) => a - b);
  }
  function pcwSet(step) { window.__pcwStep = step; renderModalContent(window.__pcwOpts || []); }
  function renderWizardStep(carrierOptions) {
    window.__pcwOpts = carrierOptions;
    const country = (activeProduct && activeProduct.country) || '';
    const step = window.__pcwStep || 1;
    const days = window.__pcwDays, style = window.__pcwStyle;
    const rowBtn = (attrs, main, sub, right) =>
      `<button type="button" ${attrs} style="display:flex;align-items:center;gap:10px;width:100%;padding:13px 14px;margin-top:8px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--bg-tertiary);cursor:pointer;text-align:left;font:inherit;color:var(--text-main);">
        <span style="flex:1;min-width:0;"><span style="display:block;font-weight:800;font-size:0.92rem;">${main}</span>${sub ? `<span style="display:block;font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${sub}</span>` : ''}</span>${right || ''}
      </button>`;
    let chips = '';
    if (step > 1 && days) chips += `<button type="button" class="pcw-chip" data-step="1" style="font:inherit;font-size:0.78rem;font-weight:800;color:var(--accent);background:rgba(242,117,31,0.08);border:1px solid rgba(242,117,31,0.3);border-radius:999px;padding:6px 12px;cursor:pointer;margin-right:6px;">📅 ${days}일 ✎</button>`;
    if (step > 2 && style) chips += `<button type="button" class="pcw-chip" data-step="2" style="font:inherit;font-size:0.78rem;font-weight:800;color:var(--accent);background:rgba(242,117,31,0.08);border:1px solid rgba(242,117,31,0.3);border-radius:999px;padding:6px 12px;cursor:pointer;margin-right:6px;">${(STYLE_META_PC[style] || {}).ic || ''} ${style} ✎</button>`;
    let body = '';
    if (step === 1) {
      const uni = pcwDursUnion(carrierOptions);
      body = `<div class="config-section-title" style="margin-top:14px;">📅 여행 날짜를 골라주세요 <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);">— 출발·귀국일 두 번이면 끝</span></div>
        <div id="pcwCal" style="margin-top:8px;"></div><div id="pcwMsg" style="display:none;margin-top:7px;font-size:0.8rem;font-weight:700;line-height:1.55;"></div>
        <details style="margin-top:10px;"><summary style="list-style:none;cursor:pointer;font-size:0.8rem;font-weight:800;color:#B04A06;">🔢 날짜 없이 일수로 고르기</summary>
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:7px;margin-top:8px;">${uni.map(d => `<button type="button" class="pcw-dur" data-val="${d}" style="min-height:42px;border-radius:999px;border:1.5px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-main);font:inherit;font-size:0.85rem;font-weight:800;cursor:pointer;">${d}일</button>`).join('')}</div>
        </details>`;
    } else if (step === 2) {
      const styles = ['마음껏', '보통', '가볍게'].filter(st => carrierOptions.some(g => (g.plans || []).some(pl => pcStyleOf(pl) === st)));
      styles.push('전체');
      body = `<div class="config-section-title" style="margin-top:14px;">데이터, 어떻게 쓰실래요?</div>` + styles.map(st => {
        const m = STYLE_META_PC[st];
        let mn = 0;
        carrierOptions.forEach(g => (g.plans || []).forEach(pl => {
          if (st !== '전체' && pcStyleOf(pl) !== st) return;
          if (days && parseInt(pl.duration, 10) !== days) return;
          if (!mn || pl.final_price < mn) mn = pl.final_price;
        }));
        return rowBtn(`class="pcw-style" data-style="${st}"`, `${m.ic} ${m.t}`, `${m.s}${mn ? ' · ' + mn.toLocaleString() + '원~' : ''}`);
      }).join('');
    } else {
      // step 3: 전 통신사 통합 리스트 — 용량 오름차순·동일 용량 가격순·무제한 뒤 (통신사 = 카드 속성)
      let items = [];
      carrierOptions.forEach(g => { ensurePlans(g); (g.plans || []).forEach(pl => {
        if (style !== '전체' && pcStyleOf(pl) !== style) return;
        items.push({ g, pl, d: parseInt(pl.duration, 10) });
      }); });
      let exact = items.filter(x => x.d === days), note = '';
      if (!exact.length && items.length) {
        const bigger = items.filter(x => x.d > days).sort((a, b) => a.d - b.d);
        if (bigger.length) { const d2 = bigger[0].d; exact = bigger.filter(x => x.d === d2); note = `<div style="font-size:0.8rem;font-weight:700;color:#B45309;margin-top:8px;">⚠️ ${days}일 상품이 없어 <b>${d2}일권</b>으로 커버해 드려요</div>`; }
      }
      exact.sort((a, b) => (pcCapMB(a.pl) - pcCapMB(b.pl)) || (a.pl.final_price - b.pl.final_price));
      const bestIdx = exact.reduce((bi, x, i) => x.pl.final_price < exact[bi].pl.final_price ? i : bi, 0);
      window.__pcwList = exact;
      body = `<div class="config-section-title" style="margin-top:14px;">딱 맞는 상품 ${exact.length}개를 골라드렸어요 <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);">— 모든 통신사 비교 완료 · 아래로 스크롤</span></div>` + note +
        `<div class="pcw-scroll" style="margin-top:2px;max-height:430px;overflow-y:auto;overscroll-behavior:contain;padding-right:5px;">` +
        (exact.map((x, i) => {
          const cap = pcPlanCap(x.pl);
          const capLbl = cap === '무제한' ? ((window.JD_UNL && window.JD_UNL.isTrue(x.pl.product_code)) ? '완전 무제한' : '무제한(속도정책 확인)') : ((x.pl.service_type === '데일리' || x.pl.service_type === '무제한') ? '매일 ' + cap : '전체 ' + cap);
          const sub = [(x.pl.service_type === '총용량' ? '기간 전체 자유 사용' : '매일 리셋'), x.g.network_speed || ''].filter(Boolean).join(' · ');
          const net = x.g.network_type === '로컬망' ? '<span style="flex-shrink:0;font-size:0.7rem;font-weight:900;color:#15803d;background:rgba(21,128,61,0.1);border-radius:999px;padding:3px 9px;">🏠 로컬</span>' : '<span style="flex-shrink:0;font-size:0.7rem;font-weight:900;color:#1d4ed8;background:rgba(29,78,216,0.08);border-radius:999px;padding:3px 9px;">🌐 로밍</span>';
          const best = i === bestIdx ? ' <span style="font-size:0.65rem;font-weight:900;color:#fff;background:var(--accent);border-radius:6px;padding:2px 7px;vertical-align:2px;">BEST</span>' : '';
          return rowBtn(`class="pcw-item" data-i="${i}"`, `${window.cleanCarrierName(x.g.carrier)} · ${capLbl}${best}`, sub,
            `${net}<span style="flex-shrink:0;font-size:1.05rem;font-weight:900;font-variant-numeric:tabular-nums;">${x.pl.final_price.toLocaleString()}<span style="font-size:0.72rem;font-weight:700;">원</span></span>`);
        }).join('') || '<div style="font-size:0.82rem;color:var(--text-muted);font-weight:700;padding:10px 2px;">이 조합의 상품이 없어요 — 다른 스타일이나 일수를 선택해 보세요</div>') +
        `</div>`;
    }
    modalContent.innerHTML = `<div style="grid-column:1/-1;">
      <div class="modal-header" style="margin-bottom:4px;">
        <div class="modal-category">${(activeProduct && activeProduct.category) || 'eSIM'}</div>
        <h2 class="modal-title">${country} eSIM</h2>
      </div>
      <div style="margin-top:6px;">${chips}</div>
      ${body}
    </div>`;
    // 바인딩
    modalContent.querySelectorAll('.pcw-chip').forEach(b => b.addEventListener('click', () => pcwSet(parseInt(b.dataset.step, 10))));
    modalContent.querySelectorAll('.pcw-dur').forEach(b => b.addEventListener('click', () => { window.__pcwDays = parseInt(b.dataset.val, 10); pcwSet(2); }));
    modalContent.querySelectorAll('.pcw-style').forEach(b => b.addEventListener('click', () => { window.__pcwStyle = b.dataset.style; pcwSet(3); }));
    modalContent.querySelectorAll('.pcw-item').forEach(b => b.addEventListener('click', () => {
      const x = (window.__pcwList || [])[parseInt(b.dataset.i, 10)];
      if (!x) return;
      activeCarrier = x.g; ensurePlans(activeCarrier);
      window.__pcwPlan = x.pl;
      activeQuantity = 1;
      window.__pcwStep = 4;
      renderModalContent(carrierOptions);
    }));
    if (step === 1 && window.JDTripCal) {
      const calBox = modalContent.querySelector('#pcwCal'), msg = modalContent.querySelector('#pcwMsg');
      let saved = null; try { saved = JSON.parse(localStorage.getItem('jd_trip_dates') || 'null'); } catch (e) {}
      window.JDTripCal.mount(calBox, { dep: saved && saved.dep, ret: saved && saved.ret, onRange: (depIso, retIso) => {
        const trip = Math.round((new Date(retIso) - new Date(depIso)) / 86400e3) + 1;
        const uni = pcwDursUnion(carrierOptions);
        if (!uni.length) return;
        const pick = uni.find(d => d >= trip) || uni[uni.length - 1];
        try { localStorage.setItem('jd_trip_dates', JSON.stringify({ dep: depIso, ret: retIso, msgPick: pick, msgTrip: trip })); } catch (e) {}
        window.__pcwDays = pick;
        if (msg) {
          msg.style.display = 'block';
          if (pick >= trip) { msg.style.color = '#15803d'; msg.innerHTML = '✅ ' + trip + '일 여행 — <b>' + pick + '일권' + (pick === trip ? '이 딱 맞아요' : '으로 여유 있게 커버돼요') + '</b>'; }
          else { msg.style.color = '#b45309'; msg.innerHTML = '⚠️ ' + trip + '일 여행인데 최대 <b>' + pick + '일권</b>까지 있어요 — 추가 구매 조합을 추천해요'; }
        }
        setTimeout(() => pcwSet(2), 350);
      } });
    }
    try { window.jdTrack && jdTrack('wizard_step', { step: 'pc' + step, country: country }); } catch (e) {}
  }

  // 12. 모달 세부 콘텐츠 구성 렌더링 (상품표 모든 세부 필드 연동 완료)
  function renderModalContent(carrierOptions) {
    // PC 위저드 라우팅 (2026-07-20): 1캘린더→2스타일→3통합리스트, 4=구매 확정(아래 기존 레이아웃)
    if ((window.__pcwStep || 1) !== 4) { renderWizardStep(carrierOptions); return; }
    if (window.__pcwPlan) { // 리스트에서 고른 상품으로 고정
      const pl = window.__pcwPlan;
      activeDuration = parseInt(pl.duration, 10);
      window.activePlanType = (pl.service_type === '데일리' || pl.service_type === '무제한') ? '데일리' : '총용량';
      activeDataLimit = pl.data_limit;
    }
    // 4단계 캐스케이딩 옵션 로직 (데일리/총용량 구분)
    const p = activeCarrier;
    
    // 캐스케이드 v4 (2026-07-20 사장님 지시): 질문 순서 = 모바일과 동일 — ①며칠 → ②쓰는 방식 → ③용량
    // 1. Durations: 전체 플랜의 일수 유니온 (일수가 첫 질문)
    const availableDurations = Array.from(new Set(p.plans.map(pl => parseInt(pl.duration, 10)))).sort((a, b) => a - b);
    if (!availableDurations.includes(parseInt(activeDuration, 10))) {
      activeDuration = availableDurations[0];
    }
    const durPlans = p.plans.filter(pl => parseInt(pl.duration, 10) === parseInt(activeDuration, 10));

    // 2. Types (매일 리셋 vs 전체 기간) — 선택한 일수에서 가능한 것만
    const types = new Set();
    durPlans.forEach(pl => {
      types.add((pl.service_type === '데일리' || pl.service_type === '무제한') ? '데일리' : '총용량');
    });
    const typeList = Array.from(types);
    if (!window.activePlanType || !typeList.includes(window.activePlanType)) {
      window.activePlanType = typeList[0];
    }
    const isDaily = (window.activePlanType === '데일리');
    const typeFilteredPlans = durPlans.filter(pl => (pl.service_type === '데일리' || pl.service_type === '무제한') === isDaily);

    // 3. Capacities — 용량 오름차순, 무제한은 맨 뒤 (모바일 리스트와 동일 규칙)
    const caps = new Set();
    typeFilteredPlans.forEach(pl => {
      caps.add(pl.data_limit.replace('매일 ', '').replace('총 ', '').trim());
    });
    const capList = Array.from(caps).sort((a, b) => {
      const parseSize = s => s === '무제한' ? Infinity : parseFloat(s.replace(/[^\d.]/g, '')) * (s.includes('MB') ? 1 : 1024);
      return parseSize(a) - parseSize(b);
    });
    if (!activeDataLimit || !capList.includes(activeDataLimit.replace('매일 ', '').replace('총 ', '').trim())) {
      activeDataLimit = (isDaily ? '매일 ' : (typeFilteredPlans[0].data_limit.includes('총') ? '총 ' : '')) + capList[0];
    }
    const cleanActiveData = activeDataLimit.replace('매일 ', '').replace('총 ', '').trim();

    activePlan = typeFilteredPlans.find(pl => pl.data_limit.replace('매일 ', '').replace('총 ', '').trim() === cleanActiveData) || typeFilteredPlans[0];

    // 일수 UI: 12개 이하 = 칩 그리드(+캘린더 접힘) / 초과 = 캘린더 기본(모바일 방식) + 칩 접힘
    const manyDur = availableDurations.length > 12;
    const durChipsHTML = availableDurations.map((dur, di2) => {
      const on = parseInt(dur, 10) === parseInt(activeDuration, 10);
      let span2;
      if (manyDur) span2 = 2;
      else {
        const n2 = availableDurations.length, perRow2 = 4;
        const lastStart2 = n2 - (n2 % perRow2 || perRow2);
        span2 = di2 >= lastStart2 ? 12 / (n2 - lastStart2) : 3;
      }
      return `<button type="button" class="jd-chip jd-dur-chip" data-val="${dur}" style="grid-column:span ${span2};min-height:${manyDur ? 42 : 52}px;border-radius:999px;border:1.5px solid ${on ? 'var(--accent)' : 'var(--border-color)'};background:${on ? 'var(--accent)' : 'var(--bg-tertiary)'};color:${on ? '#fff' : 'var(--text-main)'};font:inherit;font-size:${manyDur ? '0.85rem' : '1.0625rem'};font-weight:800;cursor:pointer;text-align:center;">${dur}일</button>`;
    }).join('');
    const durGridHTML = `<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:7px;margin-top:8px;">${durChipsHTML}</div>`;
    const durSectionHTML = manyDur
      ? `<div style="margin-top:8px;"><div id="pcTripCal"></div><div id="pcTripMsg" style="display:none;margin-top:7px;font-size:0.8rem;font-weight:700;line-height:1.55;"></div></div>
         <details style="margin-top:9px;"><summary style="list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:800;color:#B04A06;">🔢 일수 직접 고르기 <b style="color:var(--accent);">현재 ${activeDuration}일</b></summary>${durGridHTML}</details>`
      : `${durGridHTML}
         <details id="pcTripPick" style="margin-top:9px;"><summary style="list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:800;color:#B04A06;">📅 여행 날짜로 고르기 <span style="font-size:0.72rem;font-weight:700;color:var(--text-muted);">— 출발·귀국일만 넣으면 딱 맞는 일수를 골라드려요</span></summary><div id="pcTripCal" style="margin-top:8px;"></div><div id="pcTripMsg" style="display:none;margin-top:7px;font-size:0.8rem;font-weight:700;line-height:1.55;"></div></details>`;
    
    // 최종 금액 계산
    const basePrice = activePlan.final_price;
    const finalPriceVal = Math.round(basePrice + (activeQuantity - 1) * basePrice * 0.9);

    // 무제한 정직 라벨 (speed-truth.js 실측): 진짜 무제한만 ∞, 저속전환형은 전환 속도 명시
    const unlRepPlan = typeFilteredPlans.find(pl => pl.data_limit.replace('매일 ', '').replace('총 ', '').trim() === '무제한');
    const unlOptLabel = (unlRepPlan && window.JD_UNL) ? window.JD_UNL.label(unlRepPlan.product_code) : '무제한';
    const summaryDataLabel = (activeDataLimit.includes('무제한') && window.JD_UNL)
      ? window.JD_UNL.label(activePlan.product_code)
      : activeDataLimit;
    
        // 모달 본문 HTML 조합 (요청에 따라 제품코드 제거 완료)
    modalContent.innerHTML = `
      <!-- Left Config Section (4-Step Granular Dropdowns) -->
      <div>
        <div class="modal-header">
          <div class="modal-category">${p.category}</div>
          <h2 class="modal-title">
            ${p.country} eSIM 
            <span class="card-carrier" style="font-size:0.95rem; padding: 4px 12px; margin-top:2px;">${window.cleanCarrierName(p.carrier)}</span>
          </h2>
        </div>
        
        <!-- Buy Flow v5 (2026-07-20): 모바일 위저드에서 고른 상품의 확정 화면 — 선택 요약 + ✎ 수정 칩 -->
        <div class="config-group">
          <div class="config-section-title">선택한 상품</div>
          <div style="margin-top:8px;">
            <button type="button" class="pcw-chip" data-step="1" style="font:inherit;font-size:0.78rem;font-weight:800;color:var(--accent);background:rgba(242,117,31,0.08);border:1px solid rgba(242,117,31,0.3);border-radius:999px;padding:6px 12px;cursor:pointer;margin:0 6px 6px 0;">📅 ${activeDuration}일 ✎</button>
            <button type="button" class="pcw-chip" data-step="2" style="font:inherit;font-size:0.78rem;font-weight:800;color:var(--accent);background:rgba(242,117,31,0.08);border:1px solid rgba(242,117,31,0.3);border-radius:999px;padding:6px 12px;cursor:pointer;margin:0 6px 6px 0;">${(STYLE_META_PC[window.__pcwStyle] || {}).ic || '🗂'} ${window.__pcwStyle || '전체'} ✎</button>
            <button type="button" class="pcw-chip" data-step="3" style="font:inherit;font-size:0.78rem;font-weight:800;color:var(--accent);background:rgba(242,117,31,0.08);border:1px solid rgba(242,117,31,0.3);border-radius:999px;padding:6px 12px;cursor:pointer;margin:0 6px 6px 0;">📶 다른 상품 보기 ✎</button>
          </div>
          <div style="margin-top:10px;padding:13px 15px;border:1.5px solid var(--accent);border-radius:12px;background:rgba(242,117,31,0.04);">
            <div style="font-weight:900;font-size:1rem;">${window.cleanCarrierName(p.carrier)} · ${summaryDataLabel}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);font-weight:700;margin-top:4px;">${p.network_type === '로컬망' ? '🏠 로컬망' : '🌐 로밍망'} · ${p.network_speed || ''} · ${activePlan.service_type === '총용량' ? '기간 전체 자유 사용' : '매일 리셋'} · ${activeDuration}일</div>
          </div>
        </div>

        <!-- 상품 안내 (2026-07-20): 모바일 상세와 동일 정보 위계 — PC는 텍스트 여유 있게 -->
        <div class="config-group">
          <div class="config-section-title">상품 안내</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;">
            ${[['📶', '데이터', summaryDataLabel], ['📅', '사용 기간', activeDuration + '일'], [isDaily ? '↻' : '🎒', '사용 방식', isDaily ? '매일 새로 충전' : '기간 내 자유 분배'], [p.network_type === '로컬망' ? '🏠' : '🌐', '통신망', p.network_type === '로컬망' ? '현지 로컬망' : '로밍망'], ['⚡', '속도', p.network_speed || '5G/LTE'], ['🎫', '수령 방식', 'QR 즉시 발급']].map(t =>
              `<div style="background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:11px;padding:11px 10px;text-align:center;"><div style="font-size:1.05rem;">${t[0]}</div><div style="font-size:0.68rem;font-weight:700;color:var(--text-muted);margin-top:3px;">${t[1]}</div><div style="font-size:0.82rem;font-weight:800;margin-top:2px;">${t[2]}</div></div>`).join('')}
          </div>
          <p style="font-size:0.85rem;line-height:1.7;color:var(--text-main);font-weight:600;margin:12px 2px 0;">
            ${isDaily
              ? (cleanActiveData === '무제한'
                ? '용량 걱정 없이 마음껏 쓰는 상품이에요. 지도·유튜브·핫스팟까지 자유롭게 사용하세요.'
                : '오늘 데이터를 다 써도 내일이면 다시 꽉 차는 데일리 상품이에요. 여행 내내 같은 리듬으로 안심하고 쓸 수 있어요.')
              : '기간 안에서 아껴 쓰는 날, 몰아 쓰는 날을 자유롭게 조절하는 총용량 상품이에요. 사용량을 스스로 관리하는 분께 잘 맞아요.'}
            ${/\+/.test(cleanActiveData) ? ' 고속 용량 소진 후에도 저속으로 계속 연결돼 지도·메신저는 이용할 수 있어요.' : ''}
            사용일은 현지에서 통신망에 연결되는 순간부터 시작되니, 미리 사서 설치해 두어도 손해가 없어요.
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;font-size:0.72rem;font-weight:800;color:#10b981;">
            <span style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:999px;padding:5px 11px;">발급 전 100% 환불</span>
            <span style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:999px;padding:5px 11px;">미개통 100% 환불 보장</span>
            <span style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:999px;padding:5px 11px;">24시간 카톡 케어</span>
          </div>
          <details style="margin-top:12px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:11px;padding:11px 14px;">
            <summary style="list-style:none;cursor:pointer;font-size:0.82rem;font-weight:800;">📂 구매 전 꼭 확인 <span style="color:var(--text-muted);font-weight:700;font-size:0.72rem;">펼쳐 보기</span></summary>
            <div style="margin-top:8px;font-size:0.78rem;line-height:1.75;color:var(--text-muted);font-weight:600;">
              · 다이얼 *#06# 입력 시 <b style="color:var(--text-main);">EID가 표시되는 eSIM 지원 기종</b>에서만 사용할 수 있어요<br>
              · <b style="color:var(--text-main);">발급(QR 생성) 후에는 취소·환불이 불가</b>해요 — 발급 전에는 100% 환불<br>
              · 설치한 eSIM 프로필은 <b style="color:var(--text-main);">절대 삭제 금지</b> — 삭제하면 재발급이 안 돼요<br>
              · 사용 기간은 현지 도착 후 통신망 연결 시점부터 시작돼요 (유효기간 내 활성화 필요)
            </div>
          </details>
        </div>
      </div>
      </div>

      <!-- Right Sidebar (Pricing & Specs - 상품표 모든 스펙 연동) -->
      <div class="modal-sidebar">
        <!-- 24시간 안심 케어 보증 상단 표시 -->
        <div class="safety-care-mini" style="display:flex; align-items:center; gap:6px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); padding:8px 12px; border-radius:var(--radius-sm); margin-bottom:12px; font-size:0.75rem; color:#10b981; font-weight:700;">
          <span>🛡️ 24시간 긴급 안심 케어 서비스 무료 포함</span>
        </div>

        <div class="price-summary-box">
          <div class="summary-row">
            <span>선택한 데이터</span>
            <span style="color:var(--text-main); font-weight:700;">${summaryDataLabel} (${activePlan.service_type})</span>
          </div>
          <div class="summary-row">
            <span>이용 기간</span>
            <span style="color:var(--text-main); font-weight:700;">${activeDuration}일</span>
          </div>
          <div class="summary-row" style="align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);">
            <span>구매 수량</span>
            <div class="qty-selector" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 4px 8px;">
              <button class="qty-btn" id="qtyMinus" style="background: none; border: none; color: var(--text-main); font-weight: 700; width: 20px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem;">-</button>
              <span id="qtyVal" style="color: var(--accent); font-weight: 700; min-width: 16px; text-align: center;">${activeQuantity}</span>
              <button class="qty-btn" id="qtyPlus" style="background: none; border: none; color: var(--text-main); font-weight: 700; width: 20px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem;">+</button>
            </div>
          </div>
          ${activeQuantity > 1 ? `
            <div style="font-size: 0.72rem; color: #10b981; text-align: right; margin-top: 4px; font-weight: bold;">
              동반인 10% 할인이 적용되었습니다!
            </div>
          ` : ''}
          <div id="groupDiscountPromo" style="font-size: 0.72rem; color: #10b981; background: rgba(16, 185, 129, 0.08); border: 1px dashed rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 6px 10px; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px; font-weight: 700;">
            👥 2개 이상 구매 시 동반인 이심 10% 추가 할인!
          </div>
          <div class="summary-row total" style="margin-top:14px; border-top:1px solid rgba(255,255,255,0.12); padding-top:14px;">
            <span>최종 결제 금액</span>
            <span class="summary-total-price">${finalPriceVal.toLocaleString()}원</span>
          </div>
          ${activeDuration > 1 ? `<div style="text-align:right; font-size:0.74rem; color:var(--text-dim); margin-top:4px; font-weight:700;">☕ 하루 약 ${Math.round(finalPriceVal / activeQuantity / activeDuration).toLocaleString()}원 꼴</div>` : ''}
        </div>
        
        <div class="modal-cta-zone">
          <div style="display:flex;justify-content:center;gap:10px;font-size:0.7rem;font-weight:800;color:#b45309;background:linear-gradient(135deg,rgba(242,117,31,0.07),rgba(245,158,11,0.07));border:1px solid rgba(242,117,31,0.18);border-radius:12px;padding:8px 10px;margin-bottom:10px;white-space:nowrap;">
            <span>⚡ ${(window.JD_STATS && window.JD_STATS.issue && window.JD_STATS.issue.p50_min != null) ? '실측 평균 ' + Math.round(window.JD_STATS.issue.p50_min) + '분 QR 발송' : '평균 5~15분 QR 발송'}</span><span style="opacity:0.35;">|</span><span>🛡️ 미개통 100% 환불</span><span style="opacity:0.35;">|</span><a href="https://pf.kakao.com/_GSixcn/chat" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;text-underline-offset:2px;">💬 24h 카톡 상담</a>
          </div>
          <button class="cta-buy" id="buyNowBtn">
            <span class="cta-buy-main">⚡ 즉시 구매하기</span>
            <span class="cta-buy-sub">${finalPriceVal.toLocaleString()}원 · 카카오페이</span>
          </button>
          <button class="cta-cart" id="addToCartBtn">🛒 장바구니 담기</button>
          <a href="guide.html" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:9px;font-size:0.78rem;font-weight:700;color:#8a7a6d;text-decoration:none;">📖 설치가 처음이세요? <span style="color:#F2751F;text-decoration:underline;text-underline-offset:2px;">3분 설치 가이드 미리보기</span></a>
          ${SMARTSTORE_URL ? `
          <div class="cta-divider"><span>또는 네이버페이로 간편하게</span></div>
          <a href="${SMARTSTORE_URL}" target="_blank" rel="noopener" class="cta-smartstore">
            <span class="cta-ss-main">네이버 스마트스토어에서 구매</span>
            <span class="cta-ss-sub">네이버페이 · 네이버 포인트 적립</span>
          </a>` : ''}
        </div>
        
        <div class="device-compat-banner" id="detailDeviceCheckLink">
          <div class="device-compat-banner-left">
            <span class="device-compat-banner-icon">📱</span>
            <div>
              <div class="device-compat-banner-title">내 폰이 eSIM을 지원하나요?</div>
              <div class="device-compat-banner-desc">3초 만에 호환 기종 조회하기</div>
            </div>
          </div>
          <span class="device-compat-banner-arrow">➡️</span>
        </div>

      </div>

    `;

    // 4단계 캐스케이딩 드롭다운 리스너
    const cSelect = document.getElementById('carrierSelect');
    if (cSelect) {
      cSelect.addEventListener('change', (e) => {
        const targetProd = carrierOptions[Number(e.target.value)] || carrierOptions.find(co => co.carrier === e.target.value);
        if (targetProd) {
          activeCarrier = targetProd;
          ensurePlans(activeCarrier);   // 병합 누락분 plans 복구
          // Reset child states
          window.activePlanType = null;
          activeDataLimit = null;
          activeDuration = null;
          renderModalContent(carrierOptions);
        }
      });
    }

    // 위저드 ✎ 칩: 해당 스텝으로 복귀 (2026-07-20)
    modalContent.querySelectorAll('.pcw-chip').forEach(b => b.addEventListener('click', () => pcwSet(parseInt(b.dataset.step, 10))));

    // Buy Flow v3: 칩 클릭 리스너 (기존 select change와 동일한 상태 전이 — 캐스케이드 로직 보존)
    modalContent.querySelectorAll('.jd-type-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        window.activePlanType = ch.dataset.val;
        activeDataLimit = null;
        activeDuration = null;
        renderModalContent(carrierOptions);
      });
    });
    modalContent.querySelectorAll('.jd-cap-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        const v = ch.dataset.val;
        const isDaily = (window.activePlanType === '데일리');
        const rep = typeFilteredPlans.find(tp => tp.data_limit.replace('매일 ', '').replace('총 ', '').trim() === v);
        activeDataLimit = (isDaily && rep && rep.data_limit.includes('매일') ? '매일 ' : (rep && rep.data_limit.includes('총') ? '총 ' : '')) + v;
        activeDuration = null;
        renderModalContent(carrierOptions);
      });
    });
    // 📅 날짜로 고르기 (2026-07-19): 출발·귀국 → 일수 계산 → 해당 칩 자동 클릭
    (function bindPcTrip() {
      const calBox = modalContent.querySelector('#pcTripCal'), msg = modalContent.querySelector('#pcTripMsg');
      if (!calBox || calBox._bound || !window.JDTripCal) return;
      calBox._bound = true;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('jd_trip_dates') || 'null'); } catch (e) {}
      const todayIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 10);
      if (saved && saved.dep < todayIso) saved = null;
      window.JDTripCal.mount(calBox, { dep: saved && saved.dep, ret: saved && saved.ret, onRange: (depIso, retIso) => {
        const trip = Math.round((new Date(retIso) - new Date(depIso)) / 86400e3) + 1;
        const avail = [...modalContent.querySelectorAll('.jd-dur-chip')].map(b => parseInt(b.dataset.val, 10)).filter(Boolean).sort((x, y) => x - y);
        if (!avail.length) return;
        const pick = avail.find(d => d >= trip) || avail[avail.length - 1];
        try { localStorage.setItem('jd_trip_dates', JSON.stringify({ dep: depIso, ret: retIso, msgPick: pick, msgTrip: trip })); } catch (e) {}
        const btn = modalContent.querySelector(`.jd-dur-chip[data-val="${pick}"]`);
        if (btn) btn.click(); // 클릭 → 재렌더 (아래 복원 로직이 메시지·캘린더 재표시)
      } });
      // 재렌더 복원: 저장된 판정 메시지 + 캘린더 펼침 유지
      try {
        const t = saved;
        if (t && t.msgPick && t.msgTrip) {
          const det = modalContent.querySelector('#pcTripPick');
          msg.style.display = 'block';
          if (t.msgPick >= t.msgTrip) { msg.style.color = '#15803d'; msg.innerHTML = '✅ ' + t.msgTrip + '일 여행 — <b>' + t.msgPick + '일권' + (t.msgPick === t.msgTrip ? '이 딱 맞아요' : '으로 여유 있게 커버돼요') + '</b>'; }
          else { msg.style.color = '#b45309'; msg.innerHTML = '⚠️ ' + t.msgTrip + '일 여행인데 최대 <b>' + t.msgPick + '일권</b>까지 있어요 — 추가 구매 조합을 추천해요'; }
          if (det) det.open = true;
        }
      } catch (e) {}
    })();
    modalContent.querySelectorAll('.jd-dur-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        activeDuration = parseInt(ch.dataset.val);
        renderModalContent(carrierOptions);
      });
    });

    // 드롭다운 → 모던 선택 UI 변환
    enhanceOptionSelects(modalContent);

    // 바텀 탭 스위처 리스너
    const bottomTabHeaders = modalContent.querySelectorAll('.bottom-tab-header');
    bottomTabHeaders.forEach(th => {
      th.addEventListener('click', () => {
        bottomTabHeaders.forEach(h => h.classList.remove('active'));
        modalContent.querySelectorAll('.bottom-tab-content').forEach(c => c.classList.remove('active'));
        
        th.classList.add('active');
        const tabId = th.getAttribute('data-tab');
        document.getElementById('tab-' + tabId).classList.add('active');
      });
    });

    // 상세 모달 내 주의사항 탭 내용 동적 주입
    const tabPrecautionsInfo = document.getElementById('tab-precautions-info');
    if (tabPrecautionsInfo) {
      const customPrecs = getCustomPrecautions(activeCarrier.country, activeCarrier.carrier, activeCarrier.activation, activeCarrier.validity);
      let precHTML = `<div style="font-size:0.8rem; line-height:1.6; display:flex; flex-direction:column; gap:10px;">`;
      customPrecs.forEach(p => {
        let bgStyle = 'background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-color);';
        if (p.includes('⚠️') || p.includes('🚨') || p.includes('실명 인증') || p.includes('예약')) {
          bgStyle = 'background: rgba(217, 119, 6, 0.02); border: 1px solid rgba(217, 119, 6, 0.1);';
        }
        precHTML += `
          <div style="padding: 10px 12px; ${bgStyle} border-radius: var(--radius-sm); color: var(--text-muted);">
            ${p}
          </div>
        `;
      });
      precHTML += `</div>`;
      tabPrecautionsInfo.innerHTML = precHTML;
    }

    // 모달 우측 '장바구니 담기' 및 '즉시 구매하기' 버튼 리스너 연동
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    
    addToCartBtn.addEventListener('click', () => {
      const existingIndex = cart.findIndex(item => 
        item.product.country === activeCarrier.country && 
        item.product.carrier === activeCarrier.carrier &&
        item.plan.service_type === activePlan.service_type &&
        item.plan.data_limit === activePlan.data_limit &&
        item.plan.duration === activePlan.duration
      );
      
      if (existingIndex > -1) {
        cart[existingIndex].quantity = Math.min(10, cart[existingIndex].quantity + activeQuantity);
      } else {
        cart.push({
          id: Date.now() + Math.random().toString(36).substr(2, 5),
          product: activeCarrier,
          plan: activePlan,
          quantity: activeQuantity,
          addon: false
        });
      }
      
      saveCart();
      closeModal();
      openCartDrawer();
    });

    buyNowBtn.addEventListener('click', () => {
      const instantItem = {
        id: 'instant-' + Date.now(),
        product: activeCarrier,
        plan: activePlan,
        quantity: activeQuantity,
        addon: false
      };
      openCheckoutFlow([instantItem]); // Buy Flow v3: 직행
    });

    const detailDeviceCheckLink = document.getElementById('detailDeviceCheckLink');
    if (detailDeviceCheckLink) {
      detailDeviceCheckLink.addEventListener('click', (e) => {
        e.preventDefault();
        openDeviceModal();
      });
    }

    // 수량 조절 버튼 리스너 연동
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    
    qtyMinus.addEventListener('click', () => {
      if (activeQuantity > 1) {
        activeQuantity -= 1;
        renderModalContent(carrierOptions);
      }
    });
    
    qtyPlus.addEventListener('click', () => {
      if (activeQuantity < 10) {
        activeQuantity += 1;
        renderModalContent(carrierOptions);
      }
    });
  }

  // 12.45 국가/통신사별 맞춤형 실시간 주의사항 및 스펙 정보 반환 함수
  // 리드타임 정책 (2026-07-14 확정): 개통희망일 지정 상품 = 최소 2일 전 주문,
  // 미주·유럽은 시차로 현지 날짜가 어긋날 수 있어 최소 3일 전 주문 (모바일과 동일 정책)
  const LONG_LEAD_REGIONS = ['미국','캐나다','멕시코','북미','하와이','남미','브라질','아르헨티나','페루','칠레','유럽','영국','프랑스','독일','이탈리아','스페인','포르투갈','스위스','네덜란드','벨기에','오스트리아','체코','헝가리','폴란드','크로아티아','그리스','북유럽','동유럽','아이슬란드','튀르키예','터키','보다폰ES'];
  function isLongLeadCountry(name) {
    const c = String(name || '');
    return LONG_LEAD_REGIONS.some(k => c.includes(k));
  }
  function leadDaysFor(countryName) {
    return isLongLeadCountry(countryName) ? 3 : 2;
  }
  // 오늘 주문 기준 가장 빠른 개통 가능일 계산 (동적 캘린더 안내)
  function earliestActivationInfo(countryName) {
    const days = leadDaysFor(countryName);
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yo = ['일','월','화','수','목','금','토'][d.getDay()];
    const pad = n => String(n).padStart(2, '0');
    return {
      days,
      label: `${d.getMonth() + 1}/${d.getDate()}(${yo})`,
      iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    };
  }
  // 카드용 칩: 국가 그룹(g.carriers)의 activation을 종합해 구매 타이밍 칩 반환 (모바일과 동일 정책)
  function activationChip(acts, countryName) {
    const arr = Array.isArray(acts) ? acts : [acts];
    const has = s => arr.some(a => String(a || '').includes(s));
    const all = s => arr.length > 0 && arr.every(a => String(a || '').includes(s));
    if (all('즉시 개통')) return '🚨 설치 즉시 시작';
    if (all('희망일')) return isLongLeadCountry(countryName) ? '⏰ 최소 3일 전 주문' : '⏰ 최소 2일 전 주문';
    if (has('즉시 개통') || has('희망일')) return '⏰ 구매 타이밍 확인';
    if (has('개통문자')) return '💬 도착 후 문자 개통';
    return '';
  }
  // 카드 세 번째 스펙 칩: 치명 타이밍 = 빨간 경고 / 개통문자 = 파란 안내 / 없으면 '⚡ 즉시 개통'
  function actChipHtml(g) {
    const txt = activationChip((g.carriers || []).map(c => (c && c.activation) || ''), g.country);
    if (!txt) return '<div class="card-spec-item">⚡ 즉시 개통</div>';
    if (txt.includes('문자')) return `<div class="card-spec-item" style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);color:#1d4ed8;font-weight:800;">${txt}</div>`;
    return `<div class="card-spec-item" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.28);color:#dc2626;font-weight:800;">${txt}</div>`;
  }
  function leadTimeBadge(lead) {
    return `<div style="display:inline-block;background:linear-gradient(135deg,#EF4444,#F97316);color:#fff;font-size:0.82rem;font-weight:900;padding:6px 14px;border-radius:999px;margin-bottom:4px;box-shadow:0 4px 12px rgba(239,68,68,0.3);">⏰ 출국 ${lead} 전 주문 필수</div>`;
  }
  function getCustomPrecautions(country, carrier, activation, validity) {
    const list = [];
    const normalizedCountry = country.toLowerCase();
    const normalizedCarrier = carrier.toLowerCase();
    const actStr = String(activation || '');
    const isWishDate = actStr.includes('희망일');

    // 0. 주문 타이밍 배지 — 개통희망일 지정 상품에만 (activation 필드 기반, 국가 뭉뚱그림 금지)
    //    오늘 기준 "가장 빠른 개통 가능일"을 실제 날짜로 계산해 보여줌
    if (isWishDate) {
      const ea = earliestActivationInfo(country);
      list.push(leadTimeBadge(`최소 ${ea.days}일`) + `<strong>개통 희망일 지정 상품</strong> — 오늘 주문하면 <strong>${ea.label}부터</strong> 개통일로 지정할 수 있어요.${ea.days === 3 ? ' 미주·유럽은 시차로 하루 더 여유가 필요합니다.' : ''} 개통일 등록은 구매 후 케어 안내로 도와드립니다.`);
    } else if (normalizedCountry.includes('괌') || normalizedCountry.includes('사이판')) {
      list.push("<strong>현지 도착 후 개통 문자로 시작:</strong> 도착해서 개통 문자가 발송되는 시점부터 사용일이 카운트돼요 — 미리 구매해 두셔도 기간이 줄지 않습니다.");
    }

    // 0.5 유효기간 경고 — "구매일/발급일로부터 N일" 상품
    //     (2026-07-18 사장님 확정: 희망일 지정 상품은 유효기간 표기 제거 — 지정일 개통이라 무의미. 7/14 이중표시 지시를 대체.
    //      단 개통일 지정 캘린더의 유효기간 상한 로직은 유지)
    const vm = String(validity || '').match(/(구매일|발급일)로부터\s*(\d+)일/);
    if (vm && !isWishDate) {
      const vDays = parseInt(vm[2], 10);
      if (vDays <= 15) {
        list.push(`<strong>⏳ ${vm[1]}로부터 ${vDays}일 안에 현지 개통 필수:</strong> 기간이 지나면 사용할 수 없어요 — 출국 ${vDays}일 전 이내에 구매하세요.${isWishDate ? ` 개통 희망일도 ${vm[1]}로부터 ${vDays}일 안쪽으로 지정해야 합니다.` : ''}`);
      } else {
        list.push(`<strong>⏳ 유효기간:</strong> ${vm[1]}로부터 ${vDays}일 내 현지 개통 — 여행 ${vDays}일 전 이내 구매를 권장해요.`);
      }
    }

    // 5. 국가별/통신사별 상세 맞춤 특이사항 (크롤링 및 매칭)
    if (normalizedCountry.includes('일본')) {
      if (normalizedCarrier.includes('소프트뱅크')) {
        list.push("<strong>소프트뱅크 사용량 집계 지연:</strong> 사용량 조회는 가능하지만 현지 통신사 집계 특성상 최대 1~2일 지연 반영될 수 있습니다.");
      } else if (normalizedCarrier.includes('도코모')) {
        list.push("<strong>도코모 APN 수동 설정:</strong> 자동 연결 실패 시 셀룰러 네트워크 설정에서 APN(spmode.ne.jp)을 수동 등록해야 개통됩니다.");
      }
    }
    
    if (normalizedCountry.includes('베트남')) {
      list.push("<strong>베트남 시간 기준 일일 리셋:</strong> 매일 23:00(베트남 시간 기준)에 일일 사용 용량이 자동 리셋/초기화됩니다.");
      list.push("<strong>비엣텔망 수동 고정:</strong> 신호 연결 시 속도가 느린 Vietnamobile로 자동 지정되는 경우, 셀룰러 설정에서 수동으로 'Viettel'망을 강제 고정해 주세요.");
      list.push("<strong>ChatGPT 접속 제한 안내:</strong> 본 상품은 홍콩 IP를 경유하므로 보안상 ChatGPT 등의 특수 해외 서비스 접속이 원활하지 않을 수 있습니다.");
    }

    if (normalizedCountry.includes('대만')) {
      list.push("<strong>실명 인증(KYC) 등록 필수:</strong> 대만 통신법에 따라 eSIM 스캔 직후 현지에서 수신되는 문자 링크로 여권 실명 등록(KYC)을 완료해 주셔야 데이터 차단이 해제됩니다.");
    }

    if (normalizedCountry.includes('미국') || normalizedCountry.includes('캐나다') || normalizedCountry.includes('괌') || normalizedCountry.includes('사이판')) {
      list.push("<strong>단말기 컨트리락 해제 확인:</strong> 컨트리락이 해제된 공기계에서만 해외 eSIM 사용이 가능하므로 출국 전 통신사에 락 해제 여부를 확인하세요.");
    }

    if (normalizedCountry.includes('몰디브')) {
      list.push("<strong>eSIM 프로필 삭제 절대 금지:</strong> 몰디브 디라구(Dhiraagu) 이심은 삭제할 경우 재등록이 기술적으로 차단되오니 절대 임의 삭제하지 마세요.");
      list.push("<strong>통화/문자 한도:</strong> 20GB 요금제(통화 150분/문자 150건), 30GB 요금제(통화 300분/문자 300건) 무료 제공");
      list.push("<strong>번호/사용량 조회:</strong> 다이얼러에서 *2# 입력 후 통화 시 번호가 확인되며, 727 번호로 'myusage'라고 문자를 보내 잔량을 체크할 수 있습니다.");
    }

    if (normalizedCountry.includes('몽골')) {
      list.push("<strong>통화 및 수신 전용 SMS:</strong> 요금제별 현지 무료 통화(10분~150분) 발신이 제공되며, SMS는 수신만 가능합니다 (발신 불가).");
      list.push("<strong>잔여 데이터 조회:</strong> 다이얼러에서 *1411# 입력 후 통화 버튼을 누르시면 문자로 실시간 사용량이 회신됩니다.");
    }

    if (normalizedCountry.includes('유럽')) {
      list.push("<strong>국경 통과 이동 시 재부팅:</strong> 유럽 다국가 횡단 중 국가 경계에서 신호가 끊길 경우 기기를 재부팅하시면 로컬 로밍 파트너망으로 자동 갱신됩니다.");
    }

    if (normalizedCountry.includes('한국') || normalizedCountry.includes('대한민국')) {
      list.push("<strong>QR 스캔 즉시 일수 카운트:</strong> 국내에서 등록/QR 스캔을 완료하는 즉시 사용 기한이 차감되므로 출국 시나 사용 개시일에 등록해 주세요.");
    }

    if (normalizedCountry.includes('인도')) {
      list.push("<strong>주(State) 이동 시 재부팅:</strong> 주 경계를 넘으며 망이 불안정해질 경우 기기 재부팅 또는 비행기 모드 활성화를 해주시기 바랍니다.");
    }

    if (normalizedCountry.includes('글로벌') || normalizedCountry.includes('복수국가') || normalizedCountry.includes('남미') || normalizedCountry.includes('중동') || normalizedCountry.includes('아프리카')) {
      list.push("<strong>다국가 환승 시 대처법:</strong> 국가 경유 시 5~10초간 비행기 모드를 켰다 켜거나 단말기를 종료 후 재부팅하여 파트너 로밍망을 다시 잡도록 하세요.");
    }

    // 6. 유럽 특수 통신사 매칭 (보다폰스페인, 오렌지스페인, 오렌지프랑스, 쓰리)
    if (normalizedCarrier.includes('보다폰스페인') || normalizedCarrier.includes('vodafone')) {
      list.push("<strong>QR 발송 즉시 사용일 시작 (Vodafone):</strong> 보다폰스페인 이심은 이메일로 QR이 <strong>발송되는 순간 개통 시작</strong>되므로, 꼭 일정을 확인 후 구매해 주세요.");
      list.push("<strong>eSIM 프로필 삭제 금지:</strong> 삭제 시 재등록이 불가하오니 설정 등록 후 절대 지우지 마세요.");
    }
    
    if (normalizedCarrier.includes('오렌지스페인') || normalizedCarrier.includes('orange스페인')) {
      list.push("<strong>개통 예약형 상품 (Orange):</strong> 개통 예약은 구매 후 케어 안내에 따라 진행됩니다.");
    }

    if (normalizedCarrier.includes('오렌지프랑스') || normalizedCarrier.includes('orange프랑스')) {
      list.push("<strong>한국 무료 발신 혜택:</strong> 요금제에 따라 한국 발신 통화(30분~120분) 및 국제문자(200건~1000건)가 무료 탑재되어 있습니다.");
      list.push("<strong>번호 및 잔량 조회:</strong> 현지에서 다이얼 <code>225</code>를 누르고 통화 버튼 클릭 시 번호와 잔량이 즉시 문자로 전송됩니다.");
      list.push("<strong>500GB 장기 요금제 실명인증:</strong> 90일 상품은 30일 이내에 수신되는 링크를 통해 여권 인증을 거쳐야 회선이 유지됩니다.");
    }

    if (normalizedCarrier.includes('쓰리') || normalizedCarrier.includes('three')) {
      list.push("<strong>QR 스캔 즉시 개통 시작 (Three):</strong> 단말기에 QR코드를 스캔하여 등록하는 순간 개통되므로 출국 직전 또는 현지 공항에서 설치를 권장합니다.");
      list.push("<strong>eSIM 프로필 삭제 금지:</strong> 임의 삭제 시 절대 복구되지 않으므로 주의하십시오.");
      list.push("<strong>영국 외 번호 발신 금지:</strong> 영국 내에서는 영국 번호로만 발신할 수 있으며 타 국가로의 발신은 제한될 수 있습니다.");
    }

    return list;
  }

  // 12.5 주의사항 팝업 모달 제어 함수
  // ── 💰 PC 결제 쿠폰 (2026-07-17) — 회원 쿠폰 조회·적용. 원가권(type:'cost')은 단일 상품 결제에서만 동적 계산 ──
  var PC_COST_FX = { CNY: 231, HKD: 200, KRW: 1 }; // 정본: tools/pricing_constants.mjs (값 변경 시 동반 갱신)
  var JD_COST_MARKUP = 1.06;
  function pcCouponValue(c, base) {
    if (!c) return 0;
    if (c.type !== 'cost') return Math.min(Number(c.amount) || 0, base);
    if (!checkoutItems || checkoutItems.length !== 1) return 0;      // 원가권은 단일 상품만
    var it = checkoutItems[0];
    var fx = PC_COST_FX[it.plan.unit];
    if (!fx) return 0;                                                // 환율 미확정 통화 차단
    var qty = it.quantity || 1;
    var esimTotal = Math.round(it.plan.final_price + (qty - 1) * it.plan.final_price * 0.9);
    var cost = it.plan.original_price * fx * JD_COST_MARKUP * qty;
    var friendPay = Math.ceil((cost + 30) / 0.967 / 10) * 10;
    return Math.max(0, Math.min(esimTotal - friendPay, base));
  }
  function applyPcCoupon(idx) {
    var usable = window._pcUsableCoupons || [];
    window._pcCoupon = idx >= 0 ? usable[idx] : null;
    var base = window._pcBasePrice || 0;
    var disc = pcCouponValue(window._pcCoupon, base);
    var finalP = Math.max(0, base - disc);
    paySubmitBtn.setAttribute('data-price', finalP);
    paySubmitBtn.textContent = finalP.toLocaleString() + '원 결제 완료하기' + (disc ? ' (쿠폰 -' + disc.toLocaleString() + ')' : '');
  }
  function loadPcCoupons(orderTotal) {
    var box = document.getElementById('pcCouponBox');
    if (!box) {
      var ess = document.getElementById('ckEssentials');
      if (!ess) return;
      box = document.createElement('div');
      box.id = 'pcCouponBox';
      ess.parentNode.insertBefore(box, ess);
    }
    box.innerHTML = '';
    var token = '';
    try { token = localStorage.getItem('jd_member_token') || ''; } catch (e) {}
    if (!token) {
      box.innerHTML = '<a href="login.html?return=' + encodeURIComponent('index.html') + '" target="_blank" rel="noopener" style="display:block;margin:10px 0 2px;padding:11px 13px;border-radius:11px;border:1.5px dashed rgba(242,117,31,0.45);background:rgba(249,115,22,0.05);font-size:0.82rem;font-weight:800;color:var(--accent);text-decoration:none;text-align:left;">💰 쿠폰이 있으신가요? 로그인하면 자동으로 적용돼요</a>';
      return;
    }
    fetch('https://jdisim-proxy.vercel.app/api/member', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ action: 'me' }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return;
        var today = new Date().toISOString().slice(0, 10);
        var usable = (j.coupons || []).filter(function (c) { return !c.used && (!c.expires || c.expires >= today) && (!c.min_order || orderTotal >= c.min_order); });
        if (!usable.length) return;
        window._pcUsableCoupons = usable;
        var html = '<div style="margin:10px 0 2px;padding:12px 14px;border-radius:12px;border:1.5px dashed rgba(242,117,31,0.45);background:rgba(249,115,22,0.05);text-align:left;">'
          + '<div style="font-size:0.8rem;font-weight:800;color:var(--accent);margin-bottom:6px;">💰 쿠폰 적용</div>'
          + usable.slice(0, 3).map(function (c, i) {
              var v = pcCouponValue(c, orderTotal);
              var lab = c.type === 'cost' ? (v > 0 ? '-' + v.toLocaleString() + '원 (원가 적용)' : (checkoutItems.length !== 1 ? '단일 상품 결제에서만' : '이 상품 적용불가')) : '-' + Number(c.amount).toLocaleString() + '원';
              return '<label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;font-size:0.84rem;font-weight:700;color:var(--text-main);"><input type="radio" name="pcCoupon" value="' + i + '" style="width:17px;height:17px;accent-color:#F2751F;"><span style="flex:1;">' + String(c.name).replace(/</g, '&lt;') + ' <b style="color:var(--accent);">' + lab + '</b></span></label>';
            }).join('')
          + '<label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;font-size:0.84rem;font-weight:700;color:var(--text-muted);"><input type="radio" name="pcCoupon" value="-1" checked style="width:17px;height:17px;accent-color:#F2751F;"><span>적용 안 함</span></label></div>';
        box.innerHTML = html;
        box.querySelectorAll('input[name="pcCoupon"]').forEach(function (r) {
          r.addEventListener('change', function () { applyPcCoupon(parseInt(this.value, 10)); });
        });
      }).catch(function () {});
  }

  function showPrecautionModalForItems(items) {
    checkoutItems = items;
    
    const countries = [...new Set(items.map(item => item.product.country))];
    const carriers = [...new Set(items.map(item => item.product.carrier))];
    
    let html = '';

    // [0] 선택 상품 스펙 요약 (구매 직전 최종 확인)
    const totalQty = items.reduce((s, it) => s + (it.quantity || 1), 0);
    // 결제창 data-price(L1775)와 동일 공식: 1개 정가 + 2개째부터 10% 동반인 할인 (+애드온). 최종확인 총액이 실제 결제액과 일치하도록.
    const totalPrice = items.reduce((s, it) => {
      const bp = it.plan.final_price;
      let ip = Math.round(bp + ((it.quantity || 1) - 1) * bp * 0.9);
      if (it.addon) ip += 1900;
      return s + ip;
    }, 0);
    // 간결화(2026-07-16): 고객이 실제로 읽는 건 "뭘 얼마에 사는가"뿐 — 핵심만 크게, 세부는 전부 접힌 아코디언으로
    const specRows = items.map(it => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--border-color); gap: 12px;">
        <span style="font-weight: 800; color: var(--text-main); font-size: 1rem;">${it.product.country} <span style="font-weight:600;color:var(--text-muted);font-size:0.85rem;">${window.cleanCarrierName ? window.cleanCarrierName(it.product.carrier) : it.product.carrier}</span></span>
        <span style="color: var(--text-main); font-weight: 800; font-size: 0.98rem; white-space: nowrap;">${it.plan.data_limit} · ${it.plan.duration}일${(it.quantity || 1) > 1 ? ' × ' + it.quantity : ''}</span>
      </div>`).join('');
    html += `
      <div style="background: var(--accent-light); border: 1px solid rgba(242,117,31,0.25); border-radius: 14px; padding: 18px 20px; margin-bottom: 8px;">
        ${specRows}
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px;">
          <span style="font-weight: 800; font-size: 0.9rem; color: var(--text-muted);">총 ${totalQty}개 결제 금액</span>
          <span style="color: var(--accent); font-weight: 900; font-size: 1.45rem;">${totalPrice.toLocaleString()}원</span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
        <div style="display:flex;align-items:center;gap:10px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:12px;padding:12px 14px;font-size:0.92rem;font-weight:800;color:var(--text-main);">⚡ 결제하면 QR이 카톡·문자로 자동 발송돼요</div>
        <div style="display:flex;align-items:center;gap:10px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:12px;padding:12px 14px;font-size:0.92rem;font-weight:800;color:var(--text-main);">🛡️ 발급 전엔 100% 환불 · 발급 후엔 환불 불가</div>
      </div>
    `;

    // [0.5] 상품 스펙 아코디언 (선택창에서 이동해 온 상세 스펙)
    const specItems = items.map(it => {
      const pr = it.product;
      const rows = [
        ['📶 망 접속/속도', `${pr.network_type} (${pr.network_speed})`],
        ['🔄 데이터 리셋', pr.reset_data || '-'],
        ['📞 전화/문자', `전화 ${pr.calls} · 문자 ${pr.sms}`],
        ['⚡ 핫스팟', pr.hotspot === '가능' ? '지원 가능' : '지원 불가'],
        ['🛫 개통 기준', pr.activation || '-'],
        ['🐢 소진 후 속도', it.plan.low_speed || '소진 후 차단'],
        ['⚙️ APN', pr.apn || '자동 설정'],
        ['📅 유효 기간', pr.validity || '-']
      ].map(([l, v]) => `<div style="display:flex; justify-content:space-between; gap:12px; padding:6px 0; border-bottom:1px dashed var(--border-color); font-size:0.8rem;"><span style="color:var(--text-dim); flex-shrink:0;">${l}</span><span style="color:var(--text-main); font-weight:600; text-align:right;">${v}</span></div>`).join('');
      return `<div style="margin-bottom:10px;"><div style="font-weight:800; font-size:0.85rem; color:var(--text-main); margin-bottom:4px;">${pr.country} · ${pr.carrier}</div>${rows}</div>`;
    }).join('');
    html += `
      <div class="prec-accordion-item">
        <div class="prec-accordion-header">
          <span>📶 상품 스펙 한눈에 보기</span>
          <span class="arrow">▼</span>
        </div>
        <div class="prec-accordion-content">${specItems}</div>
      </div>
    `;

    // EID 아코디언 (간결화: 기본 접힘 — 제목만 보이고 탭하면 펼침)
    html += `
      <div class="prec-accordion-item">
        <div class="prec-accordion-header">
          <span>📱 내 핸드폰 eSIM 지원 여부 확인 (3초 확인)</span>
          <span class="arrow">▼</span>
        </div>
        <div class="prec-accordion-content">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div>• <strong>확인 방법:</strong> 키패드에 <code>*#06#</code>을 입력하여 <strong>32자리 EID 번호</strong>가 표시되는지 확인</div>
            <div>• <strong>지원 불가 모델:</strong> EID 항목이 없는 단말기 및 중국/홍콩/마카오 구매 아이폰</div>
          </div>
        </div>
      </div>
    `;

    // 교환/환불 아코디언 (간결화: 기본 접힘 — 핵심 한 줄은 위 스트립에 이미 노출)
    html += `
      <div class="prec-accordion-item">
        <div class="prec-accordion-header">
          <span>🔄 교환/환불 및 긴급 기술지원 규정</span>
          <span class="arrow">▼</span>
        </div>
        <div class="prec-accordion-content">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div>• <strong>단순 변심:</strong> 디지털 상품 특성상 QR코드 이메일 발송 즉시 취소/환불 불가</div>
            <div>• <strong>현지 장애 발생:</strong> <u>eSIM 프로필을 절대 지우지 마시고</u> 24시간 카카오 고객센터로 우선 기술지원 접수</div>
            <div>• <strong>환불 보장:</strong> 카카오 고객센터 접수 후 문제 미해결 시 100% 전액 즉시 환불 처리</div>
          </div>
        </div>
      </div>
    `;

    // 국가/통신사별 전용 안내 아코디언 (있을 경우만 노출)
    let combinedPrecs = [];
    items.forEach(item => {
      const precs = getCustomPrecautions(item.product.country, item.product.carrier, item.product.activation, item.product.validity);
      precs.forEach(p => {
        if (!combinedPrecs.includes(p)) {
          combinedPrecs.push(p);
        }
      });
    });

    if (combinedPrecs.length > 0) {
      let customPrecsHTML = '';
      combinedPrecs.forEach(p => {
        customPrecsHTML += `
          <li style="margin-bottom: 8px; font-size: 0.82rem; color: var(--text-main); line-height: 1.6; list-style-type: none; position: relative; padding-left: 14px;">
            <span style="position: absolute; left: 0; color: var(--accent-warning); font-weight: bold;">•</span> ${p}
          </li>
        `;
      });

      const label = countries.length > 1 ? "선택 상품들" : `${countries[0]} / ${carriers[0]}`;
      html += `
        <div class="prec-accordion-item warning-item active">
          <div class="prec-accordion-header" style="color: var(--accent-warning);">
            <span>⚠️ [${label}] 필수 확인사항</span>
            <span class="arrow">▼</span>
          </div>
          <div class="prec-accordion-content">
            <ul style="margin: 0; padding: 0; display: flex; flex-direction: column;">
              ${customPrecsHTML}
            </ul>
          </div>
        </div>
      `;
    }

    const precautionContent = document.getElementById('precautionContent');
    precautionContent.innerHTML = html;

    // 아코디언 접고 펼치기 리스너 바인딩
    const accordionHeaders = precautionContent.querySelectorAll('.prec-accordion-header');
    accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const item = header.parentElement;
        item.classList.toggle('active');
      });
    });

    // 모달 초기화
    precautionAgreeCheck.checked = false;
    precautionConfirmBtn.disabled = true;
    precautionConfirmBtn.style.opacity = '0.5';
    precautionConfirmBtn.style.cursor = 'not-allowed';

    // 팝업 열기
    precautionModal.classList.add('active');
  }

  function closePrecautionModal() {
    precautionModal.classList.remove('active');
  }

  // 13. 모달 닫기
  function closeModal() {
    if (window.__globeSearch) {
      window.__globeSearch = false;
      const si = document.getElementById('storeSearchInput');
      if (si) si.value = '';
      searchQuery = '';
      renderGrid();
    }
    productModal.classList.remove('active');
    productModal.classList.remove('anchored');
    document.querySelectorAll('.jd-spotlight').forEach(el => el.classList.remove('jd-spotlight'));
    window.__modalAnchor = null;
    document.body.style.overflow = 'auto'; // 스크롤 복구
    if (history.state && history.state.modal) history.back(); // 히스토리 정리
  }

  // 14. 결제 입력창 열기
  function openCheckoutFlow(items) {
    if (window.resetConsent) window.resetConsent(); // 결제창 열 때마다 동의 초기화
    closeModal();
    closeCartDrawer();
    
    checkoutItems = items;
    if (checkoutNameInput) checkoutNameInput.value = '';
    checkoutEmailInput.value = '';
    checkoutPhoneInput.value = '';
    
    // 개통 희망일 입력 박스 초기화 및 활성화 여부 제어
    // activation 필드 기반 판정 (원가표 정본): '입력한 개통희망일에 개통' 상품만 날짜 지정 필요
    // 리드타임: 일반 최소 2일 / 미주·유럽 최소 3일 — date picker min으로 강제
    let requiresActivationDate = false;
    let checkoutLeadDays = 2;
    let leadCountry = '';
    let validityCapDays = 0; // "구매일/발급일로부터 N일" 상품의 개통일 상한 (0 = 제한 없음)
    items.forEach(item => {
      const act = String(item.product.activation || '');
      if (act.includes('희망일')) {
        requiresActivationDate = true;
        const d = leadDaysFor(item.product.country);
        if (d > checkoutLeadDays || !leadCountry) { checkoutLeadDays = Math.max(checkoutLeadDays, d); leadCountry = item.product.country; }
        const vm = String(item.product.validity || '').match(/(구매일|발급일)로부터\s*(\d+)일/);
        if (vm) {
          const vd = parseInt(vm[2], 10);
          if (!validityCapDays || vd < validityCapDays) validityCapDays = vd;
        }
      }
    });

    const activationDateHint = document.getElementById('activationDateHint');
    if (requiresActivationDate) {
      checkoutActivationDateGroup.style.display = 'block';
      checkoutActivationDate.required = true;
      checkoutActivationDate.value = '';
      const ea = earliestActivationInfo(checkoutLeadDays === 3 ? '미국' : leadCountry);
      checkoutActivationDate.min = ea.iso;
      let capHtml = '';
      if (validityCapDays) {
        // 유효기간 상한: 오늘 + N일까지만 개통일 지정 가능
        const cap = new Date(); cap.setDate(cap.getDate() + validityCapDays);
        const pad = n => String(n).padStart(2, '0');
        checkoutActivationDate.max = `${cap.getFullYear()}-${pad(cap.getMonth() + 1)}-${pad(cap.getDate())}`;
        capHtml = ` ⏳ 이 상품은 유효기간이 있어 개통일을 <strong style="color:#b91c1c;">${cap.getMonth() + 1}/${cap.getDate()}까지</strong>만 지정할 수 있어요.`;
      } else {
        checkoutActivationDate.removeAttribute('max');
      }
      if (activationDateHint) {
        activationDateHint.innerHTML = `📌 오늘 주문 기준 가장 빠른 개통일은 <strong style="color:#F2751F;">${ea.label}</strong>이에요 — ${ea.days === 3 ? '미주·유럽은 시차 때문에 개통 준비에 <strong>최소 3일</strong>' : '개통 준비에 <strong>최소 2일</strong>'}이 필요해요.${capHtml}`;
        activationDateHint.style.display = 'block';
      }
    } else {
      checkoutActivationDateGroup.style.display = 'none';
      checkoutActivationDate.required = false;
      checkoutActivationDate.value = '';
      checkoutActivationDate.removeAttribute('min');
      checkoutActivationDate.removeAttribute('max');
      if (activationDateHint) { activationDateHint.style.display = 'none'; activationDateHint.innerHTML = ''; }
    }
    
    // Render checking out items
    checkoutItemsList.innerHTML = '';
    let totalCartPrice = 0;
    
    items.forEach(item => {
      const basePrice = item.plan.final_price;
      // Joint purchase discount (1st unit full, 2nd+ units 10% off)
      let itemPrice = Math.round(basePrice + (item.quantity - 1) * basePrice * 0.9);
      if (item.addon) {
        itemPrice += 1900;
      }
      totalCartPrice += itemPrice;
      
      const row = document.createElement('div');
      row.className = 'checkout-item-row';
      row.innerHTML = `
        <div>
          <div class="checkout-item-name">${item.product.country} eSIM</div>
          <div class="checkout-item-sub">
            ${item.product.carrier} | ${item.plan.data_limit} / ${item.plan.duration}일
          </div>
        </div>
        <div class="checkout-item-qty-price">
          ${item.quantity}개<br>
          <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">${itemPrice.toLocaleString()}원</span>
        </div>
      `;
      checkoutItemsList.appendChild(row);
    });
    
    checkoutStepInput.style.display = 'block';
    checkoutStepReceipt.style.display = 'none';
    
    paySubmitBtn.setAttribute('data-price', totalCartPrice);
    paySubmitBtn.textContent = `${totalCartPrice.toLocaleString()}원 결제 완료하기`;

    // Buy Flow v3: 핵심 스트립 2줄 + 세부(EID·환불) 접힘 — 아이템 리스트 바로 아래 (멱등 주입)
    let ess = document.getElementById('ckEssentials');
    if (!ess) {
      ess = document.createElement('div');
      ess.id = 'ckEssentials';
      checkoutItemsList.parentNode.insertBefore(ess, checkoutItemsList.nextSibling);
    }
    ess.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:7px;margin:12px 0 2px;">
        <div style="display:flex;align-items:center;gap:9px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:11px;padding:11px 13px;font-size:0.88rem;font-weight:800;color:var(--text-main);text-align:left;">⚡ 결제하면 QR이 카톡·문자로 자동 발송돼요</div>
        <div style="display:flex;align-items:center;gap:9px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:11px;padding:11px 13px;font-size:0.88rem;font-weight:800;color:var(--text-main);text-align:left;">🛡️ 발급 전엔 100% 환불 · 발급 후엔 환불 불가</div>
      </div>
      <details style="margin-top:8px;text-align:left;"><summary style="cursor:pointer;font-size:0.78rem;font-weight:700;color:var(--text-muted);padding:4px 0;">📱 내 폰 eSIM 지원 확인 · 🔄 환불 규정 자세히</summary>
        <div style="font-size:0.78rem;color:var(--text-muted);line-height:1.7;padding:8px 2px 2px;">
          • <strong>기종 확인:</strong> 키패드에 <code>*#06#</code> 입력 시 32자리 EID가 보여야 사용 가능 (중국/홍콩/마카오 구매 아이폰 불가)<br>
          • <strong>단순 변심:</strong> QR 발송 후 취소·환불 불가 · <strong>프로필 삭제 시 재설치 불가</strong><br>
          • <strong>현지 장애:</strong> 프로필을 지우지 말고 24시간 카톡 상담 접수 — 미해결 시 100% 환불 (<a href="refund.html" target="_blank" rel="noopener" style="color:var(--accent);font-weight:800;">환불 규정 전문</a>)
        </div>
      </details>`;

    // 💰 쿠폰 (2026-07-17): ckEssentials 생성 이후에 호출해야 박스가 그 위에 삽입됨
    window._pcBasePrice = totalCartPrice;
    window._pcCoupon = null;
    loadPcCoupons(totalCartPrice);

    // 📲 기종 진단 (2026-07-17): 결제 전 자기 폰을 직접 클릭해 지원 여부 확인 — jd-devices.js 공용 위젯
    try {
      const essForDc = document.getElementById('ckEssentials');
      if (essForDc && window.jdRenderDeviceCheck) {
        let dcBox = document.getElementById('pcDeviceCheck');
        if (!dcBox) { dcBox = document.createElement('div'); dcBox.id = 'pcDeviceCheck'; }
        essForDc.insertAdjacentElement('afterend', dcBox);
        window.jdRenderDeviceCheck(dcBox);
      }
    } catch (e) {}

    // 결제창 국가별 맞춤형 스펙/주의사항 카드 동적 렌더링
    const checkoutPrecautionCard = document.getElementById('checkoutPrecautionCard');
    const checkoutPrecautionList = document.getElementById('checkoutPrecautionList');
    if (checkoutPrecautionCard && checkoutPrecautionList) {
      let combinedPrecs = [];
      items.forEach(item => {
        const precs = getCustomPrecautions(item.product.country, item.product.carrier, item.product.activation, item.product.validity);
        precs.forEach(p => {
          if (!combinedPrecs.includes(p)) combinedPrecs.push(p);
        });
      });
      
      if (combinedPrecs.length > 0) {
        let precHTML = '';
        combinedPrecs.forEach(p => {
          precHTML += `<li style="margin-bottom: 6px;">${p}</li>`;
        });
        checkoutPrecautionList.innerHTML = precHTML;
        checkoutPrecautionCard.style.display = 'block';
      } else {
        checkoutPrecautionCard.style.display = 'none';
      }
    }

    checkoutModal.classList.add('active');
  }

  // 15. 결제 모달 닫기
  function closeCheckout() {
    checkoutModal.classList.remove('active');
  }

  // 15.5 결제 통합 시작 처리 (포트원 카카오페이 무료 테스트 연동)
  function startPaymentProcess() {
    const consentCheck = document.getElementById('consentAgreeCheck');
    if (consentCheck && !consentCheck.checked) {
      alert('약관 및 결제 동의에 체크해 주셔야 결제를 진행할 수 있습니다.');
      return;
    }
    const buyerName = checkoutNameInput ? checkoutNameInput.value.trim() : '';
    const email = checkoutEmailInput.value.trim();
    const phone = checkoutPhoneInput.value.trim();
    
    if (!buyerName) {
      alert('수령인 이름을 입력해 주세요. 주문 조회에 사용됩니다.');
      return;
    }
    if (!email || !phone) {
      alert('이메일 주소와 휴대폰 번호를 모두 입력해 주셔야 이심 QR코드를 정확하게 발송해 드릴 수 있어요.');
      return;
    }
    
    if (!email.includes('@')) {
      alert('이메일 형식이 올바르지 않습니다. 혹시 오타가 없는지 한 번만 확인해 주세요!');
      return;
    }

    // 개통희망일 지정 유효성 검사 (리드타임 min 미달 선택도 차단)
    if (checkoutActivationDate.required) {
      if (!checkoutActivationDate.value) {
        alert('개통 희망일 지정 상품이 담겨 있어요. 현지 개통을 위해 개통 희망일을 지정해 주세요.');
        return;
      }
      if (checkoutActivationDate.min && checkoutActivationDate.value < checkoutActivationDate.min) {
        const [y, m, d] = checkoutActivationDate.min.split('-').map(Number);
        alert(`개통 준비 기간이 필요해 가장 빠른 개통 가능일은 ${m}월 ${d}일입니다.\n개통 희망일을 다시 선택해 주세요.\n(미주·유럽은 시차로 최소 3일, 그 외 지역은 최소 2일 전 주문이 필요해요)`);
        return;
      }
      if (checkoutActivationDate.max && checkoutActivationDate.value > checkoutActivationDate.max) {
        const [y2, m2, d2] = checkoutActivationDate.max.split('-').map(Number);
        alert(`이 상품은 유효기간이 있어 ${m2}월 ${d2}일까지만 개통일로 지정할 수 있습니다.\n(구매/발급일로부터 유효기간 안에 개통해야 하는 상품이에요)\n여행이 그보다 늦다면 출국에 더 가까운 날짜에 구매해 주세요.`);
        return;
      }
    }

    const priceVal = parseInt(paySubmitBtn.getAttribute('data-price'));
    
    let paymentName = '';
    if (checkoutItems.length === 1) {
      const first = checkoutItems[0];
      paymentName = `${first.product.country} eSIM (${first.plan.data_limit}/${first.plan.duration}일)`;
    } else {
      const first = checkoutItems[0];
      paymentName = `${first.product.country} eSIM 외 ${checkoutItems.length - 1}건`;
    }

    const randNum = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderCode = `ESIM-${dateStr}-${randNum}`;

    if (window.IMP) {
      // 선택된 결제 수단에 따라 PG 분기 (카카오페이 / 신용·체크카드)
      const method = window.selectedPayMethod || 'kakaopay';
      const pgProvider = method === 'card' ? CARD_PG_PROVIDER : PORTONE_PG_PROVIDER;

      // Check if PortOne V2 parameters are present in env
      if (window.PortOne && PORTONE_STORE_ID) {
        window.PortOne.requestPayment({
          storeId: PORTONE_STORE_ID,
          channelKey: PORTONE_CHANNEL_KEY,
          paymentId: orderCode,
          orderName: paymentName,
          totalAmount: priceVal,
          currency: "CURRENCY_KRW",
          payMethod: "CARD",
          customer: {
            email: email,
            phoneNumber: phone
          },
          // G1 (2026-07-17): 웹훅 자동발주용 주문 내용 탑재 — 서버(order.js)가 sku·수량·기대금액을 교차검증
          customData: JSON.stringify({
            sku: checkoutItems[0].plan.product_code,
            qty: checkoutItems[0].qty || 1,
            items: checkoutItems.map(it => ({ sku: it.plan.product_code, qty: it.qty || 1 })).slice(0, 10),
            name: buyerName, phone: phone, email: email, amount: priceVal
          })
        }).then(function (rsp) {
          if (rsp.code != null) {
            alert(`결제에 실패하였습니다.\n사유: ${rsp.message}`);
            const forcePay = confirm("테스트 모드이므로 가상으로 결제를 완료하고 영수증 화면으로 이동하시겠습니까?");
            if (forcePay) submitPayment(orderCode, priceVal, true);
          } else {
            submitPayment(orderCode, priceVal);
          }
        });
      } else if (window.IMP) {
        window.IMP.request_pay({
          pg: pgProvider,
          pay_method: "card",
          merchant_uid: orderCode,
          name: paymentName,
          amount: priceVal,
          buyer_email: email,
          buyer_tel: phone
        }, function (rsp) {
          if (rsp.success) {
            window.lastImpUid = rsp.imp_uid; // 서버 결제 검증용 실제 결제 ID
            submitPayment(orderCode, priceVal);
          } else {
            const forcePay = confirm(`결제에 실패하였습니다.\n사유: ${rsp.error_msg}\n\n[테스트 환경 안내]\n로컬 실행 환경(file:// 프로토콜 등)에서는 보안 정책으로 인해 PG사 결제창이 작동하지 않을 수 있습니다.\n\n테스트 모드이므로 가상으로 결제를 완료하고 영수증 화면으로 이동하시겠습니까?`);
            if (forcePay) {
              submitPayment(orderCode, priceVal, true);
            }
          }
        });
      } else {
        submitPayment(orderCode, priceVal, true); // PG SDK 미로드 = 가상 결제
      }
    } else {
      submitPayment(orderCode, priceVal, true); // PG 미설정 = 가상 결제
    }
  }

  // 16. 결제 완료 처리 및 가상 영수증 출력
  
  // [PlayAuto Sync] Vercel Serverless Webhook Trigger
  function triggerVercelWebhook(orderData) {
    const payload = {
      imp_uid: window.lastImpUid || ('imp_mock_' + Date.now()),
      merchant_uid: orderData.orderCode,
      status: 'paid',
      order_details: orderData
    };

    fetch('/api/payment-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => console.log('[플레이오토 웹훅 전송 결과]', data))
    .catch(err => console.warn('[플레이오토 웹훅 전송 불가]', err.message));
  }


  // 🧳 국가별 여행 준비물 & 알아두면 좋은 이슈 (결제 완료 화면용)
  const TRAVEL_TIPS = {
    '일본': { power: '100V · A타입 (돼지코 어댑터)', items: ['A타입(돼지코) 어댑터 — 한국 충전기 대부분 프리볼트라 어댑터만 있으면 OK', '동전 지갑 — 현금·동전 사용이 아직 많아요', '교통카드(스이카)는 아이폰 지갑에서 바로 발급 가능'], issues: ['액상형 전자담배(니코틴)는 반입 제한 — 궐련형(아이코스류)은 사용 가능', '길거리 흡연 금지 구역이 많아요 — 지정 흡연소 이용', '🛂 무비자 90일 — Visit Japan Web을 미리 작성하면 입국 심사가 빨라요'] },
    '베트남': { power: '220V · 한국 플러그 대부분 그대로 사용', items: ['모기 기피제', '얇은 긴팔 — 실내 냉방이 강해요', '소액 현금(동) — 시장·로컬 식당용'], issues: ['전자담배 반입·사용 전면 금지(2025년~) — 적발 시 처벌', '이동은 그랩(Grab) 앱이 필수 — 미리 설치하세요', '🛂 무비자 45일 — 여권 유효기간 6개월 이상 필수'] },
    '태국': { power: '220V · 한국 플러그 대부분 그대로 사용', items: ['자외선 차단제', '사원 방문용 무릎 덮는 하의', '모기 기피제'], issues: ['전자담배 반입·소지 금지 — 벌금·처벌 사례가 많아요', '왕실 관련 언행은 법적 처벌 대상 — 주의', '🛂 무비자 입국이지만 디지털 입국카드(TDAC)를 출국 전 온라인으로 작성해야 해요'] },
    '대만': { power: '110V · A타입 (돼지코 어댑터)', items: ['A타입 어댑터', '접이식 우산 — 스콜성 비가 잦아요', '교통은 이지카드 하나로 해결'], issues: ['전자담배 전면 금지(2023년~)', '지하철 안 음식물 섭취 금지 — 벌금'] },
    '필리핀': { power: '220V · 한국 플러그 대부분 호환', items: ['모기 기피제', '방수팩 — 섬·액티비티용'], issues: ['전자담배는 성인 1인 소량만 반입 가능', '야간 이동 시 소지품 주의'] },
    '싱가포르': { power: '230V · G타입(영국식) 어댑터 필수', items: ['G타입 어댑터', '얇은 겉옷 — 실내 냉방이 아주 강해요'], issues: ['껌 반입 금지 · 전자담배 소지 벌금', '무단횡단·쓰레기 투기 벌금 — 엄격해요', '🛂 입국 3일 전부터 SG 입국카드(SG Arrival Card) 온라인 제출 필수'] },
    '홍콩': { power: '220V · G타입(영국식) 어댑터 필수', items: ['G타입 어댑터', '교통·결제는 옥토퍼스 카드(모바일 발급 가능)'], issues: ['전자담배 반입 금지(2022년~)', '지하철 안 음식물 섭취 금지'] },
    '마카오': { power: '220V · G타입(영국식) 어댑터 필수', items: ['G타입 어댑터'], issues: ['카지노는 만 21세부터 입장 가능'] },
    '중국': { power: '220V · 대부분 사용 가능 (멀티어댑터 권장)', items: ['멀티 어댑터', '알리페이/위챗페이 미리 설정 — 현금보다 QR결제가 보편'], issues: ['구글·카톡·인스타가 현지에서 차단되지만, 이 로밍 eSIM은 그대로 사용 가능해요 ✅', '🛂 비자 정책이 자주 바뀌어요 — 출국 전 무비자 시행 여부를 꼭 확인하세요'] },
    '미국': { power: '120V · A/B타입 (돼지코 어댑터)', items: ['A타입 어댑터', '팁용 소액권 현금'], issues: ['팁 문화 15~20% — 식당·택시 필수', '🛂 ESTA 사전 승인 필수 — 최소 출국 72시간 전에 신청하세요'] },
    '괌': { power: '120V · A/B타입 (돼지코 어댑터)', items: ['A타입 어댑터', '자외선 차단제'], issues: ['이심은 현지 도착 후 개통 문자로 시작 — 미리 사도 기간이 줄지 않아요'] },
    '사이판': { power: '120V · A/B타입 (돼지코 어댑터)', items: ['A타입 어댑터', '자외선 차단제'], issues: ['이심은 현지 도착 후 개통 문자로 시작 — 미리 사도 기간이 줄지 않아요'] },
    '말레이시아': { power: '240V · G타입(영국식) 어댑터 필수', items: ['G타입 어댑터'], issues: ['실내 냉방이 강해 얇은 겉옷 추천'] },
    '인도네시아': { power: '230V · 한국 플러그 대부분 호환', items: ['모기 기피제', '자외선 차단제'], issues: ['발리 입도 시 관광세 납부(온라인 사전 결제 가능)', '🛂 발리는 도착비자(VOA) — e-VOA로 미리 신청하면 줄이 짧아요'] },
    '호주': { power: '230V · I타입 어댑터 필수', items: ['I타입 어댑터', '자외선 차단제 — 자외선이 매우 강해요'], issues: ['입국 시 음식물·동식물 신고 엄격 — 라면 스프도 신고 대상', '전자담배는 반입 규제가 엄격해요', '🛂 ETA(전자여행허가)를 앱으로 사전 신청해야 해요'] },
    '오렌지프랑스': { power: '230V · 한국 플러그 대부분 호환', items: ['크로스백 — 앞으로 메세요'], issues: ['관광지 소매치기 주의 — 특히 지하철·에펠탑 인근'] },
    '오렌지스페인': { power: '230V · 한국 플러그 대부분 호환', items: ['크로스백 — 앞으로 메세요'], issues: ['관광지 소매치기 주의'] },
    '보다폰스페인': { power: '230V · 한국 플러그 대부분 호환', items: ['크로스백 — 앞으로 메세요'], issues: ['관광지 소매치기 주의'] },
    '쓰리(THREE)': { power: '230V · G타입(영국식) 어댑터 필수', items: ['G타입 어댑터', '우산 또는 방수 자켓'], issues: ['교통은 컨택리스 카드 태그가 가장 편해요'] }
  };

  function buildTravelTipsHTML(country) {
    const t = TRAVEL_TIPS[country];
    const li = arr => arr.map(x => `<div style="display:flex;gap:8px;padding:5px 0;font-size:0.76rem;line-height:1.55;color:#334155;"><span style="flex-shrink:0;width:4.5px;height:4.5px;border-radius:50%;background:#F97316;margin-top:7px;"></span><span>${x}</span></div>`).join('');
    const box = (title, inner, open) => `
      <details ${open ? 'open' : ''} style="background:#fff;border:1px solid #eef2f7;border-radius:14px;margin-top:9px;overflow:hidden;width:100%;">
        <summary style="list-style:none;display:flex;align-items:center;gap:8px;padding:12px 14px;font-size:0.8rem;font-weight:800;color:#0f172a;cursor:pointer;-webkit-tap-highlight-color:transparent;">${title}<span style="margin-left:auto;color:#94a3b8;font-size:0.7rem;font-weight:700;">펼치기 ▾</span></summary>
        <div style="padding:2px 14px 12px;">${inner}</div>
      </details>`;
    let html = '';
    if (t) {
      html += box(`🧳 ${country} 여행 준비물`,
        `<div style="font-size:0.72rem;font-weight:800;color:#F2751F;padding:3px 0 4px;">🔌 ${t.power}</div>` + li(t.items), false);
      if (t.issues && t.issues.length) {
        html += box(`📌 ${country}, 이건 알고 가세요`, li(t.issues), false);
      }
    }
    html += box('🔋 모든 여행 공통',
      li(['보조배터리는 위탁수하물 금지 — 반드시 기내 가방에!', '여권 유효기간 6개월 이상 남았는지 확인', 'QR 도착 전 eSIM 지원 기종인지 한 번 더 확인(*#06# → EID)']), false);
    return html;
  }

  function submitPayment(orderCode, finalPriceVal, isTest) {
    // 쿠폰 사용 확정 마킹 (서버 지갑 검증 — 이중 사용 차단). 실차감은 data-price에 이미 반영됨
    if (window._pcCoupon) {
      try {
        fetch('https://jdisim-proxy.vercel.app/api/member', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('jd_member_token') || '') },
          body: JSON.stringify({ action: 'use_coupon', code: window._pcCoupon.code, order_total: window._pcBasePrice || finalPriceVal, mid: orderCode }) }).catch(function(){});
      } catch (e) {}
      window._pcCoupon = null;
    }
    const buyerName = checkoutNameInput ? checkoutNameInput.value.trim() : '';
    const email = checkoutEmailInput.value.trim();
    const phone = checkoutPhoneInput.value.trim();
    const activationDateVal = checkoutActivationDate.value;
    
    // 주문 내역 로컬 스토리지 저장
    const newOrder = {
      orderCode: orderCode,
      buyerName: buyerName,
      date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      email: email,
      phone: phone,
      totalPrice: finalPriceVal,
      test: isTest === true, // 가상 결제 여부 — 내 여행 카드가 "테스트 주문" 라벨 표시에 사용
      activationDate: activationDateVal || '',
      items: checkoutItems.map(item => {
        const randIccid = '89823' + Math.floor(100000000000000 + Math.random() * 900000000000000);
        
        // 데이터 용량 추정(내 여행 사용량 표시용) — 정규식으로 GB/MB 일반 파싱 (T-011)
        const planLimitStr = item.plan.data_limit;
        let totalBytes;
        if (String(planLimitStr).includes('무제한')) {
          totalBytes = 100 * 1024 * 1024 * 1024; // 무제한은 100GB로 취급
        } else {
          const mm = String(planLimitStr).match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
          if (mm) {
            const mul = /mb/i.test(mm[2]) ? 1024 * 1024 : 1024 * 1024 * 1024;
            totalBytes = Math.round(parseFloat(mm[1]) * mul);
          } else {
            totalBytes = 10 * 1024 * 1024 * 1024; // 파싱 불가 시 기본 10GB
          }
        }
        
        const prodCode = item.plan.product_code || 'LS2026-eSIM-00000';
        const duration = item.plan.duration;
        const lookupKey = `${prodCode}_${duration}`;
        
        // 옵션코드(옵션명) 조회
        let optionName = (window.OPTION_CODES_MAP && window.OPTION_CODES_MAP[lookupKey]);
        if (!optionName) {
          const exactCarrier = (window.FULL_CARRIER_MAP && window.FULL_CARRIER_MAP[prodCode]) || item.product.carrier;
          if (prodCode.startsWith('LS2026-eSIM-031')) {
            optionName = `SGT_아시아 3개국_${item.plan.data_limit}_${duration}일`;
          } else {
            optionName = `${item.product.country}_${exactCarrier}_${item.plan.data_limit}_${duration}일`;
          }
        }
        
        return {
          country: item.product.country,
          carrier: item.product.carrier,
          planLimit: item.plan.data_limit,
          planDuration: item.plan.duration,
          productCode: prodCode,
          optionName: optionName, // 사용일수 옵션명 (예: JSX_일본소프트뱅크_매일5GB_01일)
          quantity: item.quantity,
          addon: item.addon || false,
          iccid: randIccid,
          totalBytes: totalBytes,
          usedBytes: 0
        };
      })
    };
    
    let savedOrders = JSON.parse(localStorage.getItem('esim_orders') || '[]');
    savedOrders.unshift(newOrder);
    localStorage.setItem('esim_orders', JSON.stringify(savedOrders));
    triggerVercelWebhook(newOrder);
    
    // 플레이오토 EMP 주문 수집 API 연동 페이로드 모의 콘솔 로깅
    if (typeof logPlayAutoSyncPayload === 'function') {
      logPlayAutoSyncPayload(newOrder);
    }

    receiptItemsContainer.innerHTML = '';
    
    checkoutItems.forEach(item => {
      const basePrice = item.plan.final_price;
      let itemPrice = Math.round(basePrice + (item.quantity - 1) * basePrice * 0.9);
      if (item.addon) {
        itemPrice += 1900;
      }
      
      const card = document.createElement('div');
      card.className = 'receipt-item-card';
      
      card.innerHTML = `
        <div class="receipt-item-header">
          <div class="receipt-item-title">${item.product.country} eSIM</div>
          <div class="receipt-item-code">${item.quantity}개 · ${itemPrice.toLocaleString()}원</div>
        </div>
        <div style="font-size:0.8rem;color:var(--text-muted);padding:6px 2px 2px;">${item.plan.data_limit || ''} / ${item.days || item.plan.duration || ''}일</div>
      `;
      receiptItemsContainer.appendChild(card);
    });
    
    document.getElementById('receiptEmail').textContent = email;
    document.getElementById('receiptOrderNum').textContent = orderCode;
    document.getElementById('receiptPrice').textContent = `${finalPriceVal.toLocaleString()}원`;
    
    // Clear cart if this was a cart checkout
    const isInstantCheckout = checkoutItems.length > 0 && checkoutItems[0].id.toString().startsWith('instant-');
    if (!isInstantCheckout) {
      cart = [];
      saveCart();
    }
    
    checkoutStepInput.style.display = 'none';
    checkoutStepReceipt.style.display = 'block';

    // 🎫 발급 링크 CTA (서버 연동 전엔 이 기기 테스트 주문으로 흐름 체험)
    const tipsBox0 = document.getElementById('receiptTravelTips');
    if (tipsBox0) {
      tipsBox0.insertAdjacentHTML('beforebegin', `
        <div style="display:flex;gap:10px;margin-top:18px;">
          ${[['💬','카톡으로','발급 링크 도착'],['🎫','원하는 때','링크에서 발급'],['🛬','현지 도착 후','로밍 켜면 개통']].map((s,i)=>`
          <div style="flex:1;background:rgba(249,115,22,0.05);border:1px solid rgba(249,115,22,0.18);border-radius:14px;padding:13px 8px;text-align:center;">
            <div style="font-size:1.2rem;">${s[0]}</div>
            <div style="font-size:0.66rem;font-weight:700;color:var(--text-muted);margin-top:5px;">STEP ${i+1} · ${s[1]}</div>
            <div style="font-size:0.76rem;font-weight:800;color:var(--text-main);margin-top:2px;">${s[2]}</div>
          </div>`).join('')}
        </div>
        <a href="issue.html?local=${encodeURIComponent(orderCode)}" target="_blank" rel="noopener"
           style="display:block;text-align:center;margin-top:14px;padding:15px;border-radius:14px;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;font-weight:800;font-size:0.92rem;text-decoration:none;box-shadow:0 8px 20px rgba(249,115,22,0.3);">🎫 발급 페이지 열기 — 원하는 시점에 발급하세요</a>
        <div style="font-size:0.74rem;color:var(--text-muted);text-align:center;margin-top:8px;">실서비스에서는 이 링크가 카카오톡 알림톡으로 발송돼요</div>`);
    }

    // 🧳 해당 국가 여행 준비물·이슈 드롭다운 채우기
    const tipsBox = document.getElementById('receiptTravelTips');
    if (tipsBox && checkoutItems.length) {
      const firstCountry = checkoutItems[0].country || (checkoutItems[0].product && checkoutItems[0].product.country) || '';
      tipsBox.innerHTML = buildTravelTipsHTML(firstCountry);
    }
    
    let successMsg = `🎉 결제가 정상 처리되었습니다!\n카카오톡으로 eSIM 발급 링크를 보내드려요. 링크에서 원하시는 시점에 발급하시면 됩니다.`;
    const requiresActivation = checkoutActivationDate.required && checkoutActivationDate.value;
    if (requiresActivation) {
      successMsg = `🎉 예약 결제가 정상 처리되었습니다!\n입력하신 이메일(${email})로 안내 메일이 발송되었습니다.\n(지정하신 개통일 [${checkoutActivationDate.value}]에 맞춰 현지망 활성화가 순차 진행됩니다.)`;
    }
    
    successMsg += `\n\n💡 구매하신 내역은 우측 상단의 [주문 조회] 메뉴에서 입력하신 정보(${email} / ${phone})로 언제든지 다시 확인하실 수 있습니다.`;
    
    setTimeout(() => {
      alert(successMsg);
    }, 100);
  }

  function completeCheckoutFlow() {
    closeCheckout();
  }

  // 18. 리뷰 아코디언/더보기 토글 로직
  function initReviewToggles() {
    const reviewCards = document.querySelectorAll('.review-card');
    reviewCards.forEach(card => {
      const textElem = card.querySelector('.review-text');
      if (!textElem) return;
      
      // 글자 수가 100자 이상일 때만 더보기 버튼 동적 노출
      const fullText = textElem.textContent.trim();
      if (fullText.length > 100) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'review-toggle-btn';
        toggleBtn.innerHTML = '더보기 ▾';
        
        // 텍스트 엘리먼트 바로 뒤에 버튼 삽입
        textElem.parentNode.insertBefore(toggleBtn, textElem.nextSibling);
        
        toggleBtn.addEventListener('click', () => {
          const isExpanded = card.classList.contains('expanded');
          if (isExpanded) {
            card.classList.remove('expanded');
            toggleBtn.innerHTML = '더보기 ▾';
            // 접었을 때 해당 리뷰 카드가 화면 밖으로 나가지 않도록 살짝 스크롤 포커싱
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            card.classList.add('expanded');
            toggleBtn.innerHTML = '접기 ▴';
          }
        });
      }
    });
  }

    // eSIM 기종 호환성 기기 정보 데이터베이스 (구조화 매핑 - 글로벌 전체 서칭 통합판)
  const DIAG_BRAND_MODELS = (window.JD_DEVICES || {}); // 기종 DB 정본은 jd-devices.js — 2026-07-17 추출(중복 제거)
  // 자가진단 관련 DOM
  const deviceModal = document.getElementById('deviceModal');
  const deviceModalCloseBtn = document.getElementById('deviceModalCloseBtn');
  const diagBrandSelect = document.getElementById('diagBrandSelect');
  const diagModelSelect = document.getElementById('diagModelSelect');
  const diagResultPanel = document.getElementById('diagResultPanel');

  function openDeviceModal() {
    deviceModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Reset forms
    diagBrandSelect.value = "";
    diagModelSelect.innerHTML = '<option value="" disabled selected>기종 선택</option>';
    diagModelSelect.disabled = true;
    diagResultPanel.innerHTML = '';
    diagResultPanel.style.display = 'none';
  }

  function closeDeviceModal() {
    deviceModal.classList.remove('active');
    if (!productModal.classList.contains('active') && !checkoutModal.classList.contains('active') && !cartDrawerOverlay.classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }

  function handleDiagBrandChange() {
    const brand = diagBrandSelect.value;
    diagModelSelect.innerHTML = '';
    diagResultPanel.style.display = 'none';
    diagResultPanel.innerHTML = '';

    if (!brand) {
      diagModelSelect.innerHTML = '<option value="" disabled selected>기종 선택</option>';
      diagModelSelect.disabled = true;
      return;
    }

    const models = DIAG_BRAND_MODELS[brand] || [];
    
    // Add default option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = "";
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    defaultOpt.textContent = "기종 선택";
    diagModelSelect.appendChild(defaultOpt);

    // Populate dropdown
    models.forEach((model, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.textContent = model.name;
      diagModelSelect.appendChild(opt);
    });

    diagModelSelect.disabled = false;
  }

  function handleDiagModelChange() {
    const brand = diagBrandSelect.value;
    const modelIndex = diagModelSelect.value;
    if (!brand || modelIndex === "") return;

    const model = DIAG_BRAND_MODELS[brand][modelIndex];
    if (!model) return;

    renderDiagResult(model);
  }

  function renderDiagResult(device) {
    diagResultPanel.className = 'diag-result-card';
    diagResultPanel.classList.add(`status-${device.status}`);

    let titleIcon = '🎉';
    let titleText = 'eSIM 개통이 가능한 기기입니다!';
    let detailHTML = '이 단말기는 내부에 eSIM 모듈칩이 장착되어 있어, 구매 후 제공받으신 QR코드 스캔을 통해 즉시 현지 데이터망 사용이 가능한 요금제입니다. 안심하고 구매하세요!';

    if (device.status === 'warning') {
      titleIcon = '⚠️';
      titleText = 'eSIM 지원여부 확인 대상 (해외/직구폰)';
      detailHTML = device.note || '해외 사양 단말기인 경우 모델에 따라 지원 여부가 상이할 수 있습니다. 구매 전에 반드시 다이얼러에서 *#06#를 입력하여 EID 항목이 뜨는지 확인하시고 구매해 주세요.';
    } else if (device.status === 'danger') {
      titleIcon = '❌';
      titleText = 'eSIM 이용이 불가능한 기기입니다';
      detailHTML = device.note || '이 기종은 가상 eSIM 기능을 지원하는 하드웨어 칩이 내장되어 있지 않습니다. 이 요금제 구매 시 사용이 불가능하므로, 대신 <strong>인천공항 수령 유심(USIM)</strong> 또는 로밍 에그 상품을 권장합니다.';
    }

    detailHTML += `
      <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.08); font-size: 0.72rem; color: var(--text-dim); display: flex; flex-direction: column; gap: 4px;">
        <div>📌 <strong>필수 체크 리스트:</strong></div>
        <div>• 컨트리락(락폰) 해제 필수: 기존 통신망 계약상 컨트리락이 걸려있는 기기는 이심 프로필 설치가 거부됩니다.</div>
        <div>• 듀얼 물리 유심 기종 미지원: 중국/홍콩 출시 아이폰 등 유심 트레이가 2개인 기종은 이심이 탑재되지 않습니다.</div>
      </div>
    `;

    diagResultPanel.innerHTML = `
      <div class="diag-result-title" style="font-size: 0.92rem; font-weight: 800; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; text-align: left;">
        <span>${titleIcon}</span> <span>${titleText}</span>
      </div>
      <div class="diag-result-desc" style="font-size: 0.78rem; line-height: 1.5; color: var(--text-muted); text-align: left;">
        ${detailHTML}
      </div>
    `;
    diagResultPanel.style.display = 'block';
  }

  function setupDeviceDiagnosticsListeners() {
    diagBrandSelect.addEventListener('change', handleDiagBrandChange);
    diagModelSelect.addEventListener('change', handleDiagModelChange);

    // Close modal bounds
    deviceModalCloseBtn.addEventListener('click', closeDeviceModal);
    deviceModal.addEventListener('click', (e) => {
      if (e.target === deviceModal) {
        closeDeviceModal();
      }
    });
  }

  // 19. eSIM 주문 내역 조회 및 마이 QR코드 렌더링 로직
  // 주문 조회: 서버 API가 있으면 서버에서, 없으면 이 기기의 구매 기록에서
  // 서버 주문조회 (T-016): 프록시 orders:index에서 email+phone 정확일치 조회 → 크로스기기에서도 내역 확인
  window.ORDERS_API = 'https://jdisim-proxy.vercel.app/api/order'; // GET ?email=&phone= → {orders:[...]}

  function handleOrderLookup() {
    const emailInput = document.getElementById('lookupEmail').value.trim();
    const phoneInput = document.getElementById('lookupPhone').value.trim();
    const resultsContainer = document.getElementById('orderLookupResults');

    if (!emailInput || !phoneInput) {
      alert('주문 당시 입력하셨던 이메일 주소와 휴대폰 번호를 모두 채워주셔야 내역을 안전하게 불러올 수 있습니다.');
      return;
    }
    if (!emailInput.includes('@')) {
      alert('올바른 이메일 주소 형식이 아닙니다. 이메일을 다시 한번 확인해 주세요!');
      return;
    }

    const ne = emailInput.toLowerCase();
    const np = phoneInput.replace(/[^0-9]/g, '');
    const savedOrders = JSON.parse(localStorage.getItem('esim_orders') || '[]');
    const localMatched = savedOrders.filter(o => (o.email || '').toLowerCase() === ne && (o.phone || '').replace(/[^0-9]/g, '') === np);
    if (window.ORDERS_API) {
      resultsContainer.style.display = 'block';
      resultsContainer.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">⏳ 조회 중...</div>';
      fetch(window.ORDERS_API + '?email=' + encodeURIComponent(ne) + '&phone=' + encodeURIComponent(np))
        .then(r => { if (!r.ok) throw 0; return r.json(); })
        .then(d => {
          // 로컬(발급링크 등 풍부) 우선 + 서버(크로스기기)로 보충 — orderCode 중복 제거
          const seen = {};
          localMatched.forEach(o => { if (o.orderCode) seen[o.orderCode] = true; });
          const serverOnly = ((d && d.orders) || []).filter(o => o.orderCode && !seen[o.orderCode]);
          renderPcOrderCards(localMatched.concat(serverOnly));
        })
        .catch(() => renderPcOrderCards(localMatched)); // 서버 실패 시 로컬 폴백 (기존 동작 보존)
      return;
    }
    renderPcOrderCards(localMatched);
  }

  function renderPcOrderCards(matchedOrders) {
    const resultsContainer = document.getElementById('orderLookupResults');
    resultsContainer.style.display = 'block';
    if (!matchedOrders.length) {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 50px 20px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; margin-bottom: 16px;">🔍</div>
          <div style="font-weight: 800; color: var(--text-main); font-size: 1.05rem; margin-bottom: 8px;">일치하는 주문 내역이 없습니다</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; max-width: 400px; margin: 0 auto;">
            구매 시 입력하셨던 정보가 맞는지 다시 확인해 주세요. 특히 이메일 오타나 휴대폰 하이픈(-) 입력 여부에 유의해 주시기 바랍니다.
          </div>
        </div>`;
      return;
    }
    resultsContainer.innerHTML = matchedOrders.map(order => {
      const it = (order.items && order.items[0]) || {};
      const lpa = it.lpa || ''; // ★ 실제 발급 데이터가 있을 때만 QR·설치 UI 노출
      const issued = !!lpa;
      const issueUrl = order.issueUrl || (order.issueToken ? ('issue.html?t=' + encodeURIComponent(order.issueToken)) : (order.orderCode ? ('issue.html?local=' + encodeURIComponent(order.orderCode)) : ''));
      return `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 26px; margin-bottom: 16px; box-shadow: var(--shadow-md);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">주문번호 ${order.orderCode || ''}</span>
          <span style="font-size:0.72rem;font-weight:900;padding:5px 11px;border-radius:12px;${issued ? 'color:#15803d;background:rgba(34,197,94,0.1);' : 'color:#b45309;background:rgba(245,158,11,0.12);'}">${issued ? '발급 완료' : '발급 대기'}</span>
        </div>
        <div style="font-weight:800;font-size:0.98rem;color:var(--text-main);margin-bottom:14px;">${it.productName || order.productName || ''} ${it.quantity ? '(' + it.quantity + '개)' : ''}</div>
        ${issued ? `
        <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap;">
          <div style="background:#fff;border-radius:14px;padding:12px;box-shadow:0 8px 22px rgba(15,23,42,0.1);">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lpa)}" width="150" height="150" alt="eSIM QR" style="display:block;">
          </div>
          <div style="flex:1;min-width:240px;">
            ${it.iccid ? `<div style="font-size:0.76rem;color:var(--text-muted);font-family:monospace;margin-bottom:10px;">ICCID: ${it.iccid}</div>` : ''}
            <button class="action-btn" style="width:100%;margin-bottom:8px;" onclick="navigator.clipboard&&navigator.clipboard.writeText('${lpa}').then(()=>alert('📋 설치 코드가 복사됐어요 — 폰의 설정 → 셀룰러 → eSIM 추가 → 세부사항 직접 입력에 붙여넣으세요'))">📋 설치 코드 복사</button>
            ${issueUrl ? `<a href="${issueUrl}" target="_blank" rel="noopener" class="action-btn" style="display:block;text-align:center;width:100%;text-decoration:none;">🎫 발급 페이지 열기 (설치·사용량 확인)</a>` : ''}
            <div style="font-size:0.72rem;color:var(--text-muted);line-height:1.6;margin-top:10px;">📱 폰 카메라로 위 QR을 스캔하거나, 발급 페이지를 폰에서 열면 탭 한 번 설치(iOS)도 가능해요.</div>
          </div>
        </div>`
        : (issueUrl ? `
        <a href="${issueUrl}" target="_blank" rel="noopener" class="action-btn" style="display:block;text-align:center;width:100%;text-decoration:none;background:linear-gradient(135deg,#F97316,#F59E0B);color:#fff;border:none;">🎫 발급 페이지 열기 — 원하는 시점에 발급하세요</a>
        <div style="font-size:0.74rem;color:var(--text-muted);line-height:1.6;margin-top:10px;">발급 전에는 100% 환불 가능 · 발급 후 취소 불가 · 사용일은 현지 활성화부터 카운트돼요. 카카오톡으로 받으신 발급 링크와 동일한 페이지입니다.</div>`
        : `
        <div style="background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.2);border-radius:12px;padding:14px;font-size:0.8rem;font-weight:700;color:#9a5b16;line-height:1.6;">🛠️ 발급 정보를 준비 중이에요 — 준비되면 카카오톡으로 발급 링크를 보내드려요.</div>
        <a href="https://pf.kakao.com/_GSixcn/chat" target="_blank" rel="noopener" class="action-btn" style="display:block;text-align:center;width:100%;text-decoration:none;margin-top:10px;">💬 발급 링크 다시 받기 (카톡 상담)</a>`)}
      </div>`;
    }).join('');
  }

  function openAppSimulator(iccid) {
    activeSimIccid = iccid;
    appSimulatorModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Update Clock time inside simulator dynamically
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    document.getElementById('simTime').textContent = timeStr;

    // Load active item and render screen details
    const savedOrders = JSON.parse(localStorage.getItem('esim_orders') || '[]');
    let foundItem = null;
    
    for (let order of savedOrders) {
      foundItem = order.items.find(item => item.iccid === iccid);
      if (foundItem) break;
    }
    
    if (!foundItem) {
      alert("해당 이심 정보를 찾을 수 없습니다.");
      closeAppSimulator();
      return;
    }
    
    document.getElementById('simCountryName').textContent = `${foundItem.country} eSIM`;
    document.getElementById('simCarrierName').textContent = `${foundItem.carrier} 5G | 로컬 연결망`;
    document.getElementById('simIccidVal').textContent = foundItem.iccid;
    document.getElementById('simPlanVal').textContent = `${foundItem.planLimit} / ${foundItem.planDuration}일`;
    document.getElementById('simExpiryVal').textContent = `${foundItem.planDuration}일 남음 (만료 전 자동 연장)`;

    updateSimulatorUI(foundItem);
  }

  function closeAppSimulator() {
    appSimulatorModal.classList.remove('active');
    if (!productModal.classList.contains('active') && !checkoutModal.classList.contains('active') && !cartDrawerOverlay.classList.contains('active') && !deviceModal.classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }

  function updateSimulatorUI(item) {
    const remainBytes = item.totalBytes - item.usedBytes;
    const remainBytesClamped = Math.max(remainBytes, 0);
    
    // Format remaining bytes to human-readable GB/MB
    let remainStr = '';
    if (remainBytesClamped >= 1024 * 1024 * 1024) {
      remainStr = (remainBytesClamped / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    } else {
      remainStr = (remainBytesClamped / (1024 * 1024)).toFixed(0) + ' MB';
    }
    
    let totalStr = '';
    if (item.totalBytes >= 1024 * 1024 * 1024) {
      totalStr = '/ ' + (item.totalBytes / (1024 * 1024 * 1024)).toFixed(0) + ' GB';
    } else {
      totalStr = '/ ' + (item.totalBytes / (1024 * 1024)).toFixed(0) + ' MB';
    }

    simGaugeValue.textContent = remainStr;
    simGaugeTotal.textContent = totalStr;

    // Draw conic-gradient progress circle
    const usedPct = (item.usedBytes / item.totalBytes) * 100;
    const usedPctClamped = Math.min(Math.max(usedPct, 0), 100);
    const remainPct = 100 - usedPctClamped;

    // conic gradient showing remaining data in accent color
    simGaugeCircle.style.background = `conic-gradient(var(--accent) ${remainPct}%, rgba(255, 255, 255, 0.08) 0%)`;

    // Draw today's chart bar today
    simChartBarToday.style.height = Math.max(usedPctClamped, 5) + '%';

    // Warnings and Push alerts
    if (usedPctClamped >= 100) {
      simPushAlertDesc.textContent = "데이터가 100% 소진되어 연결 속도가 차단되었습니다. 추가 요금제 충전이 필요합니다.";
      simPushAlert.style.display = 'flex';
      simGaugeCircle.style.background = `conic-gradient(#ef4444 100%, rgba(255, 255, 255, 0.08) 0%)`; // red gauge when empty
    } else if (usedPctClamped >= 80) {
      simPushAlertDesc.textContent = "데이터 소진율 80% 돌파! 만료 전 리필 상품 충전을 이용할 수 있습니다.";
      simPushAlert.style.display = 'flex';
      simGaugeCircle.style.background = `conic-gradient(var(--accent-warning) ${remainPct}%, rgba(255, 255, 255, 0.08) 0%)`; // orange warning
    } else {
      simPushAlert.style.display = 'none';
    }
  }

  function simulateConsumption(megabytes) {
    if (!activeSimIccid) return;
    
    const savedOrders = JSON.parse(localStorage.getItem('esim_orders') || '[]');
    let activeOrder = null;
    let activeItem = null;

    for (let order of savedOrders) {
      activeItem = order.items.find(item => item.iccid === activeSimIccid);
      if (activeItem) {
        activeOrder = order;
        break;
      }
    }

    if (!activeItem) return;

    // Add consumed bytes
    const consumedBytes = megabytes * 1024 * 1024;
    activeItem.usedBytes = Math.min(activeItem.usedBytes + consumedBytes, activeItem.totalBytes);

    // Save updated back to localStorage
    localStorage.setItem('esim_orders', JSON.stringify(savedOrders));
    triggerVercelWebhook(newOrder);

    // Update screen
    updateSimulatorUI(activeItem);
  }

  function resetConsumption() {
    if (!activeSimIccid) return;

    const savedOrders = JSON.parse(localStorage.getItem('esim_orders') || '[]');
    let activeItem = null;

    for (let order of savedOrders) {
      activeItem = order.items.find(item => item.iccid === activeSimIccid);
      if (activeItem) break;
    }

    if (!activeItem) return;

    activeItem.usedBytes = 0;
    localStorage.setItem('esim_orders', JSON.stringify(savedOrders));
    triggerVercelWebhook(newOrder);
    updateSimulatorUI(activeItem);
  }

  function setupSimulatorListeners() {
    appSimulatorCloseBtn.addEventListener('click', closeAppSimulator);
    appSimulatorModal.addEventListener('click', (e) => {
      if (e.target === appSimulatorModal) {
        closeAppSimulator();
      }
    });

    document.getElementById('btnSimYoutube').addEventListener('click', () => simulateConsumption(300));
    document.getElementById('btnSimMap').addEventListener('click', () => simulateConsumption(50));
    document.getElementById('btnSimWeb').addEventListener('click', () => simulateConsumption(20));
    document.getElementById('btnSimReset').addEventListener('click', resetConsumption);
  }

  // 19. 자주 묻는 질문(FAQ) 아코디언 토글 리스너
  function setupFaqAccordion() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const accordion = btn.closest('.faq-accordion');
        const isActive = item.classList.contains('active');
        
        // 해당 아코디언 컨테이너 내부의 다른 항목들만 닫아주기
        if (accordion) {
          accordion.querySelectorAll('.faq-item').forEach(el => {
            el.classList.remove('active');
          });
        }
        
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });
  }

  // 20. 플레이오토 EMP API 주문 수집 연동 페이로드 모의 로거
  window.logPlayAutoSyncPayload = function(newOrder) {
    const playAutoPayload = {
      api_key: "YOUR_PLAYAUTO_API_KEY",
      action: "order_collect_push",
      order_info: {
        order_num: newOrder.orderCode,
        mall_id: "jdisim",
        mall_name: "JDISIM 자사몰",
        order_date: new Date().toISOString(),
        payment_price: newOrder.totalPrice,
        buyer: {
          name: newOrder.email.split('@')[0] || "자사몰고객",
          phone: newOrder.phone,
          email: newOrder.email
        },
        receiver: {
          name: newOrder.email.split('@')[0] || "자사몰고객",
          phone: newOrder.phone,
          zipcode: "00000",
          address1: "이메일/알림톡 실시간 전송 (무배송 상품)",
          address2: ""
        },
        items: newOrder.items.map(item => ({
          product_code: item.productCode,
          product_name: item.optionName || `${item.country} ${item.carrier} (${item.planLimit} / ${item.planDuration}일)`,
          quantity: item.quantity,
          price: item.quantity > 0 ? Math.round(newOrder.totalPrice / item.quantity) : 0,
          iccid_issued: item.iccid
        }))
      }
    };
    
    console.group("%c⚙️ [PlayAuto EMP API Sync Demo]", "color: #ff6b6b; font-weight: bold; font-size: 1.1em;");
    console.log("주문이 완료되어 플레이오토 EMP 규격에 부합하는 주문 연동 Payload를 작성했습니다.");
    console.log("해당 Payload가 백엔드(playauto_webhook.js)를 통해 플레이오토 API로 자동 전송됩니다.");
    console.log("전송할 JSON 데이터:", playAutoPayload);
    console.groupEnd();
  };

  // 리얼 후기 동적 렌더링 (대표님 피드백 반영: 한글 짤림/가공 없는 원본 리뷰 본문 출력)
  function renderReviews() {
    const reviewTrack = document.getElementById('reviewTrack');
    if (!reviewTrack || !window.REVIEWS_DATA) return;

    // 요약 지표 주입 (평균 평점 · 후기 수)
    const countEl = document.querySelector('.review-track-count');
    if (countEl && window.REVIEWS_META) {
      countEl.innerHTML = '★★★★★ <span class="review-meta-line">' + window.REVIEWS_META.avg.toFixed(1) + ' / 5.0 · 실구매 후기 ' + window.REVIEWS_META.total + '건</span>';
    }

    const FLAG = { '일본': '🇯🇵', '베트남': '🇻🇳', '태국': '🇹🇭', '대만': '🇹🇼', '미국': '🇺🇸', '중국': '🇨🇳', '유럽': '🇪🇺', '뉴질랜드': '🇳🇿', '인도네시아': '🇮🇩' };
    reviewTrack.innerHTML = '';
    window.REVIEWS_DATA.forEach(rev => {
      const card = document.createElement('div');
      card.className = 'review-track-card rv-card';
      card.setAttribute('data-category', rev.country);
      if (rev.photo) card.setAttribute('data-photo', '1');
      if (rev.best) card.setAttribute('data-best', '1');
      const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
      card.innerHTML = `
        <div class="rv-top">
          <span class="rv-stars">${stars}</span>
          ${rev.best ? '<span class="rv-best">👑 BEST</span>' : ''}
        </div>
        <div class="rv-chips">
          <span class="rv-chip rv-chip-country">${FLAG[rev.country] || '🌏'} ${rev.country}</span>
          ${rev.type ? '<span class="rv-chip rv-chip-type">⏱ ' + rev.type + '</span>' : ''}
        </div>
        ${rev.photo ? '<img class="rv-photo" loading="lazy" src="' + rev.photo + '" alt="구매 후기 사진" onerror="this.remove()">' : ''}
        <p class="rv-body">${rev.body}</p>
        <div class="rv-foot">
          <span class="rv-author">✅ ${rev.author} <em>구매 확정</em></span>
          <span class="rv-date">${rev.date}</span>
        </div>
      `;
      reviewTrack.appendChild(card);
    });
  }

  // 21. 리얼 후기 태그 필터링 및 슬라이더 연동
  function initReviewFiltering() {
    const filterTags = document.querySelectorAll('.review-filter-tag');
    const reviewTrack = document.getElementById('reviewTrack');
    const reviewCards = document.querySelectorAll('.review-track-card');
    
    if (!filterTags.length || !reviewTrack || !reviewCards.length) return;
    
    filterTags.forEach(btn => {
      btn.addEventListener('click', () => {
        // 기존 액티브 클래스 제거
        filterTags.forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        
        const filterVal = btn.getAttribute('data-filter');
        
        // 카드 필터링 처리
        reviewCards.forEach(card => {
          let show;
          if (filterVal === 'all') show = true;
          else if (filterVal === 'photo') show = card.hasAttribute('data-photo');
          else if (filterVal === 'best') show = card.hasAttribute('data-best');
          else show = card.getAttribute('data-category') === filterVal;
          card.style.display = show ? 'flex' : 'none';
        });
      });
    });
  }

  // 22. 글로벌 함수 노출 (HTML onclick 속성 연동 목적)
  window.switchView = switchView;

  // 뒤로가기/앞으로가기 대응: 해시 기준으로 뷰 복원
  const VALID_VIEWS = ['home', 'store', 'orders', 'faq', 'terms', 'privacy', 'refunds', 'partnership'];
  window.addEventListener('popstate', () => {
    // 상품 팝업이 열려 있으면 페이지 이동 대신 팝업만 닫기
    if (productModal && productModal.classList.contains('active')) {
      productModal.classList.remove('active');
      productModal.classList.remove('anchored');
      document.querySelectorAll('.jd-spotlight').forEach(el => el.classList.remove('jd-spotlight'));
      window.__modalAnchor = null;
      document.body.style.overflow = 'auto';
      if (window.__globeSearch) {
        window.__globeSearch = false;
        const si = document.getElementById('storeSearchInput');
        if (si) si.value = '';
        searchQuery = '';
        renderGrid();
      }
      return;
    }
    const v = (location.hash || '#home').replace('#', '');
    suppressHistory = true;
    switchView(VALID_VIEWS.includes(v) ? v : 'home');
    suppressHistory = false;
  });
  // 새로고침/링크 직접 진입 시 해시에 맞는 뷰로 시작
  (function restoreFromHash() {
    const v = location.hash.replace('#', '');
    if (v && v !== 'home' && VALID_VIEWS.includes(v)) {
      suppressHistory = true;
      switchView(v);
      suppressHistory = false;
    }
  })();
  window.scrollToElement = function(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };


  // 23. 리얼 후기 마우스 드래그 스와이프 기능 연동 (PC 데스크톱 드래그 대응)
  function initDragScroll() {
    const slider = document.getElementById('reviewTrack');
    if (!slider) return;
    
    let isDown = false;
    let startX;
    let scrollLeft;
    
    slider.addEventListener('mousedown', (e) => {
      isDown = true;
      slider.style.cursor = 'grabbing';
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    
    slider.addEventListener('mouseleave', () => {
      isDown = false;
      slider.style.cursor = 'grab';
    });
    
    slider.addEventListener('mouseup', () => {
      isDown = false;
      slider.style.cursor = 'grab';
    });
    
    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5; // 스크롤 민감도 계수
      slider.scrollLeft = scrollLeft - walk;
    });
    
    // 기본 마우스 커서 grab 설정
    slider.style.cursor = 'grab';
  }

  // 24. 리얼 후기 섹션 접기/펼치기 아코디언 제어
  function initReviewExpander() {
    const expandWrapper = document.getElementById('reviewExpandWrapper');
    const expandBtn = document.getElementById('reviewExpandBtn');
    if (!expandWrapper || !expandBtn) return;
    
    expandBtn.addEventListener('click', () => {
      const isExpanded = expandWrapper.classList.contains('expanded');
      if (isExpanded) {
        expandWrapper.classList.remove('expanded');
        expandBtn.innerHTML = '💬 리얼 고객 후기 전체 보기 (펼치기) ▾';
        // 접었을 때 섹션 위로 포커싱 이동
        const section = document.querySelector('.review-track-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        expandWrapper.classList.add('expanded');
        expandBtn.innerHTML = '닫기 ▴';
      }
    });
  }


  // 25. 제휴 및 파트너십 문의 접수 처리
  window.submitPartnershipInquiry = function() {
    const company = document.getElementById('partnerCompany').value.trim();
    const name = document.getElementById('partnerName').value.trim();
    const email = document.getElementById('partnerEmail').value.trim();
    const phone = document.getElementById('partnerPhone').value.trim();
    const details = document.getElementById('partnerDetails').value.trim();
    
    if (!company || !name || !email || !phone || !details) {
      alert("모든 필수 항목을 입력해 주세요.");
      return;
    }
    
    alert(`제휴 문의가 성공적으로 접수되었습니다!\n\n담당자가 제안 내용을 확인한 후 남겨주신 이메일(${email})로 영업일 기준 24시간 이내에 정성껏 회신 드리겠습니다. JDISIM과의 소중한 인연에 감사드립니다.`);
    
    // 폼 초기화 후 메인화면으로 이동
    document.getElementById('partnershipForm').reset();
    switchView('home');
  };

  renderReviews();
  initReviewFiltering();
  setupFaqAccordion();
  initDragScroll();
  initReviewExpander();
  // ================= [프리미엄 리디자인] 마퀴 · 여우 카드 · 결제 수단 =================
  window.selectedPayMethod = 'kakaopay';

  function initPremiumUI() {
    // 1. 국가 해시태그 마퀴 렌더링 (2벌 복제로 무한 스크롤)
    // 지구본/마퀴 공용: 국가명으로 스토어 이동
    window.jdisimGoCountry = function (country) {
      const input = document.getElementById('storeSearchInput');
      if (input) input.value = country;
      searchQuery = String(country).toLowerCase();
      window.__globeSearch = true; // 지구본/전광판/마퀴에서 건 검색 표시
      switchView('store');
      renderGrid();
    };

    const marquee = document.getElementById('countryMarquee');
    if (marquee && productsData.length) {
      const countries = [...new Set(productsData.map(p => p.country))].slice(0, 14);
      const tagsHtml = countries.map(c => `<div class="marquee-tag" data-country="${c}">#${c}</div>`).join('');
      marquee.innerHTML = tagsHtml + tagsHtml; // seamless loop
      marquee.addEventListener('click', (e) => {
        const tag = e.target.closest('.marquee-tag');
        if (!tag) return;
        window.jdisimGoCountry(tag.getAttribute('data-country'));
      });
    }

    // 2. 여우 기종진단 카드
    const foxDevice = document.getElementById('foxDeviceCheckCard');
    if (foxDevice) foxDevice.addEventListener('click', () => openDeviceModal());

    // 3. 결제 수단 선택
    const payGroup = document.getElementById('payMethodGroup');
    if (payGroup) {
      payGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.pay-method-btn');
        if (!btn) return;
        payGroup.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        window.selectedPayMethod = btn.getAttribute('data-method');
      });
    }
  }

  await init();
  initPremiumUI();
});
