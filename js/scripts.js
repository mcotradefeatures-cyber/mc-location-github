// Données de configuration
let config = {
    cityPrice: 80000,
    suburbPrice: 120000,
    regionalPrice: 200000,
    nationalPrice: 200000,
    fuelPricePerLiter: 6000,
    fuelConsumption: 6.5,
    firstPaymentPercent: 50,
    mvolaNumber: "0347685594",
    unavailableDays: ["01/01", "25/12"],
    reservedDays: ["15/11", "16/11", "20/11", "25/11"],
    roadConditionDefault: 0
};

// Variables globales
let currentUser = null;
let isAuthenticated = false;
let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();
const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                   "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// Stockage des données
let users = JSON.parse(localStorage.getItem('mc_location_users')) || [];
let reservations = JSON.parse(localStorage.getItem('mc_location_reservations')) || [];
let invoices = JSON.parse(localStorage.getItem('mc_location_invoices')) || [];

// Variables de la réservation courante
let currentReservation = {
    id: null,
    userId: null,
    clientName: "",
    clientPhone: "",
    startLocation: "",
    endLocation: "",
    roundTrip: false,
    estimatedDistance: 0,
    roadCondition: 0,
    zone: "",
    zonePrice: 0,
    rentalDays: 1,
    fuelLiters: 0,
    fuelCost: 0,
    locationCost: 0,
    totalCost: 0,
    firstPayment: 0,
    balancePayment: 0,
    status: "pending",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    invoiceNumber: "",
    invoiceDate: ""
};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser le calendrier
    initCalendar();
    updateCalendarDisplay();
    
    // Mettre à jour les tableaux
    updateUsersTable();
    updateReservationsTable();
    
    // Gestionnaires d'événements pour la navigation
    document.getElementById('login-btn').addEventListener('click', openLoginModal);
    document.getElementById('close-login').addEventListener('click', closeLoginModal);
    document.getElementById('admin-btn').addEventListener('click', openAdminModal);
    document.getElementById('close-admin').addEventListener('click', closeAdminModal);
    document.getElementById('cancel-admin').addEventListener('click', closeAdminModal);
    document.getElementById('save-admin').addEventListener('click', saveAdminConfig);
    
    // Gestionnaire pour l'inscription
    document.getElementById('register-btn').addEventListener('click', registerUser);
    
    // Gestionnaires pour le formulaire de réservation
    document.getElementById('estimated-distance').addEventListener('input', updateCalculator);
    document.getElementById('road-condition').addEventListener('change', updateCalculator);
    document.getElementById('rental-days').addEventListener('input', updateCalculator);
    
    // Gestionnaire pour aller/retour
    document.getElementById('round-trip').addEventListener('change', function() {
        currentReservation.roundTrip = this.checked;
        updateCalculator();
    });
    
    // Gestionnaires pour les zones de location
    document.querySelectorAll('.zone-option').forEach(option => {
        option.addEventListener('click', function() {
            // Retirer la sélection précédente
            document.querySelectorAll('.zone-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Ajouter la sélection actuelle
            this.classList.add('selected');
            
            // Mettre à jour la zone sélectionnée
            const zone = this.getAttribute('data-zone');
            const price = parseInt(this.getAttribute('data-price'));
            
            currentReservation.zone = zone;
            currentReservation.zonePrice = price;
            
            // Mettre à jour l'affichage
            document.getElementById('calc-zone').textContent = 
                zone === 'city' ? 'En Ville' :
                zone === 'suburb' ? 'Périphérie' :
                zone === 'regional' ? 'Régionale' : 'Nationale';
            
            document.getElementById('calc-zone-price').textContent = formatNumber(price);
            
            updateCalculator();
        });
    });
    
    // Gestionnaire pour le paiement Mvola
    document.getElementById('pay-first').addEventListener('click', processFirstPayment);
    
    // Gestionnaire pour générer la facture
    document.getElementById('generate-invoice').addEventListener('click', generateInvoice);
    
    // Gestionnaire pour confirmer la réservation
    document.getElementById('confirm-reservation').addEventListener('click', confirmReservation);
    
    // Gestionnaire pour télécharger la facture en PDF
    document.getElementById('download-invoice-pdf').addEventListener('click', downloadInvoicePDF);
    
    // Gestionnaires pour le calendrier
    document.getElementById('prev-month').addEventListener('click', prevMonth);
    document.getElementById('next-month').addEventListener('click', nextMonth);
    
    // Onglets admin
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Désactiver tous les onglets
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            
            // Activer l'onglet cliqué
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Charger les valeurs depuis la configuration
    loadAdminValues();
    
    // Navigation smooth
    initSmoothNavigation();
    
    // Définir les dates min dans les inputs date
    const today = new Date().toISOString().split('T')[0];
    
    console.log("Application MC LOCATION initialisée avec succès!");
});

