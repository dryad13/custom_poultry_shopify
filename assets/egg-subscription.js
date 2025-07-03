// Egg Subscription Interface JS
// All config/data from window.eggSubscriptionSettings
// Handles: quantity selector, calendar, delivery area, price calc, FAQ, subscribe button

(function() {
  // --- Config ---
  const settings = window.eggSubscriptionSettings || {};
  let unitPrice = parseFloat(settings.unitPrice) || 0.5;
  let minQty = parseInt(settings.minQuantity) || 6;
  let maxQty = parseInt(settings.maxQuantity) || 60;
  let deliveryAreas = {};
  try { deliveryAreas = typeof settings.deliveryAreas === 'string' ? JSON.parse(settings.deliveryAreas) : settings.deliveryAreas; } catch(e) {}
  let currency = settings.currency || 'USD';

  // --- Elements ---
  const qtyInput = document.getElementById('egg-quantity');
  const qtyDecrement = document.getElementById('egg-qty-decrement');
  const qtyIncrement = document.getElementById('egg-qty-increment');
  const calendarEl = document.getElementById('egg-calendar');
  const calendarSummary = document.getElementById('egg-calendar-summary');
  const areaSelect = document.getElementById('egg-delivery-area');
  const priceBreakdown = document.getElementById('egg-price-breakdown');
  const subscribeBtn = document.getElementById('egg-subscribe-btn');
  const ctaBtn = document.getElementById('egg-subscription-cta');
  const faqQuestions = document.querySelectorAll('.egg-faq-question');

  // --- State ---
  let selectedQty = minQty;
  let selectedDates = [];
  let selectedArea = areaSelect ? areaSelect.value : '';
  let selectedAreaFee = areaSelect ? parseFloat(areaSelect.options[areaSelect.selectedIndex].dataset.fee) : 0;

  // --- Quantity Selector ---
  function updateQtyDisplay() {
    qtyInput.value = selectedQty;
    calculatePrice();
  }
  if (qtyDecrement && qtyIncrement && qtyInput) {
    qtyDecrement.addEventListener('click', function() {
      if (selectedQty > minQty) {
        selectedQty--;
        updateQtyDisplay();
      }
    });
    qtyIncrement.addEventListener('click', function() {
      if (selectedQty < maxQty) {
        selectedQty++;
        updateQtyDisplay();
      }
    });
  }

  // --- Calendar (Multi-date Picker) ---
  function renderCalendar(month, year) {
    // Remove existing
    calendarEl.innerHTML = '';
    const today = new Date();
    const currentMonth = typeof month === 'number' ? month : today.getMonth();
    const currentYear = typeof year === 'number' ? year : today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Header
    const header = document.createElement('div');
    header.className = 'egg-calendar-header';
    header.innerHTML = `
      <button type="button" class="egg-calendar-nav" id="egg-calendar-prev" aria-label="Previous month">&#8592;</button>
      <span class="egg-calendar-month">${firstDay.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
      <button type="button" class="egg-calendar-nav" id="egg-calendar-next" aria-label="Next month">&#8594;</button>
    `;
    calendarEl.appendChild(header);
    // Days grid
    const grid = document.createElement('div');
    grid.className = 'egg-calendar-grid';
    // Weekday headers
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'egg-calendar-weekdays';
    weekdays.forEach(d => {
      const wd = document.createElement('span');
      wd.className = 'egg-calendar-weekday';
      wd.textContent = d;
      weekdayRow.appendChild(wd);
    });
    grid.appendChild(weekdayRow);
    // Empty slots before first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      const empty = document.createElement('span');
      empty.className = 'egg-calendar-day empty';
      grid.appendChild(empty);
    }
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const dateStr = date.toISOString().split('T')[0];
      const dayBtn = document.createElement('button');
      dayBtn.type = 'button';
      dayBtn.className = 'egg-calendar-day';
      dayBtn.textContent = d;
      dayBtn.setAttribute('data-date', dateStr);
      if (selectedDates.includes(dateStr)) {
        dayBtn.classList.add('selected');
        dayBtn.setAttribute('aria-pressed', 'true');
      } else {
        dayBtn.setAttribute('aria-pressed', 'false');
      }
      dayBtn.addEventListener('click', function() {
        if (selectedDates.includes(dateStr)) {
          selectedDates = selectedDates.filter(dt => dt !== dateStr);
        } else {
          selectedDates.push(dateStr);
        }
        renderCalendar(currentMonth, currentYear);
        updateCalendarSummary();
        calculatePrice();
      });
      grid.appendChild(dayBtn);
    }
    calendarEl.appendChild(grid);
    // Nav events
    header.querySelector('#egg-calendar-prev').addEventListener('click', function() {
      let prevMonth = currentMonth - 1;
      let prevYear = currentYear;
      if (prevMonth < 0) { prevMonth = 11; prevYear--; }
      renderCalendar(prevMonth, prevYear);
    });
    header.querySelector('#egg-calendar-next').addEventListener('click', function() {
      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      if (nextMonth > 11) { nextMonth = 0; nextYear++; }
      renderCalendar(nextMonth, nextYear);
    });
  }
  function updateCalendarSummary() {
    if (!calendarSummary) return;
    if (selectedDates.length === 0) {
      calendarSummary.textContent = 'No delivery dates selected.';
    } else {
      const sorted = selectedDates.slice().sort();
      calendarSummary.textContent = 'Selected: ' + sorted.map(dt => {
        const d = new Date(dt);
        return d.toLocaleDateString();
      }).join(', ');
    }
  }
  if (calendarEl) {
    renderCalendar();
    updateCalendarSummary();
  }

  // --- Delivery Area ---
  if (areaSelect) {
    areaSelect.addEventListener('change', function() {
      selectedArea = areaSelect.value;
      selectedAreaFee = parseFloat(areaSelect.options[areaSelect.selectedIndex].dataset.fee) || 0;
      calculatePrice();
    });
  }

  // --- Price Calculation ---
  function formatMoney(amount) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(amount);
  }
  function calculatePrice() {
    const eggsCost = selectedQty * unitPrice * (selectedDates.length || 1);
    const deliveryCost = (selectedDates.length || 1) * (selectedAreaFee || 0);
    // Taxes: for demo, just show as 0 or included; real tax handled at checkout
    const taxes = settings.taxEnabled ? 0 : 0;
    const total = eggsCost + deliveryCost + taxes;
    if (priceBreakdown) {
      priceBreakdown.innerHTML = `
        <div class="egg-price-breakdown-row">
          <span>Eggs (${selectedQty} x ${formatMoney(unitPrice)} x ${selectedDates.length || 1} days):</span>
          <span>${formatMoney(eggsCost)}</span>
        </div>
        <div class="egg-price-breakdown-row">
          <span>Deliveries (${selectedDates.length || 1} x ${formatMoney(selectedAreaFee)}):</span>
          <span>${formatMoney(deliveryCost)}</span>
        </div>
        <div class="egg-price-breakdown-row">
          <span>Taxes:</span>
          <span>${settings.taxEnabled ? 'Included' : formatMoney(taxes)}</span>
        </div>
        <div class="egg-price-breakdown-row egg-price-breakdown-total">
          <span>Total Monthly Subscription:</span>
          <span>${formatMoney(total)}</span>
        </div>
      `;
    }
  }
  calculatePrice();

  // --- FAQ Accordion ---
  if (faqQuestions && faqQuestions.length) {
    faqQuestions.forEach(btn => {
      btn.addEventListener('click', function() {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', !expanded);
        const answer = btn.parentElement.querySelector('.egg-faq-answer');
        if (answer) answer.hidden = expanded;
      });
    });
  }

  // --- CTA Button Scroll ---
  if (ctaBtn) {
    ctaBtn.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('egg-subscription-form').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // --- Subscribe Now Button ---
  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      // --- Shopify Native Add to Cart/Checkout ---
      // You must create a hidden product for the subscription in Shopify, and use its variant ID below.
      // Replace 'SUBSCRIPTION_VARIANT_ID' with your actual variant ID.
      const SUBSCRIPTION_VARIANT_ID = 'SUBSCRIPTION_VARIANT_ID'; // TODO: Replace with your product's variant ID
      // Prepare properties for subscription app integration
      const properties = {
        'Egg Quantity': selectedQty,
        'Delivery Dates': selectedDates.join(', '),
        'Delivery Area': selectedArea
      };
      // --- Native Shopify Cart Add ---
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: SUBSCRIPTION_VARIANT_ID,
          quantity: 1,
          properties: properties
        })
      })
      .then(res => res.json())
      .then(data => {
        // Redirect to checkout
        window.location.href = '/checkout';
      })
      .catch(err => {
        alert('Error adding subscription to cart. Please try again.');
      });
      // --- Integration Hook for Recharge/Bold ---
      // If using Recharge/Bold, replace the above with their JS API, or trigger a custom event here:
      // document.dispatchEvent(new CustomEvent('eggSubscription:submit', { detail: { qty: selectedQty, dates: selectedDates, area: selectedArea } }));
    });
  }
})(); 