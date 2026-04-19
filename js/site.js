const CART_STORAGE_KEY = 'sirius-cart-v1';

function parsePriceValue(text) {
  const numeric = String(text || '')
    .replace(/[^0-9.,]/g, '')
    .replace(/,/g, '');
  return Number.parseFloat(numeric) || 0;
}

function formatCurrency(value) {
  return `${value.toLocaleString('en-US')} EUR`;
}

function readCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = readCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('.cart-count').forEach((badge) => {
    badge.textContent = String(count);
  });
}

function addItemToCart(item) {
  const cart = readCart();
  const existing = cart.find((entry) => entry.id === item.id);

  if (existing) {
    existing.quantity += item.quantity || 1;
  } else {
    cart.push({ ...item, quantity: item.quantity || 1 });
  }

  writeCart(cart);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getCardProductData(card) {
  const name = card.querySelector('.product-name, h3')?.textContent?.trim() || 'Product';
  const description = card.querySelector('.product-description, p')?.textContent?.trim() || '';
  const priceText = card.querySelector('.product-price, .price, .new-price')?.textContent?.trim() || '0';
  const visual = card.querySelector('.product-image')?.textContent?.trim() || name.slice(0, 2).toUpperCase();
  const category = card.dataset.category || 'general';

  return {
    id: `${category}-${slugify(name)}`,
    name,
    description,
    price: parsePriceValue(priceText),
    category,
    visual,
    quantity: 1
  };
}

function bindAddToCartButtons() {
  document.querySelectorAll('.btn-add, [data-add-to-cart]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.product-card');

      if (card) {
        addItemToCart(getCardProductData(card));
        button.textContent = 'Added';
        window.setTimeout(() => {
          button.textContent = button.dataset.originalLabel || 'Add to Cart';
        }, 1200);
        return;
      }

      const detail = document.querySelector('.product-detail-info');
      if (!detail) return;

      const name = detail.querySelector('h1')?.textContent?.trim() || 'Product';
      const priceText = detail.querySelector('.product-detail-price')?.textContent?.trim() || '0';
      const quantity = Number.parseInt(document.querySelector('.quantity-selector input')?.value || '1', 10) || 1;
      addItemToCart({
        id: `detail-${slugify(name)}`,
        name,
        description: detail.querySelector('p')?.textContent?.trim() || '',
        price: parsePriceValue(priceText),
        category: document.body.dataset.page || 'general',
        visual: document.querySelector('.product-detail-image')?.textContent?.trim() || name.slice(0, 2).toUpperCase(),
        quantity
      });
    });

    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent.trim();
    }
  });
}

function renderCartPage() {
  const cartTableBody = document.querySelector('[data-cart-items]');
  const cartEmpty = document.querySelector('[data-cart-empty]');
  const subtotalEl = document.querySelector('[data-cart-subtotal]');
  const shippingEl = document.querySelector('[data-cart-shipping]');
  const totalEl = document.querySelector('[data-cart-total]');
  const formState = document.querySelector('[data-cart-form-state]');
  if (!cartTableBody || !subtotalEl || !shippingEl || !totalEl) return;

  const cart = readCart();
  cartTableBody.innerHTML = '';

  if (!cart.length) {
    if (cartEmpty) cartEmpty.hidden = false;
    formState?.setAttribute('data-cart-ready', 'false');
  } else {
    if (cartEmpty) cartEmpty.hidden = true;
    formState?.setAttribute('data-cart-ready', 'true');
  }

  cart.forEach((item) => {
    const row = document.createElement('tr');
    const lineTotal = item.price * item.quantity;
    row.innerHTML = `
      <td>
        <div class="cart-product-cell">
          <span class="cart-product-visual">${item.visual}</span>
          <div>
            <strong>${item.name}</strong>
            <div class="cart-product-meta">${item.category}</div>
          </div>
        </div>
      </td>
      <td>${formatCurrency(item.price)}</td>
      <td>
        <div class="cart-qty-control">
          <button type="button" data-cart-decrease="${item.id}" aria-label="Decrease quantity">-</button>
          <span>${item.quantity}</span>
          <button type="button" data-cart-increase="${item.id}" aria-label="Increase quantity">+</button>
        </div>
      </td>
      <td>${formatCurrency(lineTotal)}</td>
      <td><button type="button" class="cart-remove-btn" data-cart-remove="${item.id}">Remove</button></td>
    `;
    cartTableBody.appendChild(row);
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 500 ? 0 : subtotal > 0 ? 15 : 0;
  const total = subtotal + shipping;

  subtotalEl.textContent = formatCurrency(subtotal);
  shippingEl.textContent = shipping === 0 ? 'Free' : formatCurrency(shipping);
  totalEl.textContent = formatCurrency(total);

  document.querySelectorAll('[data-cart-increase]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = readCart().map((item) => (
        item.id === button.dataset.cartIncrease ? { ...item, quantity: item.quantity + 1 } : item
      ));
      writeCart(next);
      renderCartPage();
    });
  });

  document.querySelectorAll('[data-cart-decrease]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = readCart()
        .map((item) => (
          item.id === button.dataset.cartDecrease ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
        ));
      writeCart(next);
      renderCartPage();
    });
  });

  document.querySelectorAll('[data-cart-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = readCart().filter((item) => item.id !== button.dataset.cartRemove);
      writeCart(next);
      renderCartPage();
    });
  });
}

