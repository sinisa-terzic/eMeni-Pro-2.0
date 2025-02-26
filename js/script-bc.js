document.addEventListener('DOMContentLoaded', () => {

    // Registracija Service Workera
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('js/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registrovano:', registration);
                })
                .catch(error => {
                    console.log('Registracija ServiceWorker-a nije uspela:', error);
                });
        });
    }

    // Konstante
    const JSON_PATH = 'js/data.json'; // Putanja do JSON fajla sa podacima
    const IMG_BASE_PATH = 'img/food/'; // Osnovna putanja do slika
    const AUTO_PLAY_DELAY = 3600; // Kašnjenje za auto-play u milisekundama

    // DOM elementi
    const elements = {
        container: document.querySelector('.container'),
        dropdownMenu: document.getElementById('dropdownMenu'),
        dropdownOverlay: document.getElementById('dropdownOverlay'),
        prevBtn: document.querySelector('.btn.prev'),
        nextBtn: document.querySelector('.btn.next'),
        playBtn: document.querySelector('.btn.play'),
        hamburger: document.querySelector('.hamburger'),
        dataContainer: document.getElementById('dataContainer'),
        selectedItemsContainer: document.getElementById('selectedItems'),
        checkboxCount: document.getElementById('checkboxCount'),
        popupOverlay: document.getElementById('imagePopup'),
        cartContainer: document.getElementById('cart'),
        phoneNumber: document.getElementById('phoneNumber'),
        callOptions: document.getElementById('callOptions'),
        overlay: document.getElementById('overlay'),
        closeBtn: document.querySelector('.call-option-close-btn'),
        progressBar: document.getElementById('progressBar'),
        settingsContainer: document.querySelector('.settings'),
        settingsOverlay: document.querySelector('.settings-overlay'),
        settingBtn: document.getElementById('setting'),
        settingTitle: document.getElementById('settingTitle'),
    };

    // Stanje aplikacije
    let state = {
        activeIndex: 0,
        categories: [],
        selectedItems: [],
        isAutoPlayActive: false,
        autoPlayInterval: null,
    };

    // Učitavanje korpe i čekiranih checkboxova iz localStorage
    function loadCartFromLocalStorage() {
        const cart = localStorage.getItem('cart');
        if (cart) {
            state.selectedItems = JSON.parse(cart);
            updateCart();
            restoreCheckedCheckboxes(); // Vrati čekirane checkboxove
            restoreQuantities(); // Vrati količine
        }
    }

    // Čuvanje korpe u localStorage
    function saveCartToLocalStorage() {
        localStorage.setItem('cart', JSON.stringify(state.selectedItems));
    }

    // Vraćanje čekiranih checkboxova iz localStorage
    function restoreCheckedCheckboxes() {
        state.selectedItems.forEach(item => {
            const checkbox = document.querySelector(`.item-checkbox[data-id="${item.id}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    // Vraćanje količina iz localStorage
    function restoreQuantities() {
        state.selectedItems.forEach(item => {
            const quantityElement = document.querySelector(`.menu-card[data-id="${item.id}"] .quantity`);
            const priceElement = document.querySelector(`.menu-card[data-id="${item.id}"] .price`);
            const checkbox = document.querySelector(`.menu-card[data-id="${item.id}"] h3 .item-checkbox`);
            const titleQuantityPriceElement = document.querySelector(`.menu-card[data-id="${item.id}"] .title-quantity-price`);

            if (quantityElement && priceElement && checkbox && titleQuantityPriceElement) {
                quantityElement.textContent = item.quantity; // Postavi količinu iz localStorage
                const basePrice = parseFloat(checkbox.getAttribute('data-price'));
                const newPrice = basePrice * item.quantity;
                priceElement.textContent = `${newPrice.toFixed(2)} €`;

                // Ažuriraj "title-quantity-price"
                const pricePerUnit = (newPrice / item.quantity).toFixed(2);
                titleQuantityPriceElement.textContent = `${item.quantity} x ${pricePerUnit} €`;
            }
        });
    }

    // Dohvatanje podataka iz JSON fajla
    async function fetchData() {
        try {
            const response = await fetch(JSON_PATH);
            if (!response.ok) throw new Error(`HTTP greška! status: ${response.status}`);
            const data = await response.json();
            if (!data.category) throw new Error('Nevalidan JSON format');
            state.categories = Object.values(data.category);
            initializeMenu();
            updateClasses();
            setupImageClickListeners();
            loadCartFromLocalStorage(); // Učitaj korpu i čekirane checkboxove
        } catch (error) {
            console.error('Greška:', error);
            elements.dataContainer.innerHTML = `<div class="error">${error.message}</div>`;
        }
    }

    // Inicijalizacija menija
    function initializeMenu() {
        state.categories.forEach((category, index) => {
            createBox(category, index);
            createDataSection(category, index);
            createMenuItem(category, index);
        });
    }

    // Kreiranje stavke u padajućem meniju
    function createMenuItem(category, index) {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        menuItem.innerHTML = `
            <span class="category-number">${index + 1}.</span>
            <span class="category-title">${category.details?.replace(':', '') || 'Nepoznata kategorija'}</span>
        `;
        menuItem.addEventListener('click', () => {
            state.activeIndex = index;
            updateClasses();
            toggleDropdown('close');
            toggleCart('close', true); // Zatvori korpu bez tranzicije
        });
        elements.dropdownMenu.appendChild(menuItem);
    }

    // Kreiranje box elemenata za svaku kategoriju
    function createBox(category, index) {
        const box = document.createElement('div');
        box.className = 'box';
        box.innerHTML = `
            <p class="box-text">${category.details || 'Nepoznata kategorija'}</p>
            <div class="image-overlay"></div>
        `;
        box.style.backgroundImage = `url('${IMG_BASE_PATH}cat/${index + 1}.jpg')`;
        box.setAttribute('data-bg', `${IMG_BASE_PATH}cat/${index + 1}.jpg`);
        elements.container.appendChild(box);
        setupLazyLoading(box);
    }

    // Lenjo učitavanje slika pomoću IntersectionObserver
    function setupLazyLoading(box) {
        if (!('IntersectionObserver' in window)) {
            console.error('IntersectionObserver nije podržan u ovom pregledaču.');
            return;
        }

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
        }, { rootMargin: '0px', threshold: 0.1 });

        observer.observe(box);
    }

    // Kreiranje sekcije sa podacima za svaku kategoriju
    function createDataSection(category, index) {
        try {
            const dataItem = document.createElement('div');
            dataItem.className = 'data-item';
            dataItem.innerHTML = `
                <h2>${category.details || 'Nepoznata kategorija'}</h2>
                <div class="category-description">${category.description || 'Nema opisa.'}</div>
                <div class="items-grid">
                ${category.translations?.map((item, itemIndex) => {
                // Inicijalizuj quantity i price ako nisu definisani
                item.quantity = item.quantity || 1;
                item.price = item.price || parseFloat(item.cost_key?.replace('€', '').trim() || 0);

                // Izračunaj cijenu po jedinici
                const pricePerUnit = (item.price / item.quantity).toFixed(2);

                return `
                        <article class="menu-card" data-id="${index}-${itemIndex}">
                            <img src="${IMG_BASE_PATH}${item.imageSrc}" 
                                alt="${item.title_key || 'Nepoznata stavka'}" 
                                class="item-image"
                                loading="lazy">
                            <div class="card-content">
                                <h3 class="card-title">
                                    ${item.title_key || 'Nepoznata stavka'}
                                    <input type="checkbox" class="item-checkbox" 
                                        data-id="${index}-${itemIndex}" 
                                        data-title="${item.title_key || 'Nepoznata stavka'}" 
                                        data-price="${item.cost_key?.replace('€', '').trim() || 0}">
                                </h3>
                                <p class="item-description">${item.text_key || 'Nema opisa.'}</p>
                                <div class="item-footer">
                                    <div class="quantity-controls">
                                        <button class="quantity-btn decrement">-</button>
                                        <span class="quantity">${item.quantity}</span>
                                        <button class="quantity-btn increment">+</button>
                                    </div>
                                    <span class="title-quantity-price">${item.quantity} x ${pricePerUnit} €</span>
                                    <span class="price">${item.cost_key || '0.00 €'}</span>
                                </div>
                            </div>
                        </article>
                    `;
            }).join('') || '<p>Nema dostupnih stavki.</p>'}
                </div>
            `;
            elements.dataContainer.appendChild(dataItem);
            setupQuantityControls(dataItem); // Postavlja kontrole za količinu
        } catch (error) {
            console.error('Greška pri kreiranju sekcije sa podacima:', error);
        }
    }

    // Postavljanje kontrola za količinu
    function setupQuantityControls(dataItem) {
        const quantityControls = dataItem.querySelectorAll('.quantity-controls');
        quantityControls.forEach(control => {
            const decrementBtn = control.querySelector('.decrement');
            const incrementBtn = control.querySelector('.increment');
            const quantityElement = control.querySelector('.quantity');
            const priceElement = control.closest('.card-content').querySelector('.price');
            const checkbox = control.closest('.card-content').querySelector('h3 .item-checkbox');

            if (!decrementBtn || !incrementBtn || !quantityElement || !priceElement || !checkbox) {
                console.error('Neki od elemenata nisu pronađeni.');
                return;
            }

            decrementBtn.addEventListener('click', () => updateQuantityAndPrice(quantityElement, priceElement, checkbox, -1));
            incrementBtn.addEventListener('click', () => updateQuantityAndPrice(quantityElement, priceElement, checkbox, 1));
        });
    }

    // Ažuriranje količine i cijene
    function updateQuantityAndPrice(quantityElement, priceElement, checkbox, change) {
        const itemId = checkbox.getAttribute('data-id');
        const [categoryIndex, itemIndex] = itemId.split('-');
        const item = state.categories[categoryIndex]?.translations[itemIndex];

        if (!item) {
            console.error('Stavka nije pronađena.');
            return;
        }

        let quantity = parseInt(quantityElement.textContent);
        quantity += change;
        if (quantity < 1) quantity = 1;

        quantityElement.textContent = quantity;
        item.quantity = quantity;

        const basePrice = parseFloat(checkbox.getAttribute('data-price'));
        const newPrice = basePrice * quantity;
        priceElement.textContent = `${newPrice.toFixed(2)} €`;
        item.price = newPrice;

        const itemFooter = quantityElement.closest('.item-footer');
        if (itemFooter) {
            const titleQuantityPriceElement = itemFooter.querySelector('.title-quantity-price');
            if (titleQuantityPriceElement) {
                const pricePerUnit = (newPrice / quantity).toFixed(2);
                titleQuantityPriceElement.textContent = `${quantity} x ${pricePerUnit} €`;
            }
        }

        const popup = document.getElementById('imagePopup');
        if (popup.style.display === 'flex') {
            const popupItemId = popup.querySelector('.popup-content').getAttribute('data-id');
            if (popupItemId === itemId) {
                const popupQuantityElement = popup.querySelector('.quantity');
                const popupPriceElement = popup.querySelector('.price');
                const popupTitleQuantityPriceElement = popup.querySelector('.title-quantity-price');

                if (popupQuantityElement && popupPriceElement && popupTitleQuantityPriceElement) {
                    popupQuantityElement.textContent = quantity;
                    popupPriceElement.textContent = `${newPrice.toFixed(2)} €`;
                    popupTitleQuantityPriceElement.textContent = `${quantity} x ${(newPrice / quantity).toFixed(2)} €`;
                }
            }
        }

        const selectedItem = state.selectedItems.find(item => item.id === itemId);
        if (selectedItem) {
            selectedItem.quantity = quantity;
            selectedItem.price = newPrice;
        }

        updateCart();
        saveCartToLocalStorage(); // Sačuvaj korpu nakon promene
    }

    // Otvaranje pop-up prozora
    function openPopup(item, itemId, categoryIndex, itemIndex, isFromCart = false) {
        const selectedItem = state.selectedItems.find(item => item.id === itemId);
        const quantity = selectedItem ? selectedItem.quantity : 1;

        elements.popupOverlay.innerHTML = `
        <div class="popup-content" data-id="${itemId}">
            <img src="${IMG_BASE_PATH}${item.imageSrc}" alt="${item.title_key}" class="popup-image" loading="lazy">
            <div class="popup-details">
                <div class="card-content">
                    <div class="popup-header">
                        <div class="flex">
                            <input type="checkbox" class="item-checkbox ${isFromCart ? 'from-cart' : ''}" 
                                data-id="${itemId}" 
                                data-title="${item.title_key}" 
                                data-price="${item.cost_key.replace('€', '').trim()}"
                                ${selectedItem ? 'checked' : ''}>
                            <h3 class="card-title">${item.title_key}</h3>
                        </div>
                        <div class="quantity-controls">
                            <button class="quantity-btn decrement">-</button>
                            <span class="quantity">${quantity}</span>
                            <button class="quantity-btn increment">+</button>
                            <span class="price">${(item.price * quantity).toFixed(2)} €</span>
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

        elements.popupOverlay.style.display = 'flex';

        elements.popupOverlay.addEventListener('click', (e) => {
            if (e.target === elements.popupOverlay || e.target.classList.contains('close-popup')) {
                closePopup();
            }
        });

        setupPopupEventListeners(elements.popupOverlay, itemId, categoryIndex, itemIndex);
    }

    // Postavljanje osluškivača na slike
    function setupImageClickListeners() {
        const images = document.querySelectorAll('.menu-card .item-image');
        images.forEach(image => {
            image.addEventListener('click', (e) => {
                const menuCard = e.target.closest('.menu-card');
                const itemId = menuCard.getAttribute('data-id');
                const [categoryIndex, itemIndex] = itemId.split('-');
                const category = state.categories[categoryIndex];
                const item = category.translations[itemIndex];

                openPopup(item, itemId, categoryIndex, itemIndex);
            });
        });
    }

    // Postavljanje osluškivača za pop-up
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
                const existingItem = state.selectedItems.find(item => item.id === id);
                if (!existingItem) {
                    state.selectedItems.push({ id, title, price, quantity });
                }
            } else {
                state.selectedItems = state.selectedItems.filter(item => item.id !== id);
            }

            mainCheckbox.checked = checkbox.checked;
            updateCart();
            saveCartToLocalStorage(); // Sačuvaj korpu nakon promene
        });

        closePopupBtn.addEventListener('click', () => {
            popup.style.display = 'none';
        });
    }

    // Ažuriranje klasa
    function updateClasses() {
        applyActiveClasses('.box', 'activeSlide', 'nextSlide', 'prevSlide');
        applyActiveClasses('.data-item', 'activeData', 'prevData', 'nextData');

        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach((item, index) => {
            item.classList.toggle('active-menu-item', index === state.activeIndex);
        });

        elements.dataContainer.scrollTop = 0;
        updateProgress();
        calculateDataContainerHeight();
    }

    // Primena aktivnih klasa
    function applyActiveClasses(selector, activeClass, nextClass, prevClass) {
        const elements = document.querySelectorAll(selector);
        const total = state.categories.length;

        elements.forEach((element, index) => {
            element.classList.remove(activeClass, nextClass, prevClass);
            if (index === state.activeIndex) element.classList.add(activeClass);
            else if (index === (state.activeIndex + 1) % total) element.classList.add(nextClass);
            else if (index === (state.activeIndex - 1 + total) % total) element.classList.add(prevClass);
        });
    }

    // Funkcija za nastavak auto-playa nakon promjene slajda
    function autoPlayNextSlide() {
        state.activeIndex = (state.activeIndex + 1) % state.categories.length; // Prelazak na sljedeći slajd
        updateClasses(); // Ažuriranje klasa i prikaza
        updateProgress(); // Ažuriranje progress bara
    }

    // Navigacija kroz slajdove
    function changeSlide(direction) {
        if (direction === 'next') {
            state.activeIndex = (state.activeIndex + 1) % state.categories.length;
        } else if (direction === 'prev') {
            state.activeIndex = (state.activeIndex - 1 + state.categories.length) % state.categories.length;
        }
        stopAutoPlay();
        updateClasses();
    }

    // Debounce funkcija za ograničenje broja poziva funkcije
    const debounce = (func, wait = 100) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(null, args), wait);
        };
    };

    // Dodavanje touch eventova
    function addTouchEvents(element) {
        let touchStartX = 0;
        let touchStartY = 0;
        const swipeThreshold = 20;
        const verticalThreshold = 30;

        element.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            stopAutoPlay();
        }, { passive: true });

        element.addEventListener('touchend', debounce((e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = Math.abs(touchEndY - touchStartY);

            if (Math.abs(deltaX) > swipeThreshold && deltaY < verticalThreshold) {
                if (deltaX > 0) changeSlide('prev');
                else changeSlide('next');
            }
        }, 100));
    }

    addTouchEvents(elements.container);
    addTouchEvents(elements.dataContainer);

    // Auto-play funkcionalnost
    function startAutoPlay() {
        if (!state.isAutoPlayActive) {
            autoPlayNextSlide();
            state.autoPlayInterval = setInterval(autoPlayNextSlide, AUTO_PLAY_DELAY);
            state.isAutoPlayActive = true;
            elements.playBtn.textContent = '⏸ Pauziraj';
            elements.playBtn.classList.add('stop');
            updateProgress();
        }
    }

    function stopAutoPlay() {
        clearInterval(state.autoPlayInterval);
        state.isAutoPlayActive = false;
        elements.playBtn.textContent = '▶ Auto-play';
        elements.playBtn.classList.remove('stop');
        updateProgress();
    }

    function toggleAutoPlay() {
        state.isAutoPlayActive ? stopAutoPlay() : startAutoPlay();
    }

    // Ažuriranje progress bara
    let progressTimeout;
    function updateProgress() {
        clearTimeout(progressTimeout);

        if (state.isAutoPlayActive) {
            elements.progressBar.style.transition = 'none';
            elements.progressBar.style.width = '0%';
            setTimeout(() => {
                elements.progressBar.style.transition = `width ${AUTO_PLAY_DELAY}ms linear`;
                elements.progressBar.style.width = '105%';
            }, 50);
        } else {
            const progress = (state.activeIndex + 1) / state.categories.length * 100;
            elements.progressBar.style.transition = '0.25s all';
            elements.progressBar.style.width = `${progress}%`;
        }
    }

    // Izračunavanje visine dataContainer-a
    function calculateDataContainerHeight() {
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
        elements.dataContainer.style.height = `${Math.max(remainingHeight, 100)}px`;
    }

    // Funkcionalnost za korpu
    function updateCart() {
        elements.checkboxCount.textContent = state.selectedItems.length;

        if (state.selectedItems.length === 0) {
            renderEmptyCart();
        } else {
            renderCartItems();
        }

        elements.checkboxCount.style.display = state.selectedItems.length > 0 ? 'flex' : 'none';
    }

    function renderEmptyCart() {
        elements.selectedItemsContainer.innerHTML = `
            <div class="empty-cart-message">
                Vaša korpa je prazna.
            </div>
            <div class="cart-actions">
                <button id="backToMenuButton" class="back-to-menu" role="button" aria-label="Povratak na meni">Povratak na meni</button>
            </div>
        `;
        document.querySelector('.cart-actions').style.justifyContent = 'center';
    }

    function renderCartItems() {
        const groupedItems = state.selectedItems.reduce((groups, item) => {
            const [categoryIndex, itemIndex] = item.id.split('-');
            const category = state.categories[categoryIndex];

            if (!groups[categoryIndex]) {
                groups[categoryIndex] = {
                    categoryName: category.details,
                    items: []
                };
            }

            const checkbox = document.querySelector(`.menu-card[data-id="${item.id}"] h3 .item-checkbox`);
            if (checkbox) {
                const quantity = item.quantity; // Koristi količinu iz localStorage
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
                    <div class="selected-item" data-id="${item.id}">
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

        const totalPrice = state.selectedItems.reduce((total, item) => total + item.price, 0);
        cartContent += `
            <div id="totalPriceContainer" class="total-price-container">
                <span>Ukupna cena:</span>
                <span id="totalPrice">${totalPrice.toFixed(2)} €</span>
            </div>
        `;

        cartContent += `
            <div class="cart-actions">
                <button id="backToMenuButton" class="back-to-menu">Povratak na meni</button>
                <button id="clearAllButton">Izbriši sve</button>
            </div>
        `;

        elements.selectedItemsContainer.innerHTML = cartContent;
        document.querySelector('.cart-actions').style.justifyContent = '';

        document.querySelectorAll('.edit-item').forEach(button => {
            button.addEventListener('click', () => {
                const itemId = button.getAttribute('data-id');
                const [categoryIndex, itemIndex] = itemId.split('-');
                const category = state.categories[categoryIndex];
                const item = category.translations[itemIndex];
                openPopup(item, itemId, categoryIndex, itemIndex, true); // Dodajemo true za isFromCart
            });
        });
    }

    // Event listener za dugme "Povratak na meni"
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('back-to-menu')) {
            toggleCart('close');
        }

        if (event.target.classList.contains('remove-item') || event.target.closest('.remove-item')) {
            const itemId = event.target.getAttribute('data-id');
            const item = state.selectedItems.find(item => item.id === itemId);

            if (item) {
                const itemImage = document.querySelector(`.menu-card[data-id="${itemId}"] .item-image`);
                if (itemImage) {
                    const deleteItemImage = document.getElementById('deleteItemImage');
                    deleteItemImage.src = itemImage.src;
                    deleteItemImage.alt = item.title;
                }

                document.getElementById('itemName').textContent = item.title;

                itemToDeleteId = itemId;

                document.getElementById('deleteConfirmationPopup').style.display = 'flex';
            }
        }

        if (event.target.id === 'clearAllButton') {
            document.getElementById('clearAllConfirmationPopup').style.display = 'flex';
        }
    });

    // Dohvati elemente za otvori/zatvori korpu
    const basketElement = document.querySelector('.basket');
    const cartElement = document.getElementById('cart');

    if (basketElement && cartElement) {
        basketElement.addEventListener('click', () => {
            updateCart();
            stopAutoPlay();
            toggleCart('open');
            toggleDropdown('close'); // Zatvori dropdown meni kada se otvori korpa
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
                const existingItem = state.selectedItems.find(item => item.id === id);
                if (!existingItem) {
                    state.selectedItems.push({ id, title, price, quantity });
                }
            } else {
                state.selectedItems = state.selectedItems.filter(item => item.id !== id);
            }
            updateCart();
            saveCartToLocalStorage(); // Sačuvaj korpu nakon promene
        }
    });

    // Event listener za dugme "Da" u popupu za brisanje svih stavki
    document.getElementById('confirmClearAll').addEventListener('click', () => {
        clearAllItems();
        document.getElementById('clearAllConfirmationPopup').style.display = 'none';
    });

    // Event listener za dugme "Ne" u popupu za brisanje svih stavki
    document.getElementById('cancelClearAll').addEventListener('click', () => {
        document.getElementById('clearAllConfirmationPopup').style.display = 'none';
    });

    let itemToDeleteId = null;

    // Event listener za dugme "Da" u popupu za brisanje pojedinačne stavke
    document.getElementById('confirmDelete').addEventListener('click', () => {
        if (itemToDeleteId) {
            removeItem(itemToDeleteId);
            itemToDeleteId = null;
        }
        document.getElementById('deleteConfirmationPopup').style.display = 'none';
    });

    // Event listener za dugme "Ne" u popupu za brisanje pojedinačne stavke
    document.getElementById('cancelDelete').addEventListener('click', () => {
        itemToDeleteId = null;
        document.getElementById('deleteConfirmationPopup').style.display = 'none';
    });

    // Funkcija za brisanje svih stavki iz korpe
    function clearAllItems() {
        state.selectedItems.forEach(item => {
            resetQuantity(item.id);
        });

        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        state.selectedItems = [];
        updateCart();
        saveCartToLocalStorage(); // Sačuvaj korpu nakon brisanja
    }

    // Funkcija za brisanje pojedinačne stavke iz korpe
    function removeItem(id) {
        const checkbox = document.querySelector(`.menu-card[data-id="${id}"] h3 .item-checkbox`);
        const itemElement = document.querySelector(`.selected-item[data-id="${id}"]`);

        // Pokreni animaciju za uklanjanje stavke
        if (itemElement) {
            itemElement.classList.add('fade-out');
            itemElement.addEventListener('transitionend', () => {
                itemElement.remove(); // Ukloni element iz DOM-a
                state.selectedItems = state.selectedItems.filter(item => item.id !== id); // Ažuriraj stanje
                updateCart(); // Ažuriraj korpu
                saveCartToLocalStorage(); // Sačuvaj korpu nakon brisanja
            }, { once: true });
        }

        // Resetuj checkbox i količinu
        if (checkbox) {
            checkbox.checked = false;
        }
        resetQuantity(id);
    }

    // Funkcija za resetovanje količine na 1
    function resetQuantity(itemId) {
        const mainQuantityElement = document.querySelector(`.menu-card[data-id="${itemId}"] .quantity`);
        const mainPriceElement = document.querySelector(`.menu-card[data-id="${itemId}"] .price`);
        const mainCheckbox = document.querySelector(`.menu-card[data-id="${itemId}"] h3 .item-checkbox`);
        const mainTitleQuantityPriceElement = document.querySelector(`.menu-card[data-id="${itemId}"] .title-quantity-price`);

        if (mainQuantityElement && mainPriceElement && mainCheckbox && mainTitleQuantityPriceElement) {
            mainQuantityElement.textContent = 1;
            const basePrice = parseFloat(mainCheckbox.getAttribute('data-price'));
            mainPriceElement.textContent = `${basePrice.toFixed(2)} €`;
            mainTitleQuantityPriceElement.textContent = `1 x ${basePrice.toFixed(2)} €`;
        }

        const popup = document.getElementById('imagePopup');
        if (popup.style.display === 'flex') {
            const popupItemId = popup.querySelector('.popup-content').getAttribute('data-id');
            if (popupItemId === itemId) {
                const popupQuantityElement = popup.querySelector('.quantity');
                const popupPriceElement = popup.querySelector('.price');
                const popupCheckbox = popup.querySelector('h3 .item-checkbox');
                const popupTitleQuantityPriceElement = popup.querySelector('.title-quantity-price');

                if (popupQuantityElement && popupPriceElement && popupCheckbox && popupTitleQuantityPriceElement) {
                    popupQuantityElement.textContent = 1;
                    const basePrice = parseFloat(popupCheckbox.getAttribute('data-price'));
                    popupPriceElement.textContent = `${basePrice.toFixed(2)} €`;
                    popupTitleQuantityPriceElement.textContent = `1 x ${basePrice.toFixed(2)} €`;
                }
            }
        }
    }

    // Event listener za hamburger u korpi
    const cartHamburger = document.querySelector('.cart-hamburger');
    if (cartHamburger) {
        cartHamburger.addEventListener('click', (e) => {
            e.stopPropagation(); // Spriječi propagaciju eventa
            toggleDropdown('open'); // Otvori padajući meni
        });
    }

    // Funkcija za zatvaranje padajućeg menija i skrivanje overlay-a
    function toggleDropdown(action) {
        // console.log('toggleDropdown called with action:', action); // Debug poruka
        const isExpanded = action === 'open';
        elements.dropdownMenu.classList.toggle('show', isExpanded);
        elements.dropdownOverlay.style.display = isExpanded ? 'block' : 'none';
        elements.hamburger.setAttribute('aria-expanded', isExpanded);
        if (isExpanded) stopAutoPlay();
    }

    // Funkcije za otvaranje i zatvaranje settings menija
    function toggleSettings(action) {
        settingsOpen = action === 'open';
        elements.settingsContainer.classList.toggle('open', settingsOpen);
        elements.settingsOverlay.classList.toggle('active', settingsOpen);
    }

    // Funkcije za otvaranje i zatvaranje korpe
    function toggleCart(action, noTransition = false) {
        cartOpen = action === 'open';
        if (noTransition) {
            elements.cartContainer.style.transition = 'none';
        } else {
            elements.cartContainer.style.transition = '';
        }
        elements.cartContainer.classList.toggle('open', cartOpen);
        if (cartOpen) {
            toggleDropdown('close'); // Zatvori dropdown meni kada se otvori korpa
        }
    }

    // Funkcija za zatvaranje pop-up prozora
    function closePopup() {
        elements.popupOverlay.style.display = 'none';
    }

    // Funkcije za otvaranje / zatvaranje telefonskog izbornika
    function toggleCallMenu(action) {
        const isOpen = action === 'open';
        elements.callOptions.style.display = isOpen ? 'block' : 'none';
        elements.overlay.classList.toggle('active', isOpen);
        if (isOpen) stopAutoPlay();
    }

    // Postavljanje event listenera
    function setupEventListeners() {
        // Debounce za resize event
        window.addEventListener('resize', debounce(calculateDataContainerHeight, 100));

        // Klik na hamburger meni
        elements.hamburger?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown('open');
        });

        // Klik van dropdowna zatvara ga
        document.addEventListener('click', () => toggleDropdown('close'));

        // Navigacioni dugmići
        elements.prevBtn?.addEventListener('click', () => changeSlide('prev'));
        elements.nextBtn?.addEventListener('click', () => changeSlide('next'));
        elements.playBtn?.addEventListener('click', toggleAutoPlay);

        // Klik na slajder elemente
        elements.container?.addEventListener('click', (e) => {
            const clickedBox = e.target.closest('.box');
            if (clickedBox?.classList.contains('nextSlide')) changeSlide('next');
            if (clickedBox?.classList.contains('prevSlide')) changeSlide('prev');
            elements.dataContainer?.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Scroll event u dataContaineru
        elements.dataContainer?.addEventListener('scroll', stopAutoPlay);
        elements.dataContainer?.addEventListener('click', (e) => {
            if (e.target.closest('.data-item')) stopAutoPlay();
        });

        // Klik na settings dugme
        elements.settingBtn?.addEventListener('click', () => {
            toggleSettings('open');
            stopAutoPlay();
        });

        // Zatvaranje settings menija
        elements.settingsOverlay?.addEventListener('click', () => toggleSettings('close'));
        elements.settingTitle?.addEventListener('click', () => toggleSettings('close'));

        // Klik na broj telefona - otvaranje/zatvaranje call menija
        elements.phoneNumber?.addEventListener('click', () => {
            toggleCallMenu(elements.callOptions?.style.display === 'flex' ? 'close' : 'open');
        });

        // Zatvaranje call menija
        elements.closeBtn?.addEventListener('click', () => toggleCallMenu('close'));
        elements.overlay?.addEventListener('click', () => toggleCallMenu('close'));

        // Zatvaranje dropdown menija klikom na overlay
        elements.dropdownOverlay?.addEventListener('click', () => toggleDropdown('close'));

        // Globalni event listener za tastaturu
        document.addEventListener('keydown', (event) => {
            const { key } = event;

            const isMenuOpen = elements.dropdownMenu?.classList.contains('show');
            const isCallMenuOpen = elements.callOptions?.style.display === 'block';
            const isCartOpen = elements.cartContainer?.classList.contains('open');
            const isSettingsOpen = elements.settingsContainer?.classList.contains('open');

            if (key === "Escape") {
                closeAllMenus();
            }

            // Ako je bilo koji meni otvoren, ne izvršavaj dalje komande
            if (isMenuOpen || isCallMenuOpen || isCartOpen || isSettingsOpen) return;

            switch (key) {
                case "ArrowLeft":
                    changeSlide('prev');
                    break;
                case "ArrowRight":
                    changeSlide('next');
                    break;
                case "ArrowUp":
                    scrollDataSection('up');
                    break;
                case "ArrowDown":
                    scrollDataSection('down');
                    break;
                case " ":
                    event.preventDefault();
                    toggleAutoPlay();
                    break;
            }
        });

        // Funkcija za zatvaranje svih menija
        function closeAllMenus() {
            toggleCallMenu('close');
            toggleDropdown('close');
            closePopup();
            toggleCart('close');
            toggleSettings?.('close'); // Pozovi samo ako toggleSettings postoji
        }
    }

    // Funkcija za pomicanje sadržaja aktivnog data-item elementa
    function scrollDataSection(direction) {
        const activeDataItem = document.querySelector('.data-container');
        if (activeDataItem) {
            const scrollAmount = 250;
            if (direction === 'up') {
                activeDataItem.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
            } else if (direction === 'down') {
                activeDataItem.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            }
        }
    }


    /*  Rutiranje
    =================== */
    if (!window.location.hash) {
        window.location.hash = "#/slide=0";  // Postavi početni hash ako nije definisan
    }

    // Glavna router funkcija
    function router() {
        const hash = window.location.hash || "#/slide=0"; // Postavi početni hash ako nije definisan
        const params = new URLSearchParams(hash.replace("#/", "")); // Pretvaranje hash-a u parametre

        // Resetuj sve
        toggleSettings('close');
        toggleCart('close');
        toggleCallMenu('close');
        closePopup(); // Zatvori popup prozor

        // Ažuriraj slajd ako postoji u hash-u
        if (params.has("slide")) {
            const slideIndex = parseInt(params.get("slide"), 10);
            if (!isNaN(slideIndex) && slideIndex >= 0 && slideIndex < state.categories.length) {
                state.activeIndex = slideIndex;
                updateClasses(); // Ažuriraj prikaz slajda
            } else {
                console.error("Nevažeći indeks slajda:", slideIndex);
            }
        }

        // Aktiviraj odgovarajući ekran
        if (params.has("settings")) {
            toggleSettings('open');
        } else if (params.has("cart")) {
            toggleCart('open');
        } else if (params.has("call")) {
            toggleCallMenu('open');
        } else if (params.has("popup")) {
            // Ako je URL u formatu #/popup=categoryIndex-itemIndex
            const popupValue = params.get("popup");
            const [categoryIndex, itemIndex] = popupValue.split("-").map(Number);

            // Validacija indeksa
            if (
                !isNaN(categoryIndex) && categoryIndex >= 0 && categoryIndex < state.categories.length &&
                !isNaN(itemIndex) && itemIndex >= 0 && itemIndex < state.categories[categoryIndex]?.translations?.length
            ) {
                const category = state.categories[categoryIndex];
                const item = category.translations[itemIndex];
                openPopup(item, `${categoryIndex}-${itemIndex}`, categoryIndex, itemIndex);
            } else {
                console.error("Nevažeći indeksi za popup:", categoryIndex, itemIndex);
            }
        }
    }

    // Ažurira URL prilikom promene slajda
    function updateSlideHash() {
        const newHash = `#/slide=${state.activeIndex}`;
        if (window.location.hash !== newHash) {
            history.pushState(null, "", newHash); // Ažurira URL bez reload-a
        }
    }

    // Nadogradnja funkcije za promenu slajda da ažurira hash
    function changeSlide(direction) {
        if (direction === 'next') {
            state.activeIndex = (state.activeIndex + 1) % state.categories.length;
        } else if (direction === 'prev') {
            state.activeIndex = (state.activeIndex - 1 + state.categories.length) % state.categories.length;
        }
        stopAutoPlay();
        updateClasses();
        updateSlideHash(); // Ažuriranje URL-a
    }

    // Ažuriraj padajući meni da prikaže aktivnu stavku
    function updateDropdownMenu() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach((item, index) => {
            item.classList.toggle('active-menu-item', index === state.activeIndex);
        });
    }

    // Postavi osluškivače za padajući meni
    function setupDropdownMenuListeners() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                state.activeIndex = index;
                updateClasses();
                toggleDropdown('close');
                updateSlideHash(); // Ažuriraj hash URL-a
            });
        });
    }

    // Presluškuj promene hash-a sa debounce-om
    window.addEventListener("hashchange", debounce(router));
    document.addEventListener("DOMContentLoaded", router);

    // Dodajemo popstate listener kako bi podržali navigaciju "Napred" i "Nazad"
    window.addEventListener("popstate", debounce(router));

    // Funkcije za navigaciju
    function openSettings() {
        window.location.hash = "#/slide=" + state.activeIndex + "&settings";  // Prvo slajd, pa onda settings
    }

    function openCart() {
        window.location.hash = "#/slide=" + state.activeIndex + "&cart";  // Prvo slajd, pa onda cart
    }

    function openCall() {
        window.location.hash = "#/slide=" + state.activeIndex + "&call";  // Prvo slajd, pa onda call
    }

    function openPopupRoute(categoryIndex, itemIndex) {
        if (
            categoryIndex >= 0 && categoryIndex < state.categories.length &&
            itemIndex >= 0 && itemIndex < state.categories[categoryIndex]?.translations?.length
        ) {
            window.location.hash = `#/slide=${state.activeIndex}&popup=${categoryIndex}-${itemIndex}`;  // Prvo slajd, pa onda popup
        } else {
            console.error("Nevažeći indeksi za popup:", categoryIndex, itemIndex);
        }
    }

    // Klik na dugmad za navigaciju
    document.querySelector(".setting").addEventListener("click", openSettings);
    document.querySelector(".basket").addEventListener("click", openCart);
    document.querySelector(".tel").addEventListener("click", openCall);

    // Klik na stavke menija
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('item-image') || e.target.classList.contains('edit-item')) {
            const menuCard = e.target.closest('.menu-card');
            if (menuCard) {
                const itemId = menuCard.getAttribute('data-id');
                const [categoryIndex, itemIndex] = itemId.split('-').map(Number);
                openPopupRoute(categoryIndex, itemIndex);
            }
        }
    });

    // Inicijalizacija padajućeg menija
    function initializeMenu() {
        state.categories.forEach((category, index) => {
            createBox(category, index);
            createDataSection(category, index);
            createMenuItem(category, index);
        });
        setupDropdownMenuListeners(); // Postavi osluškivače za padajući meni
    }
    /* ============================= */


    // Inicijalizacija slajda na osnovu URL-a
    function initialize() {
        fetchData();
        setupEventListeners();
    }

    // Pokretanje inicijalizacije
    initialize();
});