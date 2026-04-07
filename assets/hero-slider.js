/**
 * Hero Slider - Simple sliding animation from right to left
 */

(function() {
  'use strict';

  class HeroSlider {
    constructor(element) {
      this.el = element;
      this.container = this.el.querySelector('[data-slides-container]');
      this.slides = Array.from(this.el.querySelectorAll('.hero-slider__slide'));
      this.dots = this.el.querySelectorAll('.hero-slider__dot');
      this.prevBtn = this.el.querySelector('[data-prev]');
      this.nextBtn = this.el.querySelector('[data-next]');

      this.currentIndex = 0;
      this.isAnimating = false;
      this.isPaused = false;
      this.timer = null;

      this.settings = this.getSettings();

      if (this.slides.length > 1) {
        this.init();
      }
    }

    getSettings() {
      const sectionId = this.el.getAttribute('data-section-id');
      const script = document.querySelector(`script[data-section-id="${sectionId}"][data-section-data]`);

      try {
        return script ? JSON.parse(script.textContent) : {};
      } catch (e) {
        return {};
      }
    }

    init() {
      // Make sure first slide is visible
      this.slides[0].style.display = 'block';

      this.bindEvents();
      this.startAutoplay();
    }

    bindEvents() {
      // Arrows
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => this.prev());
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => this.next());
      }

      // Dots
      this.dots.forEach((dot, i) => {
        dot.addEventListener('click', () => this.goTo(i));
      });

      // Pause on hover
      this.el.addEventListener('mouseenter', () => {
        this.isPaused = true;
      });
      this.el.addEventListener('mouseleave', () => {
        this.isPaused = false;
      });

      // Touch swipe
      let startX = 0;
      this.el.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true });

      this.el.addEventListener('touchend', (e) => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
          diff > 0 ? this.next() : this.prev();
        }
      }, { passive: true });
    }

    startAutoplay() {
      if (!this.settings.enableAutoplay) return;

      const duration = (this.settings.autoplayDuration || 5) * 1000;

      this.timer = setInterval(() => {
        if (!this.isPaused && !this.isAnimating) {
          this.next();
        }
      }, duration);
    }

    next() {
      const nextIndex = (this.currentIndex + 1) % this.slides.length;
      // If going from last to first, use 'prev' direction (left to right)
      const direction = (this.currentIndex === this.slides.length - 1 && nextIndex === 0) ? 'prev' : 'next';
      this.slideTo(nextIndex, direction);
    }

    prev() {
      const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
      this.slideTo(prevIndex, 'prev');
    }

    goTo(index) {
      if (index !== this.currentIndex) {
        // Determine direction based on index comparison
        const direction = index > this.currentIndex ? 'next' : 'prev';
        this.slideTo(index, direction);
      }
    }

    slideTo(newIndex, direction = 'next') {
      if (this.isAnimating || newIndex === this.currentIndex) return;
      this.isAnimating = true;

      const current = this.slides[this.currentIndex];
      const next = this.slides[newIndex];
      const speed = this.settings.animationSpeed || 800;

      // Get dimensions
      const height = current.offsetHeight;

      // Prepare container
      this.container.style.height = height + 'px';
      this.container.style.position = 'relative';
      this.container.style.overflow = 'hidden';

      // Reveal animation: Next slide is positioned underneath, current slide moves away to reveal it
      // User only sees ONE image at a time - current slides away revealing next underneath

      // Setup next slide - full width, positioned underneath current
      next.style.display = 'block';
      next.style.position = 'absolute';
      next.style.top = '0';
      next.style.left = '0';
      next.style.width = '100%';
      next.style.zIndex = '1';
      next.style.transform = 'translateX(0) translateZ(0)';

      // Setup current slide - on top, will slide away
      current.style.position = 'absolute';
      current.style.top = '0';
      current.style.left = '0';
      current.style.width = '100%';
      current.style.zIndex = '2';
      current.style.transform = 'translateX(0) translateZ(0)';

      // Force reflow
      next.offsetHeight;

      // Smooth easing for the animation
      const easing = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
      current.style.transition = `transform ${speed}ms ${easing}`;

      // Animate - current slide moves away to reveal next slide underneath
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (direction === 'next') {
            // Current slides left, revealing next underneath
            current.style.transform = 'translateX(-100%) translateZ(0)';
          } else {
            // Current slides right, revealing next underneath
            current.style.transform = 'translateX(100%) translateZ(0)';
          }
        });
      });

      // Update dots
      this.dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === newIndex);
      });

      // Cleanup after animation
      setTimeout(() => {
        // Reset current slide
        current.style.display = 'none';
        current.style.position = '';
        current.style.top = '';
        current.style.left = '';
        current.style.width = '';
        current.style.zIndex = '';
        current.style.transform = '';
        current.style.transition = '';

        // Reset next slide styles
        next.style.position = '';
        next.style.top = '';
        next.style.left = '';
        next.style.width = '';
        next.style.zIndex = '';
        next.style.transform = '';

        // Reset container
        this.container.style.height = '';
        this.container.style.overflow = '';

        this.currentIndex = newIndex;
        this.isAnimating = false;
      }, speed + 50);
    }

    destroy() {
      if (this.timer) {
        clearInterval(this.timer);
      }
    }

    pause() {
      this.isPaused = true;
    }

    play() {
      this.isPaused = false;
    }
  }

  // Initialize
  function init() {
    document.querySelectorAll('[data-hero-slider]').forEach((el) => {
      const id = el.getAttribute('data-section-id');
      window.heroSliderInstances = window.heroSliderInstances || new Map();

      if (!window.heroSliderInstances.has(id)) {
        window.heroSliderInstances.set(id, new HeroSlider(el));
      }
    });
  }

  // Shopify Theme Editor
  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', (e) => {
      const slider = e.target.querySelector('[data-hero-slider]');
      if (slider) {
        const id = slider.getAttribute('data-section-id');
        window.heroSliderInstances?.get(id)?.destroy();
        window.heroSliderInstances?.delete(id);
        window.heroSliderInstances = window.heroSliderInstances || new Map();
        window.heroSliderInstances.set(id, new HeroSlider(slider));
      }
    });

    document.addEventListener('shopify:section:unload', (e) => {
      const slider = e.target.querySelector('[data-hero-slider]');
      if (slider) {
        const id = slider.getAttribute('data-section-id');
        window.heroSliderInstances?.get(id)?.destroy();
        window.heroSliderInstances?.delete(id);
      }
    });

    document.addEventListener('shopify:block:select', (e) => {
      const slider = e.target.closest('[data-hero-slider]');
      if (slider) {
        const id = slider.getAttribute('data-section-id');
        const instance = window.heroSliderInstances?.get(id);
        if (instance) {
          instance.pause();
          const index = parseInt(e.target.getAttribute('data-slide-index'), 10);
          instance.goTo(index);
        }
      }
    });

    document.addEventListener('shopify:block:deselect', (e) => {
      const slider = e.target.closest('[data-hero-slider]');
      if (slider) {
        const id = slider.getAttribute('data-section-id');
        window.heroSliderInstances?.get(id)?.play();
      }
    });
  }

  // Run
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();