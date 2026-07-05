// ─── Cart State (persisted) ──────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('snackCart')) || [];

// ─── Greeting ────────────────────────────────────────────────────
(function setGreeting() {
    const el = document.getElementById('greetingText');
    if (!el) return;
    const hour = new Date().getHours();
    let greet;
    if (hour < 12) greet = "Good morning! ☀️ What's for breakfast?";
    else if (hour < 17) greet = "Good afternoon! 🌤️ Time for a snack?";
    else greet = "Good evening! 🌙 Treat yourself!";
    el.textContent = greet;
})();

// ─── Load Products from API ──────────────────────────────────────
async function loadMenu() {
    const grid = document.getElementById('productsGrid');
    const tabsContainer = document.getElementById('categoryTabs');
    if (!grid) return;

    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (!data.success || !data.products.length) {
            grid.innerHTML = '<div style="text-align:center;grid-column:1/-1;padding:60px;color:var(--gray);">🍽️ Menu is being prepared...<br><small>Please check back soon</small></div>';
            return;
        }

        // Build category tabs
        const cats = ['All Items', ...new Set(data.products.map(p => p.category))];
        tabsContainer.innerHTML = cats.map((c, i) => `
            <button class="cat-tab ${i===0?'active':''}" data-cat="${c}">${c}</button>
        `).join('');

        // Render products
        renderProducts(data.products, 'All Items');

        // Tab click handler
        tabsContainer.addEventListener('click', (e) => {
            if (!e.target.classList.contains('cat-tab')) return;
            tabsContainer.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            renderProducts(data.products, e.target.dataset.cat);
        });

    } catch(err) {
        grid.innerHTML = `<div style="text-align:center;grid-column:1/-1;padding:60px;color:var(--gray);">Could not load menu. Make sure the server is running.</div>`;
    }
}