// Fonction pour mettre à jour le calculateur
function updateCalculator() {
    // Récupérer les valeurs du formulaire
    const distance = parseFloat(document.getElementById('estimated-distance').value) || 0;
    const roadCondition = parseInt(document.getElementById('road-condition').value) || 0;
    const rentalDays = parseInt(document.getElementById('rental-days').value) || 1;
    const roundTrip = document.getElementById('round-trip').checked;
    
    // Calculer la distance totale (aller simple ou aller-retour)
    const totalDistance = roundTrip ? distance * 2 : distance;
    
    // Calculer le gasoil avec état de la route
    const fuelLiters = (totalDistance / 100) * config.fuelConsumption * (1 + (roadCondition / 100));
    const fuelCost = fuelLiters * config.fuelPricePerLiter;
    
    // Calculer le coût de la location
    const locationCost = currentReservation.zonePrice * rentalDays;
    
    // Calculer le total
    const totalCost = locationCost + fuelCost;
    
    // Calculer les paiements
    const firstPayment = totalCost * (config.firstPaymentPercent / 100);
    const balancePayment = totalCost - firstPayment;
    
    // Mettre à jour l'objet de réservation
    currentReservation.estimatedDistance = distance;
    currentReservation.roadCondition = roadCondition;
    currentReservation.rentalDays = rentalDays;
    currentReservation.fuelLiters = fuelLiters;
    currentReservation.fuelCost = fuelCost;
    currentReservation.locationCost = locationCost;
    currentReservation.totalCost = totalCost;
    currentReservation.firstPayment = firstPayment;
    currentReservation.balancePayment = balancePayment;
    
    // Mettre à jour l'affichage
    document.getElementById('calc-total-distance').textContent = totalDistance.toFixed(1) + ' km';
    document.getElementById('calc-road-condition').textContent = roadCondition + '%';
    document.getElementById('calc-fuel-liters').textContent = fuelLiters.toFixed(1) + ' L';
    document.getElementById('calc-fuel-price').textContent = formatNumber(config.fuelPricePerLiter);
    document.getElementById('calc-fuel-cost').textContent = formatNumber(Math.round(fuelCost));
    document.getElementById('calc-days').textContent = rentalDays + (rentalDays > 1 ? ' jours' : ' jour');
    document.getElementById('calc-location-cost').textContent = formatNumber(Math.round(locationCost));
    document.getElementById('total-cost').textContent = formatNumber(Math.round(totalCost));
    document.getElementById('first-payment').textContent = formatNumber(Math.round(firstPayment));
    document.getElementById('balance-payment').textContent = formatNumber(Math.round(balancePayment));
    
    // Mettre à jour l'affichage de la zone si sélectionnée
    if (!currentReservation.zone) {
        document.getElementById('calc-zone').textContent = 'Non sélectionnée';
        document.getElementById('calc-zone-price').textContent = formatNumber(0);
    }
}

