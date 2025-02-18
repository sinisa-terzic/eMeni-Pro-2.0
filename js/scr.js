document.addEventListener('DOMContentLoaded', () => {
    // Konstante i varijable
    const JSON_PATH = 'js/data.json';
    const IMG_BASE_PATH = 'img/food/';
    const container = document.querySelector('.container');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const dropdownOverlay = document.getElementById('dropdownOverlay');
    const prevBtn = document.querySelector('.btn.prev');
    const nextBtn = document.querySelector('.btn.next');
    const playBtn = document.querySelector('.btn.play');
    const hamburger = document.querySelector('.hamburger');
    const infoContainer = document.getElementById('infoContainer');
    const selectedItemsContainer = document.getElementById('selectedItems');
    const checkboxCount = document.getElementById('checkboxCount');
    const popupOverlay = document.getElementById('imagePopup');
    const cartContainer = document.getElementById('cart');
    const phoneNumber = document.getElementById('phoneNumber');
    const callOptions = document.getElementById('callOptions');
    const overlay = document.getElementById('overlay');
    const closeBtn = document.querySelector('.call-option-close-btn');

    let activeIndex = 0;
    let categories = [];
    let selectedItems = [];
    let autoPlayInterval;
    const autoPlayDelay = 3600;
    let isAutoPlayActive = false;

    // Fetch podataka
    async function fetchData() {
        try {
            const response = await fetch(JSON_PATH);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (!data.category) throw new Error('Nevalidan JSON format');
            categories = Object.values(data.category);
            initializeMenu();
            updateClasses();
        } catch (error) {
            console.error('Greška:', error);
            infoContainer.innerHTML = `<div class="error">${error.message}</div>`;
        }
    }

    // Utility funkcija za debounce
    const debounce = (func, wait = 100) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(null, args), wait);
        };
    };

    // Generisanje menija
    function initializeMenu() {
        categories.forEach((category, index) => {
            createBox(category, index);
            createInfoSection(category, index);
            createMenuItem(category, index);
        });
    }

    // Kreiranje menu itema
    function createMenuItem(category, index) {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        menuItem.innerHTML = `
            <span class="category-number">${index + 1}.</span>
            <span class="category-title">${category.details.replace(':', '')}</span>
        `;
        menuItem.addEventListener('click', () => {
            activeIndex = index;
            updateClasses();
            closeDropdown();
        });
        dropdownMenu.appendChild(menuItem);
    }

    // Kreiranje box elemenata
    function createBox(category, index) {
        const box = document.createElement('div');
        box.className = 'box';
        box.innerHTML = `
            <p class="box-text">${category.details}</p>
            <div class="image-overlay"></div>
        `;
        box.style.backgroundImage = `url('${IMG_BASE_PATH}cat/${index + 1}.jpg')`;
        container.appendChild(box);

        setupLazyLoading(box);
    }

    // Postavljanje lazy loadinga sa IntersectionObserver
    function setupLazyLoading(box) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bg = entry.target.getAttribute('data-bg');
                    if (bg && !entry.target.style.backgroundImage) {
                        entry.target.style.backgroundImage = `url('${bg}')`;
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '0px',
            threshold: 0.1
        });

        observer.observe(box);
    }

    // Kreiranje info sekcija
    function createInfoSection(category, index) {
        const infoItem = document.createElement('div');
        infoItem.className = 'info-item';
        infoItem.innerHTML = `
            <h2>${category.details}</h2>
            <div class="category-description">${category.description}</div>
            <div class="items-grid">
                ${category.translations.map((item, itemIndex) => `
                    <article class="menu-card" data-id="${index}-${itemIndex}">
                        <img src="${IMG_BASE_PATH}${item.imageSrc}" 
                            alt="${item.title_key}" 
                            class="item-image"
                            loading="lazy">
                        <div class="card-content">
                            <h3 class="card-title">
                                ${item.title_key}
                                <input type="checkbox" class="item-checkbox" 
                                    data-id="${index}-${itemIndex}" 
                                    data-title="${item.title_key}" 
                                    data-price="${item.cost_key.replace('€', '').trim()}">
                            </h3>
                            <p class="item-description">${item.text_key}</p>
                            <div class="item-footer">
                                <div class="quantity-controls">
                                    <button class="quantity-btn decrement">-</button>
                                    <span class="quantity">1</span>
                                    <button class="quantity-btn increment">+</button>
                                </div>
                                <span class="price">${item.cost_key}</span>
                            </div>
                        </div>
                    </article>
                `).join('')}
            </div>
        `;
        infoContainer.appendChild(infoItem);

        setupQuantityControls(infoItem);
    }

    // Postavljanje event listenera za količinu
    function setupQuantityControls(infoItem) {
        const quantityControls = infoItem.querySelectorAll('.quantity-controls');

        quantityControls.forEach(control => {
            const decrementBtn = control.querySelector('.decrement');
            const incrementBtn = control.querySelector('.increment');
            const quantityElement = control.querySelector('.quantity');
            const priceElement = control.closest('.card-content').querySelector('.price');
            const checkbox = control.closest('.card-content').querySelector('h3 .item-checkbox');

            decrementBtn.addEventListener('click', () => {
                updateQuantityAndPrice(quantityElement, priceElement, checkbox, -1);
            });

            incrementBtn.addEventListener('click', () => {
                updateQuantityAndPrice(quantityElement, priceElement, checkbox, 1);
            });
        });
    }

    // Ažuriranje količine i cijene
    function updateQuantityAndPrice(quantityElement, priceElement, checkbox, change) {
        if (!quantityElement || !priceElement || !checkbox) {
            console.error('Neki od elemenata nisu pronađeni.');
            return;
        }

        let quantity = parseInt(quantityElement.textContent);
        quantity += change;
        if (quantity < 1) quantity = 1;

        quantityElement.textContent = quantity;
        const basePrice = parseFloat(checkbox.getAttribute('data-price'));
        const newPrice = basePrice * quantity;
        priceElement.textContent = `${newPrice.toFixed(2)} €`;

        const itemId = checkbox.getAttribute('data-id');
        const selectedItem = selectedItems.find(item => item.id === itemId);
        if (selectedItem) {
            selectedItem.price = newPrice;
        }

        updateCart();
    }

    // Dodavanje event listenera na sliku
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('item-image')) {
            const menuCard = e.target.closest('.menu-card');
            const itemId = menuCard.getAttribute('data-id');
            const [categoryIndex, itemIndex] = itemId.split('-');
            const category = categories[categoryIndex];
            const item = category.translations[itemIndex];

            openPopup(item, itemId, categoryIndex, itemIndex);
        }
    });

    // Generisanje pop-up prozora
    function openPopup(item, itemId, categoryIndex, itemIndex) {
        const popup = document.getElementById('imagePopup');
        popup.innerHTML = `
            <div class="popup-content" data-id="${itemId}">
                <img src="${IMG_BASE_PATH}${item.imageSrc}" alt="${item.title_key}" class="popup-image">
                <div class="popup-details">
                    <div class="card-content">
                        <div class="popup-header">
                            <div class="flex">
                                <input type="checkbox" class="item-checkbox" 
                                    data-id="${itemId}" 
                                    data-title="${item.title_key}" 
                                    data-price="${item.cost_key.replace('€', '').trim()}">
                                <h3 class="card-title">${item.title_key}</h3>
                            </div>
                            <div class="quantity-controls">
                                <button class="quantity-btn decrement">-</button>
                                <span class="quantity">1</span>
                                <button class="quantity-btn increment">+</button>
                                <span class="price">${item.cost_key}</span>
                            </div>
                        </div>
                        <p class="item-description">${item.text_key}</p>
                        <div class="drinks-section">
                            <h4>Preporučena pića:</h4>
                            <ul class="drinks-list">
                                ${item.drink ? Object.values(item.drink).map(drink => `
                                    <li>${drink}</li>
                                `).join('') : '<li>Nema preporučenih pića.</li>'}
                            </ul>
                        </div>
                    </div>
                    <button class="close-popup">×</button>
                </div>
            </div>
        `;

        const newURL = `${window.location.pathname}?slide=${activeIndex}&popup=open`;
        history.pushState({ slide: activeIndex, popup: 'open' }, '', newURL);
        popup.style.display = 'flex';

        // Dodaj event listener za zatvaranje pop-up prozora
        popup.addEventListener('click', (e) => {
            if (e.target === popup || e.target.classList.contains('close-popup')) {
                closePopup();
            }
        });

        setupPopupEventListeners(popup, itemId, categoryIndex, itemIndex);
    }

    // Postavljanje event listenera za pop-up prozor
    function setupPopupEventListeners(popup, itemId, categoryIndex, itemIndex) {
        const checkbox = popup.querySelector('.item-checkbox');
        const quantityElement = popup.querySelector('.quantity');
        const priceElement = popup.querySelector('.price');
        const decrementBtn = popup.querySelector('.decrement');
        const incrementBtn = popup.querySelector('.increment');
        const closePopupBtn = popup.querySelector('.close-popup');

        const mainCheckbox = document.querySelector(`.menu-card[data-id="${itemId}"] .item-checkbox`);
        const mainQuantityElement = document.querySelector(`.menu-card[data-id="${itemId}"] .quantity`);
        const mainPriceElement = document.querySelector(`.menu-card[data-id="${itemId}"] .price`);

        if (!checkbox || !quantityElement || !priceElement || !mainCheckbox || !mainQuantityElement || !mainPriceElement) {
            console.error('Neki od elemenata u pop-up prozoru nisu pronađeni.');
            return;
        }

        checkbox.checked = mainCheckbox.checked;
        quantityElement.textContent = mainQuantityElement.textContent;
        priceElement.textContent = mainPriceElement.textContent;

        decrementBtn.addEventListener('click', () => {
            updateQuantityAndPrice(quantityElement, priceElement, checkbox, -1);
            updateQuantityAndPrice(mainQuantityElement, mainPriceElement, mainCheckbox, -1);
        });

        incrementBtn.addEventListener('click', () => {
            updateQuantityAndPrice(quantityElement, priceElement, checkbox, 1);
            updateQuantityAndPrice(mainQuantityElement, mainPriceElement, mainCheckbox, 1);
        });

        checkbox.addEventListener('change', () => {
            const id = checkbox.getAttribute('data-id');
            const title = checkbox.getAttribute('data-title');
            const price = parseFloat(checkbox.getAttribute('data-price'));
            const quantity = parseInt(quantityElement.textContent);

            if (checkbox.checked) {
                const existingItem = selectedItems.find(item => item.id === id);
                if (!existingItem) {
                    selectedItems.push({ id, title, price, quantity });
                }
            } else {
                selectedItems = selectedItems.filter(item => item.id !== id);
            }

            mainCheckbox.checked = checkbox.checked;
            updateCart();
        });

        closePopupBtn.addEventListener('click', () => {
            popup.style.display = 'none';
        });
    }

    // Ažuriranje klasa
    function updateClasses() {
        applyActiveClasses('.box', 'activeData', 'nextData', 'prevData');
        applyActiveClasses('.info-item', 'activeInfo', 'prevInfo', 'nextInfo');

        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach((item, index) => {
            item.classList.toggle('active-menu-item', index === activeIndex);
        });

        infoContainer.scrollTop = 0;
        updateProgress();
        calculateInfoContainerHeight();
    }

    // Primena aktivnih klasa
    function applyActiveClasses(selector, activeClass, nextClass, prevClass) {
        const elements = document.querySelectorAll(selector);
        const total = categories.length;

        elements.forEach((element, index) => {
            element.classList.remove(activeClass, nextClass, prevClass);
            if (index === activeIndex) element.classList.add(activeClass);
            else if (index === (activeIndex + 1) % total) element.classList.add(nextClass);
            else if (index === (activeIndex - 1 + total) % total) element.classList.add(prevClass);
        });
    }

    // Navigacija kroz slajdove
    function goToPrevSlide() {
        activeIndex = (activeIndex - 1 + categories.length) % categories.length;
        updateClasses();
        updateURL();
        updateProgress();
    }

    function goToNextSlide() {
        activeIndex = (activeIndex + 1) % categories.length;
        updateClasses();
        updateURL();
        updateProgress();
    }

    // Dodavanje touch eventova
    function addTouchEvents(element) {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        const swipeThreshold = 30;
        const verticalThreshold = 30;

        element.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            stopAutoPlay();
        }, { passive: true });

        element.addEventListener('touchmove', (e) => {
            touchEndX = e.touches[0].clientX;
            touchEndY = e.touches[0].clientY;
        }, { passive: false });

        element.addEventListener('touchend', debounce((e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = Math.abs(touchEndY - touchStartY);

            if (Math.abs(deltaX) > swipeThreshold && deltaY < verticalThreshold) {
                if (deltaX > 0) {
                    goToPrevSlide();
                } else {
                    goToNextSlide();
                }
            }
        }, 100));
    }

    addTouchEvents(container);
    addTouchEvents(infoContainer);

    // Auto-play funkcionalnost
    function startAutoPlay() {
        if (!isAutoPlayActive) {
            autoPlayInterval = setInterval(goToNextSlide, autoPlayDelay);
            isAutoPlayActive = true;
            playBtn.textContent = '⏸ Pauziraj';
            playBtn.classList.add('stop');
            updateProgress();
        }
    }

    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
        isAutoPlayActive = false;
        playBtn.textContent = '▶ Auto-play';
        playBtn.classList.remove('stop');
        updateProgress();
    }

    function toggleAutoPlay() {
        isAutoPlayActive ? stopAutoPlay() : startAutoPlay();
        updateProgress(); // Ažuriraj progres bar
    }

    // Ažuriranje progress bara
    let progressTimeout;
    function updateProgress() {
        const progressBar = document.getElementById('progressBar');
        clearTimeout(progressTimeout);

        if (isAutoPlayActive) {
            progressBar.style.transition = 'none';
            progressBar.style.width = '0%';
            setTimeout(() => {
                progressBar.style.transition = `width ${autoPlayDelay}ms linear`;
                progressBar.style.width = '110%';
            }, 50);
        } else {
            const progress = (activeIndex + 1) / categories.length * 100;
            progressBar.style.transition = '0.25s all';
            progressBar.style.width = `${progress}%`;
        }
    }

    // Izračunavanje visine info kontejnera
    function calculateInfoContainerHeight() {
        const header = document.getElementById('header');
        const progress = document.getElementById('progress');
        const carousel = document.getElementById('carousel');
        const control = document.getElementById('control');

        const totalUsedHeight =
            header.offsetHeight +
            progress.offsetHeight +
            carousel.offsetHeight +
            control.offsetHeight;

        const viewportHeight = window.innerHeight;
        const remainingHeight = viewportHeight - totalUsedHeight - 10;
        infoContainer.style.height = `${Math.max(remainingHeight, 100)}px`;
    }

    // Funkcionalnost za korpu
    function updateCart() {
        checkboxCount.textContent = selectedItems.length;

        if (selectedItems.length === 0) {
            selectedItemsContainer.innerHTML = `
            <div class="empty-cart-message">
                Vaša korpa je prazna.
            </div>
            <div class="cart-actions">
                <button id="backToMenuButton" class="back-to-menu" role="button" aria-label="Povratak na meni">Povratak na meni</button>
            </div>
        `;

            document.querySelector('.cart-actions').style.justifyContent = 'center';
        } else {
            const groupedItems = selectedItems.reduce((groups, item) => {
                const [categoryIndex, itemIndex] = item.id.split('-');
                const category = categories[categoryIndex];

                if (!groups[categoryIndex]) {
                    groups[categoryIndex] = {
                        categoryName: category.details,
                        items: []
                    };
                }

                const checkbox = document.querySelector(`.menu-card[data-id="${item.id}"] h3 .item-checkbox`);
                if (checkbox) {
                    const quantity = parseInt(checkbox.closest('.card-content').querySelector('.quantity').textContent);
                    const basePrice = parseFloat(checkbox.getAttribute('data-price'));
                    item.price = basePrice * quantity;
                    item.quantity = quantity;
                }

                groups[categoryIndex].items.push(item);
                return groups;
            }, {});

            let cartContent = Object.values(groupedItems).map(group => `
                <div class="category-group">
                    <span class="category-title">${group.categoryName}</span>
                    ${group.items.map(item => `
                        <div class="selected-item">
                            <button class="edit-item" data-id="${item.id}">✎</button>
                            <div class="title-quantity">
                                <span class="title-quantity-name">${item.title}</span> 
                                <span class="title-quantity-price">${item.quantity} x ${(item.price / item.quantity).toFixed(2)} € = ${item.price.toFixed(2)} €</span>
                            </div>
                            <button class="remove-item" data-id="${item.id}">×</button>
                        </div>
                    `).join('')}
                </div>
            `).join('');

            const totalPrice = selectedItems.reduce((total, item) => total + item.price, 0);
            cartContent += `
                <div id="totalPriceContainer" class="total-price-container">
                    <strong>Ukupna cena:</strong>
                    <span id="totalPrice">${totalPrice.toFixed(2)} €</span>
                </div>
            `;

            cartContent += `
                <div class="cart-actions">
                    <button id="clearAllButton">Izbriši sve</button>
                    <button id="backToMenuButton" class="back-to-menu">Povratak na meni</button>
                </div>
            `;

            selectedItemsContainer.innerHTML = cartContent;
            document.querySelector('.cart-actions').style.justifyContent = '';

            document.querySelectorAll('.edit-item').forEach(button => {
                button.addEventListener('click', () => {
                    const itemId = button.getAttribute('data-id');
                    const [categoryIndex, itemIndex] = itemId.split('-');
                    const category = categories[categoryIndex];
                    const item = category.translations[itemIndex];
                    openPopup(item, itemId, categoryIndex, itemIndex);
                });
            });
        }

        checkboxCount.style.display = selectedItems.length > 0 ? 'flex' : 'none';
    }

    // Event listener za dugme "Povratak na meni"
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('back-to-menu')) {
            cartContainer.classList.remove('open');
            closeCart();
        }

        if (event.target.classList.contains('remove-item')) {
            const itemId = event.target.getAttribute('data-id');
            selectedItems = selectedItems.filter(item => item.id !== itemId);
            updateCart();
        }

        if (event.target.classList.contains('clear-all')) {
            selectedItems = [];
            updateCart();
        }

        cartContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Dohvati elemente za otvori/zatvori korpu
    const basketElement = document.querySelector('.basket');
    const cartElement = document.getElementById('cart');

    if (basketElement && cartElement) {
        basketElement.addEventListener('click', () => {
            updateCart();
            stopAutoPlay();
            cartElement.classList.toggle('open');
            openCart();
        });
    } else {
        console.error('Basket ili cart element nije pronađen u DOM-u.');
    }

    // Event listener na sve čekboksove za unos u korpu
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('item-checkbox')) {
            const checkbox = e.target;
            const id = checkbox.getAttribute('data-id');
            const title = checkbox.getAttribute('data-title');
            const price = parseFloat(checkbox.getAttribute('data-price'));

            const cardContent = checkbox.closest('.card-content');
            if (!cardContent) {
                console.error('Element .card-content nije pronađen.');
                return;
            }

            const quantityElement = cardContent.querySelector('.quantity');
            if (!quantityElement) {
                console.error('Element .quantity nije pronađen.');
                return;
            }

            const quantity = parseInt(quantityElement.textContent);

            if (checkbox.checked) {
                const existingItem = selectedItems.find(item => item.id === id);
                if (!existingItem) {
                    selectedItems.push({ id, title, price, quantity });
                }
            } else {
                selectedItems = selectedItems.filter(item => item.id !== id);
            }
            updateCart();
        }
    });

    // Funkcija za resetovanje količine na 1
    function resetQuantity(itemId) {
        const mainQuantityElement = document.querySelector(`.menu-card[data-id="${itemId}"] .quantity`);
        const mainPriceElement = document.querySelector(`.menu-card[data-id="${itemId}"] .price`);
        const mainCheckbox = document.querySelector(`.menu-card[data-id="${itemId}"] h3 .item-checkbox`);

        if (mainQuantityElement && mainPriceElement && mainCheckbox) {
            mainQuantityElement.textContent = 1;
            const basePrice = parseFloat(mainCheckbox.getAttribute('data-price'));
            mainPriceElement.textContent = `${basePrice.toFixed(2)} €`;
        }

        const popup = document.getElementById('imagePopup');
        if (popup.style.display === 'flex') {
            const popupItemId = popup.querySelector('.popup-content').getAttribute('data-id');
            if (popupItemId === itemId) {
                const popupQuantityElement = popup.querySelector('.quantity');
                const popupPriceElement = popup.querySelector('.price');
                const popupCheckbox = popup.querySelector('h3 .item-checkbox');

                if (popupQuantityElement && popupPriceElement && popupCheckbox) {
                    popupQuantityElement.textContent = 1;
                    const basePrice = parseFloat(popupCheckbox.getAttribute('data-price'));
                    popupPriceElement.textContent = `${basePrice.toFixed(2)} €`;
                }
            }
        }
    }

    // Funkcija za uklanjanje pojedinačne stavke
    function removeItem(id) {
        selectedItems = selectedItems.filter(item => item.id !== id);
        const checkbox = document.querySelector(`.menu-card[data-id="${id}"] h3 .item-checkbox`);
        if (checkbox) {
            checkbox.checked = false;
        }
        resetQuantity(id);
        updateCart();
    }

    function clearAllItems() {
        selectedItems.forEach(item => {
            resetQuantity(item.id);
        });

        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        selectedItems = [];
        updateCart();
    }

    // 1. Dodaj "?slide=0" ako URL nema parametar "slide"
    const params = new URLSearchParams(window.location.search);
    if (!params.has('slide')) {
        const newURL = `${window.location.pathname}?slide=0`;
        history.replaceState({ slide: 0, cart: 'closed' }, '', newURL);
    }

    // 2. Funkcija za ažuriranje URL-a
    function updateURL() {
        const params = new URLSearchParams(window.location.search);
        const callState = params.get('call');

        const newURL = `${window.location.pathname}?slide=${activeIndex}${callState === 'open' ? '&call=open' : ''}`;
        history.pushState({ slide: activeIndex, call: callState || 'closed' }, '', newURL);
    }

    // 3. Funkcija za promenu slajda na osnovu URL-a
    function changeSlideFromURL() {
        const params = new URLSearchParams(window.location.search);
        const slideIndex = parseInt(params.get('slide')) || 0;
        if (slideIndex !== activeIndex) {
            activeIndex = slideIndex;
            updateClasses();
        }
    }

    // 4. Osluškivanje promena u istoriji
    window.onpopstate = function (event) {
        if (event.state && event.state.slide !== undefined) {
            activeIndex = event.state.slide;
            updateClasses();

            // Provera stanja telefonskog menija
            if (event.state.call === 'open') {
                callOptions.style.display = 'block';
                overlay.classList.add('active');
            } else {
                callOptions.style.display = 'none';
                overlay.classList.remove('active');
            }

            // Provera stanja pop-up prozora
            if (event.state.popup === 'open') {
                popupOverlay.style.display = 'flex';
            } else {
                popupOverlay.style.display = 'none';
            }

            // Provera stanja korpe
            if (event.state.cart === 'open') {
                cartElement.classList.add('open');
            } else {
                cartElement.classList.remove('open');
            }
        }
    };


    // Funkcija za zatvaranje padajućeg menija i skrivanje overlay-a
    function openDropdown() {
        const isExpanded = dropdownMenu.classList.toggle('show');
        dropdownOverlay.style.display = isExpanded ? 'block' : 'none';
        hamburger.setAttribute('aria-expanded', isExpanded);
        stopAutoPlay();
    }

    function closeDropdown() {
        dropdownMenu.classList.remove('show');
        dropdownOverlay.style.display = 'none';
    }

    // Funkcije za otvaranje i zatvaranje korpe
    function openCart() {
        const newURL = `${window.location.pathname}?slide=${activeIndex}&cart=open`;
        history.pushState({ slide: activeIndex, cart: 'open' }, '', newURL);
        cartElement.classList.add('open');

    }

    function closeCart() {
        const newURL = `${window.location.pathname}?slide=${activeIndex}`;
        history.pushState({ slide: activeIndex, cart: 'closed' }, '', newURL);
        cartElement.classList.remove('open');
    }

    // Funkcija za zatvaranje pop-up prozora
    function closePopup() {
        const newURL = `${window.location.pathname}?slide=${activeIndex}`;
        history.pushState({ slide: activeIndex, popup: 'closed' }, '', newURL);
        popupOverlay.style.display = 'none';
    }

    // Funkcije za otvaranje / zatvaranje telefonskog izbornika
    function openCallMenu() {
        const newURL = `${window.location.pathname}?slide=${activeIndex}&call=open`;
        history.pushState({ slide: activeIndex, call: 'open' }, '', newURL);

        callOptions.style.display = 'block';
        overlay.classList.add('active');
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.setAttribute('aria-hidden', 'true');
        }
    }

    function closeCallMenu() {
        const newURL = `${window.location.pathname}?slide=${activeIndex}`;
        history.replaceState({ slide: activeIndex, call: 'closed' }, '', newURL);

        callOptions.style.display = 'none';
        overlay.classList.remove('active');
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.setAttribute('aria-hidden', 'false');
        }
    }

    // Postavljanje event listenera
    function setupEventListeners() {
        // Event listener za resizovanje prozora
        window.addEventListener('resize', debounce(() => {
            calculateInfoContainerHeight();
        }, 100));

        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            openDropdown();
        });

        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            dropdownOverlay.style.display = 'none';
        });

        prevBtn.addEventListener('click', () => {
            goToPrevSlide();
            stopAutoPlay();
        });

        nextBtn.addEventListener('click', () => {
            goToNextSlide();
            stopAutoPlay();
        });

        playBtn.addEventListener('click', toggleAutoPlay);

        container.addEventListener('click', (e) => {
            const clickedBox = e.target.closest('.box');
            if (clickedBox) {
                if (clickedBox.classList.contains('nextData')) goToNextSlide();
                if (clickedBox.classList.contains('prevData')) goToPrevSlide();
                infoContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
            stopAutoPlay();
        });

        infoContainer.addEventListener('scroll', () => {
            stopAutoPlay();
        });

        infoContainer.addEventListener('click', (e) => {
            if (e.target.closest('.info-item')) {
                stopAutoPlay();
            }
        });

        // Event listener za dugme "Pozovi"
        phoneNumber.addEventListener('click', () => {
            if (callOptions.style.display === 'block') {
                closeCallMenu();
            } else {
                openCallMenu();
            }
        });

        // Event listener za dugme "X" za zatvaranje menija
        closeBtn.addEventListener('click', closeCallMenu);

        phoneNumber.addEventListener('click', openCallMenu);

        overlay.addEventListener('click', closeCallMenu);

        document.addEventListener('keydown', (event) => {
            if (event.key === "Escape") {
                closeCallMenu();
                closeDropdown();
                closePopup();
                closeCart();
            } else if (event.key === "ArrowLeft" && !cartContainer.classList.contains('open') && !dropdownMenu.classList.contains('show') && callOptions.style.display !== 'block') {
                stopAutoPlay();
                goToPrevSlide();
            } else if (event.key === "ArrowRight" && !cartContainer.classList.contains('open') && !dropdownMenu.classList.contains('show') && callOptions.style.display !== 'block') {
                stopAutoPlay();
                goToNextSlide();
            } else if (event.key === "ArrowUp" && !dropdownMenu.classList.contains('show') && callOptions.style.display !== 'block') {
                scrollInfoItem('up');
            } else if (event.key === "ArrowDown" && !dropdownMenu.classList.contains('show') && callOptions.style.display !== 'block') {
                scrollInfoItem('down');
            } else if (event.key === " " && !dropdownMenu.classList.contains('show') && callOptions.style.display !== 'block') {
                event.preventDefault();
                toggleAutoPlay();
            }
        });

        selectedItemsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item')) {
                const id = e.target.getAttribute('data-id');
                removeItem(id);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.id === 'clearAllButton') {
                clearAllItems();
            }
        });

        dropdownOverlay.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            dropdownOverlay.style.display = 'none';
        });

        window.addEventListener('resize', debounce(calculateInfoContainerHeight));
    }

    // Funkcija za pomicanje sadržaja aktivnog info-item elementa
    function scrollInfoItem(direction) {
        const activeInfoItem = document.querySelector('.info-container');
        if (activeInfoItem) {
            const scrollAmount = 250;
            if (direction === 'up') {
                activeInfoItem.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
            } else if (direction === 'down') {
                activeInfoItem.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            }
        }
    }

    // 6. Inicijalizacija slajda na osnovu URL-a
    function initialize() {
        fetchData();
        setupEventListeners();
        changeSlideFromURL();

        const params = new URLSearchParams(window.location.search);
        if (params.get('cart') === 'open') {
            cartElement.classList.add('open');
        }
    }

    // Pokretanje inicijalizacije
    initialize();
});