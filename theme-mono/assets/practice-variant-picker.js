(function () {
  const section = document.querySelector('.variant-picker');
  if (!section) return;

  // Replace Dawn's default <variant-selects> with our custom picker
  const variantSelects = document.querySelector('variant-selects');
  if (variantSelects) {
    variantSelects.replaceWith(section);
  }

  const productVariants = JSON.parse(section.dataset.variants);  // зчитуємо з data-атрибуту
    const variantIdInput = section.querySelector('[data-variant-id]');
    const selectedValues = {};

    // Init selected values
    section.querySelectorAll('.variant-picker__option').forEach((optionEl) => {
      const index = parseInt(optionEl.dataset.optionIndex);
      const selected = optionEl.querySelector('.variant-picker__option-btn.is-selected');
      if (selected) selectedValues[index] = selected.dataset.value;
    });

    section.querySelectorAll('.variant-picker__option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const optionIndex = parseInt(btn.dataset.optionIndex);
        const value = btn.dataset.value;

        selectedValues[optionIndex] = value;

        // Update button states
        btn.closest('.variant-picker__option-values')
          .querySelectorAll('.variant-picker__option-btn')
          .forEach((b) => {
            const isSelected = b.dataset.value === value;
            b.classList.toggle('is-selected', isSelected);
            b.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          });

        // Update label selected value
        const label = btn.closest('.variant-picker__option').querySelector('.variant-picker__selected-value');
        if (label) label.textContent = value;

        updateVariant();
      });
    });

    section.addEventListener('variant:changed', (event) => {
      const detail = event.detail.variant;
      console.log(detail);
      const price = detail.price;
      const available = detail.available;
      const featured_media = detail.featured_media;
      console.log('change');
      
      const price_block = document.querySelector('.price__regular .price-item.price-item--regular');

      if(price_block) {
        price_block.textContent = "₴" + (price / 100).toFixed(2) + " UAH";
      }

      const addBtn = document.querySelector('.product-form__submit');
      if (addBtn) {
        section.classList.toggle('variant--sold-out', !available);
        addBtn.disabled = !available;
        // Update only the text span — never overwrite innerHTML or textContent on the button
        // because Dawn's product-form.js needs .loading__spinner to be intact inside it
        const btnText = addBtn.querySelector('[data-add-to-cart-text], span:not(.loading__spinner):not(.sold-out-message)');
        if (btnText) btnText.textContent = available ? 'Add to cart' : 'Sold out';
      }


      // data-media-id має формат "{section.id}-{media.id}"
      // section.id можна передати через data атрибут на враппері
      const mediaId = detail.featured_media?.id;
      console.log('mediaId:', mediaId);
      
      const allSlides = document.querySelectorAll('.product__media-item');
      console.log('slides found:', allSlides.length);
      allSlides.forEach((s) => console.log('slide data-media-id:', s.dataset.mediaId));

      if (mediaId) {
        allSlides.forEach((slide) => {
          const matches = slide.dataset.mediaId?.endsWith(`-${mediaId}`);
          slide.classList.toggle('is-active', matches);
        });
      }
    })

    function updateVariant() {
      const matched = productVariants.find((variant) => {
        return Object.entries(selectedValues).every(([index, value]) => {
          const optionKey = 'option' + (parseInt(index) + 1);
          return variant[optionKey] === value;
        });
      });

      if (matched) {
        // Update our hidden input
        variantIdInput.value = matched.id;

        // Update URL with new variant ID (no page reload)
        const url = new URL(window.location.href);
        url.searchParams.set('variant', matched.id);
        history.replaceState({ variantId: matched.id }, '', url.toString());

        // Update ALL variant id inputs inside product-form so ATC and Buy Now use the correct variant
        const productFormEl = document.querySelector('product-form');
        if (productFormEl) {
          productFormEl.querySelectorAll('input[name="id"]').forEach((input) => {
            input.value = matched.id;
          });
        }

        // Dispatch event for other components (e.g. price, add-to-cart)
        section.dispatchEvent(new CustomEvent('variant:changed', {
          bubbles: true,
          detail: { variant: matched }
        }));
      }
    }
  })();
