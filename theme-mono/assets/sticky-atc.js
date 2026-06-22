if (!customElements.get('sticky-atc-bar')) {
  customElements.define(
    'sticky-atc-bar',
    class StickyAtcBar extends HTMLElement {
      connectedCallback() {
        const formId = this.dataset.formId;
        this.formEl = document.getElementById(formId);
        this.footerEl = document.querySelector('.shopify-section--footer');

        if (!this.formEl) return;

        this.formHidden = false;
        this.footerVisible = false;

        this.observer = new IntersectionObserver(this.onIntersect.bind(this));
        this.observer.observe(this.formEl);
        if (this.footerEl) this.observer.observe(this.footerEl);
      }

      onIntersect(entries) {
        entries.forEach((entry) => {
          if (entry.target === this.formEl) {
            this.formHidden =
              !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
          }
          if (entry.target === this.footerEl) {
            this.footerVisible = entry.isIntersecting;
          }
        });

        this.classList.toggle('is-visible', this.formHidden && !this.footerVisible);
      }

      disconnectedCallback() {
        if (this.observer) this.observer.disconnect();
      }
    }
  );
}