function renderProducts(products, cat) {
    const grid = document.getElementById('productsGrid');
    const filtered = cat === 'All Items' ? products : products.filter(p => p.category === cat);

    if (!filtered.length) {
        grid.innerHTML = '<div style="text-align:center;grid-column:1/-1;padding:50px;color:var(--gray);">No items in this category</div>';
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div class="product-card ${!p.available ? 'unavailable' : ''}">
            <div class="product-emoji">${p.emoji || '🍽️'}</div>
            <div class="product-info">
                <p class="product-category">${p.category}</p>
                <h3>${p.name}</h3>
                <p class="product-desc">${p.description || ''}</p>
                <div class="product-footer">
                    <span class="product-price">₹${p.price}</span>
                    ${p.available
                        ? `<button class="add-to-cart-btn" onclick="addToCart('${escStr(p.name)}', ${p.price}, '${escStr(p.emoji)}')">+ Add</button>`
                        : `<span class="sold-out-badge">Sold Out</span>`
                    }
                </div>
            </div>
        </div>
    `).join('');
}

function escStr(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '\\"'); }

// ─── Cart Functions ───────────────────────────────────────────────
function saveCart() { localStorage.setItem('snackCart', JSON.stringify(cart)); }

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    if (!cartItems) return;

    if (!cart.length) {
        cartItems.innerHTML = '<p class="empty-cart">🍽️ Add items to start your order</p>';
    } else {
        cartItems.innerHTML = cart.map((item, idx) => `
            <div class="cart-item">
                <span class="cart-item-emoji">${item.emoji || '🍽️'}</span>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>₹${item.price} × ${item.qty} = ₹${item.price * item.qty}</p>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
                    <span class="qty-num">${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
                    <button class="remove-item" onclick="removeFromCart(${idx})">✕</button>
                </div>
            </div>
        `).join('');
    }

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const count = cart.reduce((s, i) => s + i.qty, 0);
    if (cartTotal) cartTotal.textContent = total;
    if (cartCount) cartCount.textContent = count;
}

function addToCart(name, price, emoji) {
    const existing = cart.find(i => i.name === name);
    if (existing) { existing.qty += 1; }
    else { cart.push({ name, price: parseFloat(price), qty: 1, emoji }); }
    saveCart(); updateCartUI();
    showToast(`Added ${emoji} ${name} to cart!`);
}

function changeQty(idx, delta) {
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    saveCart(); updateCartUI();
}

function removeFromCart(idx) {
    const name = cart[idx].name;
    cart.splice(idx, 1);
    saveCart(); updateCartUI();
    showToast(`Removed ${name}`);
}
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;

// ─── Toast ───────────────────────────────────────────────────────
function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Auth UI (user badge + logout) ───────────────────────────────
async function setupAuthUI() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (!data.logged_in) return;
        const wrap = document.getElementById('userBadgeWrap');
        if (!wrap) return;
        const u = data.user;
        wrap.innerHTML = `
            <div style="position:relative;">
                <div id="userChip" style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:#fff3e0;border-radius:25px;cursor:pointer;font-size:14px;font-weight:600;border:2px solid #fde0c0;">
                    <span style="width:28px;height:28px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${(u.name||'U')[0].toUpperCase()}</span>
                    <span>${u.name.split(' ')[0]}</span>
                    <span style="font-size:10px;">▼</span>
                </div>
                <div id="userDropdown" style="display:none;position:absolute;top:calc(100% + 6px);right:0;background:white;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:190px;overflow:hidden;z-index:100;border:1px solid #f0e8e0;">
                    <div style="padding:14px 16px;border-bottom:1px solid #f0e8e0;">
                        <div style="font-weight:700;font-size:14px;">${u.name}</div>
                        <div style="font-size:12px;color:var(--gray);margin-top:2px;">${u.email}</div>
                    </div>
                    <button id="myOrdersDropBtn" style="width:100%;padding:12px 16px;border:none;background:transparent;text-align:left;cursor:pointer;font-family:inherit;font-size:14px;font-weight:500;">📋 My Orders</button>
                    <button id="logoutDropBtn" style="width:100%;padding:12px 16px;border:none;background:transparent;text-align:left;cursor:pointer;font-family:inherit;font-size:14px;color:var(--danger);">🚪 Logout</button>
                </div>
            </div>`;

        const chip = document.getElementById('userChip');
        const menu = document.getElementById('userDropdown');
        chip.addEventListener('click', (e) => { e.stopPropagation(); menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; });
        document.addEventListener('click', () => { menu.style.display = 'none'; });

        document.getElementById('logoutDropBtn').addEventListener('click', async () => {
            const r = await fetch('/api/logout', { method: 'POST' });
            const j = await r.json();
            window.location.href = j.redirect || '/login';
        });
        document.getElementById('myOrdersDropBtn').addEventListener('click', () => { menu.style.display = 'none'; openMyOrders(); });
    } catch(e) { /* not logged in */ }
}

// ─── My Orders ───────────────────────────────────────────────────
async function openMyOrders() {
    const modal = document.getElementById('ordersModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const list = document.getElementById('myOrdersList');
    list.innerHTML = '<p style="color:var(--gray);text-align:center;padding:30px;">Loading...</p>';

    try {
        const res  = await fetch('/api/my-orders');
        const data = await res.json();
        if (!data.success || !data.orders.length) {
            list.innerHTML = '<p style="color:var(--gray);text-align:center;padding:30px;">You have not placed any orders yet.</p>';
            return;
        }
        const statusColor = { PENDING:'#856404', CONFIRMED:'#004085', READY:'#5a1d8a', PAID:'#155724', REJECTED:'#721c24' };
        const statusBg    = { PENDING:'#fff3cd', CONFIRMED:'#cce5ff', READY:'#e2d9f3',  PAID:'#d4edda',  REJECTED:'#f8d7da' };

        list.innerHTML = data.orders.map(o => {
            const itemStr = o.items.map(i => `${i.emoji||'🍽️'} ${i.name} ×${i.qty}`).join(', ');
            const sc = statusColor[o.status] || '#333';
            const sb = statusBg[o.status]    || '#eee';
            return `
            <div style="border:2px solid #f0e8e0;border-radius:12px;padding:14px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-weight:700;font-size:15px;">Order #${o.order_id}</span>
                    <span style="background:${sb};color:${sc};padding:4px 12px;border-radius:14px;font-size:12px;font-weight:700;">${o.status}</span>
                </div>
                <p style="font-size:13px;color:#555;margin-bottom:4px;">${itemStr}</p>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                    <span style="font-size:12px;color:#aaa;">${o.created_at || ''}</span>
                    <span style="font-weight:700;color:var(--primary);font-size:16px;">₹${o.amount}</span>
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        list.innerHTML = '<p style="color:var(--gray);text-align:center;padding:30px;">Could not load orders.</p>';
    }
}

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    loadMenu();
    setupAuthUI();

    // Cart toggle
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');

    if (cartBtn) cartBtn.addEventListener('click', () => { cartSidebar.classList.add('active'); cartOverlay.classList.add('active'); });
    if (closeCart) closeCart.addEventListener('click', () => { cartSidebar.classList.remove('active'); cartOverlay.classList.remove('active'); });
    if (cartOverlay) cartOverlay.addEventListener('click', () => { cartSidebar.classList.remove('active'); cartOverlay.classList.remove('active'); });

    // Checkout
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (!cart.length) { showToast('Add items first!'); return; }
            window.location.href = '/checkout.html';
        });
    }

    // My Orders link
    const myOrdersLink = document.getElementById('myOrdersLink');
    if (myOrdersLink) myOrdersLink.addEventListener('click', (e) => { e.preventDefault(); openMyOrders(); });

    // Hamburger — toggles slide-down nav menu
    const hamburger = document.getElementById('hamburger');
    const navMenu   = document.getElementById('navMenu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            // animate hamburger into X
            const spans = hamburger.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
                spans[1].style.opacity   = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
            } else {
                spans[0].style.transform = '';
                spans[1].style.opacity   = '';
                spans[2].style.transform = '';
            }
        });
        // Close menu when a link is tapped
        navMenu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                navMenu.classList.remove('active');
                hamburger.querySelectorAll('span').forEach(s => { s.style.transform=''; s.style.opacity=''; });
            });
        });
    }
});