// Fonction pour formater les nombres avec des espaces
function formatNumber(num) {
    return num.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Fonction pour mettre à jour la table des utilisateurs
function updateUsersTable() {
    const usersTableBody = document.getElementById('users-table-body');
    const noUsersMessage = document.getElementById('no-users-message');
    
    // Vider le tableau
    usersTableBody.innerHTML = '';
    
    if (users.length === 0) {
        noUsersMessage.style.display = 'block';
        return;
    }
    
    noUsersMessage.style.display = 'none';
    
    // Ajouter chaque utilisateur au tableau
    users.forEach((user, index) => {
        const row = document.createElement('tr');
        
        // Formater la date
        const date = new Date(user.date);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        
        row.innerHTML = `
            <td class="user-id">${index + 1}</td>
            <td>${user.name}</td>
            <td>${user.phone}</td>
            <td>${user.city}</td>
            <td class="user-date">${formattedDate}</td>
        `;
        
        usersTableBody.appendChild(row);
    });
}

// Fonction pour mettre à jour la table des réservations admin
function updateReservationsTable() {
    const reservationsTableBody = document.getElementById('reservations-table-body');
    const noReservationsMessage = document.getElementById('no-reservations-admin-message');
    
    // Vider le tableau
    reservationsTableBody.innerHTML = '';
    
    if (reservations.length === 0) {
        noReservationsMessage.style.display = 'block';
        return;
    }
    
    noReservationsMessage.style.display = 'none';
    
    // Ajouter chaque réservation au tableau
    reservations.forEach((reservation, index) => {
        const row = document.createElement('tr');
        
        // Trouver le nom du client
        const client = users.find(u => u.phone === reservation.clientPhone);
        const clientName = client ? client.name : 'Inconnu';
        
        // Déterminer le type de zone
        const zoneType = reservation.zone === 'city' ? 'Ville' :
                        reservation.zone === 'suburb' ? 'Périphérie' :
                        reservation.zone === 'regional' ? 'Régionale' : 'Nationale';
        
        // Déterminer le statut
        const statusBadge = reservation.status === 'accomplished' ? 
            '<span class="status-badge status-accomplished">Accomplie</span>' :
            '<span class="status-badge status-missed">Ratée</span>';
        
        row.innerHTML = `
            <td class="reservation-id">${reservation.id || index + 1}</td>
            <td class="client-name">${clientName}</td>
            <td class="reservation-type">${zoneType}</td>
            <td class="reservation-date">${reservation.startDate || 'N/A'}</td>
            <td>${reservation.startLocation} → ${reservation.endLocation}</td>
            <td class="reservation-status">${statusBadge}</td>
            <td class="invoice-cell">
                ${reservation.invoiceNumber ? 
                    `<a href="#" class="invoice-download" onclick="downloadInvoice('${reservation.invoiceNumber}')">Voir</a>` : 
                    'N/A'}
            </td>
        `;
        
        reservationsTableBody.appendChild(row);
    });
}

// Fonction pour mettre à jour les réservations du client
function updateClientReservations() {
    if (!currentUser) return;
    
    const clientReservationsBody = document.getElementById('client-reservations-body');
    const noReservationsMessage = document.getElementById('no-reservations-message');
    
    // Vider le tableau
    clientReservationsBody.innerHTML = '';
    
    // Filtrer les réservations du client
    const clientReservations = reservations.filter(r => r.clientPhone === currentUser.phone);
    
    if (clientReservations.length === 0) {
        noReservationsMessage.style.display = 'block';
        return;
    }
    
    noReservationsMessage.style.display = 'none';
    
    // Ajouter chaque réservation au tableau
    clientReservations.forEach((reservation, index) => {
        const row = document.createElement('tr');
        
        // Déterminer le type de zone
        const zoneType = reservation.zone === 'city' ? 'Ville' :
                        reservation.zone === 'suburb' ? 'Périphérie' :
                        reservation.zone === 'regional' ? 'Régionale' : 'Nationale';
        
        // Déterminer le statut
        const statusBadge = reservation.status === 'accomplished' ? 
            '<span class="status-badge status-accomplished">Accomplie</span>' :
            '<span class="status-badge status-missed">Ratée</span>';
        
        row.innerHTML = `
            <td>${reservation.id || 'RES-' + (index + 1)}</td>
            <td>${zoneType}</td>
            <td>${reservation.startDate || 'N/A'}</td>
            <td>${reservation.startTime || 'N/A'}</td>
            <td>${reservation.endTime || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td>
                ${reservation.invoiceNumber ? 
                    `<a href="#" class="invoice-download" onclick="downloadInvoice('${reservation.invoiceNumber}')">Télécharger</a>` : 
                    'N/A'}
            </td>
        `;
        
        clientReservationsBody.appendChild(row);
    });
}

// Fonction pour le défilement fluide
function initSmoothNavigation() {
    // Navigation par ancres
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Fonction pour faire défiler vers une section
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Fonction pour retourner en haut
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Fonction pour ouvrir le modal de connexion
function openLoginModal() {
    document.getElementById('login-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Fonction pour fermer le modal de connexion
function closeLoginModal() {
    document.getElementById('login-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
    resetLoginForm();
}

// Fonction pour réinitialiser le formulaire de connexion
function resetLoginForm() {
    document.getElementById('phone-number').value = '';
    document.getElementById('user-name').value = '';
    document.getElementById('user-city').value = '';
}

// Fonction pour enregistrer un utilisateur
function registerUser() {
    const phone = document.getElementById('phone-number').value.trim();
    const name = document.getElementById('user-name').value.trim();
    const city = document.getElementById('user-city').value.trim();
    
    // Validation
    if (!phone || phone.length < 10) {
        alert("Veuillez entrer un numéro de téléphone valide (10 chiffres)");
        return;
    }
    
    if (!name) {
        alert("Veuillez entrer votre nom et prénom");
        return;
    }
    
    if (!city) {
        alert("Veuillez entrer votre ville");
        return;
    }
    
    // Vérifier si l'utilisateur existe déjà
    let existingUser = users.find(user => user.phone === phone);
    
    if (existingUser) {
        // Mettre à jour les informations
        existingUser.name = name;
        existingUser.city = city;
        existingUser.date = new Date().toISOString();
        alert(`✅ Bienvenue de retour ${name}!`);
    } else {
        // Ajouter un nouvel utilisateur
        const newUser = {
            id: users.length + 1,
            phone: phone,
            name: name,
            city: city,
            date: new Date().toISOString()
        };
        users.push(newUser);
        alert(`✅ Bienvenue ${name}! Votre compte a été créé avec succès.`);
    }
    
    // Sauvegarder dans le localStorage
    localStorage.setItem('mc_location_users', JSON.stringify(users));
    
    // Mettre à jour l'utilisateur courant
    currentUser = users.find(user => user.phone === phone);
    
    // Mettre à jour les tables
    updateUsersTable();
    updateClientReservations();
    
    // Authentifier l'utilisateur
    isAuthenticated = true;
    closeLoginModal();
    
    // Afficher l'espace réservation
    document.getElementById('reservation-space').classList.add('active');
    
    // Afficher l'espace client
    document.getElementById('client-space').style.display = 'block';
    document.getElementById('client-id-display').textContent = `ID: ${currentUser.phone}`;
    
    // Initialiser la réservation courante
    currentReservation.userId = currentUser.id;
    currentReservation.clientName = currentUser.name;
    currentReservation.clientPhone = currentUser.phone;
    
    // Faire défiler jusqu'à l'espace réservation
    setTimeout(() => {
        document.getElementById('reservation-space').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, 300);
}

// Fonction pour ouvrir le modal admin
function openAdminModal() {
    const password = prompt("Entrez le code d'accès administrateur:");
    if (password === "2204") {
        document.getElementById('admin-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Mettre à jour les tables
        updateUsersTable();
        updateReservationsTable();
    } else if (password !== null) {
        alert("Code d'accès incorrect");
    }
}

// Fonction pour fermer le modal admin
function closeAdminModal() {
    document.getElementById('admin-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Fonction pour charger les valeurs admin
function loadAdminValues() {
    document.getElementById('admin-city-price').value = config.cityPrice;
    document.getElementById('admin-suburb-price').value = config.suburbPrice;
    document.getElementById('admin-regional-price').value = config.regionalPrice;
    document.getElementById('admin-national-price').value = config.nationalPrice;
    document.getElementById('admin-fuel-price').value = config.fuelPricePerLiter;
    document.getElementById('admin-fuel-consumption').value = config.fuelConsumption;
    document.getElementById('admin-first-payment-percent').value = config.firstPaymentPercent;
    document.getElementById('admin-mvola-number').value = config.mvolaNumber;
    document.getElementById('admin-unavailable-days').value = config.unavailableDays.join(', ');
    document.getElementById('admin-reserved-days').value = config.reservedDays.join(', ');
    document.getElementById('admin-road-condition-default').value = config.roadConditionDefault;
    
    // Mettre à jour l'affichage public
    document.querySelector('.zone-option[data-zone="city"] .zone-price').textContent = 
        formatNumber(config.cityPrice) + ' Ar/jour';
    document.querySelector('.zone-option[data-zone="suburb"] .zone-price').textContent = 
        formatNumber(config.suburbPrice) + ' Ar/jour';
    document.querySelector('.zone-option[data-zone="regional"] .zone-price').textContent = 
        formatNumber(config.regionalPrice) + ' Ar/jour';
    document.querySelector('.zone-option[data-zone="national"] .zone-price').textContent = 
        formatNumber(config.nationalPrice) + ' Ar/jour';
    
    // Mettre à jour les attributs data-price
    document.querySelector('.zone-option[data-zone="city"]').setAttribute('data-price', config.cityPrice);
    document.querySelector('.zone-option[data-zone="suburb"]').setAttribute('data-price', config.suburbPrice);
    document.querySelector('.zone-option[data-zone="regional"]').setAttribute('data-price', config.regionalPrice);
    document.querySelector('.zone-option[data-zone="national"]').setAttribute('data-price', config.nationalPrice);
    
    document.getElementById('mvola-number').textContent = config.mvolaNumber;
}

// Fonction pour sauvegarder la configuration admin
function saveAdminConfig() {
    try {
        config.cityPrice = parseInt(document.getElementById('admin-city-price').value) || 80000;
        config.suburbPrice = parseInt(document.getElementById('admin-suburb-price').value) || 120000;
        config.regionalPrice = parseInt(document.getElementById('admin-regional-price').value) || 200000;
        config.nationalPrice = parseInt(document.getElementById('admin-national-price').value) || 200000;
        config.fuelPricePerLiter = parseInt(document.getElementById('admin-fuel-price').value) || 6000;
        config.fuelConsumption = parseFloat(document.getElementById('admin-fuel-consumption').value) || 6.5;
        config.firstPaymentPercent = parseInt(document.getElementById('admin-first-payment-percent').value) || 50;
        config.mvolaNumber = document.getElementById('admin-mvola-number').value.trim() || "0347685594";
        config.roadConditionDefault = parseInt(document.getElementById('admin-road-condition-default').value) || 0;
        
        const unavailableInput = document.getElementById('admin-unavailable-days').value.trim();
        const reservedInput = document.getElementById('admin-reserved-days').value.trim();
        
        config.unavailableDays = unavailableInput ? 
            unavailableInput.split(',').map(d => d.trim()).filter(d => d.length > 0) : [];
        
        config.reservedDays = reservedInput ? 
            reservedInput.split(',').map(d => d.trim()).filter(d => d.length > 0) : [];
        
        // Mettre à jour l'affichage public
        loadAdminValues();
        updateCalculator();
        updateCalendarDisplay();
        
        closeAdminModal();
        
        alert("✅ Configuration enregistrée avec succès!");
    } catch (error) {
        alert("❌ Erreur lors de l'enregistrement: " + error.message);
    }
}

// Fonction pour traiter le premier paiement
function processFirstPayment() {
    if (!isAuthenticated) {
        alert("⚠️ Veuillez vous connecter d'abord.");
        openLoginModal();
        return;
    }
    
    if (currentReservation.totalCost === 0) {
        alert("📍 Veuillez d'abord compléter les détails de votre réservation.");
        return;
    }
    
    if (!currentReservation.zone) {
        alert("📍 Veuillez sélectionner une zone de location.");
        return;
    }
    
    const paymentMessage = 
        `💳 Paiement Mvola - Premier versement (${config.firstPaymentPercent}%)\n\n` +
        `Numéro: ${config.mvolaNumber}\n` +
        `Montant: ${formatNumber(Math.round(currentReservation.firstPayment))} Ar\n` +
        `Référence: MC-${Date.now().toString().slice(-6)}\n` +
        `Pour: ${currentReservation.clientName}\n` +
        `Location: ${currentReservation.zone === 'city' ? 'En Ville' : 
                    currentReservation.zone === 'suburb' ? 'Périphérie' :
                    currentReservation.zone === 'regional' ? 'Régionale' : 'Nationale'}\n` +
        `Durée: ${currentReservation.rentalDays} jour(s)\n\n` +
        `Après paiement, envoyez une capture d'écran au ${config.mvolaNumber} pour confirmer votre réservation.`;
    
    alert(paymentMessage);
}

// Fonction pour générer la facture
function generateInvoice() {
    if (!isAuthenticated) {
        alert("⚠️ Veuillez vous connecter d'abord.");
        openLoginModal();
        return;
    }
    
    if (currentReservation.totalCost === 0) {
        alert("📍 Veuillez d'abord compléter les détails de votre réservation.");
        return;
    }
    
    if (!currentReservation.zone) {
        alert("📍 Veuillez sélectionner une zone de location.");
        return;
    }
    
    // Récupérer les informations de localisation
    currentReservation.startLocation = document.getElementById('start-location').value || 'Non spécifié';
    currentReservation.endLocation = document.getElementById('end-location').value || 'Non spécifié';
    
    // Générer un numéro de facture
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${(invoices.length + 1).toString().padStart(3, '0')}`;
    currentReservation.invoiceNumber = invoiceNumber;
    
    // Date actuelle
    const today = new Date();
    const invoiceDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    // Date d'échéance (7 jours)
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = `${dueDate.getDate().toString().padStart(2, '0')}/${(dueDate.getMonth() + 1).toString().padStart(2, '0')}/${dueDate.getFullYear()}`;
    
    // Mettre à jour l'affichage de la facture
    document.getElementById('invoice-number').textContent = invoiceNumber;
    document.getElementById('invoice-date').textContent = invoiceDate;
    document.getElementById('invoice-client-name').textContent = currentReservation.clientName;
    document.getElementById('invoice-client-phone').textContent = currentReservation.clientPhone;
    document.getElementById('invoice-days').textContent = currentReservation.rentalDays + ' jour(s)';
    document.getElementById('invoice-day-price').textContent = formatNumber(currentReservation.zonePrice) + ' Ar';
    document.getElementById('invoice-location-total').textContent = formatNumber(Math.round(currentReservation.locationCost)) + ' Ar';
    document.getElementById('invoice-fuel-liters').textContent = currentReservation.fuelLiters.toFixed(1) + ' L';
    document.getElementById('invoice-fuel-price').textContent = formatNumber(config.fuelPricePerLiter) + ' Ar';
    document.getElementById('invoice-fuel-total').textContent = formatNumber(Math.round(currentReservation.fuelCost)) + ' Ar';
    document.getElementById('invoice-total-ht').textContent = formatNumber(Math.round(currentReservation.totalCost)) + ' Ar';
    document.getElementById('invoice-total-ttc').textContent = formatNumber(Math.round(currentReservation.totalCost)) + ' Ar';
    document.getElementById('invoice-first-payment').textContent = formatNumber(Math.round(currentReservation.firstPayment)) + ' Ar';
    document.getElementById('invoice-balance').textContent = formatNumber(Math.round(currentReservation.balancePayment)) + ' Ar';
    document.getElementById('invoice-reference').textContent = `MC-${Date.now().toString().slice(-6)}`;
    document.getElementById('invoice-due-date').textContent = dueDateStr;
    
    // Afficher la section de facture
    document.getElementById('invoice-section').style.display = 'block';
    
    // Faire défiler jusqu'à la facture
    setTimeout(() => {
        document.getElementById('invoice-section').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, 300);
}

// Fonction pour télécharger la facture en PDF
function downloadInvoicePDF() {
    const invoiceElement = document.getElementById('invoice-container');
    
    html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Facture-${currentReservation.invoiceNumber}.pdf`);
        
        alert("✅ Facture téléchargée avec succès!");
    }).catch(error => {
        console.error("Erreur lors de la génération du PDF:", error);
        alert("❌ Erreur lors de la génération du PDF. Veuillez réessayer.");
    });
}

// Fonction pour télécharger une facture spécifique
function downloadInvoice(invoiceNumber) {
    // Rechercher la facture
    const reservation = reservations.find(r => r.invoiceNumber === invoiceNumber);
    if (!reservation) {
        alert("Facture non trouvée");
        return;
    }
    
    // Ici, normalement on générerait le PDF à partir des données
    alert(`Téléchargement de la facture ${invoiceNumber}\n\nCette fonctionnalité génère normalement le PDF à partir des données stockées.`);
}

// Fonction pour confirmer la réservation
function confirmReservation() {
    if (!isAuthenticated) {
        alert("⚠️ Veuillez vous connecter d'abord.");
        openLoginModal();
        return;
    }
    
    if (currentReservation.totalCost === 0) {
        alert("📍 Veuillez d'abord compléter les détails de votre réservation.");
        return;
    }
    
    if (!currentReservation.zone) {
        alert("📍 Veuillez sélectionner une zone de location.");
        return;
    }
    
    // Demander la date et l'heure de départ
    const startDate = prompt("Entrez la date de départ (format: JJ/MM/AAAA):");
    if (!startDate) return;
    
    const startTime = prompt("Entrez l'heure de départ (format: HH:MM):");
    if (!startTime) return;
    
    const endTime = prompt("Entrez l'heure d'arrivée estimée (format: HH:MM):");
    if (!endTime) return;
    
    // Ajouter un ID à la réservation
    currentReservation.id = reservations.length + 1;
    currentReservation.startDate = startDate;
    currentReservation.startTime = startTime;
    currentReservation.endTime = endTime;
    currentReservation.status = "accomplished"; // Par défaut, on met "accomplie"
    currentReservation.dateCreated = new Date().toISOString();
    
    // Ajouter la réservation à la liste
    reservations.push({...currentReservation});
    
    // Ajouter la facture à la liste
    invoices.push({
        invoiceNumber: currentReservation.invoiceNumber,
        reservationId: currentReservation.id,
        clientPhone: currentReservation.clientPhone,
        date: new Date().toISOString(),
        amount: currentReservation.totalCost
    });
    
    // Sauvegarder dans le localStorage
    localStorage.setItem('mc_location_reservations', JSON.stringify(reservations));
    localStorage.setItem('mc_location_invoices', JSON.stringify(invoices));
    
    // Mettre à jour les tableaux
    updateReservationsTable();
    updateClientReservations();
    
    alert(`✅ Réservation confirmée avec succès!\n\nNuméro de réservation: ${currentReservation.id}\nNuméro de facture: ${currentReservation.invoiceNumber}\n\nVeuillez effectuer le paiement de ${formatNumber(Math.round(currentReservation.firstPayment))} Ar via Mvola.`);
    
    // Réinitialiser la réservation courante
    currentReservation = {
        id: null,
        userId: currentUser.id,
        clientName: currentUser.name,
        clientPhone: currentUser.phone,
        startLocation: "",
        endLocation: "",
        roundTrip: false,
        estimatedDistance: 0,
        roadCondition: 0,
        zone: "",
        zonePrice: 0,
        rentalDays: 1,
        fuelLiters: 0,
        fuelCost: 0,
        locationCost: 0,
        totalCost: 0,
        firstPayment: 0,
        balancePayment: 0,
        status: "pending",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        invoiceNumber: "",
        invoiceDate: ""
    };
    
    // Réinitialiser le formulaire
    document.getElementById('start-location').value = '';
    document.getElementById('end-location').value = '';
    document.getElementById('estimated-distance').value = '0';
    document.getElementById('round-trip').checked = false;
    document.getElementById('road-condition').value = '0';
    document.getElementById('rental-days').value = '1';
    document.querySelectorAll('.zone-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Masquer la facture
    document.getElementById('invoice-section').style.display = 'none';
    
    // Recalculer
    updateCalculator();
}

// Fonction pour initialiser le calendrier
function initCalendar() {
    updateCalendarDisplay();
}

// Fonction pour mettre à jour l'affichage du calendrier
function updateCalendarDisplay() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentDate = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const monthName = monthNames[currentCalendarMonth];
    const year = currentCalendarYear;
    
    document.getElementById('current-month').textContent = `${monthName} ${year}`;
    
    const firstDayIndex = currentDate.getDay();
    const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
    
    let calendarHTML = '<div class="calendar-days-header">';
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    
    dayNames.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    
    calendarHTML += '</div><div class="calendar-days-grid">';
    
    for (let i = 0; i < firstDayIndex; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${day.toString().padStart(2, '0')}/${(currentCalendarMonth + 1).toString().padStart(2, '0')}`;
        let dayClass = "calendar-day";
        let status = "available";
        
        const isToday = day === currentDay && 
                        currentCalendarMonth === currentMonth && 
                        currentCalendarYear === currentYear;
        
        if (isToday) {
            dayClass += " today";
        }
        
        const isPast = (currentCalendarYear < currentYear) ||
                      (currentCalendarYear === currentYear && currentCalendarMonth < currentMonth) ||
                      (currentCalendarYear === currentYear && currentCalendarMonth === currentMonth && day < currentDay);
        
        if (isPast) {
            dayClass += " past";
            status = "past";
        } else {
            if (config.unavailableDays.includes(dateStr)) {
                dayClass += " unavailable";
                status = "unavailable";
            } else if (config.reservedDays.includes(dateStr)) {
                dayClass += " reserved";
                status = "reserved";
            }
        }
        
        calendarHTML += `<div class="${dayClass}" data-day="${day}" data-status="${status}">${day}</div>`;
    }
    
    calendarHTML += '</div>';
    calendarGrid.innerHTML = calendarHTML;
    
    const style = document.createElement('style');
    style.textContent = `
        .calendar-days-header {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
            margin-bottom: 8px;
        }
        .calendar-day-header {
            text-align: center;
            font-weight: 600;
            color: var(--apple-gray);
            padding: 8px;
            font-size: 14px;
        }
        .calendar-days-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }
        .calendar-day {
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            background-color: var(--apple-light);
            border: 1px solid transparent;
        }
        .calendar-day:hover:not(.empty):not(.past) {
            background-color: var(--apple-accent);
            color: white;
            transform: scale(1.05);
        }
        .calendar-day.empty {
            background-color: transparent;
            cursor: default;
        }
        .calendar-day.today {
            border: 2px solid var(--apple-accent);
            font-weight: 600;
        }
        .calendar-day.past {
            background-color: #f0f0f0;
            color: var(--apple-light-gray);
            cursor: not-allowed;
        }
        .calendar-day.unavailable {
            background-color: var(--danger-color);
            color: white;
            cursor: not-allowed;
        }
        .calendar-day.reserved {
            background-color: var(--warning-color);
            color: white;
            cursor: not-allowed;
        }
    `;
    
    const oldStyle = document.getElementById('calendar-style');
    if (oldStyle) oldStyle.remove();
    
    style.id = 'calendar-style';
    document.head.appendChild(style);
    
    document.querySelectorAll('.calendar-day:not(.empty):not(.past):not(.unavailable):not(.reserved)').forEach(dayElement => {
        dayElement.addEventListener('click', function() {
            const day = this.getAttribute('data-day');
            const month = currentCalendarMonth + 1;
            const dateStr = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
            
            if (isAuthenticated) {
                if (confirm(`Voulez-vous réserver pour le ${day}/${month}/${currentCalendarYear} ?`)) {
                    if (!config.reservedDays.includes(dateStr)) {
                        config.reservedDays.push(dateStr);
                        updateCalendarDisplay();
                        alert(`✅ Réservation confirmée pour le ${day}/${month}/${currentCalendarYear}`);
                    } else {
                        alert("ℹ️ Ce jour est déjà réservé.");
                    }
                }
            } else {
                alert("⚠️ Veuillez vous connecter pour réserver.");
                openLoginModal();
            }
        });
    });
}

// Fonction pour aller au mois précédent
function prevMonth() {
    currentCalendarMonth--;
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    }
    updateCalendarDisplay();
}

// Fonction pour aller au mois suivant
function nextMonth() {
    currentCalendarMonth++;
    if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }
    updateCalendarDisplay();
}

// Fermer les modals avec la touche Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeLoginModal();
        closeAdminModal();
    }
});

// Gestion des clics en dehors des modals pour les fermer
window.addEventListener('click', function(event) {
    const loginModal = document.getElementById('login-modal');
    const adminModal = document.getElementById('admin-modal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    
    if (event.target === adminModal) {
        closeAdminModal();
    }
});

// Initialisation finale
console.log("Application MC LOCATION initialisée avec succès! Code admin: 2204");