function bindSearchInputs() {
  document.querySelectorAll('[data-product-search]').forEach((input) => {
    input.addEventListener('input', () => {
      const term = input.value.trim().toLowerCase();
      document.querySelectorAll('.products-grid .product-card').forEach((card) => {
        const text = card.textContent.toLowerCase();
        const categoryMatch = !card.dataset.filteredOut;
        const matches = text.includes(term);
        card.hidden = !matches || card.dataset.filteredOut === 'true';
        if (categoryMatch && matches) card.hidden = false;
      });
    });
  });
}

function bindSortSelect() {
  const sortSelect = document.querySelector('[data-product-sort]');
  const grid = document.querySelector('.products-grid');
  if (!sortSelect || !grid) return;

  sortSelect.addEventListener('change', () => {
    const cards = Array.from(grid.querySelectorAll('.product-card'));
    cards.sort((a, b) => {
      const priceA = parsePriceValue(a.querySelector('.product-price')?.textContent || '0');
      const priceB = parsePriceValue(b.querySelector('.product-price')?.textContent || '0');
      const nameA = a.querySelector('.product-name, h3')?.textContent?.trim() || '';
      const nameB = b.querySelector('.product-name, h3')?.textContent?.trim() || '';

      switch (sortSelect.value) {
        case 'price-asc': return priceA - priceB;
        case 'price-desc': return priceB - priceA;
        case 'name-asc': return nameA.localeCompare(nameB);
        default: return 0;
      }
    });

    cards.forEach((card) => grid.appendChild(card));
  });
}

function enhanceAccessibility() {
  document.querySelectorAll('.search-input').forEach((input) => {
    input.setAttribute('aria-label', 'Search products');
  });

  document.querySelectorAll('.search-btn').forEach((button) => {
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', 'Submit search');
  });

  document.querySelectorAll('.category-card, .feature-box[onclick]').forEach((card) => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'link');
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });
}

function normalizeContent() {
  const replacements = [
    ['âš¡ Sirius Albania', 'Sirius Albania'],
    ['ðŸ”', 'Search'],
    ['ðŸ‘¤ Account', 'Account'],
    ['ðŸ›’', 'Cart'],
    ['Categories â–¼', 'Categories ▼'],
    ['ðŸ“±', 'Phone'],
    ['âŒš', 'Watch'],
    ['ðŸ”Œ', 'Access'],
    ['ðŸ’»', 'Laptop'],
    ['ðŸ–¥ï¸', 'Desktop'],
    ['ðŸ“º', 'Display'],
    ['ðŸŽ§', 'Audio'],
    ['ðŸŽ®', 'Gaming'],
    ['ðŸ“·', 'Camera'],
    ['ðŸ“¹', 'Camera'],
    ['ðŸ”Š', 'Speaker'],
    ['ðŸŽ™ï¸', 'Studio'],
    ['ðŸ–±ï¸', 'Mouse'],
    ['ðŸ–¨ï¸', 'Printer'],
    ['ðŸ“¡', 'Router'],
    ['ðŸ’¾', 'SSD'],
    ['ðŸ”', 'Dock'],
    ['ðŸ›¡ï¸', 'Shield'],
    ['Add to Cart', 'Add to Cart'],
    ['Back to Products', 'Back to Products'],
    ['Shopping Cart', 'Shopping Cart'],
    ['Contact', 'Contact'],
    ['About Us', 'About Us'],
    ['Cart Summary', 'Cart Summary'],
    ['Shipping', 'Shipping'],
    ['Total', 'Total'],
    ['Continue Shopping', 'Continue Shopping'],
    ['Proceed to Checkout', 'Proceed to Checkout'],
    ['Didn’t find your answer?', 'Didn’t find your answer?'],
    ['Need more confidence?', 'Need more confidence?'],
    ['Free shipping across Albania', 'Free shipping across Albania'],
    ['All rights reserved.', 'All rights reserved.']
  ];

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    let value = node.nodeValue;
    replacements.forEach(([from, to]) => {
      value = value.split(from).join(to);
    });
    node.nodeValue = value;
  });

  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((field) => {
    let placeholder = field.getAttribute('placeholder') || '';
    replacements.forEach(([from, to]) => {
      placeholder = placeholder.split(from).join(to);
    });
    field.setAttribute('placeholder', placeholder);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  normalizeContent();
  updateCartCount();
  bindAddToCartButtons();
  renderCartPage();
  bindSearchInputs();
  bindSortSelect();
  enhanceAccessibility();
});
