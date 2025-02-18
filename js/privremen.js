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

    // Funkcija za ažuriranje URL-a
    function updateURLState() {
        const params = new URLSearchParams(window.location.search);
        params.set('slide', activeIndex);

        // Ako je pop-up otvoren, dodajemo `popup=open` u URL
        if (popupOverlay.style.display === 'flex') {
            params.set('popup', 'open');
        } else {
            // Ako je pop-up zatvoren, uklanjamo `popup=open` iz URL-a
            params.delete('popup');
        }

        if (cartContainer.classList.contains('open')) {
            params.set('cart', 'open');
        } else {
            params.delete('cart');
        }

        // Ako je padajući meni otvoren, dodajemo `menu=open` u URL
        if (dropdownMenu.classList.contains('show')) {
            params.set('menu', 'open');
        } else {
            // Ako je padajući meni zatvoren, uklanjamo `menu=open` iz URL-a
            params.delete('menu');
        }

        // Ako je meni za opcije telefonskog poziva otvoren, dodajemo `call=open` u URL
        if (callOptions.style.display === 'block') {
            params.set('call', 'open');
        } else {
            // Ako je meni zatvoren, uklanjamo `call=open` iz URL-a
            params.delete('call');
        }

        // Ažuriramo URL bez ponovnog učitavanja stranice
        history.replaceState({}, '', `?${params.toString()}`);
    }

    window.addEventListener('popstate', () => {
        applyURLState(); // Primena stanja iz URL-a kada se koristi dugme "Napred" ili "Nazad"
    });

    // Funkcija za primenu stanja iz URL-a
    function applyURLState() {
        const params = new URLSearchParams(window.location.search);
        const slide = params.get('slide');
        const popup = params.get('popup');
        const cart = params.get('cart');
        const menu = params.get('menu');
        const call = params.get('call');

        // Ažuriranje aktivnog slajda
        if (slide !== null && !isNaN(slide)) {
            activeIndex = parseInt(slide);
            updateClasses();
        }

        // Ažuriranje pop-up prozora
        if (popup === 'open' && categories.length > 0) {
            openPopupFromURL();
        } else {
            popupOverlay.style.display = 'none';
        }

        // Ažuriranje korpe
        if (cart === 'open') {
            cartContainer.classList.add('open');
        } else {
            cartContainer.classList.remove('open');
        }

        // Ažuriranje padajućeg menija
        if (menu === 'open') {
            dropdownMenu.classList.add('show');
            dropdownOverlay.style.display = 'block';
        } else {
            dropdownMenu.classList.remove('show');
            dropdownOverlay.style.display = 'none';
        }

        // Ažuriranje menija za opcije telefonskog poziva
        if (call === 'open') {
            callOptions.style.display = 'block';
            overlay.classList.add('active');
        } else {
            callOptions.style.display = 'none';
            overlay.classList.remove('active');
        }
    }

    // Funkcija za otvaranje pop-up prozora iz URL-a
    function openPopupFromURL() {
        const params = new URLSearchParams(window.location.search);
        const slide = params.get('slide');

        // Proverite da li su podaci učitani i da li postoji kategorija na datom indeksu
        if (categories.length > 0 && slide !== null && categories[slide]) {
            const category = categories[slide];
            const itemId = `${slide}-0`; // Pretpostavka da otvaramo prvu stavku u kategoriji
            const item = category.translations[0];
            openPopup(item, itemId, slide, 0);
        } else {
            console.error('Podaci nisu učitani ili kategorija ne postoji.');
        }
    }

    // Dodajemo event listener za promene u URL-u
    window.addEventListener('popstate', () => {
        applyURLState();
    });

    // Postavljanje event listenera
    function setupEventListeners() {
        const dropdownOverlay = document.getElementById('dropdownOverlay'); // Dohvati overlay

        // Proverite da li hamburger postoji pre dodavanja event listenera
        if (hamburger) {
            hamburger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isExpanded = dropdownMenu.classList.toggle('show');
                dropdownOverlay.style.display = isExpanded ? 'block' : 'none';
                hamburger.setAttribute('aria-expanded', isExpanded);
                stopAutoPlay();
                updateURLState();
            });
        }

        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            dropdownOverlay.style.display = 'none'; // Skrivanje overlay-a
            updateURLState(); // Ažuriranje URL-a nakon zatvaranja padajućeg menija
        });

        // Proverite da li prevBtn postoji pre dodavanja event listenera
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                goToPrevSlide();
                stopAutoPlay();
            });
        }

        // Proverite da li nextBtn postoji pre dodavanja event listenera
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                goToNextSlide();
                stopAutoPlay();
            });
        }

        if (playBtn) {
            playBtn.addEventListener('click', toggleAutoPlay);
        }

        // Proverite da li container postoji pre dodavanja event listenera
        if (container) {
            container.addEventListener('click', (e) => {
                const clickedBox = e.target.closest('.box');
                if (clickedBox) {
                    if (clickedBox.classList.contains('nextData')) goToNextSlide();
                    if (clickedBox.classList.contains('prevData')) goToPrevSlide();
                    infoContainer.scrollTo({ top: 0, behavior: 'smooth' });
                }
                stopAutoPlay();
            });
        }

        // Proverite da li infoContainer postoji pre dodavanja event listenera
        if (infoContainer) {
            infoContainer.addEventListener('scroll', () => {
                stopAutoPlay();
            });

            infoContainer.addEventListener('click', (e) => {
                if (e.target.closest('.info-item')) {
                    stopAutoPlay();
                }
            });
        }

        // Event listener za klik na info-item
        infoContainer.addEventListener('click', (e) => {
            if (e.target.closest('.info-item')) {
                stopAutoPlay(); // Zaustavi auto-play kada korisnik klikne na info-item
            }
        });

        // Funkcija za otvaranje menija i prikaz overlay-a
        if (phoneNumber) {
            phoneNumber.addEventListener('click', () => {
                callOptions.style.display = 'block';
                overlay.classList.add('active');
                // Umesto postavljanja aria-hidden na <body>, postavite ga na glavni sadržaj
                const mainContent = document.querySelector('main'); // Ili drugi odgovarajući element
                if (mainContent) {
                    mainContent.setAttribute('aria-hidden', 'true');
                }
                updateURLState(); // Ažuriranje URL-a
            });
        }


        // Funkcija za zatvaranje
        function closeMenu() {
            callOptions.style.display = 'none';
            overlay.classList.remove('active');
            // Vratite aria-hidden na false za glavni sadržaj
            const mainContent = document.querySelector('main'); // Ili drugi odgovarajući element
            if (mainContent) {
                mainContent.setAttribute('aria-hidden', 'false');
            }
            updateURLState(); // Ažuriranje URL-a
        }

        // Klik na overlay zatvara meni
        if (overlay) {
            overlay.addEventListener('click', closeMenu);
        }

        // Klik na dugme "X" zatvara meni
        if (closeBtn) {
            closeBtn.addEventListener('click', closeMenu);
        }

        // Klik na ESC dugme zatvara meni
        document.addEventListener('keydown', (event) => {
            if (event.key === "Escape") {
                closeMenu();
                updateURLState(); // Ažuriranje URL-a nakon zatvaranja padajućeg menija
            }
        });

        // Event listener za dugme "Izbriši pojedinačno" u korpu
        if (selectedItemsContainer) {
            selectedItemsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-item')) {
                    const id = e.target.getAttribute('data-id');
                    removeItem(id);
                }
            });
        }

        // Event listener za dugme "Izbriši sve" u korpu
        document.addEventListener('click', (e) => {
            if (e.target.id === 'clearAllButton') {
                clearAllItems();
            }
        });

        // Event listener za overlay (zatvaranje padajućeg menija kada se klikne na overlay)
        // Proverite da li dropdownOverlay postoji pre dodavanja event listenera
        if (dropdownOverlay) {
            dropdownOverlay.addEventListener('click', () => {
                dropdownMenu.classList.remove('show');
                dropdownOverlay.style.display = 'none';
                updateURLState();
            });
        }

        if (window) {
            window.addEventListener('resize', debounce(calculateInfoContainerHeight));
        }
    }

    // Inicijalizacija
    async function initialize() {
        await fetchData(); // Sačekajte da se podaci učitaju
        setupEventListeners();
        applyURLState(); // Primena stanja iz URL-a nakon učitavanja podataka
    }

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
            dropdownMenu.classList.remove('show');
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
                    observer.unobserve(entry.target); // Prestani da posmatraš nakon učitavanja
                }
            });
        }, {
            rootMargin: '0px',
            threshold: 0.1
        });

        observer.observe(box); // Posmatraj box element
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

    // Postavljanje event listenera za količinu u glavnom elementu
    function setupQuantityControls(infoItem) {
        const quantityControls = infoItem.querySelectorAll('.quantity-controls');

        quantityControls.forEach(control => {
            const decrementBtn = control.querySelector('.decrement');
            const incrementBtn = control.querySelector('.increment');
            const quantityElement = control.querySelector('.quantity');
            const priceElement = control.closest('.card-content').querySelector('.price');
            const checkbox = control.closest('.card-content').querySelector('h3 .item-checkbox'); // Promjena ovdje

            decrementBtn.addEventListener('click', () => {
                updateQuantityAndPrice(quantityElement, priceElement, checkbox, -1);
            });

            incrementBtn.addEventListener('click', () => {
                updateQuantityAndPrice(quantityElement, priceElement, checkbox, 1);
            });
        });
    }

    // Funkcija za ažuriranje količine i cijene u glavnom elementu i pop-up prozoru
    function updateQuantityAndPrice(quantityElement, priceElement, checkbox, change) {
        let quantity = parseInt(quantityElement.textContent);
        quantity += change;
        if (quantity < 1) quantity = 1;

        // Ažuriraj količinu
        quantityElement.textContent = quantity;

        // Izračunaj novu cijenu
        const basePrice = parseFloat(checkbox.getAttribute('data-price')); // Osnovna cijena
        const newPrice = basePrice * quantity;

        // Ažuriraj prikaz cijene
        priceElement.textContent = `${newPrice.toFixed(2)} €`;

        // Ažuriraj cijenu u korpi
        const itemId = checkbox.getAttribute('data-id');
        const selectedItem = selectedItems.find(item => item.id === itemId);
        if (selectedItem) {
            selectedItem.price = newPrice; // Ažuriraj cijenu u korpi
        }

        // Ažuriraj korpu
        updateCart();
    }

    // Dodajemo event listener na sliku
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('item-image')) {
            const menuCard = e.target.closest('.menu-card');
            const itemId = menuCard.getAttribute('data-id');
            const categoryIndex = itemId.split('-')[0];
            const itemIndex = itemId.split('-')[1];
            const category = categories[categoryIndex];
            const item = category.translations[itemIndex];

            openPopup(item, itemId, categoryIndex, itemIndex);
        }
    });

    // Generišemo pop-up prozor
    function openPopup(item, itemId, categoryIndex, itemIndex) {
        const popup = document.getElementById('imagePopup');
        popup.innerHTML = `
            <div class="popup-content" data-id="${itemId}">
                <img src="${IMG_BASE_PATH}${item.imageSrc}" alt="${item.title_key}" class="popup-image">
                <div class="popup-details">
                    <div class="card-content">
                        <h3 class="card-title">
                            ${item.title_key}
                            <input type="checkbox" class="item-checkbox" 
                                data-id="${itemId}" 
                                data-title="${item.title_key}" 
                                data-price="${item.cost_key.replace('€', '').trim()}">
                        </h3>
                    <div>
                    <p class="item-description">${item.text_key}</p>
                    <div class="item-footer">
                        <div class="quantity-controls">
                            <button class="quantity-btn decrement">-</button>
                            <span class="quantity">1</span>
                            <button class="quantity-btn increment">+</button>
                        </div>
                        <span class="price">${item.cost_key}</span>
                    </div>
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
        `;

        popup.style.display = 'flex';
        updateURLState(); // Ažuriranje URL-a
        setupPopupEventListeners(popup, itemId, categoryIndex, itemIndex);
    }

    // Dodajemo event listener za zatvaranje pop-up prozora
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            popupOverlay.style.display = 'none';
            updateURLState(); // Ažuriranje URL-a
        }
    });

    // Postavljanje event listenera za količinu u pop-up prozoru
    function setupPopupEventListeners(popup, itemId, categoryIndex, itemIndex) {
        const checkbox = popup.querySelector('h3 .item-checkbox');
        const quantityElement = popup.querySelector('.quantity');
        const priceElement = popup.querySelector('.price');
        const decrementBtn = popup.querySelector('.decrement');
        const incrementBtn = popup.querySelector('.increment');
        const closePopupBtn = popup.querySelector('.close-popup');

        const mainCheckbox = document.querySelector(`.menu-card[data-id="${itemId}"] h3 .item-checkbox`);
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
                // Provjeri da li stavka već postoji u korpi
                const existingItem = selectedItems.find(item => item.id === id);
                if (!existingItem) {
                    selectedItems.push({ id, title, price, quantity });
                }
            } else {
                selectedItems = selectedItems.filter(item => item.id !== id);
            }

            // Sinhronizacija s glavnim čekboksom
            mainCheckbox.checked = checkbox.checked;
            updateCart();
        });

        closePopupBtn.addEventListener('click', () => {
            popup.style.display = 'none';
            updateURLState(); // Ažuriranje URL-a nakon zatvaranja pop-up prozora
        });
    }

    // Sinhronizacija čekboksa i količine
    function updateQuantity(change, quantityElement, priceElement, checkbox, mainQuantityElement, mainPriceElement, mainCheckbox) {
        let quantity = parseInt(quantityElement.textContent);
        quantity += change;
        if (quantity < 1) quantity = 1;

        // Ažuriraj količinu
        quantityElement.textContent = quantity;
        if (mainQuantityElement) mainQuantityElement.textContent = quantity;

        // Izračunaj novu cijenu
        const basePrice = parseFloat(checkbox.getAttribute('data-price')); // Osnovna cijena
        const newPrice = basePrice * quantity;

        // Ažuriraj prikaz cijene
        priceElement.textContent = `${newPrice.toFixed(2)} €`;
        if (mainPriceElement) mainPriceElement.textContent = `${newPrice.toFixed(2)} €`;

        // Ažuriraj cijenu u korpi
        const itemId = checkbox.getAttribute('data-id');
        const selectedItem = selectedItems.find(item => item.id === itemId);
        if (selectedItem) {
            selectedItem.price = newPrice; // Ažuriraj cijenu u korpi
        }

        // Ažuriraj korpu
        updateCart();
    }

    // Ažuriranje klasa
    function updateClasses() {
        // console.log("Aktivni indeks:", activeIndex);

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

    // Funkcije za navigaciju
    function goToPrevSlide() {
        activeIndex = (activeIndex - 1 + categories.length) % categories.length;
        updateClasses();
        updateURLState(); // Ažuriranje URL-a
    }

    function goToNextSlide() {
        activeIndex = (activeIndex + 1) % categories.length;
        updateClasses();
        updateURLState(); // Ažuriranje URL-a
    }

    // Dodavanje touch eventova na potrebne elemente
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

        element.addEventListener('touchend', (e) => {
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
        });
    }

    addTouchEvents(container);
    addTouchEvents(infoContainer);

    // Auto-play funkcionalnost
    let autoPlayInterval;
    const autoPlayDelay = 3600;
    let isAutoPlayActive = false;

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
        updateURLState(); // Ažuriranje URL-a
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
            // cartTitle.style.display = 'block';

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

            // Dinamički dodavanje total-price-container ispod liste stavki
            const totalPrice = selectedItems.reduce((total, item) => total + item.price, 0);
            cartContent += `
                <div id="totalPriceContainer" class="total-price-container">
                    <strong>Ukupna cena:</strong>
                    <span id="totalPrice">${totalPrice.toFixed(2)} €</span>
                </div>
            `;

            // Dodavanje cart-actions ispod ukupne cene
            cartContent += `
                <div class="cart-actions">
                    <button id="clearAllButton">Izbriši sve</button>
                    <button id="backToMenuButton" class="back-to-menu">Povratak na meni</button>
                </div>
            `;

            selectedItemsContainer.innerHTML = cartContent;
            document.querySelector('.cart-actions').style.justifyContent = '';

            // Dodaj event listenere za dugmiće "✎" (edit)
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
        // Zatvaranje korpe klikom na "← Meni"
        if (event.target.classList.contains('back-to-menu')) {
            cartElement.classList.remove('open');
        }

        // Uklanjanje pojedinačnih stavki iz korpe
        if (event.target.classList.contains('remove-item')) {
            const itemId = event.target.getAttribute('data-id');
            selectedItems = selectedItems.filter(item => item.id !== itemId);
            updateCart(); // Ažuriraj korpu nakon uklanjanja stavke
        }

        // Uklanjanje svih stavki iz korpe
        if (event.target.classList.contains('clear-all')) {
            selectedItems = []; // Resetuj korpu
            updateCart();
        }

        cartContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Dohvati elemente za otvori/zatvori korpu
    const basketElement = document.querySelector('.basket');
    const cartElement = document.getElementById('cart');

    // Provjeri da li su elementi pronađeni
    if (basketElement && cartElement) {
        // Event listener na basket
        basketElement.addEventListener('click', () => {
            // Ažuriraj korpu prije nego što je prikažemo
            updateCart();
            stopAutoPlay();
            // Otvori/zatvori korpu
            cartElement.classList.toggle('open');
            updateURLState(); // Ažuriranje URL-a
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

            // Pronađi .card-content element
            const cardContent = checkbox.closest('.card-content');
            if (!cardContent) {
                console.error('Element .card-content nije pronađen.');
                return;
            }

            // Pronađi .quantity element unutar .card-content
            const quantityElement = cardContent.querySelector('.quantity');
            if (!quantityElement) {
                console.error('Element .quantity nije pronađen.');
                return;
            }

            const quantity = parseInt(quantityElement.textContent);

            if (checkbox.checked) {
                // Provjeri da li stavka već postoji u korpi
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
        const checkbox = document.querySelector(`.menu-card[data-id="${id}"] h3 .item-checkbox`); // Promjena ovdje
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

    // Utility funkcija za debounce
    const debounce = (func, wait = 100) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(null, args), wait);
        };
    };

    // Pokretanje inicijalizacije
    initialize();
});