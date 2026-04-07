/* ===========================================================
    CART DRAWER JS — Force single full-screen overlay + reliable close
    Clean, well-structured and idempotent
    =========================================================== */

(function () {
    'use strict';

    function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
    function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel || '')); }
    function on(el, ev, fn) { if (!el) return; el.addEventListener(ev, fn); }

    // Mutable refs
    let drawer = qs('#CartDrawer');
    let overlay = qs('#CartDrawerOverlay');

    // Create or normalize a single overlay element we control
    function ensureOverlay() {
        // Remove duplicate overlay-like elements (keep the first)
        const candidates = qsa('#CartDrawerOverlay, .cart-drawer__overlay');
        if (candidates.length > 1) {
            for (let i = 1; i < candidates.length; i++) {
                try { candidates[i].parentNode.removeChild(candidates[i]); } catch (e) { /* ignore */ }
            }
        }

        overlay = qs('#CartDrawerOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'CartDrawerOverlay';
            overlay.className = 'cart-drawer__overlay';
            document.body.appendChild(overlay);
        }

        // Force full-screen, base hidden state (inline style to beat external CSS if necessary)
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            width: '100%',
            height: '100%',
            zIndex: '9998',
            display: 'none',
            pointerEvents: 'none',
            opacity: '0',
            visibility: 'hidden',
            background: 'rgba(0,0,0,0.36)'
        });

        overlay.setAttribute('aria-hidden', 'true');

        // bind click once
        if (!overlay._cartOverlayClickBound) {
            overlay.addEventListener('click', function (e) {
                e.preventDefault();
                closeDrawer();
            });
            overlay._cartOverlayClickBound = true;
        }
    }

    // ensures drawer ref
    function ensureDrawer() {
        drawer = qs('#CartDrawer');
        if (!drawer) return;
        drawer.style.right = '0';
        drawer.style.left = 'auto';
    }

    function showOverlay() {
        if (!overlay) return;
        overlay.style.display = 'block';
        overlay.style.pointerEvents = 'auto';
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        overlay.setAttribute('aria-hidden', 'false');
    }

    /* ---------- Update header cart count (keeps badge in sync) ---------- */
    /* ---------- Update header cart count (keeps badge in sync) ---------- */
    function updateCartCount(providedCount) {
        // selectors to try — covers many theme/app naming conventions
        const selectors = [
            '[data-header-cart-count]',
            '[data-cart-count]',
            '[data-cart-bubble]',
            '[data-cart-quantity]',
            '.site-header-cart--count',
            '.site-header__cart-count',
            '.site-cart-count',
            '.cart-count-bubble',
            '.cart-count',
            '.cart-quantity',
            '.header-cart-count',
            '.site-header-cart-badge',
            '.cart-bubble',
            '.mini-cart__count',
            '.cart-badge'
        ];

        function applyCount(count) {
            const n = Number(count) || 0;
            // update any matching element's visible text + some common attributes
            selectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => {
                    try {
                        // if element contains only a number, replace it; otherwise update dataset/aria (safe)
                        // set visible number (or empty string when zero)
                        el.textContent = n > 0 ? String(n) : '';

                        // also set common numeric attributes used by themes/apps
                        try { if (el.dataset) el.dataset.cartCount = n > 0 ? String(n) : ''; } catch (e) { }
                        try { if (el.dataset) el.dataset.headerCartCount = n > 0 ? String(n) : ''; } catch (e) { }
                        try { if (el.hasAttribute && el.hasAttribute('data-header-cart-count')) el.setAttribute('data-header-cart-count', String(n)); } catch (e) { }
                        try { if (el.hasAttribute && el.hasAttribute('data-cart-count')) el.setAttribute('data-cart-count', String(n)); } catch (e) { }

                        // update title/aria-label if present so tooltips/readers are consistent
                        try { if (n > 0) el.title = (el.title || '').replace(/\d+/, String(n)); } catch (e) { }
                        try { if (n > 0 && el.getAttribute('aria-label')) el.setAttribute('aria-label', el.getAttribute('aria-label').replace(/\d+/, String(n))); } catch (e) { }

                        // toggle visible class (your theme uses this)
                        if (n > 0) el.classList.add('visible');
                        else el.classList.remove('visible');
                    } catch (e) { /* ignore per-element errors */ }
                });
            });

            // Additionally update any inline bubbles inside cart icons (e.g. .cart-icon .bubble)
            try {
                document.querySelectorAll('.cart-icon, .site-header__cart, .header-cart').forEach(icon => {
                    const bubble = icon.querySelector('.cart-bubble, .bubble, .site-header-cart--count, .cart-count');
                    if (bubble) {
                        try { bubble.textContent = n > 0 ? String(n) : ''; } catch (e) { }
                        try { if (n > 0) bubble.classList.add('visible'); else bubble.classList.remove('visible'); } catch (e) { }
                    }
                });
            } catch (e) { }

            return n;
        }

        if (typeof providedCount !== 'undefined') {
            return Promise.resolve(applyCount(providedCount));
        }

        return fetch('/cart.js', { credentials: 'same-origin' })
            .then(r => { if (!r.ok) throw new Error('Cart fetch failed'); return r.json(); })
            .then(data => {
                const count = applyCount((data && typeof data.item_count !== 'undefined') ? data.item_count : 0);
                // Dispatch cart:updated event for free shipping bar
                try {
                    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: data } }));
                } catch (e) { }
                return count;
            })
            .catch(err => {
                console.warn('updateCartCount error', err);
                return 0;
            });
    }


    function hideOverlay() {
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        overlay.setAttribute('aria-hidden', 'true');
    }

    // drawer open/close
    function openDrawer() {
        ensureDrawer();
        if (!drawer) return;
        drawer.classList.add('cart-drawer--open');
        showOverlay();
        document.documentElement.style.overflow = 'hidden';
    }

    function closeDrawer() {
        ensureDrawer();
        if (!drawer) return;
        drawer.classList.remove('cart-drawer--open');
        hideOverlay();
        document.documentElement.style.overflow = '';
    }

    // safe bind helper (prevents duplicate handlers using data flag)
    function safeBind(el, ev, fn, flag) {
        if (!el) return;
        try {
            if (flag && el.dataset && el.dataset[flag]) return;
        } catch (e) { }
        el.addEventListener(ev, fn);
        try { if (flag && el.dataset) el.dataset[flag] = '1'; } catch (e) { }
    }

    // bind open triggers by data attribute or common selectors
    function bindOpenTriggers() {
        let triggers = qsa('[data-cart-open], [data-cart-toggle]');
        if (!triggers.length) {
            const selectors = [
                '.site-header__cart',
                '.site-header-cart--button',
                '.site-header-cart--button a',
                '.cart-toggle',
                '.cart-button',
                '.header__icon--cart',
                '.icon-cart',
                '[data-action="toggle-cart"]',
                'button[aria-label*="cart"]',
            ];
            selectors.forEach(sel => qsa(sel).forEach(el => triggers.push(el)));
        }

        triggers.forEach(btn => {
            safeBind(btn, 'click', function (e) {
                e.preventDefault();
                openDrawer();
            }, 'cartOpenBound');
        });
    }

    // bind close buttons & Escape
    function bindCloseButtons() {
        qsa('[data-cart-drawer-close]').forEach(btn => {
            safeBind(btn, 'click', function (e) {
                e.preventDefault();
                closeDrawer();
            }, 'cartCloseBound');
        });

        if (!document._cartEscapeBound) {
            document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
            document._cartEscapeBound = true;
        }
    }

    // qty binds (keeps old behavior)
    function bindQty() {
        // Check if we're on the cart page (not drawer)
        const isCartPage = !!document.querySelector('.cart-sidebar');

        qsa('[data-qty-change]').forEach(btn => {
            safeBind(btn, 'click', function (e) {
                e.preventDefault();
                const line = btn.getAttribute('data-line');
                const change = btn.getAttribute('data-qty-change');
                const input = qs(`[data-line-input="${line}"]`);
                let qty = parseInt(input ? input.value : '0', 10) || 0;
                const newQty = change === 'increase' ? qty + 1 : qty - 1;
                if (newQty < 0) return;

                // Disable buttons during update to prevent multiple clicks
                const qtyContainer = btn.closest('.cart-drawer__qty');
                const allButtons = qtyContainer ? qtyContainer.querySelectorAll('.cart-drawer__qty-btn') : [];
                allButtons.forEach(b => b.style.pointerEvents = 'none');

                // Optimistic update: immediately update the input value for instant feedback
                if (input) input.value = newQty;

                changeLineQuantity(line, newQty)
                    .then((cart) => {
                        // Update header badge immediately
                        updateCartCount(cart.item_count).catch(() => { });

                        // Reload page if on cart page, otherwise refresh drawer
                        if (isCartPage) {
                            window.location.reload();
                        } else {
                            return refreshDrawer();
                        }
                    })
                    .catch(err => {
                        console.error('Quantity change failed', err);
                        // Revert optimistic update on error
                        if (input) input.value = qty;
                        // Re-enable buttons
                        allButtons.forEach(b => b.style.pointerEvents = 'auto');
                    });
            }, 'qtyBtnBound');
        });

        qsa('[data-line-input]').forEach(input => {
            safeBind(input, 'blur', function () {
                const line = input.getAttribute('data-line-input');
                let qty = parseInt(input.value, 10);
                if (isNaN(qty) || qty < 0) qty = 0;
                changeLineQuantity(line, qty)
                    .then((cart) => {
                        // Update header badge immediately
                        updateCartCount(cart.item_count).catch(() => { });

                        // Reload page if on cart page, otherwise refresh drawer
                        if (isCartPage) {
                            window.location.reload();
                        } else {
                            return refreshDrawer();
                        }
                    })
                    .catch(err => console.error('Quantity input failed', err));
            }, 'qtyInputBound');

            safeBind(input, 'keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            }, 'qtyInputKeyBound');
        });
    }

    function changeLineQuantity(line, qty) {
        line = parseInt(line, 10);
        qty = parseInt(qty, 10);
        if (isNaN(line) || line < 1) return Promise.reject('invalid-line');

        const params = new URLSearchParams();
        params.append('line', String(line));
        params.append('quantity', String(qty));

        return fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: params.toString()
        }).then(r => {
            if (!r.ok) throw new Error('Network');
            return r.json();
        }).then(cart => {
            // Dispatch cart:updated event immediately for free shipping bar
            try {
                document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: cart } }));
            } catch (e) { }
            return cart;
        });
    }

    // AJAX add-to-cart interception (skips payment buttons)
    function bindAddToCart() {
        if (document._cartAddBound) return;

        // Use capture phase to intercept before Empire theme handlers
        document.addEventListener('submit', function (e) {
            const form = e.target;
            if (!form || !form.matches) return;

            // Check for cart/add forms with various action formats
            const action = form.getAttribute('action') || '';
            if (!action.includes('/cart/add') && !action.includes('cart/add')) return;

            let submitter = e.submitter || document.activeElement;
            const skipSelectors = [
                '.shopify-payment-button',
                '.shop-pay-button',
                '.pay-with-shop',
                '.paypal-button',
                '[data-shopify-payment-button]',
                '[data-gateway="paypal"]',
                '[data-gateway="shop_pay"]',
                '[data-skip-ajax]'
            ];
            if (submitter) {
                for (const sel of skipSelectors) {
                    try { if (submitter.matches && submitter.matches(sel)) return; } catch (err) { }
                }
            }

            // Stop event from reaching Empire theme handlers
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const data = new FormData(form);

            // Fix: Get variant ID from variant-selection element (updated synchronously)
            // instead of relying on the hidden select (updated asynchronously)
            const variantSelection = form.querySelector('variant-selection');
            if (variantSelection) {
                const correctVariantId = variantSelection.getAttribute('variant');
                if (correctVariantId && correctVariantId !== 'not-selected' && correctVariantId !== 'unavailable') {
                    data.set('id', correctVariantId);
                }
            }

            fetch('/cart/add.js', { method: 'POST', body: data })
                .then(r => { if (!r.ok) throw new Error('Add failed'); return r.json(); })
                // Auto-open drawer after refresh completes, then update header count
                .then(() => refreshDrawer().then(() => {
                    openDrawer();
                    // update header badge too
                    updateCartCount().catch(() => { });
                }))
                .catch(err => console.error('Add to cart failed', err));
        }, true); // Use capture phase

        document._cartAddBound = true;
    }

    // Cross-sell add handler (delegated) — separate from bindAddToCart
    function bindCrossSellAdd() {
        safeBind(document, 'click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-drawer-add]') : null;
            if (!btn) return;
            e.preventDefault();

            const variantId = btn.getAttribute('data-variant-id');
            if (!variantId) return;

            btn.disabled = true;
            const formData = new FormData();
            formData.append('id', variantId);
            formData.append('quantity', '1');

            fetch('/cart/add.js', { method: 'POST', body: formData })
                .then(res => { if (!res.ok) throw new Error('Add failed'); return res.json(); })
                .then(() => {
                    if (typeof refreshDrawer === 'function') {
                        refreshDrawer().then(function () {
                            try { if (typeof openDrawer === 'function') openDrawer(); } catch (e) { }
                            // update header badge too
                            updateCartCount().catch(() => { });
                        }).catch(() => { /* ignore */ });
                    } else {
                        // fallback: fetch drawer fragment and replace
                        fetch('/?section_id=cart-drawer')
                            .then(r => r.text())
                            .then(html => {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(html, 'text/html');
                                const newDrawer = doc.querySelector('#CartDrawer');
                                if (newDrawer) {
                                    const old = document.querySelector('#CartDrawer');
                                    if (old) old.replaceWith(newDrawer); else document.body.appendChild(newDrawer);
                                }
                                try { if (typeof openDrawer === 'function') openDrawer(); } catch (e) { }
                                // update header badge too
                                updateCartCount().catch(() => { });
                            }).catch(() => { /* ignore */ });
                    }
                })
                .catch(err => {
                    console.error('Cross-sell add failed', err);
                })
                .finally(() => { btn.disabled = false; });
        }, 'crossSellBound');
    }

    // Intercept data-quick-buy clicks before Empire theme handles them
    function bindQuickBuyButtons() {
        if (document._quickBuyBound) return;

        // Use capture phase to intercept before Empire theme handlers
        document.addEventListener('click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-quick-buy]') : null;
            if (!btn) return;

            // Stop event from reaching Empire theme handlers
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const variantId = btn.getAttribute('data-variant-id');
            if (!variantId) return;

            // Disable button and show loading state
            const originalText = btn.querySelector('.atc-button--text');
            const originalTextContent = originalText ? originalText.textContent : btn.textContent;
            btn.disabled = true;
            if (originalText) {
                originalText.textContent = 'Adding...';
            }

            const formData = new FormData();
            formData.append('id', variantId);
            formData.append('quantity', '1');

            fetch('/cart/add.js', { method: 'POST', body: formData })
                .then(res => { if (!res.ok) throw new Error('Add failed'); return res.json(); })
                .then(() => refreshDrawer().then(() => {
                    openDrawer();
                    updateCartCount().catch(() => {});
                }))
                .catch(err => console.error('Quick buy add failed', err))
                .finally(() => {
                    btn.disabled = false;
                    if (originalText) {
                        originalText.textContent = originalTextContent;
                    }
                });
        }, true); // Use capture phase

        document._quickBuyBound = true;
    }

    // Free Gift add handler — adds product with _free_gift property
    function bindFreeGiftVariantSelect() {
        safeBind(document, 'change', function (e) {
            var select = e.target.closest ? e.target.closest('[data-free-gift-variant-select]') : null;
            if (!select) return;
            var selectedOption = select.options[select.selectedIndex];
            var isAvailable = selectedOption.getAttribute('data-available') === 'true';
            var info = select.closest('.free-gift-products__info');
            var btn = info.querySelector('.free-gift-products__add-btn');
            if (!btn) return;

            if (isAvailable) {
                btn.disabled = false;
                btn.textContent = 'Add';
                btn.classList.remove('free-gift-products__add-btn--soldout');
                btn.setAttribute('data-free-gift-add', '');
            } else {
                btn.disabled = true;
                btn.textContent = 'Sold out';
                btn.classList.add('free-gift-products__add-btn--soldout');
                btn.removeAttribute('data-free-gift-add');
            }
        }, 'freeGiftVariantBound');
    }

    function bindFreeGiftAdd() {
        safeBind(document, 'click', function (e) {
            const btn = e.target.closest ? e.target.closest('[data-free-gift-add]') : null;
            if (!btn) return;
            e.preventDefault();

            const variantSelect = btn.closest('.free-gift-products__info').querySelector('[data-free-gift-variant-select]');
            const variantId = variantSelect ? variantSelect.value : btn.getAttribute('data-variant-id');
            const productTitle = btn.getAttribute('data-product-title') || 'Free Gift';
            if (!variantId) return;

            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = 'Adding...';

            // Add with line item properties to mark as free gift
            const addData = {
                items: [{
                    id: parseInt(variantId, 10),
                    quantity: 1,
                    properties: {
                        '_free_gift': 'true',
                        '_gift_label': 'Free Gift'
                    }
                }]
            };

            fetch('/cart/add.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addData)
            })
                .then(res => { if (!res.ok) throw new Error('Add failed'); return res.json(); })
                .then(() => {
                    btn.textContent = 'Added!';
                    btn.classList.add('free-gift-products__add-btn--added');

                    refreshDrawer().then(function () {
                        try { openDrawer(); } catch(e){}
                        updateCartCount().catch(()=>{});
                    }).catch(()=>{ /* ignore */ });

                    // Keep button in "added" state
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.disabled = false;
                        btn.classList.remove('free-gift-products__add-btn--added');
                    }, 3000);
                })
                .catch(err => {
                    console.error('Free gift add failed', err);
                    btn.textContent = 'Error';
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.disabled = false;
                    }, 2000);
                });
        }, 'freeGiftBound');
    }

    // Refresh drawer: replace only the drawer, not overlay — preserve open state
    function refreshDrawer() {
        // capture whether the drawer was open (so we can restore it)
        var wasOpen = drawer && drawer.classList && drawer.classList.contains('cart-drawer--open');

        return fetch('/?section_id=cart-drawer', {
                cache: 'no-store'
            })
            .then(r => {
                if (!r.ok) throw new Error('Network response not ok');
                return r.text();
            })
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newDrawer = doc.querySelector('#CartDrawer');

                if (newDrawer) {
                    // replace existing drawer with the new fragment
                    try {
                        if (drawer && drawer.parentNode) drawer.replaceWith(newDrawer);
                        else document.body.appendChild(newDrawer);
                    } catch (e) {
                        // fallback append/replace
                        const existing = document.querySelector('#CartDrawer');
                        if (existing && existing.parentNode) existing.parentNode.replaceChild(newDrawer, existing);
                        else document.body.appendChild(newDrawer);
                    }
                    // update our ref to the current drawer
                    drawer = qs('#CartDrawer');
                }

                // Make sure overlay exists and event bindings persisted
                ensureOverlay();

                // Restore open/closed state that was present before refresh
                if (wasOpen && drawer) {
                    try { drawer.classList.add('cart-drawer--open'); } catch (e) { }
                    showOverlay();
                    document.documentElement.style.overflow = 'hidden';
                } else {
                    // If it wasn't open before, keep it closed — do not force-hide overlay unless it exists open
                    try { if (drawer) drawer.classList.remove('cart-drawer--open'); } catch (e) { }
                    hideOverlay();
                    document.documentElement.style.overflow = '';
                }

                // Rebind handlers for new drawer markup
                bindOpenTriggers();
                bindCloseButtons();
                bindQty();

                // Reapply excluded products and cart items after drawer refresh
                try {
                    const excluded = getExcludedProducts();
                    const showcaseContainer = document.querySelector('[data-showcase-container]');

                    if (showcaseContainer) {
                        getCartProductIds().then(cartProductIds => {
                            const allCards = Array.from(showcaseContainer.querySelectorAll('.showcase-card'));

                            // Mark excluded products and products in cart
                            allCards.forEach(card => {
                                const productId = card.getAttribute('data-product-id');
                                if (productId) {
                                    if (excluded.includes(productId) || cartProductIds.includes(productId)) {
                                        card.setAttribute('data-excluded', 'true');
                                    }
                                }
                            });

                            // Ensure exactly 3 visible products (prioritize non-excluded)
                            const nonExcludedCards = allCards.filter(c => !c.hasAttribute('data-excluded'));
                            const excludedCards = allCards.filter(c => c.hasAttribute('data-excluded'));

                            // Hide all first
                            allCards.forEach(c => c.classList.add('showcase-card--hidden'));

                            // Show first 3 non-excluded, or fill with excluded if needed
                            const cardsToShow = nonExcludedCards.slice(0, 3);
                            if (cardsToShow.length < 3) {
                                cardsToShow.push(...excludedCards.slice(0, 3 - cardsToShow.length));
                            }
                            cardsToShow.forEach(c => c.classList.remove('showcase-card--hidden'));
                        }).catch(err => {
                            console.warn('Could not get cart products on refresh:', err);
                        });
                    }
                } catch (e) { }

                // Update header badge after drawer refresh (keeps icon in sync)
                try { updateCartCount().catch(() => { }); } catch (e) { }

                // return resolved promise so callers can chain .then(...)
                return Promise.resolve();
            })
            .catch(err => {
                console.error('Could not refresh drawer', err);
                return Promise.reject(err);
            });
    }

    // small compatibility for older naming in case used earlier code
    function bindOverlayClickIfNeeded() {
        if (!overlay) return;
        if (!overlay._bound) {
            overlay.addEventListener('click', function () { closeDrawer(); });
            overlay._bound = true;
        }
    }

    // Bind cart page quantity selectors (different from cart drawer)
    function bindCartPageQuantity() {
        const isCartPage = !!document.querySelector('.cart-sidebar');
        if (!isCartPage) return;

        // Handle + and - buttons
        document.querySelectorAll('[data-quantity-minus], [data-quantity-plus]').forEach(btn => {
            if (btn.dataset.cartPageBound) return;
            btn.dataset.cartPageBound = 'true';

            btn.addEventListener('click', function() {
                // Update free shipping bar immediately before reload
                setTimeout(() => {
                    fetch('/cart.js')
                        .then(r => r.json())
                        .then(cart => {
                            document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: cart } }));
                            // Small delay to let the bar update visually
                            setTimeout(() => {
                                window.location.reload();
                            }, 100);
                        })
                        .catch(() => {
                            window.location.reload();
                        });
                }, 200);
            });
        });

        // Handle direct input changes
        document.querySelectorAll('[data-quantity-input]').forEach(input => {
            if (input.dataset.cartPageBound) return;
            input.dataset.cartPageBound = 'true';

            input.addEventListener('change', function() {
                // Update free shipping bar immediately before reload
                setTimeout(() => {
                    fetch('/cart.js')
                        .then(r => r.json())
                        .then(cart => {
                            document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: cart } }));
                            // Small delay to let the bar update visually
                            setTimeout(() => {
                                window.location.reload();
                            }, 100);
                        })
                        .catch(() => {
                            window.location.reload();
                        });
                }, 200);
            });
        });
    }

    // INIT
    (function init() {
        ensureOverlay();
        ensureDrawer();
        hideOverlay();
        bindOverlayClickIfNeeded(); // legacy: keep if present
        bindOpenTriggers();
        bindCloseButtons();
        bindQty();

        bindAddToCart();
        bindCrossSellAdd();

        // Bind cart page quantity controls
        bindCartPageQuantity();
        bindQuickBuyButtons();
        bindFreeGiftAdd();
        bindFreeGiftVariantSelect();
        bindShowcaseQuickAdd();
        // ensure closed on load
        try { if (drawer && drawer.classList.contains('cart-drawer--open')) drawer.classList.remove('cart-drawer--open'); } catch (e) { }
        // --- Dynamic padding for upsell so cart items never get hidden ---
        // --- Dynamic padding for upsell so cart items never get hidden ---
        function setupUpsellSpacing() {
            const upsell = document.querySelector('.upsellCarousel');
            const cartItems = document.querySelector('.cart-drawer__cart-items');
            if (!upsell || !cartItems) return;

            function updateUpsellPadding() {
                const h = Math.ceil(upsell.offsetHeight);
                cartItems.style.setProperty('--upsell-height', `${h}px`);
            }

            window.addEventListener('load', updateUpsellPadding);
            window.addEventListener('resize', updateUpsellPadding);

            const observer = new MutationObserver(updateUpsellPadding);
            observer.observe(upsell, { childList: true, subtree: true, attributes: true });

            updateUpsellPadding();
        }

        setupUpsellSpacing();

        // Sync badge on init (in case page load and cart differ)
        try { updateCartCount().catch(() => { }); } catch (e) { }

        // Initialize dynamic free shipping bar with currency conversion
        initDynamicFreeShipping();

    })();

    // ============================================================================
    // DYNAMIC FREE SHIPPING BAR WITH CURRENCY CONVERSION
    // Only for UK (GBP), US (USD), EU (EUR)
    // ============================================================================
    function initDynamicFreeShipping() {
        function updateFreeShippingBar(cartData) {
            // Re-query all free shipping bars each time (in case drawer was refreshed)
            const freeShippingBars = document.querySelectorAll('.free-shipping-bar-dynamic');
            if (!freeShippingBars.length) return;

            // Fetch cart data if not provided
            const cartPromise = cartData ? Promise.resolve(cartData) : fetch('/cart.js').then(r => r.json());

            cartPromise
                .then(cart => {
                    const subtotal = cart.items_subtotal_price || 0;

                    // Update all free shipping bars (cart drawer AND cart page synchronously)
                    freeShippingBars.forEach(freeShippingBar => {
                        // Read threshold and currency from Liquid-generated data attributes
                        // This uses Shopify's native localization.country approach
                        const threshold = parseInt(freeShippingBar.getAttribute('data-threshold')) || 0;
                        const currencyCode = freeShippingBar.getAttribute('data-currency-code') || 'GBP';
                        const countryCode = freeShippingBar.getAttribute('data-country-code') || 'GB';

                        // If threshold is 0, this country doesn't have free shipping - hide the bar
                        if (threshold === 0) {
                            freeShippingBar.style.display = 'none';
                            return;
                        }

                        // Show the bar since country has free shipping
                        freeShippingBar.style.display = 'block';

                        const remaining = threshold - subtotal;
                        const progress = Math.min(Math.round((subtotal / threshold) * 100), 100);

                        const messageEl = freeShippingBar.querySelector('.free-shipping-bar-dynamic__message');
                        const progressEl = freeShippingBar.querySelector('.free-shipping-bar-dynamic__progress');
                        const progressFillEl = freeShippingBar.querySelector('.free-shipping-bar-dynamic__progress-fill');

                        if (!messageEl) return;

                        if (remaining > 0) {
                            // Still need more for free shipping
                            const formattedRemaining = formatMoney(remaining, currencyCode);

                            messageEl.innerHTML = `
                                <span class="free-shipping-bar-dynamic__icon">🚚</span>
                                <span class="free-shipping-bar-dynamic__text">
                                    <strong class="free-shipping-bar-dynamic__amount">${formattedRemaining}</strong> away from free shipping
                                </span>
                            `;
                            messageEl.classList.remove('free-shipping-bar-dynamic__message--eligible');

                            if (progressEl) progressEl.style.display = 'block';
                            if (progressFillEl) progressFillEl.style.width = progress + '%';
                        } else {
                            // Eligible for free shipping!
                            messageEl.innerHTML = `
                                <span class="free-shipping-bar-dynamic__text">
                                    <strong>You're eligible for free shipping!</strong> 🎉
                                </span>
                            `;
                            messageEl.classList.add('free-shipping-bar-dynamic__message--eligible');

                            if (progressEl) progressEl.style.display = 'none';
                        }
                    });
                })
                .catch(err => console.error('Error updating free shipping bar:', err));
        }

        function formatMoney(cents, currencyCode) {
            const amount = (cents / 100).toFixed(2);
            const symbols = {
                'GBP': '£',
                'USD': '$',
                'EUR': '€'
            };
            const symbol = symbols[currencyCode] || currencyCode + ' ';
            return symbol + amount;
        }

        // Initial update
        updateFreeShippingBar();

        // Listen for cart updates (from quantity changes, add to cart, etc.)
        document.addEventListener('cart:updated', function(e) {
            const cartData = e.detail && e.detail.cart ? e.detail.cart : null;
            updateFreeShippingBar(cartData);
        });

        // Note: Country changes are handled by Shopify's native localization form
        // which triggers a page reload, so no need to listen for storage events
    }

    // ============================================================================
    // PRODUCT SHOWCASE - Variant Selection & Quick Add
    // ============================================================================

    // Helper: Get/Set excluded product IDs from sessionStorage
    function getExcludedProducts() {
        try {
            const excluded = sessionStorage.getItem('showcase_excluded_products');
            return excluded ? JSON.parse(excluded) : [];
        } catch (e) {
            return [];
        }
    }

    function addExcludedProduct(productId) {
        try {
            const excluded = getExcludedProducts();
            if (!excluded.includes(productId)) {
                excluded.push(productId);
                sessionStorage.setItem('showcase_excluded_products', JSON.stringify(excluded));
            }
        } catch (e) {
            console.warn('Could not save excluded product', e);
        }
    }

    // Track loaded product IDs to avoid duplicates
    function getLoadedProductIds() {
        const showcaseContainer = document.querySelector('[data-showcase-container]');
        if (!showcaseContainer) return [];
        const allCards = Array.from(showcaseContainer.querySelectorAll('.showcase-card'));
        return allCards.map(card => card.getAttribute('data-product-id')).filter(Boolean);
    }

    // Get current cart product IDs to exclude them from showcase
    function getCartProductIds() {
        return fetch('/cart.js')
            .then(r => r.json())
            .then(cart => {
                if (cart && cart.items) {
                    return cart.items.map(item => String(item.product_id));
                }
                return [];
            })
            .catch(() => []);
    }

    // Dynamically load more products from collection
    function loadMoreProducts(collectionHandle, count = 5) {
        return new Promise((resolve, reject) => {
            if (!collectionHandle) {
                console.warn('loadMoreProducts: No collection handle provided');
                reject('No collection handle');
                return;
            }

            console.log('loadMoreProducts: Starting for collection:', collectionHandle);

            const excluded = getExcludedProducts();
            const loadedIds = getLoadedProductIds();
            console.log('Excluded products:', excluded.length);
            console.log('Loaded products:', loadedIds.length);

            // Get cart product IDs to exclude products already in cart
            getCartProductIds().then(cartProductIds => {
                console.log('Cart products:', cartProductIds.length);
                const allExcluded = [...new Set([...excluded, ...loadedIds, ...cartProductIds])];
                console.log('Total excluded (unique):', allExcluded.length);

                // Fetch more products from the collection
                const url = `/collections/${collectionHandle}/products.json?limit=50`;
                console.log('Fetching from:', url);

                fetch(url)
                    .then(r => r.json())
                    .then(data => {
                        console.log('API returned products:', data.products ? data.products.length : 0);

                        if (!data.products || data.products.length === 0) {
                            console.warn('No products returned from API');
                            resolve([]);
                            return;
                        }

                        // Filter out:
                        // 1. Already loaded and excluded products
                        // 2. Products from valentines-day-free-gifts collection
                        // 3. Products already in cart
                        const newProducts = data.products.filter(p => {
                            // Skip if already excluded/loaded/in cart
                            if (allExcluded.includes(String(p.id))) {
                                return false;
                            }

                            // Skip if product has 'valentines-day-free-gifts' tag or is from that collection
                            if (p.tags && Array.isArray(p.tags)) {
                                const hasFreeGiftTag = p.tags.some(tag =>
                                    tag.toLowerCase().includes('free') ||
                                    tag.toLowerCase().includes('gift') ||
                                    tag.toLowerCase().includes('valentine')
                                );
                                if (hasFreeGiftTag) return false;
                            }

                            // Skip if product handle contains free-gift or valentine
                            if (p.handle && (
                                p.handle.includes('free-gift') ||
                                p.handle.includes('valentine')
                            )) {
                                return false;
                            }

                            return true;
                        }).slice(0, count);

                        console.log('Filtered products (after exclusions):', newProducts.length);
                        if (newProducts.length > 0) {
                            console.log('Returning product:', newProducts[0].title);
                        }

                        resolve(newProducts);
                    })
                    .catch(err => {
                        console.error('Error fetching products:', err);
                        reject(err);
                    });
            }).catch(err => {
                console.error('Error getting cart products:', err);
                // Fallback: just use excluded and loaded IDs
                const allExcluded = [...new Set([...excluded, ...loadedIds])];

                fetch(`/collections/${collectionHandle}/products.json?limit=50`)
                    .then(r => r.json())
                    .then(data => {
                        if (!data.products || data.products.length === 0) {
                            resolve([]);
                            return;
                        }

                        const newProducts = data.products.filter(p => {
                            if (allExcluded.includes(String(p.id))) return false;
                            if (p.tags && Array.isArray(p.tags)) {
                                const hasFreeGiftTag = p.tags.some(tag =>
                                    tag.toLowerCase().includes('free') ||
                                    tag.toLowerCase().includes('gift') ||
                                    tag.toLowerCase().includes('valentine')
                                );
                                if (hasFreeGiftTag) return false;
                            }
                            if (p.handle && (p.handle.includes('free-gift') || p.handle.includes('valentine'))) {
                                return false;
                            }
                            return true;
                        }).slice(0, count);

                        resolve(newProducts);
                    })
                    .catch(err => {
                        console.error('Fallback fetch error:', err);
                        reject(err);
                    });
            });
        });
    }

    // Create product card element (returns DOM element, not HTML string)
    function createProductCard(product) {
        // Create the card element
        const card = document.createElement('div');
        card.className = 'showcase-card';
        card.setAttribute('data-product-id', product.id);

        let variantHtml = '';
        if (product.variants && product.variants.length > 1) {
            const availableVariants = product.variants.filter(v => v.available);
            if (availableVariants.length > 0) {
                variantHtml = '<select class="showcase-card__variant-selector" data-product-variant-selector>';
                availableVariants.forEach(variant => {
                    // API returns price in dollars, convert to cents for Shopify.formatMoney
                    const variantPrice = Math.round(parseFloat(variant.price) * 100) || 0;
                    const priceDisplay = Shopify.formatMoney(variantPrice);
                    variantHtml += `<option value="${variant.id}" data-price="${variantPrice}">${variant.title} - ${priceDisplay}</option>`;
                });
                variantHtml += '</select>';
            }
        } else if (product.variants && product.variants.length === 1) {
            const variant = product.variants[0];
            // API returns price in dollars, convert to cents for Shopify.formatMoney
            const variantPrice = Math.round(parseFloat(variant.price) * 100) || 0;
            variantHtml = `<input type="hidden" class="showcase-card__variant-id" value="${variant.id}" data-price="${variantPrice}">`;
        }

        // Get image URL
        let imageUrl = '';
        if (product.images && product.images.length > 0) {
            imageUrl = product.images[0].src.replace(/_(pico|icon|thumb|small|compact|medium|large|grande|original|1024x1024|2048x2048|master)\.(jpg|jpeg|gif|png|bmp|bitmap|webp)/gi, '_200x200.$2');
        }

        // Get display price using Shopify.formatMoney - same as cart items use | money
        // API returns prices in dollars, convert to cents for Shopify.formatMoney
        let displayPrice = Shopify.formatMoney(0);
        if (product.variants && product.variants.length > 0) {
            if (product.price_varies) {
                const prices = product.variants.map(v => Math.round(parseFloat(v.price) * 100) || 0).filter(p => p > 0);
                if (prices.length > 0) {
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    displayPrice = `${Shopify.formatMoney(minPrice)} - ${Shopify.formatMoney(maxPrice)}`;
                }
            } else {
                const price = Math.round(parseFloat(product.variants[0].price) * 100) || 0;
                displayPrice = Shopify.formatMoney(price);
            }
        }

        const productTitle = product.title || 'Product';
        const truncatedTitle = productTitle.length > 40 ? productTitle.substring(0, 40) + '...' : productTitle;
        const productUrl = product.url || '#';

        // For multi-variant products, set the first available variant as default
        let defaultVariantId = '';
        if (product.variants && product.variants.length > 0) {
            const firstAvailable = product.variants.find(v => v.available);
            if (firstAvailable) {
                defaultVariantId = firstAvailable.id;
            } else if (product.variants[0]) {
                defaultVariantId = product.variants[0].id;
            }
        }

        card.innerHTML = `
            <div class="showcase-card__top-row">
                <a href="${productUrl}" class="showcase-card__image-link">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${productTitle}" class="showcase-card__image" loading="lazy">` : '<div class="showcase-card__image-placeholder"></div>'}
                </a>
                <a href="${productUrl}" class="showcase-card__title">
                    ${truncatedTitle}
                </a>
            </div>
            <div class="showcase-card__content">
                <div class="showcase-card__variant-wrapper">
                    ${variantHtml}
                </div>
                <div class="showcase-card__price-wrapper">
                    <span class="showcase-card__price">${displayPrice}</span>
                </div>
                <div class="showcase-card__actions">
                    <button class="showcase-card__add-btn" type="button" data-showcase-quick-add data-product-id="${product.id}" ${defaultVariantId ? `data-variant-id="${defaultVariantId}"` : ''} aria-label="Quick add ${productTitle} to cart">
                        Quick Add
                    </button>
                    <button class="showcase-card__remove-btn" type="button" data-showcase-remove aria-label="Remove ${productTitle} from suggestions">
                        ×
                    </button>
                </div>
            </div>
        `;

        console.log('Created card with variant ID:', defaultVariantId);

        return card;
    }

    // Helper function to refresh variant IDs on buttons (exposed globally)
    window.refreshShowcaseVariantIds = function() {
        document.querySelectorAll('.showcase-card').forEach(card => {
            const variantSelector = card.querySelector('[data-product-variant-selector]');
            const addBtn = card.querySelector('[data-showcase-quick-add]');

            if (variantSelector && addBtn) {
                // Set variant ID from the first selected option
                const selectedValue = variantSelector.value || variantSelector.options[0]?.value;
                if (selectedValue) {
                    addBtn.setAttribute('data-variant-id', selectedValue);
                    console.log('Refreshed variant ID:', selectedValue, 'for product:', card.getAttribute('data-product-id'));
                }
            }
        });
    };

    // Use event delegation to avoid duplicate event listeners
    let showcaseInitialized = false;

    function initProductShowcase() {
        // Prevent multiple initializations
        if (showcaseInitialized) return;
        showcaseInitialized = true;

        // Mark previously excluded products and cart products, then ensure 3 are visible
        const excluded = getExcludedProducts();
        const showcaseContainer = document.querySelector('[data-showcase-container]');

        if (showcaseContainer) {
            // Get cart product IDs to exclude
            getCartProductIds().then(cartProductIds => {
                const allCards = Array.from(showcaseContainer.querySelectorAll('.showcase-card'));

                // Mark excluded products and products already in cart
                allCards.forEach(card => {
                    const productId = card.getAttribute('data-product-id');
                    if (productId) {
                        // Mark if previously excluded
                        if (excluded.includes(productId)) {
                            card.setAttribute('data-excluded', 'true');
                        }
                        // Mark if already in cart
                        if (cartProductIds.includes(productId)) {
                            card.setAttribute('data-excluded', 'true');
                        }
                    }
                });

                // Ensure exactly 3 visible products on init (prioritize non-excluded)
                const nonExcludedCards = allCards.filter(c => !c.hasAttribute('data-excluded'));
                const excludedCards = allCards.filter(c => c.hasAttribute('data-excluded'));

                // Hide all first
                allCards.forEach(c => c.classList.add('showcase-card--hidden'));

                // Show first 3 non-excluded, or fill with excluded if needed
                const cardsToShow = nonExcludedCards.slice(0, 3);
                if (cardsToShow.length < 3) {
                    cardsToShow.push(...excludedCards.slice(0, 3 - cardsToShow.length));
                }
                cardsToShow.forEach(c => c.classList.remove('showcase-card--hidden'));
            }).catch(err => {
                console.warn('Could not get cart products:', err);
                // Fallback: just use excluded list
                const allCards = Array.from(showcaseContainer.querySelectorAll('.showcase-card'));

                if (excluded.length > 0) {
                    allCards.forEach(card => {
                        const productId = card.getAttribute('data-product-id');
                        if (productId && excluded.includes(productId)) {
                            card.setAttribute('data-excluded', 'true');
                        }
                    });
                }

                const nonExcludedCards = allCards.filter(c => !c.hasAttribute('data-excluded'));
                const excludedCards = allCards.filter(c => c.hasAttribute('data-excluded'));

                allCards.forEach(c => c.classList.add('showcase-card--hidden'));

                const cardsToShow = nonExcludedCards.slice(0, 3);
                if (cardsToShow.length < 3) {
                    cardsToShow.push(...excludedCards.slice(0, 3 - cardsToShow.length));
                }
                cardsToShow.forEach(c => c.classList.remove('showcase-card--hidden'));
            });
        }

        // Event delegation for Remove buttons
        document.addEventListener('click', function(e) {
            const removeBtn = e.target.closest('[data-showcase-remove]');
            if (!removeBtn) return;

            e.preventDefault();
            const card = removeBtn.closest('.showcase-card');
            if (!card) return;

            console.log('Remove button clicked for product:', card.getAttribute('data-product-id'));

            // Get product ID and add to excluded list
            const productId = card.getAttribute('data-product-id');
            if (productId) {
                addExcludedProduct(productId);
                console.log('Added to excluded list:', productId);
            }

            // Find next available product to replace THIS specific card at the SAME position
            const showcaseContainer = document.querySelector('[data-showcase-container]');
            if (!showcaseContainer) {
                console.warn('No showcase container found');
                return;
            }

            const allCards = Array.from(showcaseContainer.querySelectorAll('.showcase-card'));
            console.log('Total cards in DOM:', allCards.length);

            const availableCards = allCards.filter(c =>
                c.classList.contains('showcase-card--hidden') &&
                !c.hasAttribute('data-excluded')
            );
            console.log('Available hidden cards:', availableCards.length);

            // Replace this card with next available product at the SAME DOM position
            if (availableCards.length > 0) {
                const nextCard = availableCards[0];
                console.log('Replacing with existing hidden card:', nextCard.getAttribute('data-product-id'));
                // Replace the current card with the next available one at the same position
                card.replaceWith(nextCard);
                nextCard.classList.remove('showcase-card--hidden');
            } else {
                // No more products in DOM, try to load more dynamically
                console.log('No available cards, loading more products...');
                const collectionHandle = showcaseContainer.getAttribute('data-collection-handle');

                if (!collectionHandle) {
                    console.warn('No collection handle found');
                    card.classList.add('showcase-card--hidden');
                    card.setAttribute('data-excluded', 'true');
                    return;
                }

                console.log('Loading from collection:', collectionHandle);
                loadMoreProducts(collectionHandle, 1)
                    .then(products => {
                        console.log('Loaded products:', products.length);
                        if (products.length > 0) {
                            console.log('Creating card for product:', products[0].title);
                            // Create new product card element
                            const newCard = createProductCard(products[0]);

                            // Replace the current card with the new one at the SAME position
                            card.replaceWith(newCard);

                            // Refresh variant IDs for the new card
                            if (typeof window.refreshShowcaseVariantIds === 'function') {
                                window.refreshShowcaseVariantIds();
                            }
                        } else {
                            console.warn('No more products available to load');
                            // No more products available, just hide this card
                            card.classList.add('showcase-card--hidden');
                            card.setAttribute('data-excluded', 'true');
                        }
                    })
                    .catch(err => {
                        console.error('Error loading more products:', err);
                        // Just hide current card if loading fails
                        card.classList.add('showcase-card--hidden');
                        card.setAttribute('data-excluded', 'true');
                    });
            }
        });

        // Event delegation for Variant selection
        document.addEventListener('change', function(e) {
            const variantSelector = e.target.closest('[data-product-variant-selector]');
            if (!variantSelector) return;

            const card = variantSelector.closest('.showcase-card');
            if (!card) return;

            const selectedOption = variantSelector.options[variantSelector.selectedIndex];
            const price = selectedOption.getAttribute('data-price');
            const variantId = selectedOption.value;
            const priceElement = card.querySelector('.showcase-card__price');
            const addBtn = card.querySelector('[data-showcase-quick-add]');

            // Update price display using Shopify.formatMoney - same as cart items
            // Price stored in data-price attribute is already in cents
            if (price && priceElement) {
                const priceInCents = parseInt(price) || 0;
                priceElement.textContent = Shopify.formatMoney(priceInCents);
            }

            // Update button data-variant-id
            if (addBtn && variantId) {
                addBtn.setAttribute('data-variant-id', variantId);
            }
        });

        // Initialize variant selectors on page load
        window.refreshShowcaseVariantIds();
    }

    // ============================================================================
    // SHOWCASE QUICK ADD - Bind outside initProductShowcase for reliability
    // ============================================================================
    let lastShowcaseAddTime = 0;
    const SHOWCASE_ADD_COOLDOWN = 1000;

    function bindShowcaseQuickAdd() {
        if (document._showcaseQuickAddBound) return;

        document.addEventListener('click', function(e) {
            const addBtn = e.target.closest('[data-showcase-quick-add]');
            if (!addBtn) return;

            e.preventDefault();
            e.stopPropagation();

            // Prevent double-click
            if (addBtn.disabled || addBtn.classList.contains('loading')) {
                console.log('Quick Add: Button already processing');
                return;
            }

            // Rate limiting
            const now = Date.now();
            if (now - lastShowcaseAddTime < SHOWCASE_ADD_COOLDOWN) {
                console.log('Quick Add: Too fast, please wait');
                addBtn.textContent = 'Wait...';
                setTimeout(() => { addBtn.textContent = 'Quick Add'; }, 500);
                return;
            }
            lastShowcaseAddTime = now;

            const card = addBtn.closest('.showcase-card');
            if (!card) {
                console.error('Quick Add: No card found');
                return;
            }

            // Get variant ID from button, selector, or hidden input
            let variantId = addBtn.getAttribute('data-variant-id');

            if (!variantId) {
                const variantSelector = card.querySelector('[data-product-variant-selector]');
                if (variantSelector) {
                    variantId = variantSelector.value;
                }
            }

            if (!variantId) {
                const hiddenInput = card.querySelector('.showcase-card__variant-id');
                if (hiddenInput) {
                    variantId = hiddenInput.value;
                }
            }

            if (!variantId || variantId === '') {
                console.error('Quick Add: No variant ID found');
                return;
            }

            console.log('Quick Add: Starting with variant ID:', variantId);

            // Set loading state
            addBtn.disabled = true;
            const originalText = addBtn.textContent;
            addBtn.textContent = 'Adding...';

            // Add to excluded list
            const productId = card.getAttribute('data-product-id');
            if (productId) {
                addExcludedProduct(productId);
            }

            // Use exact same logic as regular Add to Cart
            const formData = new FormData();
            formData.append('id', variantId);
            formData.append('quantity', '1');

            console.log('Quick Add: Sending request to /cart/add.js');

            fetch('/cart/add.js', { method: 'POST', body: formData })
                .then(r => {
                    console.log('Quick Add: Response status:', r.status);
                    if (!r.ok) throw new Error('Add failed: ' + r.status);
                    return r.json();
                })
                .then(data => {
                    console.log('Quick Add: Added to cart:', data);

                    // Check if we're on the cart page (not drawer)
                    const isCartPage = !!document.querySelector('.cart-sidebar');

                    if (isCartPage) {
                        // On cart page: update cart count and reload to show new items
                        console.log('Quick Add: On cart page, reloading...');
                        updateCartCount().catch(() => {});
                        window.location.reload();
                    } else {
                        // In drawer: refresh drawer and open it
                        console.log('Quick Add: In drawer, refreshing...');
                        return refreshDrawer().then(() => {
                            openDrawer();
                            updateCartCount().catch(() => {});
                        });
                    }
                })
                .catch(err => {
                    console.error('Quick Add: Error:', err);
                    addBtn.textContent = originalText;
                    addBtn.disabled = false;
                });
        }, true); // Use capture phase like Add to Cart

        document._showcaseQuickAddBound = true;
    }

    function formatMoney(cents, currency) {
        const amount = (cents / 100).toFixed(2);
        const symbols = {
            'GBP': '£',
            'USD': '$',
            'EUR': '€',
            'AUD': 'A$',
            'CAD': 'C$',
            'NZD': 'NZ$'
        };
        const symbol = symbols[currency] || currency + ' ';
        return symbol + amount;
    }

    // Initialize once on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProductShowcase);
    } else {
        initProductShowcase();
    }

    // Re-initialize variant IDs when drawer content changes
    document.addEventListener('cart:updated', function() {
        // Small delay to ensure DOM has updated
        setTimeout(function() {
            if (typeof window.refreshShowcaseVariantIds === 'function') {
                window.refreshShowcaseVariantIds();
            }
        }, 100);
    });

    // ============================================================================
    // SHIPPING COST BAR - Location-based shipping messaging (Cart Page Only)
    // ============================================================================
    // Note: Shipping cost bar is only shown on cart page, not in drawer
    // Country detection is handled by Shopify's native localization.country object
    // When country changes via localization form, page reloads automatically

})();