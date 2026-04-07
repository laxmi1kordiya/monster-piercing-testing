class SearchModal extends HTMLElement {
    constructor() {
        super();
        this.modalCloseButton = this.querySelector('[data-asset="search-modal-close"]');
        this.body = document.querySelector('body');
        this._currentScrollCandidate = null;
    }

    connectedCallback() {
        document.querySelectorAll('button[data-asset="search-button"]').forEach((button) => {
            button.addEventListener('click', this.handleSearchButtonClickEvent.bind(this));
        });

        if (this.modalCloseButton) {
            this.modalCloseButton.addEventListener('click', this.handleSearchCloseButtonClickEvent.bind(this));
        }
    }

    /* -----------------------------------------
       FIND & PREPARE THE SCROLLABLE INNER PANEL
    ----------------------------------------- */
    _prepareScrollablePanel() {
        const selectors = [
            '.search-modal__panel',
            '.search-modal__inner',
            '.search-results',
            '.search-modal-inner'
        ];

        let candidate = null;

        // Try known selectors first
        for (let sel of selectors) {
            const el = this.querySelector(sel);
            if (el) { candidate = el; break; }
        }

        // Fallback: pick largest element inside modal
        if (!candidate) {
            const all = Array.from(this.querySelectorAll('*'));
            candidate = all.reduce((best, el) => {
                if (!best) return el;
                return (el.scrollHeight > best.scrollHeight) ? el : best;
            }, null);
        }

        if (!candidate) return null;

        // Apply scroll styles
        candidate.dataset.modalScrollCandidate = 'true';
        candidate.style.maxHeight = 'calc(100vh - 40px)';
        candidate.style.overflow = 'auto';
        candidate.style.webkitOverflowScrolling = 'touch';
        candidate.setAttribute('tabindex', '-1');

        // Focus so scroll works immediately
        try { candidate.focus({ preventScroll: true }); } catch (e) {}

        return candidate;
    }

    /* ------------------------------
       OPEN SEARCH MODAL
    ------------------------------ */
    handleSearchButtonClickEvent(event) {
        // Show modal visually
        this.body.classList.add('search-modal-loaded', 'search-modal-visible');

        // Lock body scroll (shared helper)
        if (typeof window.disablePageScroll === 'function') {
            window.disablePageScroll();
        }

        // Prepare scrollable modal content
        this._currentScrollCandidate = this._prepareScrollablePanel();
    }

    /* ------------------------------
       CLOSE SEARCH MODAL
    ------------------------------ */
    handleSearchCloseButtonClickEvent(event) {
    this.body.classList.remove('search-modal-loaded', 'search-modal-visible');

    /* FORCE restore scroll — do NOT rely on theme helper */
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';

    if (this._currentScrollCandidate) {
        let c = this._currentScrollCandidate;
        c.style.maxHeight = '';
        c.style.overflow = '';
        c.style.webkitOverflowScrolling = '';
        c.removeAttribute('tabindex');
        delete c.dataset.modalScrollCandidate;
    }

    this._currentScrollCandidate = null;
}


        // this._currentScrollCandidate = null;
    // }
}


customElements.define('search-modal', SearchModal);

class LocalizationSelectorsForm extends HTMLElement {
     constructor() {
        super();
        this.localizationDataDisclosureToggleButton = this.querySelector('[data-disclosure-toggle]');
        this.disclosureList = this.querySelector('[data-disclosure-list]');
        this.disclosureOptions = this.querySelectorAll('[data-disclosure-option]');
        this.localizationForm = this.querySelector('#localization_form');
        this.disclosureInput = this.querySelector('[data-disclosure-input]');
    }

     connectedCallback() {
        const localCurrency = this.dataset.localCurrency;
        const configuredCurrenciesString = this.dataset.configuredCurrencies;

        if (!configuredCurrenciesString.includes(localCurrency)) {
          this.submitLocalizationForm("GB")
        }
       
        this.localizationDataDisclosureToggleButton.addEventListener('click', this.handleLocalizationDataDisclosureToggleButton.bind(this));

        for (var i = 0; i < this.disclosureOptions.length; i++) {
          var option = this.disclosureOptions[i];
          option.addEventListener('click', this.handleLocalizationOptionClickEvent.bind(this));
        }

        document.addEventListener('click', (event) => {
          if (!this.localizationDataDisclosureToggleButton.contains(event.target) && this.disclosureList.classList.contains('disclosure-list--visible')) {
             this.localizationDataDisclosureToggleButton.click();
          }
        });
    }

    handleLocalizationOptionClickEvent(event) {
      this.submitLocalizationForm(event.currentTarget.dataset.value);
    }

    submitLocalizationForm(value) {
      this.disclosureInput.value = value;
      this.localizationForm.submit();
    }

