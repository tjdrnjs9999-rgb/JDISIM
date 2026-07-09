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
        
        <label class="cart-item-addon-check">
          <input type="checkbox" class="cart-item-addon-cb" data-index="${index}" ${item.addon ? 'checked' : ''}>
          <span>맛집 지도 & 가이드북 추가 (+1,900원)</span>
        </label>
        
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
      
      card.querySelector('.cart-item-addon-cb').addEventListener('change', (e) => {
        cart[index].addon = e.target.checked;
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

    // 부가상품 체크 박스 체인지 리스너
    checkoutAddon.addEventListener('change', () => {
      const basePrice = parseInt(paySubmitBtn.getAttribute('data-price'));
      const isChecked = checkoutAddon.checked;
      const finalPrice = isChecked ? basePrice + 1900 : basePrice;
      paySubmitBtn.textContent = `${finalPrice.toLocaleString()}원 결제 완료하기`;
    });

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
        showPrecautionModalForItems(cart);
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

    // 모든 뷰 숨기기 (안전 가드 처리)
    const allViews = [viewHome, viewStore, viewOrders, viewTerms, viewPrivacy, viewRefunds, viewPartnership];
    allViews.forEach(v => {
      if (v) v.classList.remove('active');
    });

    // 선택한 뷰 활성화
    if (viewId === 'home') {
      if (viewHome) viewHome.classList.add('active');
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
      
      p.plans.forEach(pl => {
        if (pl.final_price < g.minPrice) {
          g.minPrice = pl.final_price;
        }
        if (pl.data_limit === '무제한') {
          g.has_unlimited = true;
        }
      });
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
            <span class="card-tag local" style="background-color:#10b981;">인기 상품</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">
            <span>${g.country}</span>
            <span class="card-carrier" style="font-size: 0.75rem; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${carriersStr}</span>
          </div>
          <div class="card-specs">
            <div class="card-spec-item">📶 ${speedsStr}</div>
            <div class="card-spec-item">📞 ${callsStr}</div>
            <div class="card-spec-item">⚡ 1분 개통</div>
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
          c.plans.forEach(pl => {
            if (pl.final_price < absoluteMin) {
              absoluteMin = pl.final_price;
              bestCarrier = c;
            }
          });
        });
        openModal(bestCarrier);
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
            ${g.has_unlimited ? '<span class="card-tag best" style="background-color:#a855f7; color:#fff;">무제한</span>' : ''}
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">
            <span>${g.country}</span>
            <span class="card-carrier" style="font-size: 0.75rem; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${carriersStr}</span>
          </div>
          <div class="card-specs">
            <div class="card-spec-item">📶 ${speedsStr}</div>
            <div class="card-spec-item">📞 ${callsStr}</div>
            <div class="card-spec-item">⚡ 1분 개통</div>
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
          c.plans.forEach(pl => {
            if (pl.final_price < absoluteMin) {
              absoluteMin = pl.final_price;
              bestCarrier = c;
            }
          });
        });
        openModal(bestCarrier);
      });
      
      productGrid.appendChild(card);
    });
  }

  // 11. 모달창 열기 및 데이터 연동

  // ===== 드롭다운 현대화: select를 숨기고 알약/카드 UI로 변환 =====
  // 표시용 통신사명 정리: '1티어 로밍망' 같은 괄호 수식어 제거 (내부 값은 원본 유지)
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

  function openModal(prod) {
    activeProduct = prod;
    
    // 동일 국가의 다른 캐리어(통신사)가 있는지 확인
    const sameCountryProducts = productsData.filter(p => p.country === prod.country);
    activeCarrier = prod;
    
    // 데이터 및 기간 초기화
    const firstPlan = activeCarrier.plans[0];
    activeDataLimit = firstPlan.data_limit;
    activeDuration = firstPlan.duration;
    activeQuantity = 1; // 수량 초기화

    renderModalContent(sameCountryProducts);
    
    productModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // 스크롤 락
    history.pushState({ modal: true }, '', location.hash || '#home');
  }

  // 12. 모달 세부 콘텐츠 구성 렌더링 (원가표 모든 세부 필드 연동 완료)
  function renderModalContent(carrierOptions) {
    // 4단계 캐스케이딩 옵션 로직 (데일리/총용량 구분)
    const p = activeCarrier;
    
    // 1. Available Types (데일리 vs 총용량)
    const types = new Set();
    p.plans.forEach(pl => {
      if (pl.service_type === '데일리' || pl.service_type === '무제한') types.add('데일리');
      else if (pl.service_type === '총용량' || pl.data_limit.includes('총')) types.add('총용량');
      else types.add('총용량');
    });
    const typeList = Array.from(types);
    
    // Validate activePlanType
    if (!window.activePlanType || !typeList.includes(window.activePlanType)) {
      window.activePlanType = typeList[0];
    }
    
    // 2. Filter plans by Type
    const isDaily = (window.activePlanType === '데일리');
    const typeFilteredPlans = p.plans.filter(pl => (pl.service_type === '데일리' || pl.service_type === '무제한') === isDaily);
    
    // 3. Available Capacities
    const caps = new Set();
    typeFilteredPlans.forEach(pl => {
      const c = pl.data_limit.replace('매일 ', '').replace('총 ', '').trim();
      caps.add(c);
    });
    const capList = Array.from(caps).sort((a,b) => {
       const parseSize = s => parseFloat(s.replace(/[^\d.]/g, '')) * (s.includes('MB') ? 1 : 1024);
       return parseSize(a) - parseSize(b);
    });
    
    if (!activeDataLimit || !capList.includes(activeDataLimit.replace('매일 ', '').replace('총 ', '').trim())) {
      activeDataLimit = (isDaily ? '매일 ' : (typeFilteredPlans[0].data_limit.includes('총') ? '총 ' : '')) + capList[0];
    }
    
    const cleanActiveData = activeDataLimit.replace('매일 ', '').replace('총 ', '').trim();
    
    // 4. Available Durations
    const durFilteredPlans = typeFilteredPlans.filter(pl => pl.data_limit.replace('매일 ', '').replace('총 ', '').trim() === cleanActiveData);
    const availableDurations = Array.from(new Set(durFilteredPlans.map(pl => pl.duration))).sort((a, b) => a - b);
    
    if (!availableDurations.includes(activeDuration)) {
      activeDuration = availableDurations[0];
    }
    
    activePlan = durFilteredPlans.find(pl => pl.duration === activeDuration) || durFilteredPlans[0];
    
    // 최종 금액 계산
    const basePrice = activePlan.final_price;
    const finalPriceVal = Math.round(basePrice + (activeQuantity - 1) * basePrice * 0.9);
    
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
        
        <!-- 1. 통신사 및 네트워크망 선택-->
        <div class="config-group">
          <div class="config-section-title">1. 통신사 및 네트워크망 선택</div>
          <select id="carrierSelect" class="checkout-input" style="width: 100%; height: 48px; border-radius: var(--radius-sm); padding: 0 16px; background: var(--bg-tertiary); color: var(--text-main); font-size: 0.85rem; cursor: pointer; outline: none; border: 1px solid var(--border-color); margin-top: 6px;">
            ${carrierOptions.map(co => `
              <option value="${co.carrier}" data-name="${co.carrier}" data-net="${co.network_type}" data-speed="${co.network_speed}" ${co.carrier === p.carrier ? 'selected' : ''}>
                ${window.cleanCarrierName(co.carrier)} (${co.network_type} · ${co.network_speed})
              </option>
            `).join('')}
          </select>
        </div>

        <!-- 2. 플랜 타입 선택 -->
        <div class="config-group">
          <div class="config-section-title">2. 플랜 타입 (데일리 vs 총용량)</div>
          <select id="planTypeSelect" class="checkout-input" style="width: 100%; height: 48px; border-radius: var(--radius-sm); padding: 0 16px; background: var(--bg-tertiary); color: var(--text-main); font-size: 0.85rem; cursor: pointer; outline: none; border: 1px solid var(--border-color); margin-top: 6px;">
            ${typeList.map(t => `<option value="${t}" ${t === window.activePlanType ? 'selected' : ''}>${t === '데일리' ? '📅 데일리 (매일 리셋)' : '🎒 총용량 (전체 기간)'}</option>`).join('')}
          </select>
        </div>

        <!-- 3. 데이터 용량 선택 -->
        <div class="config-group">
          <div class="config-section-title">3. 데이터 용량 선택</div>
          <select id="capacitySelect" class="checkout-input" style="width: 100%; height: 48px; border-radius: var(--radius-sm); padding: 0 16px; background: var(--bg-tertiary); color: var(--text-main); font-size: 0.85rem; cursor: pointer; outline: none; border: 1px solid var(--border-color); margin-top: 6px;">
            ${capList.map(c => `<option value="${c}" ${c === cleanActiveData ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>

        <!-- 4. 이용 일수 선택 -->
        <div class="config-group">
          <div class="config-section-title">4. 이용 일수 (기간) 선택</div>
          <select id="durationSelect" class="checkout-input" style="width: 100%; height: 48px; border-radius: var(--radius-sm); padding: 0 16px; background: var(--bg-tertiary); color: var(--text-main); font-size: 0.85rem; cursor: pointer; outline: none; border: 1px solid var(--border-color); margin-top: 6px;">
            ${availableDurations.map(dur => `
              <option value="${dur}" ${dur === activeDuration ? 'selected' : ''}>${dur}일</option>
            `).join('')}
          </select>
        </div>
      </div>
      </div>

      <!-- Right Sidebar (Pricing & Specs - 원가표 모든 스펙 연동) -->
      <div class="modal-sidebar">
        <!-- 24시간 안심 케어 보증 상단 표시 -->
        <div class="safety-care-mini" style="display:flex; align-items:center; gap:6px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); padding:8px 12px; border-radius:var(--radius-sm); margin-bottom:12px; font-size:0.75rem; color:#10b981; font-weight:700;">
          <span>🛡️ 24시간 긴급 안심 케어 서비스 무료 포함</span>
        </div>

        <div class="price-summary-box">
          <div class="summary-row">
            <span>선택한 데이터</span>
            <span style="color:var(--text-main); font-weight:700;">${activeDataLimit} (${activePlan.service_type})</span>
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
          <button class="cta-buy" id="buyNowBtn">
            <span class="cta-buy-main">⚡ 즉시 구매하기</span>
            <span class="cta-buy-sub">${finalPriceVal.toLocaleString()}원 · 카카오페이/카드</span>
          </button>
          <button class="cta-cart" id="addToCartBtn">🛒 장바구니 담기</button>
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
        const targetProd = carrierOptions.find(co => co.carrier === e.target.value);
        if (targetProd) {
          activeCarrier = targetProd;
          // Reset child states
          window.activePlanType = null;
          activeDataLimit = null;
          activeDuration = null;
          renderModalContent(carrierOptions);
        }
      });
    }

    const ptSelect = document.getElementById('planTypeSelect');
    if (ptSelect) {
      ptSelect.addEventListener('change', (e) => {
        window.activePlanType = e.target.value;
        activeDataLimit = null;
        activeDuration = null;
        renderModalContent(carrierOptions);
      });
    }

    const capSelect = document.getElementById('capacitySelect');
    if (capSelect) {
      capSelect.addEventListener('change', (e) => {
        const isDaily = (window.activePlanType === '데일리');
        activeDataLimit = (isDaily ? (typeFilteredPlans.find(tp => tp.data_limit.replace('매일 ', '').trim() === e.target.value).data_limit.includes('매일') ? '매일 ' : '') : '') + e.target.value;
        activeDuration = null;
        renderModalContent(carrierOptions);
      });
    }

    const durSelect = document.getElementById('durationSelect');
    if (durSelect) {
      durSelect.addEventListener('change', (e) => {
        activeDuration = parseInt(e.target.value);
        renderModalContent(carrierOptions);
      });
    }

    // 기간 변경 리스너
    const durationSelect = document.getElementById('durationSelect');
    if (durationSelect) {
      durationSelect.addEventListener('change', (e) => {
        activeDuration = parseInt(e.target.value);
        renderModalContent(carrierOptions);
      });
    }

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
      const customPrecs = getCustomPrecautions(activeCarrier.country, activeCarrier.carrier);
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
      showPrecautionModalForItems([instantItem]);
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
  function getCustomPrecautions(country, carrier) {
    const list = [];
    const normalizedCountry = country.toLowerCase();
    const normalizedCarrier = carrier.toLowerCase();

    // 5. 국가별/통신사별 상세 맞춤 특이사항 (크롤링 및 매칭)
    if (normalizedCountry.includes('일본')) {
      if (normalizedCarrier.includes('소프트뱅크')) {
        list.push("<strong>소프트뱅크 실시간 사용량 조회 불가:</strong> 소프트뱅크망 특성상 실시간 데이터 사용량 조회가 불가하며, 현지 통신사 집계 지연으로 인해 2일 전 누적 사용량 기준 지연 반영됩니다.");
      } else if (normalizedCarrier.includes('도코모')) {
        list.push("<strong>도코모 APN 수동 설정:</strong> 자동 연결 실패 시 셀룰러 네트워크 설정에서 APN(spmode.ne.jp)을 수동 등록해야 개통됩니다.");
      }
    }
    
    if (normalizedCountry.includes('베트남')) {
      list.push("<strong>베트남 시간 기준 일일 리셋:</strong> 매일 23:00(베트남 시간 기준)에 일일 사용 용량이 자동 리셋/초기화됩니다.");
      list.push("<strong>비엣텔망 수동 고정:</strong> 신호 연결 시 속도가 느린 Vietnamobile로 자동 지정되는 경우, 셀룰러 설정에서 수동으로 'Viettel'망을 강제 고정해 주세요.");
      list.push("<strong>ChatGPT 접속 제한 안내:</strong> 본 상품은 홍콩 IP를 경유하므로 보안상 ChatGPT 등의 특수 해외 서비스 접속이 원활하지 않을 수 있습니다.");
      list.push("<strong>15일 유효기간 준수:</strong> 발급일로부터 15일 이내에 반드시 현지 신호 연결을 최초 활성화하셔야 정상 작동됩니다.");
    }

    if (normalizedCountry.includes('대만')) {
      list.push("<strong>실명 인증(KYC) 등록 필수:</strong> 대만 통신법에 따라 eSIM 스캔 직후 현지에서 수신되는 문자 링크로 여권 실명 등록(KYC)을 완료해 주셔야 데이터 차단이 해제됩니다.");
    }

    if (normalizedCountry.includes('미국') || normalizedCountry.includes('캐나다') || normalizedCountry.includes('괌') || normalizedCountry.includes('사이판')) {
      list.push("<strong>사전 개통 희망일 지정 필수:</strong> 결제 후 전송되는 링크/안내 메일로 <strong>출국 최소 1~2일 전 개통 날짜를 등록</strong>해야 정상 활성화됩니다.");
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
      list.push("<strong>개통 예약 신청 필수 (Orange):</strong> 원활한 자동 개통을 위해 결제란에서 <strong>실제 여행 도착 예정일보다 하루 전날</strong>을 개통일로 꼭 기입해 주세요.");
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
  function showPrecautionModalForItems(items) {
    checkoutItems = items;
    
    const countries = [...new Set(items.map(item => item.product.country))];
    const carriers = [...new Set(items.map(item => item.product.carrier))];
    
    let html = '';

    // [0] 선택 상품 스펙 요약 (구매 직전 최종 확인)
    const totalQty = items.reduce((s, it) => s + (it.quantity || 1), 0);
    const totalPrice = items.reduce((s, it) => s + (it.plan.final_price * (it.quantity || 1)), 0);
    const specRows = items.map(it => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border-color); font-size: 0.85rem;">
        <span style="font-weight: 700; color: var(--text-main);">${it.product.country} · ${it.product.carrier}</span>
        <span style="color: var(--text-muted);">${it.plan.data_limit} / ${it.plan.duration}일 × ${it.quantity || 1}개</span>
      </div>`).join('');
    html += `
      <div style="background: var(--accent-light); border: 1px solid rgba(242,117,31,0.25); border-radius: 12px; padding: 14px 16px; margin-bottom: 4px;">
        <div style="font-size: 0.8rem; font-weight: 800; color: var(--accent); margin-bottom: 6px;">🧾 선택하신 상품 스펙</div>
        ${specRows}
        <div style="display: flex; justify-content: space-between; padding-top: 10px; font-weight: 800; font-size: 0.92rem;">
          <span>총 ${totalQty}개</span><span style="color: var(--accent);">${totalPrice.toLocaleString()}원</span>
        </div>
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
      <div class="prec-accordion-item active">
        <div class="prec-accordion-header">
          <span>📶 상품 스펙 한눈에 보기</span>
          <span class="arrow">▼</span>
        </div>
        <div class="prec-accordion-content">${specItems}</div>
      </div>
    `;

    // EID 아코디언 (기본 열림: active 클래스)
    html += `
      <div class="prec-accordion-item active">
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

    // 교환/환불 아코디언 (기본 열림: active 클래스)
    html += `
      <div class="prec-accordion-item active">
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
      const precs = getCustomPrecautions(item.product.country, item.product.carrier);
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
    productModal.classList.remove('active');
    document.body.style.overflow = 'auto'; // 스크롤 복구
    if (history.state && history.state.modal) history.back(); // 히스토리 정리
  }

  // 14. 결제 입력창 열기
  function openCheckoutFlow(items) {
    if (window.resetConsent) window.resetConsent(); // 결제창 열 때마다 동의 초기화
    closeModal();
    closeCartDrawer();
    
    checkoutItems = items;
    checkoutEmailInput.value = '';
    checkoutPhoneInput.value = '';
    
    // 개통 희망일 입력 박스 초기화 및 활성화 여부 제어
    let requiresActivationDate = false;
    items.forEach(item => {
      const carrierName = item.product.carrier.toLowerCase();
      const countryName = item.product.country.toLowerCase();
      const isOrangeSpain = carrierName.includes('오렌지스페인') || carrierName.includes('orange스페인');
      const isUSAOrCanada = countryName.includes('미국') || countryName.includes('캐나다') || countryName.includes('괌') || countryName.includes('사이판');
      if (isOrangeSpain || isUSAOrCanada) {
        requiresActivationDate = true;
      }
    });
    
    if (requiresActivationDate) {
      checkoutActivationDateGroup.style.display = 'block';
      checkoutActivationDate.required = true;
      checkoutActivationDate.value = '';
    } else {
      checkoutActivationDateGroup.style.display = 'none';
      checkoutActivationDate.required = false;
      checkoutActivationDate.value = '';
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
            ${item.product.carrier} | ${item.plan.data_limit} / ${item.plan.duration}일${item.addon ? ' | 📍 가이드북 추가' : ''}
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

    // 결제창 국가별 맞춤형 스펙/주의사항 카드 동적 렌더링
    const checkoutPrecautionCard = document.getElementById('checkoutPrecautionCard');
    const checkoutPrecautionList = document.getElementById('checkoutPrecautionList');
    if (checkoutPrecautionCard && checkoutPrecautionList) {
      let combinedPrecs = [];
      items.forEach(item => {
        const precs = getCustomPrecautions(item.product.country, item.product.carrier);
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
    const email = checkoutEmailInput.value.trim();
    const phone = checkoutPhoneInput.value.trim();
    
    if (!email || !phone) {
      alert('이메일 주소와 휴대폰 번호를 모두 입력해 주셔야 이심 QR코드를 정확하게 발송해 드릴 수 있어요.');
      return;
    }
    
    if (!email.includes('@')) {
      alert('이메일 형식이 올바르지 않습니다. 혹시 오타가 없는지 한 번만 확인해 주세요!');
      return;
    }

    // 개통희망일 지정 유효성 검사
    if (checkoutActivationDate.required && !checkoutActivationDate.value) {
      alert('유럽 오렌지 스페인 및 북미 상품은 현지 개통을 위해 개통 희망일을 반드시 지정해 주셔야 합니다.');
      return;
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
          }
        }).then(function (rsp) {
          if (rsp.code != null) {
            alert(`결제에 실패하였습니다.\n사유: ${rsp.message}`);
            const forcePay = confirm("테스트 모드이므로 가상으로 결제를 완료하고 영수증 화면으로 이동하시겠습니까?");
            if (forcePay) submitPayment(orderCode, priceVal);
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
              submitPayment(orderCode, priceVal);
            }
          }
        });
      } else {
        submitPayment(orderCode, priceVal);
      }
    } else {
      submitPayment(orderCode, priceVal);
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

  function submitPayment(orderCode, finalPriceVal) {
    const email = checkoutEmailInput.value.trim();
    const phone = checkoutPhoneInput.value.trim();
    const activationDateVal = checkoutActivationDate.value;
    
    // 주문 내역 로컬 스토리지 저장
    const newOrder = {
      orderCode: orderCode,
      date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      email: email,
      phone: phone,
      totalPrice: finalPriceVal,
      activationDate: activationDateVal || '',
      items: checkoutItems.map(item => {
        const randIccid = '89823' + Math.floor(100000000000000 + Math.random() * 900000000000000);
        
        const planLimitStr = item.plan.data_limit;
        let totalBytes = 10 * 1024 * 1024 * 1024; // default 10GB
        if (planLimitStr.includes('1GB')) {
          totalBytes = 1 * 1024 * 1024 * 1024;
        } else if (planLimitStr.includes('2GB')) {
          totalBytes = 2 * 1024 * 1024 * 1024;
        } else if (planLimitStr.includes('3GB')) {
          totalBytes = 3 * 1024 * 1024 * 1024;
        } else if (planLimitStr.includes('5GB')) {
          totalBytes = 5 * 1024 * 1024 * 1024;
        } else if (planLimitStr.includes('20GB')) {
          totalBytes = 20 * 1024 * 1024 * 1024;
        } else if (planLimitStr.includes('30GB')) {
          totalBytes = 30 * 1024 * 1024 * 1024;
        } else if (planLimitStr.includes('50GB')) {
          totalBytes = 50 * 1024 * 1024 * 1024;
        } else if (planLimitStr.includes('무제한')) {
          totalBytes = 100 * 1024 * 1024 * 1024; // treat unlimited as 100GB
        }
        
        const prodCode = item.plan.product_code || 'LS2026-eSIM-00000';
        const duration = item.plan.duration;
        const lookupKey = `${prodCode}_${duration}`;
        
        // 원가표 매핑용 옵션코드(옵션명) 조회
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
          optionName: optionName, // 원가표 사용일수 옵션명 (예: JSX_일본소프트뱅크_매일5GB_01일)
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
      
      const mockCode = item.plan.product_code || 'LS2026-eSIM-00000';
      
      card.innerHTML = `
        <div class="receipt-item-header">
          <div class="receipt-item-title">${item.product.country} eSIM</div>
          <div class="receipt-item-code">${mockCode}</div>
        </div>
        <div class="receipt-item-qr-layout">
          <div class="receipt-item-qr-box">
            <svg class="receipt-item-qr-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="#fff" />
              <rect x="10" y="10" width="20" height="20" fill="#000" />
              <rect x="12" y="12" width="16" height="16" fill="#fff" />
              <rect x="14" y="14" width="12" height="12" fill="#000" />
              <rect x="70" y="10" width="20" height="20" fill="#000" />
              <rect x="72" y="12" width="16" height="16" fill="#fff" />
              <rect x="74" y="14" width="12" height="12" fill="#000" />
              <rect x="10" y="70" width="20" height="20" fill="#000" />
              <rect x="12" y="72" width="16" height="16" fill="#fff" />
              <rect x="14" y="74" width="12" height="12" fill="#000" />
              <rect x="78" y="78" width="12" height="12" fill="#000" />
              <rect x="40" y="20" width="8" height="8" fill="#000" />
              <rect x="52" y="12" width="6" height="10" fill="#000" />
              <rect x="45" y="35" width="12" height="6" fill="#000" />
              <rect x="15" y="45" width="8" height="12" fill="#000" />
              <rect x="35" y="55" width="20" height="10" fill="#000" />
              <rect x="65" y="45" width="10" height="20" fill="#000" />
              <rect x="75" y="35" width="8" height="8" fill="#000" />
              <rect x="25" y="75" width="10" height="10" fill="#000" />
              <rect x="45" y="75" width="8" height="12" fill="#000" />
              <rect x="58" y="70" width="10" height="8" fill="#000" />
              <rect x="58" y="82" width="12" height="8" fill="#000" />
            </svg>
          </div>
          <div class="receipt-item-info-table">
            <div class="receipt-item-info-row">
              <span>통신사</span>
              <span>${item.product.carrier}</span>
            </div>
            <div class="receipt-item-info-row">
              <span>선택 요금제</span>
              <span>${item.plan.data_limit} / ${item.plan.duration}일</span>
            </div>
            <div class="receipt-item-info-row">
              <span>구매 수량</span>
              <span>${item.quantity}개</span>
            </div>
            ${item.addon ? `
            <div class="receipt-item-info-row" style="color: #10b981;">
              <span>📍 가이드북</span>
              <span>추가됨</span>
            </div>` : ''}
            ${activationDateVal ? `
            <div class="receipt-item-info-row" style="color: var(--accent-warning);">
              <span>📅 개통일</span>
              <span>${activationDateVal}</span>
            </div>` : ''}
          </div>
        </div>
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
    
    let successMsg = `🎉 결제가 정상 처리되었습니다!\n입력하신 이메일(${email})로 개통용 QR코드가 즉시 발송되었습니다.`;
    const requiresActivation = checkoutActivationDate.required && checkoutActivationDate.value;
    if (requiresActivation) {
      successMsg = `🎉 예약 결제가 정상 처리되었습니다!\n입력하신 이메일(${email})로 안내 메일이 발송되었습니다.\n(지정하신 개통일 [${checkoutActivationDate.value}]에 맞춰 현지망 활성화가 순차 진행됩니다.)`;
    }
    
    let hasAddon = checkoutItems.some(item => item.addon);
    if (hasAddon) {
      successMsg += `\n\n🎁 [추가 혜택] 선택하신 맛집 가이드북 및 구글 맵 맛집 지도 다운로드 링크가 이메일에 함께 첨부되었습니다!`;
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
  const DIAG_BRAND_MODELS = {
    Apple: [
      // iPhones
      { name: "iPhone 16 / 16 Plus / 16 Pro / 16 Pro Max", status: "success" },
      { name: "iPhone 15 / 15 Plus / 15 Pro / 15 Pro Max", status: "success" },
      { name: "iPhone 14 / 14 Plus / 14 Pro / 14 Pro Max", status: "success" },
      { name: "iPhone 13 / 13 mini / 13 Pro / 13 Pro Max", status: "success" },
      { name: "iPhone 12 / 12 mini / 12 Pro / 12 Pro Max", status: "success" },
      { name: "iPhone 11 / 11 Pro / 11 Pro Max", status: "success" },
      { name: "iPhone XS / XS Max / XR", status: "success" },
      { name: "iPhone SE (3세대 - 2022)", status: "success" },
      { name: "iPhone SE (2세대 - 2020)", status: "success" },
      { name: "iPhone X / 8 / 8 Plus 및 이전 모든 기종", status: "danger", note: "아이폰 X, 8, 7, 6s, SE 1세대 이하 구형 기종들은 메인보드 내부에 eSIM 전용 하드웨어 칩(eUICC)이 내장되어 있지 않아 사용이 완전히 불가능합니다. 유심(USIM) 상품을 구매해 주세요." },
      // iPads
      { name: "iPad Pro 11-inch (1세대 ~ 4세대) [셀룰러 모델]", status: "success" },
      { name: "iPad Pro 12.9-inch (3세대 ~ 6세대) [셀룰러 모델]", status: "success" },
      { name: "iPad Air (3세대 ~ 5세대) [셀룰러 모델]", status: "success" },
      { name: "iPad mini (5세대 ~ 6세대) [셀룰러 모델]", status: "success" },
      { name: "iPad (7세대 ~ 10세대) [셀룰러 모델]", status: "success" },
      { name: "iPad (모든 WiFi 전용 기종 - 심 카드 슬롯 없음)", status: "danger", note: "와이파이 전용 아이패드는 무선 셀룰러 통신 모듈 및 물리 심/이심 슬롯이 전혀 장착되어 있지 않아 개통이 불가합니다." }
    ],
    Samsung: [
      // Flagships (S Series)
      { name: "Galaxy S24 / S24+ / S24 Ultra", status: "success" },
      { name: "Galaxy S23 / S23+ / S23 Ultra / S23 FE", status: "success" },
      { name: "Galaxy S22 / S22+ / S22 Ultra (국내 정식 발매판)", status: "danger", note: "국내에 정식 발매된 갤럭시 S22 시리즈는 하드웨어 칩셋 상 eSIM 기능이 차단되어 사용이 불가능합니다. 해외 직구폰인 경우에만 제한적으로 지원할 수 있으니 EID 조회를 진행하세요." },
      { name: "Galaxy S22 / S22+ / S22 Ultra (해외 직구판)", status: "warning", note: "해외 사양 단말기인 경우 국가/버전에 따라 일부 eSIM 부품이 탑재되어 있을 수 있습니다. 다이얼러에서 *#06#를 입력하여 EID가 정상 표시되는지 대조해 주시기 바랍니다." },
      { name: "Galaxy S21 / S21+ / S21 Ultra / S21 FE (국내 정식 발매판)", status: "danger", note: "갤럭시 S21 시리즈 국내판은 eSIM을 탑재하고 있지 않습니다." },
      { name: "Galaxy S21 / S21+ / S21 Ultra / S21 FE (해외 직구판)", status: "warning", note: "해외판 기기는 국가 사양에 따라 지원 여부가 달라지므로 다이얼러에서 *#06# 후 EID 조회가 요구됩니다." },
      { name: "Galaxy S20 / S20+ / S20 Ultra (국내 정식 발매판)", status: "danger", note: "갤럭시 S20 시리즈 국내판은 eSIM을 탑재하고 있지 않습니다." },
      { name: "Galaxy S20 / S20+ / S20 Ultra (해외 직구판)", status: "warning", note: "해외판 기기는 국가 사양에 따라 지원 여부가 달라지므로 다이얼러에서 *#06# 후 EID 조회가 요구됩니다." },
      // Foldables (Z Series)
      { name: "Galaxy Z Flip 6 / Z Fold 6", status: "success" },
      { name: "Galaxy Z Flip 5 / Z Fold 5", status: "success" },
      { name: "Galaxy Z Flip 4 / Z Fold 4", status: "success" },
      { name: "Galaxy Z Flip 3 / Z Fold 3 및 이전 구형 폴더블", status: "danger", note: "Z플립3, Z폴드3 이하 기종들은 국내판과 해외판 모두 eSIM 부품을 탑재하지 않았습니다. 유심 상품을 이용해 주세요." },
      // Mid-range (A Series & Quantum)
      { name: "Galaxy A25 5G / A35 5G / A55 5G (국내 정발판)", status: "success" },
      { name: "Galaxy A15 / A24 / A34 / A54 (국내 정발판)", status: "danger", note: "삼성 보급형 A시리즈 모델 중 국내 정식 유통된 모델들은 A25, A35, A55 기종만 이심을 탑재하였습니다. 그 외 A시리즈는 이심 하드웨어가 내장되어 있지 않습니다." },
      { name: "Galaxy Quantum 4 (SKT 전용)", status: "success" },
      { name: "Galaxy Quantum 1 / 2 / 3 (SKT 전용)", status: "danger", note: "양자보안 라인업 중 퀀텀 4 기종을 제외한 이전 모든 모델은 이심 미탑재 단말기입니다." },
      // Notes
      { name: "Galaxy Note 20 / Note 20 Ultra (국내 정식 발매판)", status: "danger", note: "국내판 노트 20 시리즈는 이심을 전혀 지원하지 않습니다." },
      { name: "Galaxy Note 20 / Note 20 Ultra (해외 직구판)", status: "warning", note: "해외 직구폰인 경우 미국/유럽/홍콩 버전의 사양에 따라 이심 칩셋이 있을 수 있으니 EID를 검증해 주세요." },
      { name: "Galaxy Note 10 / Note 10+ 및 이전 노트 기종", status: "danger", note: "노트 10 이하 모델들은 국내/해외 사양 전체 eSIM 미지원 기기입니다." },
      // Tablets (Tab Series)
      { name: "Galaxy Tab S9 / S9+ / S9 Ultra / S9 FE / S9 FE+ [셀룰러 모델]", status: "success" },
      { name: "Galaxy Tab S8 / S8+ / S8 Ultra [셀룰러 모델]", status: "success" },
      { name: "Galaxy Tab (모든 WiFi 전용 기종 - 심 카드 슬롯 없음)", status: "danger", note: "와이파이 단독 아이패드/갤럭시탭은 네트워크 기능이 무선랜(WiFi) 전용으로 국한되어 eSIM을 사용할 수 없습니다." }
    ],
    Google: [
      { name: "Pixel 9 / 9 Pro / 9 Pro XL / 9 Pro Fold", status: "success" },
      { name: "Pixel 8 / 8 Pro / 8a", status: "success" },
      { name: "Pixel 7 / 7 Pro / 7a", status: "success" },
      { name: "Pixel 6 / 6 Pro / 6a", status: "success" },
      { name: "Pixel 5 / 5a 5G", status: "success" },
      { name: "Pixel 4 / 4 XL / 4a / 4a 5G", status: "success" },
      { name: "Pixel 3 / 3 XL / 3a / 3a XL", status: "danger", note: "구글 픽셀 3 시리즈 이하 구형 모델은 국내 이동통신 규격 상 eSIM 추가 및 개통이 제한되어 있습니다. 유심 사용을 권장합니다." }
    ],
    Others: [
      // Xiaomi
      { name: "샤오미 Xiaomi 15 / 15 Pro / 15 Ultra (해외판)", status: "success" },
      { name: "샤오미 Xiaomi 14 / 14 Pro / 14 Ultra / 14T / 14T Pro (해외판)", status: "success" },
      { name: "샤오미 Xiaomi 13 / 13 Pro / 13 Ultra / 13 Lite (해외판)", status: "success" },
      { name: "샤오미 Xiaomi 12T Pro (해외판)", status: "success" },
      { name: "샤오미 Redmi Note (홍미노트) 시리즈 국내 정식 정발판 전체", status: "danger", note: "국내 총판을 통해 유통된 모든 정발 홍미노트 단말은 eSIM 규격을 누락하고 있습니다. 유심을 구매해 주세요." },
      // Oppo & OnePlus
      { name: "오포 Oppo Find X5 / Find X5 Pro (해외판)", status: "success" },
      { name: "오포 Oppo Find X3 Pro / Reno 6 Pro 5G / Reno 5 A (해외판)", status: "success" },
      { name: "원플러스 OnePlus 12 / 12R / 11 / Open (해외판)", status: "success" },
      // Motorola
      { name: "모토로라 Razr 50 / 40 / 40 Ultra / 2022 (해외판)", status: "success" },
      { name: "모토로라 Edge 50 / 40 / 40 Pro / 30 Neo (해외판)", status: "success" },
      // Sony
      { name: "소니 Xperia 1 VI / 1 V / 1 IV (해외판)", status: "success" },
      { name: "소니 Xperia 5 V / 5 IV / 10 VI / 10 V / 10 IV (해외판)", status: "success" },
      // Huawei
      { name: "화웨이 P40 / P40 Pro / Mate 40 Pro (해외판)", status: "success" },
      // LG
      { name: "LG Wing / Velvet / G8 / V50 등 LG 스마트폰 전 모델", status: "danger", note: "LG전자 모바일 사업부에서 생산하고 유통했던 모든 기종은 eSIM 하드웨어 장치를 설계하지 않아 가상 이심 사용이 원천 불가합니다. 유심 상품을 구매하셔야 합니다." },
      // Global/Fuzzy 직구폰
      { name: "기타 외산폰 (샤오미/오포/모토로라/소니 등) 해외 직구 단말기 전체", status: "warning", note: "직구하신 국가와 세부 하드웨어 일련번호 버전에 따라 eSIM 칩셋 장착 여부가 천차만별입니다. 구매하시기 전에 팁 아코디언의 EID 확인법을 통해 EID가 나타나는지 반드시 자가 확인해 주세요." }
    ]
  };
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

    // 불러올 로컬 스토리지 주문 목록
    const savedOrders = JSON.parse(localStorage.getItem('esim_orders') || '[]');
    
    // 이메일과 전화번호 매칭 필터링 (공백 제거, 대소문자 무시)
    const normalizedEmail = emailInput.toLowerCase();
    const normalizedPhone = phoneInput.replace(/[^0-9]/g, ''); // 숫자만 대조
    
    const matchedOrders = savedOrders.filter(order => {
      const orderEmail = order.email.toLowerCase();
      const orderPhone = order.phone.replace(/[^0-9]/g, '');
      return orderEmail === normalizedEmail && orderPhone === normalizedPhone;
    });

    resultsContainer.innerHTML = '';

    if (matchedOrders.length === 0) {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 50px 20px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; margin-bottom: 16px;">🔍</div>
          <div style="font-weight: 800; color: var(--text-main); font-size: 1.05rem; margin-bottom: 8px;">일치하는 주문 내역이 없습니다</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; max-width: 400px; margin: 0 auto;">
            구매 시 입력하셨던 정보가 맞는지 다시 확인해 주세요. 특히 이메일 오타나 휴대폰 하이픈(-) 입력 여부에 유의해 주시기 바랍니다.
          </div>
        </div>
      `;
      resultsContainer.style.display = 'block';
      return;
    }

    // 주문 리스트 출력
    matchedOrders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'order-history-card';
      
      let itemsHTML = '';
      order.items.forEach((item, idx) => {
        const itemPrice = order.totalPrice; // For simplicity in mock
        const itemMockCode = item.productCode || 'LS2026-eSIM-00000';
        
        // 국가별 맞춤 APN 정보 및 가이드
        let apnInfo = 'APN: spmode.ne.jp (자동 설정이 안 될 시 APN 프로필 수동 설치 요망)';
        if (item.country.includes('베트남')) {
          apnInfo = 'APN: internet (Viettel망 수동 강제 고정 권장)';
        } else if (item.country.includes('대만')) {
          apnInfo = 'APN: internet / 대만 현지 도착 직후 SMS 여권 실명인증(KYC) 필수';
        } else if (item.country.includes('유럽')) {
          apnInfo = 'APN: mobile.three.co.uk / 국가 경유 시 2~3회 재부팅 권장';
        } else if (item.country.includes('미국') || item.country.includes('캐나다')) {
          apnInfo = 'APN: wholesale / 북미 전용 T-Mobile 로컬 개통망 연결';
        }
        
        itemsHTML += `
          <div class="order-history-item-row">
            <div class="order-history-item-meta">
              <div>
                <div class="order-history-item-title">${item.country} eSIM</div>
                <div class="order-history-item-sub">
                  ${item.carrier} | ${item.planLimit} / ${item.planDuration}일 | 수량 ${item.quantity}개
                </div>
                <div style="font-size: 0.72rem; color: var(--accent); margin-top: 4px; font-weight: 700; letter-spacing: 0.5px;">
                  ICCID: ${item.iccid || '8982300000000000000'}
                </div>
              </div>
              <div class="order-history-item-price">
                ${itemMockCode}
              </div>
            </div>
            
            <button class="order-history-qr-btn" data-toggle-idx="${order.orderCode}-${idx}">
              📱 개통 QR코드 및 설치 안내 열기 ▾
            </button>
            <button class="order-history-sim-btn" data-iccid="${item.iccid || ''}" style="border: 1px solid #10b981; color: #10b981; background: rgba(16,185,129,0.03); padding: 8px 16px; font-size: 0.78rem; font-weight: 700; border-radius: var(--radius-sm); cursor: pointer; margin-top: 12px; display: inline-flex; align-items: center; gap: 6px; transition: var(--transition-fast); margin-left: 8px;">
              📊 실시간 데이터 사용량 조회 (App 연동)
            </button>
            
            <!-- Collapsible QR Code view -->
            <div class="order-history-qr-expanded" id="qr-panel-${order.orderCode}-${idx}">
              <div class="receipt-item-qr-layout" style="margin-top: 10px;">
                <div class="receipt-item-qr-box">
                  <svg class="receipt-item-qr-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" fill="#fff" />
                    <rect x="10" y="10" width="20" height="20" fill="#000" />
                    <rect x="12" y="12" width="16" height="16" fill="#fff" />
                    <rect x="14" y="14" width="12" height="12" fill="#000" />
                    <rect x="70" y="10" width="20" height="20" fill="#000" />
                    <rect x="72" y="12" width="16" height="16" fill="#fff" />
                    <rect x="74" y="14" width="12" height="12" fill="#000" />
                    <rect x="10" y="70" width="20" height="20" fill="#000" />
                    <rect x="12" y="72" width="16" height="16" fill="#fff" />
                    <rect x="14" y="74" width="12" height="12" fill="#000" />
                    <rect x="78" y="78" width="12" height="12" fill="#000" />
                    <rect x="40" y="20" width="8" height="8" fill="#000" />
                    <rect x="52" y="12" width="6" height="10" fill="#000" />
                    <rect x="45" y="35" width="12" height="6" fill="#000" />
                    <rect x="15" y="45" width="8" height="12" fill="#000" />
                    <rect x="35" y="55" width="20" height="10" fill="#000" />
                    <rect x="65" y="45" width="10" height="20" fill="#000" />
                    <rect x="75" y="35" width="8" height="8" fill="#000" />
                    <rect x="25" y="75" width="10" height="10" fill="#000" />
                    <rect x="45" y="75" width="8" height="12" fill="#000" />
                    <rect x="58" y="70" width="10" height="8" fill="#000" />
                    <rect x="58" y="82" width="12" height="8" fill="#000" />
                  </svg>
                </div>
                <div class="receipt-item-info-table" style="flex: 1.2;">
                  <div class="receipt-item-info-row">
                    <span>APN 설정</span>
                    <span style="font-size: 0.72rem; text-align: right; color: var(--accent); font-weight: 700;">${apnInfo}</span>
                  </div>
                  <div class="receipt-item-info-row">
                    <span>설치 상태</span>
                    <span>개통 대기 (스캔 시 활성화)</span>
                  </div>
                  ${order.activationDate ? `
                  <div class="receipt-item-info-row">
                    <span>예약 개통일</span>
                    <span style="color: var(--accent-warning); font-weight: bold;">${order.activationDate}</span>
                  </div>` : ''}
                  ${item.addon ? `
                  <div class="receipt-item-info-row" style="border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 6px; margin-top: 6px;">
                    <span>📍 가이드북</span>
                    <a href="JDISIM_Guidebook.pdf" download style="color:#10b981; font-weight:700; text-decoration:underline; font-size:0.75rem;">다운로드 📥</a>
                  </div>` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="order-history-card-header">
          <div class="order-history-date">주문일자: ${order.date}</div>
          <div class="order-history-code">${order.orderCode}</div>
        </div>
        <div class="order-history-items-list">
          ${itemsHTML}
        </div>
        <div class="order-history-total-row">
          <span class="order-history-total-label">총 결제액</span>
          <span class="order-history-total-price">${order.totalPrice.toLocaleString()}원</span>
        </div>
      `;
      
      resultsContainer.appendChild(card);
    });

    // 아코디언 토글 클릭 이벤트 위임
    resultsContainer.querySelectorAll('.order-history-qr-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const toggleIdx = btn.getAttribute('data-toggle-idx');
        const panel = document.getElementById(`qr-panel-${toggleIdx}`);
        if (panel) {
          panel.classList.toggle('active');
          const isActive = panel.classList.contains('active');
          btn.innerHTML = isActive ? '📱 개통 QR코드 및 설치 안내 닫기 ▴' : '📱 개통 QR코드 및 설치 안내 열기 ▾';
        }
      });
    });

    // 실시간 사용량 앱 시뮬레이터 바인딩
    resultsContainer.querySelectorAll('.order-history-sim-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const iccid = btn.getAttribute('data-iccid');
        openAppSimulator(iccid);
      });
    });

    resultsContainer.style.display = 'block';
  }

  // JDISIM 실시간 사용량 모바일 시뮬레이터 상태 및 DOM 캐싱
  const appSimulatorModal = document.getElementById('appSimulatorModal');
  const appSimulatorCloseBtn = document.getElementById('appSimulatorCloseBtn');
  const simGaugeCircle = document.getElementById('simGaugeCircle');
  const simGaugeValue = document.getElementById('simGaugeValue');
  const simGaugeTotal = document.getElementById('simGaugeTotal');
  const simPushAlert = document.getElementById('simPushAlert');
  const simPushAlertDesc = document.getElementById('simPushAlertDesc');
  const simChartBarToday = document.getElementById('simChartBarToday');
  
  let activeSimIccid = null;

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
      document.body.style.overflow = 'auto';
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
    const marquee = document.getElementById('countryMarquee');
    if (marquee && productsData.length) {
      const countries = [...new Set(productsData.map(p => p.country))].slice(0, 14);
      const tagsHtml = countries.map(c => `<div class="marquee-tag" data-country="${c}">#${c}</div>`).join('');
      marquee.innerHTML = tagsHtml + tagsHtml; // seamless loop
      marquee.addEventListener('click', (e) => {
        const tag = e.target.closest('.marquee-tag');
        if (!tag) return;
        const input = document.getElementById('storeSearchInput');
        if (input) input.value = tag.getAttribute('data-country');
        searchQuery = tag.getAttribute('data-country').toLowerCase();
        switchView('store');
        renderGrid();
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