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

    // DOM elementi
    const elements = {
        dropdownMenu: document.getElementById('dropdownMenu'),
        dropdownOverlay: document.getElementById('dropdownOverlay'),
        prevBtn: document.querySelector('.btn.prev'),
        nextBtn: document.querySelector('.btn.next'),
        hamburgerBtn: document.querySelector('.hamburgerBtn'),
        dataContainer: document.getElementById('dataContainer'),
        selectedItemsContainer: document.getElementById('selectedItems'),
        checkboxCount: document.getElementById('checkboxCount'),
        popupOverlay: document.getElementById('imagePopup'),
        cartContainer: document.getElementById('cart'),
        phoneNumber: document.getElementById('phoneNumber'),
        callOptions: document.getElementById('callOptions'),
        overlay: document.getElementById('overlay'),
        closeBtn: document.querySelector('.call-option-close-btn'),
        settingsContainer: document.querySelector('.settings'),
        settingsOverlay: document.querySelector('.settings-overlay'),
        settingBtn: document.getElementById('settingBtn'),
        // settingTitle: document.getElementById('settingTitle'),
        searchInput: document.getElementById('searchInput'),
        searchResults: document.getElementById('searchResults'),
        scrollArrow: document.getElementById('scrollArrow'),
        slider: document.getElementById('slider'),
        itemsTitle: document.querySelector('.items-title')
    };

    // Stanje aplikacije
    let state = {
        activeIndex: 0,
        categories: [],
        selectedItems: [],
        slideHistory: [],
        itemHistory: [],
        popupOpen: false,
        callMenuOpen: false,
        searchQuery: '',
        cartOpen: false,
        settingsOpen: false,
        dropdownOpen: false,
    };

    // Funkcija za ažuriranje URL-a
    function updateURL() {
        const url = new URL(window.location);

        // Postavljamo parametre u zavisnosti od stanja
        url.searchParams.set('slide', state.activeIndex);
        if (state.popupOpen) url.searchParams.set('popup', 'true');
        if (state.callMenuOpen) url.searchParams.set('call', 'true');
        // if (state.searchQuery) url.searchParams.set('search', state.searchQuery);  // Ovo brišemo
        if (state.cartOpen) url.searchParams.set('cart', 'true');
        if (state.settingsOpen) url.searchParams.set('settings', 'true');
        if (state.dropdownOpen) url.searchParams.set('dropdown', 'true');

        // Ako neki od elemenata nisu aktivni, uklanjamo odgovarajući parametar iz URL-a
        if (!state.popupOpen) url.searchParams.delete('popup');
        if (!state.callMenuOpen) url.searchParams.delete('call');
        // if (!state.searchQuery) url.searchParams.delete('search');  // Ovo brišemo
        if (!state.cartOpen) url.searchParams.delete('cart');
        if (!state.settingsOpen) url.searchParams.delete('settings');
        if (!state.dropdownOpen) url.searchParams.delete('dropdown');

        // Dodajemo novo stanje u istoriju pretraživača
        history.pushState(state, '', url);
    }

    // Funkcija za čitanje stanja iz URL-a
    function readURL() {
        const url = new URL(window.location);
        const stateFromURL = {
            activeIndex: parseInt(url.searchParams.get('slide')) || 0,
            popupOpen: url.searchParams.get('popup') || null,
            callMenuOpen: url.searchParams.get('call') || null,
            // searchQuery: url.searchParams.get('search') || '',  // Ovo brišemo
            cartOpen: url.searchParams.get('cart') || null,
            settingsOpen: url.searchParams.get('settings') || null,
            dropdownOpen: url.searchParams.get('dropdown') || null,
        };
        return stateFromURL;
    }

    // Funkcija za primenu stanja iz URL-a
    function applyURLState(stateFromURL) {
        if (stateFromURL.activeIndex !== undefined) {
            state.activeIndex = stateFromURL.activeIndex;
            updateClasses();
        }
        if (stateFromURL.popupOpen === 'true') {
            state.popupOpen = true;
            elements.popupOverlay.style.display = 'flex';
        } else {
            state.popupOpen = false;
            elements.popupOverlay.style.display = 'none';
        }
        if (stateFromURL.callMenuOpen === 'true') {
            toggleCallMenu('open');
        } else {
            toggleCallMenu('close');
        }
        // if (stateFromURL.searchQuery) {  // Ovo brišemo
        //     elements.searchInput.value = stateFromURL.searchQuery;
        //     searchItem(stateFromURL.searchQuery);
        // }
        if (stateFromURL.cartOpen === 'true') {
            toggleCart('open');
        } else {
            toggleCart('close');
        }
        if (stateFromURL.settingsOpen === 'true') {
            toggleSettings('open');
        } else {
            toggleSettings('close');
        }
        if (stateFromURL.dropdownOpen === 'true') {
            toggleDropdown('open');
        } else {
            toggleDropdown('close');
        }
    }

    // Event listener za promene u URL-u
    window.addEventListener('popstate', (event) => {
        if (event.state) {
            applyURLState(event.state);
        } else {
            closeAllMenus(); // Zatvaramo sve otvorene elemente
        }
    });

    // Inicijalizacija stanja iz URL-a prilikom učitavanja stranice
    const initialState = readURL();
    applyURLState(initialState);

    // Funkcija za čuvanje stanja aplikacije u localStorage
    function saveAppStateToLocalStorage() {
        const appState = {
            activeIndex: state.activeIndex,
            selectedItems: state.selectedItems,
            slideHistory: state.slideHistory,
            itemHistory: state.itemHistory,
            dropdownState: {
                isDropdownOpen: elements.dropdownMenu.classList.contains('show'),
            },
        };
        localStorage.setItem('appState', JSON.stringify(appState));
    }

    // Funkcija za učitavanje stanja aplikacije iz localStorage
    function loadAppStateFromLocalStorage() {
        const savedState = localStorage.getItem('appState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            state.activeIndex = parsedState.activeIndex || 0;
            state.selectedItems = parsedState.selectedItems || [];
            state.slideHistory = parsedState.slideHistory || [];
            state.itemHistory = parsedState.itemHistory || [];

            if (parsedState.dropdownState) {
                if (parsedState.dropdownState.isDropdownOpen) {
                    toggleDropdown('open');
                }
            }

            updateClasses();
        }
    }

    // Debounce funkcija za ograničenje broja poziva funkcije
    const debounce = (func, wait = 100, immediate = false) => {
        let timeout;

        const debounced = (...args) => {
            const callNow = immediate && !timeout;

            clearTimeout(timeout);

            timeout = setTimeout(() => {
                timeout = null;
                if (!immediate) func(...args);
            }, wait);

            if (callNow) func(...args);
        };

        debounced.cancel = () => clearTimeout(timeout);

        return debounced;
    };

    // Funkcije za otvaranje i zatvaranje menija s debounce-om
    const debouncedOpenSettings = debounce(() => toggleSettings('open'));
    const debouncedOpenCart = debounce(() => toggleCart('open'));
    const debouncedOpenCallMenu = debounce(() => toggleCallMenu('open'));

    // Učitavanje korpe i čekiranih checkboxova iz localStorage
    function loadCartFromLocalStorage() {
        const cartData = localStorage.getItem('cart');
        if (cartData) {
            try {
                const parsedData = JSON.parse(cartData);
                state.selectedItems = parsedData.items || [];

                // Update UI elements with proper translations
                updateCart();
                restoreCheckedCheckboxes();
                restoreQuantities();

                // Update total price title if language strings are available
                if (parsedData.languageStrings) {
                    const totalPriceTitle = document.querySelector('#totalPriceTitle');
                    if (totalPriceTitle) {
                        totalPriceTitle.textContent = parsedData.languageStrings.total_price + ':';
                    }
                }
            } catch (error) {
                console.error('Error loading cart:', error);
                state.selectedItems = [];
                localStorage.removeItem('cart');
                renderEmptyCart();
            }
        } else {
            renderEmptyCart();
        }
    } -

        function safeSaveCart() {
            try {
                saveCartToLocalStorage();
            } catch (error) {
                console.error('Error saving cart:', error);
            }
        }

    // Čuvanje korpe u localStorage
    function saveCartToLocalStorage() {
        localStorage.setItem('cart', JSON.stringify({
            items: state.selectedItems,
            languageStrings: getCurrentLanguageStrings() // You'll need to implement this
        }));
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
            const checkbox = document.querySelector(`.menu-card[data-id="${item.id}"] .item-checkbox`);
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

    // Dodajemo ove promenljive na početku skripte (u delu gde definišemo state)
    let currentLanguage = 'sr'; // Podrazumevani jezik
    const languageMap = {
        sr: 'js/data_sr.json',
        ru: 'js/data_ru.json',
        en: 'js/data_en.json'
    };

    // Dohvatanje podataka iz JSON fajla
    async function fetchData(callback) {
        try {
            const response = await fetch(languageMap[currentLanguage] || JSON_PATH);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (!data.category || !data.language_strings) throw new Error('Invalid JSON format');

            state.categories = Object.values(data.category);
            updatePopupTexts(data.language_strings);

            // Save language strings for cart
            const cartData = localStorage.getItem('cart');
            if (cartData) {
                const parsedData = JSON.parse(cartData);
                localStorage.setItem('cart', JSON.stringify({
                    ...parsedData,
                    languageStrings: data.language_strings
                }));
            }

            initializeMenu();
            updateClasses();
            setupImageClickListeners();

            if (callback) callback();
        } catch (error) {
            console.error('Error:', error);
            elements.dataContainer.innerHTML = `<div class="error">${error.message}</div>`;
        }
    }

    function updatePopupTexts(languageData) {
        document.querySelector('#clearAllConfirmationPopup p').textContent = languageData.confirm_clear_all;
        document.querySelector('#confirmClearAll').textContent = languageData.yes;
        document.querySelector('#cancelClearAll').textContent = languageData.no;

        document.querySelector('#deleteConfirmationPopup p').firstChild.textContent = languageData.confirm_remove_item + ' "';
        document.querySelector('#confirmDelete').textContent = languageData.yes;
        document.querySelector('#cancelDelete').textContent = languageData.no;

    }

    // Funkcija za osvežavanje dugmadi za jezik:
    function updateLanguageButtons() {
        const savedLanguage = localStorage.getItem('selectedLanguage');
        document.querySelectorAll('.language-btn').forEach(btn => {
            btn.classList.toggle('active', savedLanguage && btn.dataset.lang === currentLanguage);
        });
    }

    // Funkcija za promenu jezika
    function changeLanguage(lang) {
        if (currentLanguage !== lang && languageMap[lang]) {
            currentLanguage = lang;
            localStorage.setItem('selectedLanguage', lang);
            // updateLanguageButtons(); // Osveži dugmad nakon promene jezika

            fetch(languageMap[lang])
                .then(response => response.json())
                .then(data => {
                    if (!data.category || !data.language_strings) {
                        throw new Error('Nedostaju prevodi u JSON fajlu');
                    }

                    // Ažuriraj naslove u korpi
                    const updatedCart = state.selectedItems.map(item => {
                        const [catIndex, itemIndex] = item.id.split('-');
                        const category = Object.values(data.category)[catIndex];
                        const translation = category?.translations?.[itemIndex];

                        return {
                            ...item,
                            title: translation?.title_key || item.title
                        };
                    });

                    // Sačuvaj ažuriranu korpu sa novim prevodima
                    localStorage.setItem('cart', JSON.stringify({
                        items: updatedCart,
                        languageStrings: data.language_strings
                    }));

                    window.location.reload();
                })
                .catch(error => {
                    console.error('Greška pri promeni jezika:', error);
                    window.location.reload();
                });
        }
    }

    function getCurrentLanguageStrings() {
        // Proveri localStorage prvo
        const cartData = localStorage.getItem('cart');
        if (cartData) {
            try {
                const parsed = JSON.parse(cartData);
                if (parsed.languageStrings) {
                    return {
                        ...parsed.languageStrings,
                        // Fallback vrednosti ako neki string nedostaje
                        recommended_drinks: parsed.languageStrings.recommended_drinks || "Preporučena pića",
                        recommended_food: parsed.languageStrings.recommended_food || "Preporučena jela",
                        no_recommendations: parsed.languageStrings.no_recommendations || "Nema preporuka"
                    };
                }
            } catch (e) {
                console.error('Error parsing cart data:', e);
            }
        }

        // Fallback na podrazumevane prevode
        return {
            empty_cart: "Vaša korpa je prazna",
            back_to_menu: "Povratak na meni",
            clear_all: "Izbriši sve",
            total_price: "Ukupna cena",
            recommended_drinks: "Preporučena pića",
            recommended_food: "Preporučena jela",
            no_recommendations: "Nema preporuka"
        };
    }

    // Inicijalizacija menija
    function initializeMenu() {
        state.categories.forEach((category, index) => {
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
            updateSlider(); // Ažuriraj slider
            toggleDropdown('close'); // Zatvori padajući meni
            toggleCart('close'); // Zatvori korpu
            saveAppStateToLocalStorage(); // Sačuvaj stanje u localStorage
            scrollArrow.classList.remove('visible');
        });
        elements.dropdownMenu.appendChild(menuItem);
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
                        <div class="menu-card-img">
                            <img src="${IMG_BASE_PATH}${item.imageSrc}" 
                                alt="${item.title_key || 'Nepoznata stavka'}" 
                                class="item-image"
                                loading="lazy">
                            <div class="menu-card-img-zoom">
    							<img src="img/command/zoom-in.png" alt="zoom">
    						</div>
                        </div >    
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
            const menuCards = dataItem.querySelectorAll('.data-item .menu-card');

            if (menuCards.length >= 2) {
                const secondToLastMenuCard = menuCards[menuCards.length - 2]; // Uzimamo predzadnji element

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

                observer.observe(secondToLastMenuCard);
            } else {
                console.warn('Nema dovoljno stavki za praćenje.');
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

        // elements.dataContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Postavljanje kontrola za količinu
    function setupQuantityControls(dataItem) {
        const quantityControls = dataItem.querySelectorAll('.quantity-controls');
        quantityControls.forEach(control => {
            const decrementBtn = control.querySelector('.decrement');
            const incrementBtn = control.querySelector('.increment');
            const quantityElement = control.querySelector('.quantity');
            const priceElement = control.closest('.card-content').querySelector('.price');
            const checkbox = control.closest('.card-content').querySelector('.item-checkbox');

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
    function openPopup(item, itemId, categoryIndex, itemIndex, isFromCart = false) {
        addToItemHistory(itemId);

        const selectedItem = state.selectedItems.find(item => item.id === itemId);
        const quantity = selectedItem ? selectedItem.quantity : 1;
        const langStrings = getCurrentLanguageStrings();

        state.popupOpen = true;
        updateURL();

        // Prikupite preporučene stavke
        const recommendedItems = [];
        let recommendationTitle = langStrings.no_recommendations;
        let showRecommendations = true; // Dodajemo flag za prikaz preporuka

        if (isFromCart) {
            showRecommendations = false; // Sakrij preporuke ako je popup otvoren iz korpe
        } else if (item.drink) {
            recommendationTitle = langStrings.recommended_drinks || "Preporučena pića";
            Object.values(item.drink).forEach(drinkName => {
                const recommendedItem = findItemByTitleKey(drinkName);
                if (recommendedItem) {
                    recommendedItems.push({ ...recommendedItem, type: 'drink' });
                }
            });
        } else if (item.food) {
            recommendationTitle = langStrings.recommended_food || "Preporučena jela";
            Object.values(item.food).forEach(foodName => {
                const recommendedItem = findItemByTitleKey(foodName);
                if (recommendedItem) {
                    recommendedItems.push({ ...recommendedItem, type: 'food' });
                }
            });
        }

        // Generisanje HTML za popup sa opcijom za sakrivanje preporuka
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
                        ${item.description_key ? `<p class="item-description">${item.description_key}</p>` : ''}
                        <div class="recommendations-section" style="${!showRecommendations ? 'display: none;' : ''}">
                            <h4>${recommendationTitle}</h4>
                            ${recommendedItems.length > 0 ?
                recommendedItems.map(recommendedItem => {
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
                }).join('') :
                `<p>${langStrings.no_recommendations || "Nema preporuka"}</p>`
            }
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
        const menuCards = document.querySelectorAll('.menu-card-img-zoom');
        menuCards.forEach(menuCard => {
            menuCard.addEventListener('click', (e) => {
                const menuCardWithId = e.target.closest('[data-id]');
                if (!menuCardWithId) {
                    console.error('Roditeljski element s data-id nije pronađen.');
                    return;
                }

                const itemId = menuCardWithId.getAttribute('data-id');
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
        // Ažuriraj items-title sa trenutnom kategorijom
        updateItemsTitle();

        applyActiveClasses('.data-item', 'activeData', 'prevData', 'nextData');

        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach((item, index) => {
            item.classList.toggle('active-menu-item', index === state.activeIndex);
        });

        elements.dataContainer.scrollTop = 0;
        calculateDataContainerHeight();
    }

    // Ažuriranje naslova kategorije u items-title
    function updateItemsTitle() {
        if (!elements.itemsTitle || !state.categories[state.activeIndex]) return;

        const currentCategory = state.categories[state.activeIndex];
        elements.itemsTitle.innerHTML = `
            <div class="title-container">
                <div class="title-content">
                    <h2>${currentCategory.details || 'Nepoznata kategorija'}</h2>
                    <div class="category-description">${currentCategory.description || 'Nema opisa.'}</div>
                </div>
                <button class="btn prev">←</button>
                <button class="btn next">→</button>
            </div>
        `;

        // Postavi event listenere samo ako dugmad postoje
        const prevBtn = elements.itemsTitle.querySelector('.btn.prev');
        const nextBtn = elements.itemsTitle.querySelector('.btn.next');

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => changeSlide('prev'));
            nextBtn.addEventListener('click', () => changeSlide('next'));
        }
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

    // Navigacija kroz slajdove
    function changeSlide(direction) {
        if (direction === 'next') {
            state.activeIndex = (state.activeIndex + 1) % state.categories.length;
        } else if (direction === 'prev') {
            state.activeIndex = (state.activeIndex - 1 + state.categories.length) % state.categories.length;
        }
        updateClasses(); // Ažuriramo prikaz
        updateSlider(); // Ažuriramo slider
        addToSlideHistory(state.activeIndex); // Dodajemo u istoriju
        saveAppStateToLocalStorage(); // Sačuvaj stanje u localStorage
        resetQuantities(); // Resetujemo količine
        // Sakrij strelicu prilikom promene slajda
        if (elements.scrollArrow) {
            elements.scrollArrow.classList.remove('visible');
        }
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

    addTouchEvents(elements.itemsTitle);
    // addTouchEvents(elements.dataContainer);

    // Izračunavanje visine dataContainer-a
    function calculateDataContainerHeight() {
        const header = document.getElementById('header');
        const itemsTitle = document.querySelector('.items-title');
        const control = document.getElementById('control');

        // Proveravamo da li svi elementi postoje pre nego što pristupimo njihovim svojstvima
        if (!header || !control || !itemsTitle) {
            console.error('Neki od elemenata za izračunavanje visine nisu pronađeni');
            return;
        }

        const totalUsedHeight =
            header.offsetHeight +
            control.offsetHeight +
            itemsTitle.offsetHeight;

        const viewportHeight = window.innerHeight;
        const remainingHeight = viewportHeight - totalUsedHeight - 10;
        elements.dataContainer.style.height = `${Math.max(remainingHeight, 100)}px`;
    }

    // *** Ažurira prikaz korpe
    function updateCart() {
        elements.checkboxCount.textContent = state.selectedItems.length;

        if (state.selectedItems.length === 0) {
            renderEmptyCart(); // Prikaži praznu korpu
        } else {
            renderCartItems(); // Prikaži stavke u korpi
        }

        elements.checkboxCount.style.display = state.selectedItems.length > 0 ? 'flex' : 'none';
    }

    // *** Prikazuje praznu korpu sa porukom i dugmetom za povratak na meni.
    function renderEmptyCart() {
        const langStrings = getCurrentLanguageStrings();

        elements.selectedItemsContainer.innerHTML = `
            <div class="empty-cart-message">
                ${langStrings.empty_cart || "Vaša korpa je prazna"}
            </div>
            <div class="cart-actions">
                <button id="backToMenuButton" class="back-to-menu">
                    ${langStrings.back_to_menu || "Povratak na meni"}
                </button>
            </div>
        `;

        document.querySelector('.cart-actions').style.justifyContent = 'center';
    }

    // *** Prikazuje stavke u korpi, po kategorijama, i opcijama za izmenu i brisanje
    function renderCartItems() {
        const langStrings = getCurrentLanguageStrings();
        let cartContent = '';

        // Grupisanje stavki po kategorijama
        const groupedItems = state.selectedItems.reduce((groups, item) => {
            const [categoryIndex, itemIndex] = item.id.split('-');
            const category = state.categories[categoryIndex];

            if (!groups[categoryIndex]) {
                groups[categoryIndex] = {
                    categoryName: category?.details || 'Nepoznata kategorija',
                    items: []
                };
            }

            groups[categoryIndex].items.push(item);
            return groups;
        }, {});

        // Generisanje HTML-a za svaku kategoriju
        cartContent = Object.values(groupedItems).map(group => `
            <div class="category-group">
                <span class="category-title">${group.categoryName}</span>
                ${group.items.map(item => `
                    <div class="selected-item" data-id="${item.id}">
                        <button class="edit-item" data-id="${item.id}">✎</button>
                        <div class="title-quantity">
                            <span class="title-quantity-name">${item.title}</span> 
                            <span class="title-quantity-price">${item.quantity} x ${(item.price / item.quantity).toFixed(2)} € = ${item.price.toFixed(2)} €</span>
                        </div>
                        <button class="remove-item">
                            <img data-id="${item.id}" src="img/command/clear.png" alt="clearBtn">    
                        </button>
                    </div>
                `).join('')}
            </div>
        `).join('');

        // Dodavanje ukupne cene
        const totalPrice = state.selectedItems.reduce((total, item) => total + item.price, 0);
        cartContent += `
            <div id="totalPriceContainer" class="total-price-container">
                <span id="totalPriceTitle">${langStrings.total_price || "Ukupna cena"}:</span>
                <span id="totalPrice">${totalPrice.toFixed(2)} €</span>
            </div>
        `;

        // Dodavanje dugmadi
        cartContent += `
            <div class="cart-actions">
                <button id="backToMenuButton" class="back-to-menu">
                    ${langStrings.back_to_menu || "Povratak na meni"}
                </button>
                <button id="clearAllButton">
                    ${langStrings.clear_all || "Izbriši sve"}
                </button>
            </div>
        `;

        elements.selectedItemsContainer.innerHTML = cartContent;
        document.querySelector('.cart-actions').style.justifyContent = '';

        // Dodajemo event listenere za dugmad "✎" (edit) na svaku stavku
        document.querySelectorAll('.edit-item').forEach(button => {
            button.addEventListener('click', () => {
                const itemId = button.getAttribute('data-id');
                const [categoryIndex, itemIndex] = itemId.split('-');
                const category = state.categories[categoryIndex];
                const item = category.translations[itemIndex];
                openPopup(item, itemId, categoryIndex, itemIndex, true); // Otvaramo popup prozor za izmenu stavke
            });
        });
    }


    // Event listener za dugme "Povratak na meni"
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('back-to-menu')) {
            toggleCart('close');
            updateSlider(); // Ažuriraj slider kada se vratiš na meni
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
    const basketElement = document.querySelector('.basketBtn');
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
        const mainCheckbox = document.querySelector(`.menu-card[data-id="${itemId}"] .item-checkbox`);
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
                const popupCheckbox = popup.querySelector('.item-checkbox');
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

    // Proveravati da li je checkbox čekiran pre nego što resetuje količinu i cenu.
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
        elements.hamburgerBtn.setAttribute('aria-expanded', isExpanded);
        state.dropdownOpen = isExpanded;
        updateURL();
    }

    // Funkcije za otvaranje i zatvaranje settings menija
    function toggleSettings(action) {
        const isOpen = action === 'open';
        elements.settingsContainer.classList.toggle('open', isOpen);
        elements.settingsOverlay.classList.toggle('active', isOpen);
        state.settingsOpen = isOpen;
        updateURL();
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
        state.cartOpen = cartOpen;
        updateURL(); // Ažuriraj URL nakon otvaranja/zatvaranja korpe
    }

    // Funkcija za zatvaranje pop-up prozora
    function closePopup() {
        elements.popupOverlay.style.display = 'none';
        state.popupOpen = false;
        updateURL();
    }

    // Funkcije za otvaranje / zatvaranje telefonskog izbornika
    function toggleCallMenu(action) {
        const isOpen = action === 'open';
        elements.callOptions.style.display = isOpen ? 'block' : 'none';
        elements.overlay.classList.toggle('active', isOpen);
        state.callMenuOpen = isOpen;
        updateURL();
    }

    // Funkcija za ažuriranje slidera na osnovu aktivnog slajda
    function updateSlider() {
        if (!elements.slider) return;

        const totalSlides = state.categories.length;
        if (totalSlides === 0) return;

        const sliderValue = (state.activeIndex / (totalSlides - 1)) * 100;
        elements.slider.value = sliderValue;
    }

    // Funkcija za promenu slajda na osnovu vrednosti slidera
    function changeSlideFromSlider() {
        const totalSlides = state.categories.length;
        const sliderValue = elements.slider.value; // Uzimamo vrednost slidera (0-100)
        const newIndex = Math.round((sliderValue / 100) * (totalSlides - 1)); // Računamo indeks slajda
        if (newIndex !== state.activeIndex) {
            state.activeIndex = newIndex; // Postavljamo novi indeks
            updateClasses(); // Ažuriramo prikaz
            updateURL(); // Ažuriramo URL
        }
    }

    // Postavljanje event listenera
    function setupEventListeners() {
        // 1. Event listeneri za navigaciju i interakciju sa slajdovima
        elements.prevBtn?.addEventListener('click', () => changeSlide('prev'));
        elements.nextBtn?.addEventListener('click', () => changeSlide('next'));
        elements.slider.addEventListener('input', () => {
            changeSlideFromSlider();
        });

        elements.container?.addEventListener('click', (e) => {
            const clickedBox = e.target.closest('.box');
            if (clickedBox?.classList.contains('nextSlide')) changeSlide('next');
            if (clickedBox?.classList.contains('prevSlide')) changeSlide('prev');
            elements.dataContainer?.scrollTo({ top: 0, behavior: 'smooth' });
        });

        elements.dataContainer?.addEventListener('click', (e) => {
            if (e.target.closest('.data-item')) { }
        });

        // 2. Event listeneri za padajući meni (dropdown)
        elements.hamburgerBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown('open');
        });

        document.addEventListener('click', () => toggleDropdown('close'));
        elements.dropdownOverlay?.addEventListener('click', () => toggleDropdown('close'));

        // 3. Event listeneri za settings meni
        elements.settingBtn?.addEventListener('click', debouncedOpenSettings);
        elements.settingsOverlay?.addEventListener('click', () => toggleSettings('close'));
        // elements.settingTitle?.addEventListener('click', () => toggleSettings('close'));

        // 4. Event listeneri za call meni
        elements.phoneNumber?.addEventListener('click', debouncedOpenCallMenu);
        elements.closeBtn?.addEventListener('click', () => toggleCallMenu('close'));
        elements.overlay?.addEventListener('click', () => toggleCallMenu('close'));

        // 5. Event listeneri za pretragu - OVO BRIŠEMO CEO DEO
        elements.searchInput.addEventListener('input', () => {
            const query = elements.searchInput.value;
            if (query) {
                searchItem(query);
            } else {
                elements.searchResults.innerHTML = '';
            }
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('.search-box') && !event.target.closest('#searchResults')) {
                elements.searchResults.innerHTML = '';
            }
        });

        // 6. Globalni event listener za tastaturu
        document.addEventListener('keydown', (event) => {
            const { key } = event;

            const isMenuOpen = elements.dropdownMenu?.classList.contains('show');
            const isCallMenuOpen = elements.callOptions?.style.display === 'block';
            const isCartOpen = elements.cartContainer?.classList.contains('open');
            const isSettingsOpen = elements.settingsContainer?.classList.contains('open');

            if (key === "Escape") {
                closeAllMenus();
            }

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
            }
        });

        // 7. Resize event listener
        window.addEventListener('resize', debounce(calculateDataContainerHeight, 100));

        function closeAllMenus() {
            toggleCallMenu('close');
            toggleDropdown('close');
            closePopup();
            toggleCart('close');
            toggleSettings('close');
            elements.searchResults.innerHTML = '';
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

    /* ***** PRETRAGA ***** */

    // Funkcija za pretragu stavki
    function searchItem(query) {
        query = query.toLowerCase().trim(); // Normalizujemo upit (mala slova, bez višak razmaka)
        elements.searchResults.innerHTML = ''; // Brišemo prethodne rezultate pretrage

        state.searchQuery = query;
        updateURL(); // Ažuriraj URL nakon pretrage

        // Poseban slučaj: ako je upit "vino" ili "vina", prikazujemo predefinisane kategorije vina
        const wineCategories = ['Bijelo vino', 'Crno vino', 'Rose', 'Moje vino'];
        if (query === 'vino' || query === 'vina') {
            wineCategories.forEach(wine => {
                const resultElement = document.createElement('div');
                resultElement.textContent = wine;
                resultElement.classList.add('search-result-item');

                // Event listener za klik na rezultat pretrage
                resultElement.addEventListener('click', () => {
                    scrollToSubcategoryTitle(wine); // Skrolujemo do odgovarajućeg naslova
                });

                elements.searchResults.appendChild(resultElement); // Dodajemo rezultat u kontejner
            });

            return; // Prekidamo funkciju jer je ovo poseban slučaj
        }

        // Klasična pretraga - prolazimo kroz sve kategorije i stavke
        const results = [];

        state.categories.forEach((category, categoryIndex) => {
            let isCategoryMatch = false;
            let startIndex = -1;

            // Proveravamo da li upit odgovara nekoj kategoriji
            category.translations.forEach((item, itemIndex) => {
                if (item.details && item.details.toLowerCase().includes(query)) {
                    isCategoryMatch = true;
                    startIndex = itemIndex + 1; // Počinjemo pretragu od sledeće stavke
                }
            });

            // Ako je pronađena kategorija, dodajemo sve stavke iz te kategorije
            if (isCategoryMatch && startIndex !== -1) {
                for (let i = startIndex; i < category.translations.length; i++) {
                    const item = category.translations[i];
                    if (item.details) break; // Prekidamo ako naiđemo na novu kategoriju
                    if (!results.some(result => result.item === item)) {
                        results.push({ categoryIndex, itemIndex: i, item }); // Dodajemo stavku u rezultate
                    }
                }
            }

            // Proveravamo da li upit odgovara naslovu stavke
            category.translations.forEach((item, itemIndex) => {
                if (item.title_key && item.title_key.toLowerCase().includes(query)) {
                    if (!results.some(result => result.item === item)) {
                        results.push({ categoryIndex, itemIndex, item }); // Dodajemo stavku u rezultate
                    }
                }
            });
        });

        displaySearchResults(results); // Prikazujemo rezultate pretrage
    }

    // Funkcija za skrolovanje do određenog naslova (<h3 class="subcategory-title">)
    function scrollToSubcategoryTitle(title) {
        // Pronalazimo odgovarajući naslov u DOM-u
        const targetElement = Array.from(document.querySelectorAll('.subcategory-title'))
            .find(el => el.textContent.trim().toLowerCase() === title.toLowerCase());

        if (targetElement) {
            // Pronalazimo indeks kategorije koja sadrži ovaj naslov
            const categoryIndex = state.categories.findIndex(category =>
                category.translations.some(item => item.details && item.details.toLowerCase() === title.toLowerCase())
            );

            if (categoryIndex !== -1) {
                state.activeIndex = categoryIndex; // Postavljamo aktivnu kategoriju
                updateClasses(); // Ažuriramo prikaz

                const offset = targetElement.offsetTop; // Pozicija naslova u odnosu na vrh stranice

                // Skrolujemo do naslova sa animacijom
                setTimeout(() => {
                    elements.dataContainer.scrollTo({
                        top: offset,
                        behavior: 'smooth'
                    });

                    // Dodajemo klasu za highlight na 2 sekunde
                    targetElement.classList.add('highlight');
                    setTimeout(() => targetElement.classList.remove('highlight'), 2000);
                }, 200);
            }
        }

        // Brišemo rezultate pretrage i unos u polje za pretragu
        elements.searchResults.innerHTML = '';
        elements.searchInput.value = '';
    }

    // Funkcija za prikaz rezultata pretrage
    function displaySearchResults(results) {
        elements.searchResults.innerHTML = ''; // Brišemo prethodne rezultate

        if (results.length === 0) {
            // Ako nema rezultata, prikazujemo poruku
            elements.searchResults.innerHTML = '<div>Nijedna stavka nije pronađena.</div>';
            return;
        }

        // Za svaki rezultat kreiramo element i dodajemo ga u kontejner
        results.forEach(result => {
            if (!result.item.details) {
                const resultElement = document.createElement('div');
                resultElement.textContent = result.item.title_key;
                resultElement.classList.add('search-result-item');

                // Event listener za klik na rezultat
                resultElement.addEventListener('click', () => {
                    state.activeIndex = result.categoryIndex; // Postavljamo aktivnu kategoriju
                    updateClasses(); // Ažuriramo prikaz

                    // Sačuvaj stanje u localStorage
                    saveAppStateToLocalStorage();

                    const itemElement = document.querySelector(`.menu-card[data-id="${result.categoryIndex}-${result.itemIndex}"]`);
                    if (itemElement) {
                        const itemPosition = itemElement.offsetTop; // Pozicija stavke u odnosu na vrh stranice

                        // Skrolujemo do stavke sa animacijom
                        setTimeout(() => {
                            elements.dataContainer.scrollTo({
                                top: itemPosition - 40,
                                behavior: 'smooth'
                            });
                            calculateDataContainerHeight(); // Ažuriramo visinu kontejnera
                        }, 200);

                        // Dodajemo klasu za highlight na 3 sekunde
                        itemElement.classList.add('highlight');
                        setTimeout(() => itemElement.classList.remove('highlight'), 3000);
                    }

                    // Brišemo rezultate pretrage i unos u polje za pretragu
                    elements.searchResults.innerHTML = '';
                    elements.searchInput.value = '';
                    toggleCart('close');
                    elements.scrollArrow.classList.remove('visible');
                });

                elements.searchResults.appendChild(resultElement); // Dodajemo rezultat u kontejner
            }
        });
    }

    /* ***** END PRETRAGA ***** */

    // Inicijalizacija slajda na osnovu URL-a
    function initialize() {
        // Proveri da li postoji sačuvan jezik u localStorage
        const savedLanguage = localStorage.getItem('selectedLanguage');

        if (!savedLanguage) {
            // Ako nema sačuvanog jezika, otvori prozor za podešavanja
            toggleSettings('open');
            // Postavi podrazumevani jezik na sr, ali ne aktiviraj dugme
            currentLanguage = 'sr';
        } else if (languageMap[savedLanguage]) {
            currentLanguage = savedLanguage;
        }

        loadAppStateFromLocalStorage();
        fetchData(() => {
            loadCartFromLocalStorage();
            updateSlider();
        });
        setupEventListeners();

        // Postavi event listenere za dugmad za jezik
        // Postavi event listenere za dugmad za jezik
        document.querySelectorAll('.language-btn').forEach(btn => {
            // Aktiviraj dugme samo ako postoji sačuvan jezik
            btn.classList.toggle('active', localStorage.getItem('selectedLanguage') && btn.dataset.lang === currentLanguage);

            btn.addEventListener('click', () => {
                // Dodaj aktivnu klasu na kliknuto dugme
                document.querySelectorAll('.language-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Sačuvaj izabrani jezik u localStorage
                localStorage.setItem('selectedLanguage', btn.dataset.lang);
                changeLanguage(btn.dataset.lang);
                // Nakon izbora jezika, zatvori prozor za podešavanja
                toggleSettings('close');
            });
        });

        const initialState = readURL();
        applyURLState(initialState);
    }

    // Pokretanje inicijalizacije
    initialize();
});