    handleLocalizationDataDisclosureToggleButton(event) {
        var ariaExpanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
        event.currentTarget.setAttribute('aria-expanded', !ariaExpanded);

        if (this.disclosureList.classList.contains('disclosure-list--visible')) {
          this.disclosureList.classList.remove('disclosure-list--visible');
        } else {
          this.disclosureList.classList.add('disclosure-list--visible');
        }
    }
}
customElements.define('localization-selectors-form', LocalizationSelectorsForm);


(() => {
  class FeaturedCollectionTab {
    constructor() {
      this.tabLinks = null;
      this.tabCollections = null;
      this.section = null;
    }

    register(section) {
      this.section = section;
      this.tabLinks = this.section.querySelectorAll('[data-featured-collection-tab-link]');
      this.tabCollections = this.section.querySelectorAll('[data-featured-collection]');
      this._initEvents();
    }

    _initEvents() {
      this.tabLinks?.forEach(link => {
        link.addEventListener('click', (event) => this.handleLinkClickEvent(event));
      });
    }

    handleLinkClickEvent(event) {
      event.preventDefault();
      const link = event.currentTarget;
      const targetId = link.getAttribute('href').replace('#', '');
      this.tabLinks.forEach(tabLink => tabLink.classList.remove('active'));
      this.tabCollections.forEach(tabCollection => tabCollection.classList.remove('active'));
      link.classList.add('active');
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.add('active');
      }
    }

  }

  const featuredCollectionsAsTabSections = document.querySelectorAll('[data-featured-collections-as-tabs]');
  featuredCollectionsAsTabSections.forEach(section => {
    const featuredCollectionTab = new FeaturedCollectionTab();
    featuredCollectionTab.register(section);
  });
})();

(() => {
  class Accordion {
    constructor(el) {
      this.el = el;
      this.summary = el.querySelector('summary');
      this.content = el.querySelector('.collapsible-tab__text');
      this.animation = null;
      this.isClosing = false;
      this.isExpanding = false;
      this.summary.addEventListener('click', (e) => this.onClick(e));
    }
  
    onClick(e) {
      e.preventDefault();
      this.el.style.overflow = 'hidden';
      if (this.isClosing || !this.el.open) {
        this.open();
      } else if (this.isExpanding || this.el.open) {
        this.shrink();
      }
    }
  
    shrink() {
      this.isClosing = true;
      const startHeight = `${this.el.offsetHeight}px`;
      const endHeight = `${this.summary.offsetHeight}px`;

      if (this.animation) {
        this.animation.cancel();
      }
      
      this.animation = this.el.animate({
        height: [startHeight, endHeight]
      }, {
        duration: 400,
        easing: 'ease-out'
      });
      
      this.animation.onfinish = () => this.onAnimationFinish(false);
      this.animation.oncancel = () => this.isClosing = false;
    }
  
    open() {
      this.el.style.height = `${this.el.offsetHeight}px`;
      this.el.open = true;
      window.requestAnimationFrame(() => this.expand());
    }
  
    expand() {
      this.isExpanding = true;
      const startHeight = `${this.el.offsetHeight}px`;
      const endHeight = `${this.summary.offsetHeight + this.content.offsetHeight}px`;
      
      if (this.animation) {
        this.animation.cancel();
      }
      
      // Start a WAAPI animation
      this.animation = this.el.animate({
        height: [startHeight, endHeight]
      }, {
        duration: 400,
        easing: 'ease-out'
      });
      this.animation.onfinish = () => this.onAnimationFinish(true);
      this.animation.oncancel = () => this.isExpanding = false;
    }
  
    onAnimationFinish(open) {
      this.el.open = open;
      this.animation = null;
      this.isClosing = false;
      this.isExpanding = false;
      this.el.style.height = this.el.style.overflow = '';
    }
  }
  
  document.querySelectorAll('details.collapsible-tab').forEach((el) => {
    new Accordion(el);
  });document.addEventListener("DOMContentLoaded", function () {

  const mobileNav = document.querySelector(".mobile-nav-content");
  if (!mobileNav) return;

  function clearSelected() {
    mobileNav.querySelectorAll(".menu-selected").forEach(el => {
      el.classList.remove("menu-selected");
    });
  }

  
  function getHeadingLink(item) {
    // Priority 1: explicit parent link
    let link = item.querySelector(".navmenu-link-parent");
    if (link) return link;

    // Priority 2: active class
    link = item.querySelector(".navmenu-link.navmenu-link-active");
    if (link) return link;

    // Priority 3: ANY link inside the item (works for Gold)
    return item.querySelector(".navmenu-link");
  }

  function updateSelection(button) {
    const item = button.closest(".navmenu-item");
    if (!item) return;

    const isOpen = button.getAttribute("aria-expanded") === "true";
    const link = getHeadingLink(item);

    clearSelected();

    if (isOpen && link) {
      link.classList.add("menu-selected");
    }
  }

  mobileNav.querySelectorAll(".navmenu-button").forEach(button => {
    button.addEventListener("click", function () {
      // small delay to wait for aria-expanded change
      setTimeout(() => updateSelection(button), 20);
    });
  });

});
/* Permanent mobile fix: force expanded headings red via inline style */
(function () {
  const ROOT = '.mobile-nav-content';
  const root = document.querySelector(ROOT);
  if (!root) return;

  const COLOR_VAR = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#C72536';

  function clearAll() {
    root.querySelectorAll('.navmenu-link').forEach(a => a.style.removeProperty('color'));
  }

  function applyToOpen() {
    clearAll();
    const anchors = Array.from(root.querySelectorAll('.navmenu-link[aria-expanded="true"]'));
    root.querySelectorAll('.navmenu-button[aria-expanded="true"]').forEach(btn => {
      const item = btn.closest('.navmenu-item');
      const a = item && item.querySelector('.navmenu-link');
      if (a && !anchors.includes(a)) anchors.push(a);
    });
    anchors.forEach(a => a.style.setProperty('color', COLOR_VAR, 'important'));
  }

  // initial run
  applyToOpen();

  // observe changes
  const mo = new MutationObserver(() => {
    // small debounce
    if (mo._t) clearTimeout(mo._t);
    mo._t = setTimeout(applyToOpen, 15);
  });
  mo.observe(root, { attributes: true, childList: true, subtree: true });
  
})();

})();
/* ===============================
   GLOBAL SCROLL SAFETY NET
   If user clicks page → allow scroll
================================ */

