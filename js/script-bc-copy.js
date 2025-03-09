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
    const JSON_PATH = 'js/data-copy.json'; // Putanja do JSON fajla sa podacima
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
        searchContainer: document.getElementById('search'),
        searchBtn: document.querySelector('.searchBtn'),
        searchInput: document.getElementById('searchInput'),
        filterContainer: document.getElementById('filterContainer'),
        searchResults: document.getElementById('searchResults'),
    };

    // Stanje aplikacije
    let state = {
        activeIndex: 0,
        categories: [],
        selectedItems: [],
        isAutoPlayActive: false,
        autoPlayInterval: null,
        slideHistory: [], // Istorija pregledanih slajdova
        itemHistory: [],  // Istorija pregledanih stavki
    };

    // Funkcija za čuvanje stanja aplikacije u localStorage
    function saveAppStateToLocalStorage() {
        const appState = {
            activeIndex: state.activeIndex, // Sačuvaj aktivni indeks
            selectedItems: state.selectedItems,
            isAutoPlayActive: state.isAutoPlayActive,
            slideHistory: state.slideHistory,
            itemHistory: state.itemHistory,
            dropdownState: {
                isDropdownOpen: elements.dropdownMenu.classList.contains('show'), // Da li je padajući meni otvoren
            },
        };
        localStorage.setItem('appState', JSON.stringify(appState));
    }

    function loadAppStateFromLocalStorage() {
        const savedState = localStorage.getItem('appState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            state.activeIndex = parsedState.activeIndex || 0; // Učitaj aktivni indeks
            state.selectedItems = parsedState.selectedItems || [];
            state.isAutoPlayActive = parsedState.isAutoPlayActive || false;
            state.slideHistory = parsedState.slideHistory || [];
            state.itemHistory = parsedState.itemHistory || [];

            // Ažuriraj padajući meni na osnovu učitanog stanja
            if (parsedState.dropdownState) {
                if (parsedState.dropdownState.isDropdownOpen) {
                    toggleDropdown('open'); // Otvori padajući meni ako je bio otvoren
                }
            }

            // Postavi aktivni slajd na osnovu učitanog indeksa
            updateClasses();
        }
    }

    // Debounce funkcija za ograničenje broja poziva funkcije
    const debounce = (func, wait = 100, immediate = false) => {
        let timeout;
        return function (...args) {
            const context = this;
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = null;
                if (!immediate) func.apply(context, args);
            }, wait);
            if (callNow) func.apply(context, args);
        };
    };

    // Funkcije za otvaranje i zatvaranje menija s debounce-om
    const debouncedOpenSettings = debounce(() => toggleSettings('open'));
    const debouncedOpenCart = debounce(() => toggleCart('open'));
    const debouncedOpenCallMenu = debounce(() => toggleCallMenu('open'));

    // Učitavanje korpe i čekiranih checkboxova iz localStorage
    function loadCartFromLocalStorage() {
        const cart = localStorage.getItem('cart');
        if (cart) {
            state.selectedItems = JSON.parse(cart);
            updateCart(); // Ažuriraj korpu
            restoreCheckedCheckboxes(); // Vrati čekirane checkboxove
            restoreQuantities(); // Vrati količine
        } else {
            // Ako nema stavki u localStorage, prikaži praznu korpu
            renderEmptyCart();
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

    // Učitavanje istorije iz localStorage
    function loadHistoryFromLocalStorage() {
        const history = localStorage.getItem('history');
        if (history) {
            const { slideHistory, itemHistory } = JSON.parse(history);
            state.slideHistory = slideHistory || [];
            state.itemHistory = itemHistory || [];
        }
    }

    // Čuvanje istorije u localStorage
    function saveHistoryToLocalStorage() {
        const history = {
            slideHistory: state.slideHistory,
            itemHistory: state.itemHistory,
        };
        localStorage.setItem('history', JSON.stringify(history));
    }

    // Dodavanje u istoriju slajdova
    function addToSlideHistory(slideIndex) {
        if (!state.slideHistory.includes(slideIndex)) {
            state.slideHistory.push(slideIndex);
            saveHistoryToLocalStorage(); // Sačuvaj istoriju u localStorage
        }
    }

    // Dodavanje u istoriju stavki
    function addToItemHistory(itemId) {
        if (!state.itemHistory.includes(itemId)) {
            state.itemHistory.push(itemId);
            saveHistoryToLocalStorage(); // Sačuvaj istoriju u localStorage
        }
    }

    // Dohvatanje podataka iz JSON fajla
    async function fetchData(callback) {
        try {
            const response = await fetch(JSON_PATH);
            if (!response.ok) throw new Error(`HTTP greška! status: ${response.status}`);
            const data = await response.json();
            if (!data.category) throw new Error('Nevalidan JSON format');
            state.categories = Object.values(data.category); // Inicijalizuj state.categories
            initializeMenu(); // Inicijalizuj meni
            updateClasses(); // Ažuriraj klase
            setupImageClickListeners(); // Postavi osluškivače za slike
            generateFilterRadioButtons(); // Generišemo radio dugmad
            if (callback) callback(); // Pozovi callback ako postoji
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
            state.activeIndex = index; // Postavi aktivni indeks
            updateClasses(); // Ažuriraj klase
            toggleDropdown('close'); // Zatvori padajući meni
            toggleCart('close'); // Zatvori korpu
            saveAppStateToLocalStorage(); // Sačuvaj stanje u localStorage
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
        let dataItem;

        try {
            dataItem = document.createElement('div');
            dataItem.className = 'data-item';

            const itemsGridContent = category.translations?.map((item, itemIndex) => {
                if (item.details && !item.title_key) {
                    return `<h3 class="subcategory-title">${item.details}</h3>`;
                }

                item.quantity = item.quantity || 1;
                item.price = item.price || parseFloat(item.cost_key?.replace('€', '').trim() || 0);

                const pricePerUnit = (item.price / item.quantity).toFixed(2);

                // Generišemo HTML za stavku
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
                            ${item.text_key ? `<p class="item-description">${item.text_key}</p>` : ''}
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
            }).join('') || '<p>Nema dostupnih stavki.</p>';

            dataItem.innerHTML = `
                <div class="items-title">
                    <h2>${category.details || 'Nepoznata kategorija'}</h2>
                    <div class="category-description">${category.description || 'Nema opisa.'}</div>
                </div>
                <div class="items-grid">
                    ${itemsGridContent}
                </div>
            `;

            elements.dataContainer.appendChild(dataItem);
            setupQuantityControls(dataItem);
        } catch (error) {
            console.error('Greška pri kreiranju sekcije sa podacima:', error);
            return;
        }

        // Intersection Observer za strelicu
        const scrollArrow = document.getElementById('scrollArrow');
        const dataContainer = document.querySelector('.data-container');

        if (scrollArrow && dataContainer) {
            const lastMenuCard = dataItem.querySelector('.data-item .menu-card:last-child');

            if (lastMenuCard) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.boundingClientRect.top <= dataContainer.getBoundingClientRect().top) {
                            scrollArrow.classList.add('visible');
                        } else if (entry.isIntersecting) {
                            scrollArrow.classList.remove('visible');
                        }
                    });
                }, {
                    root: dataContainer,
                    rootMargin: '0px',
                    threshold: [1]
                });

                observer.observe(lastMenuCard);
            }

            scrollArrow.addEventListener('click', () => {
                elements.dataContainer.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        } else {
            console.error('Strelica (scrollArrow) ili dataContainer nisu pronađeni u DOM-u.');
        }

        elements.dataContainer.scrollTo({ top: 0, behavior: 'smooth' });
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
        // 1. Dohvatanje podataka o stavci
        const itemId = checkbox.getAttribute('data-id');
        const [categoryIndex, itemIndex] = itemId.split('-');
        const item = state.categories[categoryIndex]?.translations[itemIndex];

        if (!item) {
            console.error('Stavka nije pronađena.');
            return;
        }

        // 2. Ažuriranje količine
        let quantity = parseInt(quantityElement.textContent);
        quantity += change;
        if (quantity < 1) quantity = 1;

        quantityElement.textContent = quantity;
        item.quantity = quantity;

        // 3. Ažuriranje cene
        const basePrice = parseFloat(checkbox.getAttribute('data-price'));
        const newPrice = basePrice * quantity;
        priceElement.textContent = `${newPrice.toFixed(2)} €`;
        item.price = newPrice;

        // 4. Ažuriranje u glavnom meniju
        const itemFooter = quantityElement.closest('.item-footer');
        if (itemFooter) {
            const titleQuantityPriceElement = itemFooter.querySelector('.title-quantity-price');
            if (titleQuantityPriceElement) {
                const pricePerUnit = (newPrice / quantity).toFixed(2);
                titleQuantityPriceElement.textContent = `${quantity} x ${pricePerUnit} €`;
            }
        }

        // 5. Ažuriranje u popup prozoru
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

        // 6. Ažuriranje korpe
        const selectedItem = state.selectedItems.find(item => item.id === itemId);
        if (selectedItem) {
            selectedItem.quantity = quantity;
            selectedItem.price = newPrice;
        }

        updateCart();
        saveCartToLocalStorage(); // Sačuvaj korpu nakon promene
    }

    // Otvaranje pop-up prozora
    // Funkcija za otvaranje pop-up prozora
    function openPopup(item, itemId, categoryIndex, itemIndex, isFromCart = false) {
        addToItemHistory(itemId); // Dodaj u istoriju

        const selectedItem = state.selectedItems.find(item => item.id === itemId);
        const quantity = selectedItem ? selectedItem.quantity : 1;

        // Prikupi sve preporučene stavke (pića ili jela)
        const recommendedItems = [];
        if (item.drink) {
            Object.values(item.drink).forEach(drinkName => {
                const recommendedItem = findItemByTitleKey(drinkName);
                if (recommendedItem) {
                    recommendedItems.push({ ...recommendedItem, type: 'drink' });
                }
            });
        } else if (item.food) {
            Object.values(item.food).forEach(foodName => {
                const recommendedItem = findItemByTitleKey(foodName);
                if (recommendedItem) {
                    recommendedItems.push({ ...recommendedItem, type: 'food' });
                }
            });
        }

        // Generiši HTML za preporučene stavke
        const recommendedItemsHTML = recommendedItems.map(recommendedItem => {
            const recommendedItemId = `${recommendedItem.categoryIndex}-${recommendedItem.itemIndex}`;
            const recommendedItemSelected = state.selectedItems.find(item => item.id === recommendedItemId);
            const recommendedItemQuantity = recommendedItemSelected ? recommendedItemSelected.quantity : 1;

            return `
            <div class="recommended-item" data-id="${recommendedItemId}">
                <div>
                    <input type="checkbox" class="item-checkbox" 
                        data-id="${recommendedItemId}" 
                        data-title="${recommendedItem.title_key}" 
                        data-price="${recommendedItem.cost_key.replace('€', '').trim()}"
                        ${recommendedItemSelected ? 'checked' : ''}>
                    <span class="recommended-item-title">${recommendedItem.title_key}</span>
                </div>
                <div>
                    <span class="quantity-controls">
                        <button class="quantity-btn decrement">-</button>
                        <span class="quantity">${recommendedItemQuantity}</span>
                        <button class="quantity-btn increment">+</button>
                    </span>
                    <span class="price">${(parseFloat(recommendedItem.cost_key.replace('€', '').trim()) * recommendedItemQuantity).toFixed(2)} €</span>
                </div>
            </div>
        `;
        }).join('');

        // Generišemo HTML za popup prozor
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
                    ${item.text_key ? `<p class="item-description">${item.text_key}</p>` : ''}
                    ${item.description_key ? `<p class="item-description">${item.description_key}</p>` : ''}
                    <div class="drinks-section">
                        <h4>Preporučena ${item.drink ? 'pića' : 'jela'}:</h4>
                        ${recommendedItemsHTML}
                    </div>
                </div>
                <button class="close-popup">×</button>
            </div>
        </div>
    `;

        elements.popupOverlay.style.display = 'flex';

        // Dodajemo event listener za zatvaranje popup prozora
        elements.popupOverlay.addEventListener('click', (e) => {
            if (e.target === elements.popupOverlay || e.target.classList.contains('close-popup')) {
                closePopup();
            }
        });

        // Postavljamo event listenere za popup prozor
        setupPopupEventListeners(elements.popupOverlay, itemId, categoryIndex, itemIndex);
    }

    // Funkcija će pretraživati sve kategorije i stavke kako bi pronašla stavku sa odgovarajućim title_key
    function findItemByTitleKey(titleKey) {
        for (let categoryIndex = 0; categoryIndex < state.categories.length; categoryIndex++) {
            const category = state.categories[categoryIndex];
            for (let itemIndex = 0; itemIndex < category.translations.length; itemIndex++) {
                const item = category.translations[itemIndex];
                if (item.title_key === titleKey) {
                    return { ...item, categoryIndex, itemIndex };
                }
            }
        }
        return null;
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
        const mainTitleQuantityPriceElement = document.querySelector(`.menu-card[data-id="${itemId}"] .title-quantity-price`);

        if (!checkbox || !quantityElement || !priceElement || !mainCheckbox || !mainQuantityElement || !mainPriceElement || !mainTitleQuantityPriceElement) {
            console.error('Neki od elemenata u pop-up prozoru nisu pronađeni.');
            return;
        }

        // Postavi početne vrijednosti
        checkbox.checked = mainCheckbox.checked;
        quantityElement.textContent = mainQuantityElement.textContent;
        priceElement.textContent = mainPriceElement.textContent;

        // Dodaj event listener za promjenu checkboxa u popup prozoru
        checkbox.addEventListener('change', () => {
            const id = checkbox.getAttribute('data-id');
            const title = checkbox.getAttribute('data-title');
            const price = parseFloat(checkbox.getAttribute('data-price'));
            const quantity = parseInt(quantityElement.textContent);

            if (checkbox.checked) {
                // Dodaj stavku u korpu ako je checkbox čekiran
                const existingItem = state.selectedItems.find(item => item.id === id);
                if (!existingItem) {
                    state.selectedItems.push({ id, title, price, quantity });
                }
            } else {
                // Ukloni stavku iz korpe ako je checkbox odčekiran
                removeItem(id); // Koristimo postojeću funkciju za uklanjanje stavke

                // Eksplicitno ažuriraj količinu i cijenu u popup prozoru
                quantityElement.textContent = 1; // Resetuj količinu na 1
                const basePrice = parseFloat(checkbox.getAttribute('data-price'));
                priceElement.textContent = `${basePrice.toFixed(2)} €`; // Resetuj cijenu
            }

            // Ažuriraj glavni checkbox i korpu
            mainCheckbox.checked = checkbox.checked;
            updateCart();
            saveCartToLocalStorage(); // Sačuvaj korpu nakon promene
        });

        // Dodaj event listener za dugme za smanjenje količine u popup prozoru
        decrementBtn.addEventListener('click', () => {
            updateQuantityAndPrice(quantityElement, priceElement, checkbox, -1);
            updateQuantityAndPrice(mainQuantityElement, mainPriceElement, mainCheckbox, -1);
        });

        // Dodaj event listener za dugme za povećanje količine u popup prozoru
        incrementBtn.addEventListener('click', () => {
            updateQuantityAndPrice(quantityElement, priceElement, checkbox, 1);
            updateQuantityAndPrice(mainQuantityElement, mainPriceElement, mainCheckbox, 1);
        });

        // Dodaj event listener za zatvaranje popup prozora
        closePopupBtn.addEventListener('click', () => {
            popup.style.display = 'none';
        });

        // Dodaj event listenere za preporučene stavke
        const recommendedItems = popup.querySelectorAll('.recommended-item');
        recommendedItems.forEach(recommendedItem => {
            const recommendedCheckbox = recommendedItem.querySelector('.item-checkbox');
            const recommendedQuantityElement = recommendedItem.querySelector('.quantity');
            const recommendedPriceElement = recommendedItem.querySelector('.price');
            const recommendedDecrementBtn = recommendedItem.querySelector('.decrement');
            const recommendedIncrementBtn = recommendedItem.querySelector('.increment');

            // Pronađi glavnu stavku u meniju koja odgovara preporučenoj stavki
            const mainRecommendedCheckbox = document.querySelector(`.menu-card[data-id="${recommendedCheckbox.getAttribute('data-id')}"] .item-checkbox`);
            const mainRecommendedQuantityElement = document.querySelector(`.menu-card[data-id="${recommendedCheckbox.getAttribute('data-id')}"] .quantity`);
            const mainRecommendedPriceElement = document.querySelector(`.menu-card[data-id="${recommendedCheckbox.getAttribute('data-id')}"] .price`);
            const mainRecommendedTitleQuantityPriceElement = document.querySelector(`.menu-card[data-id="${recommendedCheckbox.getAttribute('data-id')}"] .title-quantity-price`);

            recommendedCheckbox.addEventListener('change', () => {
                const id = recommendedCheckbox.getAttribute('data-id');
                const title = recommendedCheckbox.getAttribute('data-title');
                const price = parseFloat(recommendedCheckbox.getAttribute('data-price'));
                const quantity = parseInt(recommendedQuantityElement.textContent);

                if (recommendedCheckbox.checked) {
                    // Dodaj stavku u korpu ako je checkbox čekiran
                    const existingItem = state.selectedItems.find(item => item.id === id);
                    if (!existingItem) {
                        state.selectedItems.push({ id, title, price, quantity });
                    }
                } else {
                    // Ukloni stavku iz korpe ako je checkbox odčekiran
                    removeItem(id); // Koristimo postojeću funkciju za uklanjanje stavke

                    // Eksplicitno ažuriraj količinu i cijenu u popup prozoru
                    recommendedQuantityElement.textContent = 1; // Resetuj količinu na 1
                    const basePrice = parseFloat(recommendedCheckbox.getAttribute('data-price'));
                    recommendedPriceElement.textContent = `${basePrice.toFixed(2)} €`; // Resetuj cijenu
                }

                // Ažuriraj glavni checkbox i korpu
                if (mainRecommendedCheckbox) {
                    mainRecommendedCheckbox.checked = recommendedCheckbox.checked;
                }
                updateCart();
                saveCartToLocalStorage(); // Sačuvaj korpu nakon promene
            });

            recommendedDecrementBtn.addEventListener('click', () => {
                updateQuantityAndPrice(recommendedQuantityElement, recommendedPriceElement, recommendedCheckbox, -1);
                if (mainRecommendedQuantityElement && mainRecommendedPriceElement && mainRecommendedCheckbox && mainRecommendedTitleQuantityPriceElement) {
                    updateQuantityAndPrice(mainRecommendedQuantityElement, mainRecommendedPriceElement, mainRecommendedCheckbox, -1);
                }
            });

            recommendedIncrementBtn.addEventListener('click', () => {
                updateQuantityAndPrice(recommendedQuantityElement, recommendedPriceElement, recommendedCheckbox, 1);
                if (mainRecommendedQuantityElement && mainRecommendedPriceElement && mainRecommendedCheckbox && mainRecommendedTitleQuantityPriceElement) {
                    updateQuantityAndPrice(mainRecommendedQuantityElement, mainRecommendedPriceElement, mainRecommendedCheckbox, 1);
                }
            });
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
        addToSlideHistory(state.activeIndex); // Dodaj u istoriju
        saveAppStateToLocalStorage();
        resetQuantities();
    }

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
            renderEmptyCart(); // Prikaži praznu korpu
        } else {
            renderCartItems(); // Prikaži stavke u korpi
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
        if (!state.categories || state.categories.length === 0) {
            console.error('Kategorije nisu učitane.');
            return;
        }

        const groupedItems = state.selectedItems.reduce((groups, item) => {
            const [categoryIndex, itemIndex] = item.id.split('-');
            const category = state.categories[categoryIndex]; // Pristup kategoriji

            // Proveri da li kategorija postoji
            if (!category) {
                console.error(`Kategorija sa indeksom ${categoryIndex} nije pronađena.`);
                return groups; // Preskoči ovu stavku
            }

            if (!groups[categoryIndex]) {
                groups[categoryIndex] = {
                    categoryName: category.details || 'Nepoznata kategorija', // Koristi podrazumevani naziv ako `details` ne postoji
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
        basketElement.addEventListener('click', debouncedOpenCart);
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
                resetQuantity(id); // Resetuj količinu i cijenu
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
        const checkbox = document.querySelector(`.menu-card[data-id="${id}"] .item-checkbox`);
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

    // Funkcija resetQuantities će sada proveravati da li je checkbox čekiran pre nego što resetuje količinu i cenu.
    function resetQuantities() {
        const currentDataItem = document.querySelector('.data-item.activeData');
        if (!currentDataItem) return;

        const quantityElements = currentDataItem.querySelectorAll('.quantity');
        const priceElements = currentDataItem.querySelectorAll('.price');
        const checkboxes = currentDataItem.querySelectorAll('.item-checkbox');
        const titleQuantityPriceElements = currentDataItem.querySelectorAll('.title-quantity-price');

        quantityElements.forEach((quantityElement, index) => {
            const checkbox = checkboxes[index];
            const priceElement = priceElements[index];
            const titleQuantityPriceElement = titleQuantityPriceElements[index];

            if (checkbox && priceElement && titleQuantityPriceElement) {
                // Proveri da li je checkbox čekiran
                if (!checkbox.checked) {
                    // Resetuj količinu na 1 samo ako checkbox nije čekiran
                    quantityElement.textContent = 1;

                    // Resetuj cenu na osnovnu cenu
                    const basePrice = parseFloat(checkbox.getAttribute('data-price'));
                    priceElement.textContent = `${basePrice.toFixed(2)} €`;

                    // Resetuj "title-quantity-price"
                    titleQuantityPriceElement.textContent = `1 x ${basePrice.toFixed(2)} €`;

                    // Ažuriraj stanje stavke u state.categories
                    const itemId = checkbox.getAttribute('data-id');
                    const [categoryIndex, itemIndex] = itemId.split('-');
                    const item = state.categories[categoryIndex]?.translations[itemIndex];
                    if (item) {
                        item.quantity = 1;
                        item.price = basePrice;
                    }

                    // Resetuj količinu i cenu u popup prozoru (ako je otvoren za tu stavku)
                    const popup = document.getElementById('imagePopup');
                    if (popup.style.display === 'flex') {
                        const popupItemId = popup.querySelector('.popup-content').getAttribute('data-id');
                        if (popupItemId === itemId) {
                            const popupQuantityElement = popup.querySelector('.quantity');
                            const popupPriceElement = popup.querySelector('.price');
                            const popupTitleQuantityPriceElement = popup.querySelector('.title-quantity-price');

                            if (popupQuantityElement && popupPriceElement && popupTitleQuantityPriceElement) {
                                popupQuantityElement.textContent = 1;
                                popupPriceElement.textContent = `${basePrice.toFixed(2)} €`;
                                popupTitleQuantityPriceElement.textContent = `1 x ${basePrice.toFixed(2)} €`;
                            }
                        }
                    }
                }
            }
        });

        // Ažuriraj korpu i sačuvaj promene
        updateCart();
        saveCartToLocalStorage();
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
        if (settingsOpen) stopAutoPlay();
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
            stopAutoPlay();
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

    // Funkcija za otvaranje/zatvaranje pretrage
    function toggleSearch(action) {
        const isOpen = action === 'open';
        elements.searchContainer.classList.toggle('open', isOpen);
        elements.searchBtn.setAttribute('aria-expanded', isOpen);
        if (isOpen) {
            elements.searchInput.focus();
        }
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
        elements.settingBtn?.addEventListener('click', debouncedOpenSettings);

        // Zatvaranje settings menija
        elements.settingsOverlay?.addEventListener('click', () => toggleSettings('close'));
        elements.settingTitle?.addEventListener('click', () => toggleSettings('close'));

        // Klik na broj telefona - otvaranje/zatvaranje call menija
        elements.phoneNumber?.addEventListener('click', debouncedOpenCallMenu);

        // Zatvaranje call menija
        elements.closeBtn?.addEventListener('click', () => toggleCallMenu('close'));
        elements.overlay?.addEventListener('click', () => toggleCallMenu('close'));

        // Zatvaranje dropdown menija klikom na overlay
        elements.dropdownOverlay?.addEventListener('click', () => toggleDropdown('close'));


        ///////////////////////

        // Event listener za otvaranje pretrage
        elements.searchBtn.addEventListener('click', () => {
            toggleSearch('open');
        });

        // Event listener za zatvaranje pretrage klikom na "Meni"
        document.getElementById('searchTitle').addEventListener('click', () => {
            toggleSearch('close');
        });

        // Event listener za unos u polje za pretragu sa debounce-om
        elements.searchInput.addEventListener('input', () => {
            const query = elements.searchInput.value;
            if (query) {
                searchItem(query);
            } else {
                elements.searchResults.innerHTML = ''; // Očisti rezultate ako nema upita
            }
        });

        document.getElementById('searchInput').addEventListener('input', debouncedSearch);

        // Event listener za klik van radio dugmadi
        document.addEventListener('click', (event) => {
            const isRadioButton = event.target.tagName === 'INPUT' && event.target.type === 'radio';
            const isLabelForRadio = event.target.tagName === 'LABEL' && event.target.htmlFor;

            // Ako klik nije na radio dugme ili labelu za radio dugme
            if (!isRadioButton && !isLabelForRadio) {
                const radioButtons = document.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    if (radio.checked) {
                        radio.checked = false; // Otčekiraj sva radio dugmad
                        currentFilter = ''; // Resetuj trenutni filter
                        elements.searchInput.value = ''; // Očisti polje za unos
                        elements.searchResults.innerHTML = ''; // Očisti rezultate
                        elements.searchInput.focus(); // Fokusiraj polje za unos
                    }
                });
            }
        });

        // Event listener za zatvaranje pretrage klikom van nje
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.search-container') && !event.target.closest('.searchBtn')) {
                toggleSearch('close');
            }
        });

        // Generišemo radio dugmad za filtere
        generateFilterRadioButtons();

        ///////////////////////


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
                    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                        event.preventDefault();
                        toggleAutoPlay();
                    }
                    break;

            }
        });

        // Funkcija za zatvaranje svih menija
        function closeAllMenus() {
            toggleCallMenu('close');
            toggleDropdown('close');
            closePopup();
            toggleCart('close');
            toggleSettings('close');
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



    ////////////////////////////////

    if (!elements.searchContainer || !elements.searchBtn || !elements.searchInput || !elements.filterContainer || !elements.searchResults) {
        console.error('Neki od elemenata za pretragu nisu pronađeni!');
        return;
    }

    let currentFilter = ''; // Trenutno čekirani filter

    function generateFilterRadioButtons() {
        const uniqueCategories = new Set();

        state.categories.forEach(category => {
            category.translations.forEach(item => {
                if (item.details) {
                    uniqueCategories.add(item.details);
                }
            });
        });

        uniqueCategories.forEach(category => {
            const radioButton = document.createElement('input');
            radioButton.type = 'radio';
            radioButton.name = 'categoryFilter';
            radioButton.value = category;
            radioButton.id = `filter-${category}`;

            const label = document.createElement('label');
            label.htmlFor = `filter-${category}`;
            label.textContent = category;

            elements.filterContainer.appendChild(radioButton);
            elements.filterContainer.appendChild(label);
            elements.filterContainer.appendChild(document.createElement('br'));

            // Klik event - rješava i čekiranje i odčekiranje
            radioButton.addEventListener('click', (e) => {
                if (radioButton.checked && currentFilter === category) {
                    // Ako je već čekirano i kliknuto ponovo - brišemo filter i pretragu
                    radioButton.checked = false;
                    currentFilter = '';
                    elements.searchInput.value = '';
                    elements.searchResults.innerHTML = '';
                } else {
                    // Normalno ponašanje - postavlja filter i pokreće pretragu
                    currentFilter = category;
                    elements.searchInput.value = category;
                    searchItem(category);
                }
            });

            // Osiguraj da kad se pređe na drugo dugme, automatski se update-uje pretraga
            radioButton.addEventListener('change', () => {
                if (radioButton.checked) {
                    currentFilter = category;
                    elements.searchInput.value = category;
                    searchItem(category);
                }
            });
        });
    }

    // Funkcija za pretragu stavki
    function searchItem(query) {
        query = query.toLowerCase().trim();
        elements.searchResults.innerHTML = '';  // Čistimo stare rezultate

        const wineCategories = ['Bijelo vino', 'Crno vino', 'Rose', 'Moje vino'];

        if (query === 'vino' || query === 'vina') {
            // Poseban slučaj: korisnik je pretražio "vino"
            wineCategories.forEach(wine => {
                const resultElement = document.createElement('div');
                resultElement.textContent = wine;
                resultElement.classList.add('search-result-item');

                resultElement.addEventListener('click', () => {
                    scrollToSubcategoryTitle(wine); // Novi način skrolanja direktno na <h3>
                });

                elements.searchResults.appendChild(resultElement);
            });

            return; // Prekidamo jer ne radimo klasičnu pretragu za "vino"
        }

        // Klasična pretraga - sve ostalo osim "vino"
        const results = [];

        state.categories.forEach((category, categoryIndex) => {
            let isCategoryMatch = false;
            let startIndex = -1;

            category.translations.forEach((item, itemIndex) => {
                if (item.details && item.details.toLowerCase().includes(query)) {
                    isCategoryMatch = true;
                    startIndex = itemIndex + 1;
                }
            });

            if (isCategoryMatch && startIndex !== -1) {
                for (let i = startIndex; i < category.translations.length; i++) {
                    const item = category.translations[i];
                    if (item.details) break;
                    if (!results.some(result => result.item === item)) {
                        results.push({ categoryIndex, itemIndex: i, item });
                    }
                }
            }

            category.translations.forEach((item, itemIndex) => {
                if (item.title_key && item.title_key.toLowerCase().includes(query)) {
                    if (!results.some(result => result.item === item)) {
                        results.push({ categoryIndex, itemIndex, item });
                    }
                }
            });
        });

        displaySearchResults(results);
    }

    // Nova funkcija za skrolovanje do <h3 class="subcategory-title">
    function scrollToSubcategoryTitle(title) {
        const targetElement = Array.from(document.querySelectorAll('.subcategory-title'))
            .find(el => el.textContent.trim().toLowerCase() === title.toLowerCase());

        if (targetElement) {
            // Pronađi odgovarajući categoryIndex
            const categoryIndex = state.categories.findIndex(category =>
                category.translations.some(item => item.details && item.details.toLowerCase() === title.toLowerCase())
            );

            if (categoryIndex !== -1) {
                state.activeIndex = categoryIndex;
                updateClasses(); // Ovo prebacuje na pravi "slajd" (kategoriju)

                const offset = targetElement.offsetTop;

                setTimeout(() => {
                    elements.dataContainer.scrollTo({
                        top: offset,
                        behavior: 'smooth'
                    });

                    targetElement.classList.add('highlight');
                    setTimeout(() => targetElement.classList.remove('highlight'), 2000);
                }, 200);
            }
        }

        // Očisti rezultate i polje pretrage
        elements.searchResults.innerHTML = '';
        elements.searchInput.value = '';
        toggleSearch('close');
    }



    // Funkcija za prikaz rezultata pretrage
    function displaySearchResults(results) {
        elements.searchResults.innerHTML = '';

        if (results.length === 0) {
            elements.searchResults.innerHTML = '<div>Nijedna stavka nije pronađena.</div>';
            return;
        }

        results.forEach(result => {
            if (!result.item.details) {
                const resultElement = document.createElement('div');
                resultElement.textContent = result.item.title_key;
                resultElement.classList.add('search-result-item');

                resultElement.addEventListener('click', () => {
                    state.activeIndex = result.categoryIndex;
                    updateClasses();

                    const itemElement = document.querySelector(`.menu-card[data-id="${result.categoryIndex}-${result.itemIndex}"]`);
                    if (itemElement) {
                        const itemPosition = itemElement.offsetTop;
                        setTimeout(() => {
                            elements.dataContainer.scrollTo({
                                top: itemPosition,
                                behavior: 'smooth'
                            });
                            calculateDataContainerHeight();
                        }, 200);

                        itemElement.classList.add('highlight');
                        setTimeout(() => itemElement.classList.remove('highlight'), 2000);
                    }

                    elements.searchResults.innerHTML = '';
                    elements.searchInput.value = '';
                    toggleSearch('close');
                });

                elements.searchResults.appendChild(resultElement);
            }
        });
    }

    // Event listener za unos u polje za pretragu sa debounce-om
    const debouncedSearch = debounce(() => {
        const query = document.getElementById('searchInput').value;
        if (query) {
            searchItem(query);
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#searchInput') && !e.target.closest('#searchResults')) {
            document.getElementById('searchResults').innerHTML = '';
            elements.searchResults.innerHTML = '';
            elements.searchInput.value = '';
        }
    });

    document.getElementById('searchInput').addEventListener('input', debouncedSearch);

    document.getElementById('searchInput').addEventListener('input', debouncedSearch);

    // Event listener za dugme za pretragu
    /* document.getElementById('searchButton').addEventListener('click', () => {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value;
        if (query) {
            searchItem(query);
        } else {
            alert('Unesite naziv stavke za pretragu.');
        }
    }); */

    // Event listener za Enter u polju za pretragu
    /* document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value;
            if (query) {
                searchItem(query);
            } else {
                alert('Unesite naziv stavke za pretragu.');
            }
        }
    }); */

    ////////////////////////////////


    // Inicijalizacija slajda na osnovu URL-a
    function initialize() {
        loadAppStateFromLocalStorage(); // Učitaj stanje aplikacije
        fetchData(() => {
            // Ovo će se izvršiti tek nakon što su kategorije učitane
            loadCartFromLocalStorage(); // Učitaj korpu
        });
        setupEventListeners(); // Postavi event listenere
    }

    // Pokretanje inicijalizacije
    initialize();
});