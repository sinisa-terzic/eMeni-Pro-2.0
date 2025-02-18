document.addEventListener('DOMContentLoaded', () => {
    // Konstante i varijable
    const JSON_PATH = 'js/data.json';
    const IMG_BASE_PATH = 'img/food/';
    const container = document.querySelector('.container');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const prevBtn = document.querySelector('.btn.prev');
    const nextBtn = document.querySelector('.btn.next');
    const playBtn = document.querySelector('.btn.play');
    const hamburger = document.querySelector('.hamburger');
    const infoContainer = document.getElementById('infoContainer');
    const selectedItemsContainer = document.getElementById('selectedItems');
    const checkboxCount = document.getElementById('checkboxCount');
    const popupOverlay = document.getElementById('imagePopup');

    let activeIndex = 0;
    let categories = [];
    let selectedItems = [];

    // Postavljanje event listenera
    function setupEventListeners() {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
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

        // Event listener za dugme "Izbriši pojedinačno" u korpu
        selectedItemsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item')) {
                const id = e.target.getAttribute('data-id');
                removeItem(id);
            }
        });

        // Event listener za dugme "Izbriši sve" u korpu
        document.addEventListener('click', (e) => {
            if (e.target.id === 'clearAllButton') {
                clearAllItems();
            }
        });

        window.addEventListener('resize', debounce(calculateInfoContainerHeight));
    }

    // Inicijalizacija
    function initialize() {
        fetchData();
        setupEventListeners(); // Sada je sigurno definirana
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

    // Postavljanje lazy loadinga
    function setupLazyLoading(box) {
        let isLazyLoadInit = false;

        const lazyLoadBackgrounds = () => {
            if (!isLazyLoadInit) return;
            document.querySelectorAll('.box').forEach(box => {
                if (box.getBoundingClientRect().top < window.innerHeight * 1.2) {
                    const bg = box.getAttribute('data-bg');
                    if (bg && !box.style.backgroundImage) {
                        box.style.backgroundImage = `url('${bg}')`;
                    }
                }
            });
        };

        window.addEventListener('scroll', lazyLoadBackgrounds);
        window.addEventListener('load', () => {
            isLazyLoadInit = true;
            lazyLoadBackgrounds();
        });

        window.addEventListener('beforeunload', () => {
            window.removeEventListener('scroll', lazyLoadBackgrounds);
            window.removeEventListener('resize', debounce(calculateInfoContainerHeight));
        });
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
                            <h3>${item.title_key}</h3>
                            <p class="item-description">${item.text_key}</p>
                            <div class="item-footer">
                                <span class="price">${item.cost_key}</span>
                                <div class="quantity-controls">
                                    <button class="quantity-btn decrement">-</button>
                                    <span class="quantity">1</span>
                                    <button class="quantity-btn increment">+</button>
                                </div>
                                <input type="checkbox" class="item-checkbox" 
                                    data-id="${index}-${itemIndex}" 
                                    data-title="${item.title_key}" 
                                    data-price="${item.cost_key.replace('€', '').trim()}"> <!-- Ovdje čuvamo osnovnu cijenu -->
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
            const priceElement = control.closest('.item-footer').querySelector('.price');
            const checkbox = control.closest('.item-footer').querySelector('.item-checkbox');

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
                    <h3>${item.title_key}</h3>
                    <p class="item-description">${item.text_key}</p>
                    <div class="item-footer">
                        <span class="price">${item.cost_key}</span>
                        <div class="quantity-controls">
                            <button class="quantity-btn decrement">-</button>
                            <span class="quantity">1</span>
                            <button class="quantity-btn increment">+</button>
                        </div>
                        <input type="checkbox" class="item-checkbox" 
                            data-id="${itemId}" 
                            data-title="${item.title_key}" 
                            data-price="${item.cost_key}">
                    </div>
                    <!-- Dodajemo sekciju za pića -->
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

        // Postavljamo event listenere za popup
        setupPopupEventListeners(popup, itemId, categoryIndex, itemIndex);
    }

    // Dodajemo event listener za zatvaranje pop-up prozora
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            popupOverlay.style.display = 'none';
        }
    });

    /* popup.addEventListener("click", function () {
        this.style.display = "none";
    }); */ // Izmeniti strukturu u javaskrit



    // Postavljanje event listenera za količinu u pop-up prozoru
    function setupPopupEventListeners(popup, itemId, categoryIndex, itemIndex) {
        const checkbox = popup.querySelector('.item-checkbox');
        const quantityElement = popup.querySelector('.quantity');
        const priceElement = popup.querySelector('.price');
        const decrementBtn = popup.querySelector('.decrement');
        const incrementBtn = popup.querySelector('.increment');
        const closePopupBtn = popup.querySelector('.close-popup');

        // Sinhronizacija sa osnovnim elementom
        const mainCheckbox = document.querySelector(`.menu-card[data-id="${itemId}"] .item-checkbox`);
        const mainQuantityElement = document.querySelector(`.menu-card[data-id="${itemId}"] .quantity`);
        const mainPriceElement = document.querySelector(`.menu-card[data-id="${itemId}"] .price`);

        // Postavljamo početne vrijednosti
        checkbox.checked = mainCheckbox.checked;
        quantityElement.textContent = mainQuantityElement.textContent;
        priceElement.textContent = mainPriceElement.textContent;

        // Dodajemo event listenere za količinu
        decrementBtn.addEventListener('click', () => {
            updateQuantityAndPrice(quantityElement, priceElement, checkbox, -1);
            updateQuantityAndPrice(mainQuantityElement, mainPriceElement, mainCheckbox, -1);
        });

        incrementBtn.addEventListener('click', () => {
            updateQuantityAndPrice(quantityElement, priceElement, checkbox, 1);
            updateQuantityAndPrice(mainQuantityElement, mainPriceElement, mainCheckbox, 1);
        });

        // Dodajemo event listener za čekboks
        checkbox.addEventListener('change', () => {
            mainCheckbox.checked = checkbox.checked;
            updateCart();
        });

        // Dodajemo event listener za zatvaranje pop-up prozora
        closePopupBtn.addEventListener('click', () => {
            popup.style.display = 'none';
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
        console.log("Aktivni indeks:", activeIndex);

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
    }

    function goToNextSlide() {
        activeIndex = (activeIndex + 1) % categories.length;
        updateClasses();
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

        // Provjeri je li korpa prazna
        if (selectedItems.length === 0) {
            cartTitle.style.display = 'none';
            selectedItemsContainer.innerHTML = `
                <div class="empty-cart-message">
                    Vaša korpa je prazna.
                </div>
                <div class="cart-actions">
                    <button id="backToMenuButton">Povratak na meni</button>
                </div>
            `;
        } else {
            cartTitle.style.display = 'block';

            // Grupiši čekirane stavke po kategorijama
            const groupedItems = selectedItems.reduce((groups, item) => {
                const [categoryIndex, itemIndex] = item.id.split('-');
                const category = categories[categoryIndex];

                if (!groups[categoryIndex]) {
                    groups[categoryIndex] = {
                        categoryName: category.details,
                        items: []
                    };
                }

                // Ažuriraj cijenu na osnovu trenutne količine
                const checkbox = document.querySelector(`.item-checkbox[data-id="${item.id}"]`);
                if (checkbox) {
                    const quantity = parseInt(checkbox.closest('.item-footer').querySelector('.quantity').textContent);
                    const basePrice = parseFloat(checkbox.getAttribute('data-price'));
                    item.price = basePrice * quantity; // Ažuriraj cijenu
                }

                groups[categoryIndex].items.push(item);
                return groups;
            }, {});

            // Prikaz grupa u korpi
            selectedItemsContainer.innerHTML = Object.values(groupedItems).map(group => `
                <div class="category-group">
                    <span class="category-title">${group.categoryName}</span>
                    ${group.items.map(item => `
                        <div class="selected-item">
                            <span>${item.title} - ${item.price.toFixed(2)} €</span>
                            <button class="remove-item" data-id="${item.id}">×</button>
                        </div>
                    `).join('')}
                </div>
            `).join('');

            // Dugme za brisanje svih stavki i dugme za povratak na meni
            selectedItemsContainer.innerHTML += `
                <div class="cart-actions">
                    <button id="clearAllButton">Izbriši sve</button>
                    <button id="backToMenuButton">Povratak na meni</button>
                </div>
            `;
        }

        // Prikaz ili sakrivanje checkboxCount
        checkboxCount.style.display = selectedItems.length > 0 ? 'flex' : 'none';
    }

    // Event listener za dugme "Povratak na meni"
    document.addEventListener('click', (event) => {
        if (event.target.id === 'backToMenuButton') {
            cartElement.classList.remove('open');
        }

        // Event listener za uklanjanje stavki iz korpe
        if (event.target.classList.contains('remove-item')) {
            const itemId = event.target.getAttribute('data-id');
            selectedItems = selectedItems.filter(item => item.id !== itemId);
            updateCart(); // Ažuriraj korpu nakon uklanjanja stavke
        }

        // Event listener za dugme "Izbriši sve"
        if (event.target.id === 'clearAllButton') {
            selectedItems = []; // Izbriši sve stavke
            updateCart(); // Ažuriraj korpu
        }
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

            // Otvori/zatvori korpu
            cartElement.classList.toggle('open');
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
            const quantity = parseInt(checkbox.closest('.item-footer').querySelector('.quantity').textContent);

            if (checkbox.checked) {
                selectedItems.push({ id, title, price, quantity });
            } else {
                selectedItems = selectedItems.filter(item => item.id !== id);
            }
            updateCart();
        }
    });

    // Funkcija za resetovanje količine na 1
    function resetQuantity(itemId) {
        // Resetuj količinu u glavnom elementu
        const mainQuantityElement = document.querySelector(`.menu-card[data-id="${itemId}"] .quantity`);
        const mainPriceElement = document.querySelector(`.menu-card[data-id="${itemId}"] .price`);
        const mainCheckbox = document.querySelector(`.menu-card[data-id="${itemId}"] .item-checkbox`);

        if (mainQuantityElement && mainPriceElement && mainCheckbox) {
            mainQuantityElement.textContent = 1; // Resetuj količinu na 1
            const basePrice = parseFloat(mainCheckbox.getAttribute('data-price')); // Osnovna cijena
            mainPriceElement.textContent = `${basePrice.toFixed(2)} €`; // Resetuj cijenu
        }

        // Resetuj količinu u pop-up prozoru (ako je otvoren)
        const popup = document.getElementById('imagePopup');
        if (popup.style.display === 'flex') {
            const popupItemId = popup.querySelector('.popup-content').getAttribute('data-id');
            if (popupItemId === itemId) {
                const popupQuantityElement = popup.querySelector('.quantity');
                const popupPriceElement = popup.querySelector('.price');
                const popupCheckbox = popup.querySelector('.item-checkbox');

                if (popupQuantityElement && popupPriceElement && popupCheckbox) {
                    popupQuantityElement.textContent = 1; // Resetuj količinu na 1
                    const basePrice = parseFloat(popupCheckbox.getAttribute('data-price')); // Osnovna cijena
                    popupPriceElement.textContent = `${basePrice.toFixed(2)} €`; // Resetuj cijenu
                }
            }
        }
    }

    // Funkcija za uklanjanje pojedinačne stavke
    function removeItem(id) {
        selectedItems = selectedItems.filter(item => item.id !== id);
        const checkbox = document.querySelector(`.item-checkbox[data-id="${id}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }
        resetQuantity(id); // Resetuj količinu na 1
        updateCart();
    }

    // Funkcija za brisanje svih stavki
    function clearAllItems() {
        selectedItems.forEach(item => {
            resetQuantity(item.id); // Resetuj količinu na 1 za svaku stavku
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