function forceEnableScroll() {
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
}

/* Any click on page restores scroll if no overlay is open */
document.addEventListener(
  'click',
  function () {
    const searchOpen = document.body.classList.contains('search-modal-visible');

    const cartOpen =
      document.body.classList.contains('cart-drawer-open') ||
      document.body.classList.contains('cart-open');

    if (!searchOpen && !cartOpen) {
      forceEnableScroll();
    }
  },
  true
);

/* ESC key fallback */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    forceEnableScroll();
  }
});

/* Header: hide on scroll down, show on scroll up */
document.addEventListener('DOMContentLoaded', function() {
  var header = document.querySelector('.site-header.static-header-ew');
  if (!header) return;

  var lastScrollY = 0;

  window.addEventListener('scroll', function() {
    var currentScrollY = window.scrollY;

    // Only apply hide/show when header is in sticky/scrolled state
    if (header.classList.contains('site-header-sticky--scrolled')) {
      if (currentScrollY > lastScrollY) {
        // Scrolling down - hide
        header.classList.add('header--hidden');
      } else {
        // Scrolling up - show
        header.classList.remove('header--hidden');
      }
    } else {
      // Not scrolled yet, remove hidden class
      header.classList.remove('header--hidden');
    }

    lastScrollY = currentScrollY;
  });
});

/* -------------------------------------------------------
   Swatch Slider Arrow – scroll swatches on click
------------------------------------------------------- */
(function () {
  function initSwatchArrows() {
    document.querySelectorAll('[data-swatch-arrow]').forEach(function (arrow) {
      if (arrow._swatchArrowInit) return;
      arrow._swatchArrowInit = true;

      arrow.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var container = arrow.closest('.productitem--swatches')
          ?.querySelector('.productitem--swatches-container');
        if (!container) return;

        var scrollAmount = container.offsetWidth * 0.6;
        var isReversed = arrow.classList.contains('reverse');

        if (isReversed) {
          container.scrollLeft -= scrollAmount;
          // If scrolled back to start, flip arrow to forward
          if (container.scrollLeft - scrollAmount <= 0) {
            arrow.classList.remove('reverse');
            arrow.style.transform = '';
          }
        } else {
          container.scrollLeft += scrollAmount;
          // If near the end, flip arrow to reverse
          var maxScroll = container.scrollWidth - container.clientWidth;
          if (container.scrollLeft + scrollAmount >= maxScroll) {
            arrow.classList.add('reverse');
            arrow.style.transform = 'rotate(180deg)';
          }
        }
      });

      // Update arrow direction on manual scroll (touch/drag)
      var container = arrow.closest('.productitem--swatches')
        ?.querySelector('.productitem--swatches-container');
      if (container) {
        container.addEventListener('scroll', function () {
          var maxScroll = container.scrollWidth - container.clientWidth;
          if (container.scrollLeft >= maxScroll - 2) {
            arrow.classList.add('reverse');
            arrow.style.transform = 'rotate(180deg)';
          } else if (container.scrollLeft <= 2) {
            arrow.classList.remove('reverse');
            arrow.style.transform = '';
          }
        });
      }
    });
  }

  // Init on DOMContentLoaded and observe for dynamically added cards
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSwatchArrows);
  } else {
    initSwatchArrows();
  }

  // Re-init when new product cards are injected (e.g. AJAX pagination)
  var observer = new MutationObserver(function () {
    initSwatchArrows();
  });
})();

(function () {
  var mobileTop = document.querySelector('.product-info--mobile-top');
  if (!mobileTop) return;

  var desktopPricing = document.querySelector('[data-product-details] [data-product-pricing]');
  var mobilePricing = mobileTop.querySelector('[data-product-pricing]');
  if (!desktopPricing || !mobilePricing) return;

  // Elements in the desktop pricing block (source of truth)
  var desktopPriceContainer = desktopPricing.querySelector('[data-price-container]');
  var desktopCompareContainer = desktopPricing.querySelector('[data-price-compare-container]');
  var desktopBadge = desktopPricing.querySelector('[data-badge-sales]');

  // Corresponding elements in the mobile pricing block
  var mobilePriceContainer = mobilePricing.querySelector('[data-price-container]');
  var mobileCompareContainer = mobilePricing.querySelector('[data-price-compare-container]');
  var mobileBadge = mobilePricing.querySelector('[data-badge-sales]');

  function syncMobilePrice() {
    if (desktopPriceContainer && mobilePriceContainer) {
      mobilePriceContainer.innerHTML = desktopPriceContainer.innerHTML;
    }
    if (desktopCompareContainer && mobileCompareContainer) {
      mobileCompareContainer.innerHTML = desktopCompareContainer.innerHTML;
      mobileCompareContainer.className = desktopCompareContainer.className;
    }
    if (desktopBadge && mobileBadge) {
      mobileBadge.innerHTML = desktopBadge.innerHTML;
      mobileBadge.className = desktopBadge.className;
    }
    // Sync visibility
    mobilePricing.style.visibility = desktopPricing.style.visibility;
  }

  // Watch desktop price container for changes (theme JS replaces innerHTML)
  if (desktopPriceContainer) {
    new MutationObserver(syncMobilePrice)
      .observe(desktopPriceContainer, { childList: true, subtree: true, characterData: true });
  }
  if (desktopCompareContainer) {
    new MutationObserver(syncMobilePrice)
      .observe(desktopCompareContainer, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  }
  if (desktopBadge) {
    new MutationObserver(syncMobilePrice)
      .observe(desktopBadge, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  }

  // Also listen for variant-change directly as a safety net
  var variantSelection = document.querySelector('[data-variant-selection]');
  if (variantSelection) {
    variantSelection.addEventListener('variant-change', function () {
      setTimeout(syncMobilePrice, 200);
    });
  }
})();

/* -------------------------------------------------------
   Move WishlistHero button inside .product-form__action-wrapper
   and inject custom heart SVG icons directly into the button
------------------------------------------------------- */
(function () {
  const SVG_EMPTY  = '<svg class="wh-heart-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#db1e37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  const SVG_FILLED = '<svg class="wh-heart-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#db1e37" stroke="#db1e37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

  function injectHeartSVG(btn) {
    if (btn.querySelector('.wh-heart-svg')) return;
    btn.insertAdjacentHTML('beforeend', SVG_EMPTY);

    // Watch for WishlistHero adding/removing .btn class (wishlisted toggle)
    const btnObserver = new MutationObserver(function () {
      const svg = btn.querySelector('.wh-heart-svg');
      if (!svg) return;
      if (btn.classList.contains('btn')) {
        svg.outerHTML = SVG_FILLED;
      } else {
        btn.querySelector('.wh-heart-svg').outerHTML = SVG_EMPTY;
      }
    });
    btnObserver.observe(btn, { attributes: true, attributeFilter: ['class'] });
  }

  function setupWishlist() {
    const wishlist = document.querySelector('.wishlisthero-product-page-button-container');
    const actionWrapper = document.querySelector('.product-form__action-wrapper');
    if (!wishlist || !actionWrapper) return false;

    // Move into action wrapper
    if (!actionWrapper.contains(wishlist)) {
      actionWrapper.appendChild(wishlist);
    }

    // Inject heart SVG into the button — only succeed if button exists
    const btn = wishlist.querySelector('button');
    if (!btn) return false;

    injectHeartSVG(btn);
    return true;
  }

  // Try immediately (in case WishlistHero already injected the button)
  if (!setupWishlist()) {
    // Fallback: watch for WishlistHero injecting the button later
    const observer = new MutationObserver(function () {
      if (setupWishlist()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
