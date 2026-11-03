export interface Translations {
  available: string;
  notAvailable: string;
  errorLoadingVehicles: string;
  failedToFetchVehicles: string;
  bookInBrowser: string;
  copyTitle: string;
  sortAlphabetically: string;
  sortByDistance: string;
  filterBy: string;
  // Reservations translations
  authRequired: string;
  authSuccess: string;
  loggedInAs: string;
  reservationsFeature: string;
  graphqlIntegrationReady: string;
  pleaseEnterCredentials: string;
  openPreferences: string;
  error: string;
  checkCredentials: string;
  showDetails: string;
  // Booking form translations
  createBooking: string;
  bookVehicle: string;
  vehicle: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  note: string;
  businessTrip: string;
  optionalNoteBooking: string;
  validationError: string;
  endAfterStart: string;
  startTimeTooLate: string;
  bookingInFuture: string;
  creatingBooking: string;
  bookingVehicle: string;
  bookingCreated: string;
  successfullyBooked: string;
  bookingFailed: string;
  unknownError: string;
  availability: string;
  checkingAvailability: string;
  vehicleAvailable: string;
  vehicleNotAvailable: string;
  invalidTimeRange: string;
  availabilityCheckFailed: string;
  // Reservation detail translations
  reservationDetails: string;
  start: string;
  end: string;
  duration: string;
  status: string;
  fishingPin: string;
  vehicleInformation: string;
  captions: string;
  capabilities: string;
  none: string;
  day: string;
  days: string;
  at: string;
  reservation: string;
  copyAllDetails: string;
  openInBrowser: string;
  copyReservationId: string;
  deleteReservation: string;
  deletingReservation: string;
  reservationDeleted: string;
  errorDeleting: string;
  updateReservation: string;
  updatingReservation: string;
  reservationUpdated: string;
  updateFailed: string;
  editReservation: string;
  saveChanges: string;
  // Vehicle detail translations
  brand: string;
  model: string;
  licensePlate: string;
  condition: string;
  carSharingGroup: string;
  locationContact: string;
  address: string;
  city: string;
  timezone: string;
  homeBase: string;
  currentPosition: string;
  currentAddress: string;
  availabilityStatus: string;
  availableNow: string;
  activeReservations: string;
  technicalDetails: string;
  onBoardUnit: string;
  electricVehicleData: string;
  stateOfCharge: string;
  charging: string;
  pluggedIn: string;
  displayRecommendation: string;
  fuelData: string;
  fuelLevel: string;
  supportZone: string;
  supporters: string;
  zone: string;
  description: string;
  customInformation: string;
  unknown: string;
  yes: string;
  no: string;
  copyLicensePlate: string;
  copyVehicleId: string;
  copyAddress: string;
  // Reservations list translations
  noReservations: string;
  noReservationsSubtitle: string;
  copyReservationDetails: string;
  findVehicles: string;
  timeBasedSearch: string;
  enableTimeFilter: string;
  searchVehicles: string;
  clearFilter: string;
  availableVehicles: string;
  timeRange: string;
  all: string;
  timeBasedSearchDescription: string;
  availableInTimeRange: string;
  newSearch: string;
  noVehiclesInTimeRange: string;
  tryDifferentTimeRange: string;
  openInMaps: string;
  reservedNow: string;
  equipment: string;
  contact: string;
  stateOpened: string;
  stateProtected: string;
  upcoming: string;
  ended: string;
  copyPin: string;
  confirmBooking: string;
  purpose: string;
  purposePersonal: string;
  purposeBusiness: string;
  locationNotFound: string;
  deleteConfirmTitle: string;
  deleteAction: string;
  cancel: string;
  demoLoginHint: string;
  serverUnreachable: string;
  checkSettings: string;
  checkUrl: string;
  checkLogin: string;
  checkLocation: string;
  checkVehicles: string;
  checking: string;
  skipped: string;
  urlOk: string;
  urlDemo: string;
  urlNotZemtu: string;
  loginOk: string;
  loginFailed: string;
  locationNotSet: string;
  locationCoordinates: string;
  locationAddress: string;
  vehiclesFound: string;
  noVehiclesVisible: string;
  allChecksPassed: string;
  checkAgain: string;
  searchInfo: string;
  loadingReservations: string;
  authenticationRequired: string;
  currentReservation: string;
  nextReservation: string;
  upcomingReservations: string;
  until: string;
  ongoing: string;
  inHours: string;
  inMinutes: string;
  refreshReservations: string;
  openZemtu: string;
  actions: string;
  // Date formatting
  on: string;
  from: string;
  to: string;
  oclock: string;
  today: string;
}

export const translations: Record<string, Translations> = {
  en: {
    available: "Available",
    notAvailable: "Not Available",
    errorLoadingVehicles: "Error loading vehicles",
    failedToFetchVehicles: "Failed to fetch vehicles",
    bookInBrowser: "Book in Browser",
    copyTitle: "Copy Title",
    copyVehicleId: "Copy Vehicle ID",
    copyLicensePlate: "Copy License Plate",
    sortAlphabetically: "Sort Alphabetically",
    sortByDistance: "Sort by Distance",
    filterBy: "Filter by",
    // Reservations translations
    authRequired: "Authentication Required",
    authSuccess: "Authentication successful!",
    loggedInAs: "Logged in as",
    reservationsFeature: "Reservations feature",
    graphqlIntegrationReady: "GraphQL integration ready - awaiting reservations schema",
    pleaseEnterCredentials: "Please enter your username and password in preferences",
    openPreferences: "Open Preferences",
    error: "Error",
    checkCredentials: "Check Credentials",
    showDetails: "Show Details",
    // Booking form translations
    createBooking: "Create Booking",
    bookVehicle: "Book Vehicle",
    vehicle: "Vehicle",
    location: "Location",
    startDateTime: "Start Date and Time",
    endDateTime: "End Date and Time",
    note: "Note",
    businessTrip: "Business Trip",
    optionalNoteBooking: "Optional note for booking",
    validationError: "Validation Error",
    endAfterStart: "End date and time must be after start date and time",
    startTimeTooLate: "Start time is too late",
    bookingInFuture: "Booking must be in the future",
    creatingBooking: "Creating Booking",
    bookingVehicle: "Booking Vehicle",
    bookingCreated: "Booking Created",
    successfullyBooked: "Successfully Booked",
    bookingFailed: "Booking Failed",
    unknownError: "Unknown Error",
    availability: "Availability",
    checkingAvailability: "Checking Availability",
    vehicleAvailable: "Vehicle Available",
    vehicleNotAvailable: "Vehicle Not Available",
    invalidTimeRange: "Invalid Time Range",
    availabilityCheckFailed: "Availability Check Failed",
    // Reservation detail translations
    reservationDetails: "Reservation Details",
    start: "Start",
    end: "End",
    duration: "Duration",
    status: "Status",
    fishingPin: "Fishing Pin",
    vehicleInformation: "Vehicle Information",
    captions: "Captions",
    capabilities: "Capabilities",
    none: "None",
    day: "Day",
    days: "Days",
    at: "At",
    reservation: "Reservation",
    copyAllDetails: "Copy All Details",
    openInBrowser: "Open in Browser",
    copyReservationId: "Copy Reservation ID",
    deleteReservation: "Delete Reservation",
    deletingReservation: "Deleting Reservation",
    reservationDeleted: "Reservation Deleted",
    errorDeleting: "Error Deleting",
    updateReservation: "Update Reservation",
    updatingReservation: "Updating Reservation",
    reservationUpdated: "Reservation Updated",
    updateFailed: "Update Failed",
    editReservation: "Edit Reservation",
    saveChanges: "Save Changes",
    // Vehicle detail translations
    brand: "Brand",
    model: "Model",
    licensePlate: "License Plate",
    condition: "Condition",
    carSharingGroup: "Car Sharing Group",
    locationContact: "Location",
    address: "Address",
    city: "City",
    timezone: "Timezone",
    homeBase: "Home Base",
    currentPosition: "Current Position",
    currentAddress: "Current Address",
    availabilityStatus: "Availability Status",
    availableNow: "Available Now",
    activeReservations: "Active Reservations",
    technicalDetails: "Technical Details",
    onBoardUnit: "On Board Unit",
    electricVehicleData: "Electric Vehicle Data",
    stateOfCharge: "State of Charge",
    charging: "Charging",
    pluggedIn: "Plugged In",
    displayRecommendation: "Display Recommendation",
    fuelData: "Fuel Data",
    fuelLevel: "Fuel Level",
    supportZone: "Support Zone",
    supporters: "Supporters",
    zone: "Zone",
    description: "Description",
    customInformation: "Custom Information",
    unknown: "Unknown",
    yes: "Yes",
    no: "No",
    copyAddress: "Copy Address",
    // Reservations list translations
    noReservations: "You have no reservations.",
    noReservationsSubtitle: "Search for a vehicle.",
    copyReservationDetails: "Copy Reservation Details",
    findVehicles: "Find Vehicles",
    timeBasedSearch: "Time-Based Vehicle Search",
    enableTimeFilter: "Enable Time Filter",
    searchVehicles: "Search Vehicles",
    clearFilter: "Show All Vehicles",
    availableVehicles: "Available Vehicles",
    timeRange: "Time Range",
    all: "All Vehicles",
    timeBasedSearchDescription: "Find vehicles available in a specific time range",
    availableInTimeRange: "Available in time range",
    newSearch: "New Search",
    noVehiclesInTimeRange: "No vehicles available in this time range",
    tryDifferentTimeRange: "Try a different time range",
    openInMaps: "Open in Maps",
    reservedNow: "Currently reserved",
    equipment: "Equipment",
    contact: "Contact",
    stateOpened: "Confirmed",
    stateProtected: "Protected",
    upcoming: "Upcoming",
    ended: "Ended",
    copyPin: "Copy PIN",
    confirmBooking: "Book this vehicle?",
    purpose: "Purpose",
    purposePersonal: "Personal",
    purposeBusiness: "Business",
    locationNotFound: "Location not found – check the address in the preferences",
    deleteConfirmTitle: "Delete this reservation?",
    deleteAction: "Delete",
    cancel: "Cancel",
    demoLoginHint:
      "You are connected to the Zemtu demo (demo.zemtu.com). Enter your provider's Zemtu URL in the preferences, e.g. https://yourcompany.zemtu.com.",
    serverUnreachable:
      "Zemtu could not be reached. Check the Zemtu URL in the preferences and your internet connection.",
    checkSettings: "Check Settings",
    checkUrl: "Zemtu URL",
    checkLogin: "Login",
    checkLocation: "Location",
    checkVehicles: "Vehicles",
    checking: "Checking…",
    skipped: "Skipped",
    urlOk: "Reachable",
    urlDemo: "Reachable – this is the Zemtu demo, not your provider",
    urlNotZemtu: "Reachable, but this doesn't look like a Zemtu server",
    loginOk: "Logged in as {user}",
    loginFailed: "Login failed",
    locationNotSet: "Not set (optional) – vehicles are sorted by name",
    locationCoordinates: "Coordinates {value}",
    locationAddress: "Found: {value}",
    vehiclesFound: "{count} vehicles visible",
    noVehiclesVisible: "Login works, but no vehicles are visible for this account",
    allChecksPassed: "Everything is set up correctly",
    checkAgain: "Check Again",
    searchInfo: "Search Information",
    loadingReservations: "Loading reservations...",
    authenticationRequired: "Authentication Required",
    currentReservation: "Current Reservation",
    nextReservation: "Next Reservation",
    upcomingReservations: "Upcoming Reservations",
    until: "until",
    ongoing: "Ongoing",
    inHours: "in",
    inMinutes: "in",
    refreshReservations: "Refresh",
    openZemtu: "Open Zemtu Extension",
    actions: "Actions",
    // Date formatting
    on: "on",
    from: "from",
    to: "to",
    oclock: "o'clock",
    today: "Today",
  },
  de: {
    available: "Verfügbar",
    notAvailable: "Nicht verfügbar",
    errorLoadingVehicles: "Fehler beim Laden der Fahrzeuge",
    failedToFetchVehicles: "Fahrzeuge konnten nicht geladen werden",
    bookInBrowser: "Im Browser buchen",
    copyTitle: "Titel kopieren",
    copyVehicleId: "Fahrzeug-ID kopieren",
    copyLicensePlate: "Kennzeichen kopieren",
    sortAlphabetically: "Alphabetisch sortieren",
    sortByDistance: "Nach Entfernung sortieren",
    filterBy: "Filtern nach",
    // Reservations translations
    authRequired: "Authentifizierung erforderlich",
    authSuccess: "Authentifizierung erfolgreich!",
    loggedInAs: "Angemeldet als",
    reservationsFeature: "Reservierungen Feature",
    graphqlIntegrationReady: "GraphQL Integration bereit - warte auf Reservierungen Schema",
    pleaseEnterCredentials: "Bitte geben Sie Ihren Benutzernamen und Ihr Passwort in den Einstellungen ein",
    openPreferences: "Einstellungen öffnen",
    error: "Fehler",
    checkCredentials: "Anmeldedaten überprüfen",
    showDetails: "Details anzeigen",
    // Booking form translations
    createBooking: "Buchung erstellen",
    bookVehicle: "Fahrzeug buchen",
    vehicle: "Fahrzeug",
    location: "Ort",
    startDateTime: "Startdatum und -uhrzeit",
    endDateTime: "Enddatum und -uhrzeit",
    note: "Notiz",
    businessTrip: "Geschäftsreise",
    optionalNoteBooking: "Optional: Notiz für die Buchung",
    validationError: "Validierungsfehler",
    endAfterStart: "Das Enddatum und die -uhrzeit müssen nach dem Startdatum und der -uhrzeit liegen",
    startTimeTooLate: "Startzeit ist zu spät",
    bookingInFuture: "Die Buchung muss in der Zukunft liegen",
    creatingBooking: "Buchung wird erstellt",
    bookingVehicle: "Fahrzeug wird gebucht",
    bookingCreated: "Buchung erstellt",
    successfullyBooked: "Erfolgreich gebucht",
    bookingFailed: "Buchung fehlgeschlagen",
    unknownError: "Unbekannter Fehler",
    availability: "Verfügbarkeit",
    checkingAvailability: "Verfügbarkeit wird geprüft",
    vehicleAvailable: "Fahrzeug verfügbar",
    vehicleNotAvailable: "Fahrzeug nicht verfügbar",
    invalidTimeRange: "Ungültiger Zeitraum",
    availabilityCheckFailed: "Verfügbarkeitsprüfung fehlgeschlagen",
    // Reservation detail translations
    reservationDetails: "Reservierungs-Details",
    start: "Start",
    end: "Ende",
    duration: "Dauer",
    status: "Status",
    fishingPin: "Fishing Pin",
    vehicleInformation: "Fahrzeug-Informationen",
    captions: "Beschriftungen",
    capabilities: "Fähigkeiten",
    none: "Keine",
    day: "Tag",
    days: "Tage",
    at: "Um",
    reservation: "Reservierung",
    copyAllDetails: "Alle Details kopieren",
    openInBrowser: "In Browser öffnen",
    copyReservationId: "Reservierungs-ID kopieren",
    deleteReservation: "Reservierung löschen",
    deletingReservation: "Reservierung wird gelöscht",
    reservationDeleted: "Reservierung gelöscht",
    errorDeleting: "Fehler beim Löschen",
    updateReservation: "Reservierung aktualisieren",
    updatingReservation: "Reservierung wird aktualisiert",
    reservationUpdated: "Reservierung aktualisiert",
    updateFailed: "Aktualisierung fehlgeschlagen",
    editReservation: "Reservierung bearbeiten",
    saveChanges: "Änderungen speichern",
    // Vehicle detail translations
    brand: "Marke",
    model: "Modell",
    licensePlate: "Kennzeichen",
    condition: "Zustand",
    carSharingGroup: "Car Sharing Gruppe",
    locationContact: "Ort",
    address: "Adresse",
    city: "Stadt",
    timezone: "Zeitzone",
    homeBase: "Heimatbasis",
    currentPosition: "Aktuelle Position",
    currentAddress: "Aktuelle Adresse",
    availabilityStatus: "Verfügbarkeitsstatus",
    availableNow: "Jetzt verfügbar",
    activeReservations: "Aktive Reservierungen",
    technicalDetails: "Technische Details",
    onBoardUnit: "Bordcomputer",
    electricVehicleData: "Elektrofahrzeug-Daten",
    stateOfCharge: "Ladestand",
    charging: "Laden",
    pluggedIn: "Eingesteckt",
    displayRecommendation: "Anzeige-Empfehlung",
    fuelData: "Kraftstoff-Daten",
    fuelLevel: "Kraftstoffstand",
    supportZone: "Support-Zone",
    supporters: "Unterstützer",
    zone: "Zone",
    description: "Beschreibung",
    customInformation: "Benutzerdefinierte Informationen",
    unknown: "Unbekannt",
    yes: "Ja",
    no: "Nein",
    copyAddress: "Adresse kopieren",
    // Reservations list translations
    noReservations: "Du hast keine Reservierungen.",
    noReservationsSubtitle: "Fahrzeug suchen.",
    copyReservationDetails: "Reservierungs-Details kopieren",
    findVehicles: "Fahrzeuge finden",
    timeBasedSearch: "Zeitbasierte Fahrzeugsuche",
    enableTimeFilter: "Zeitfilter aktivieren",
    searchVehicles: "Fahrzeuge suchen",
    clearFilter: "Alle Fahrzeuge anzeigen",
    availableVehicles: "Verfügbare Fahrzeuge",
    timeRange: "Zeitraum",
    all: "Alle Fahrzeuge",
    timeBasedSearchDescription: "Finde Fahrzeuge, die in einem bestimmten Zeitraum verfügbar sind",
    availableInTimeRange: "Im Zeitraum verfügbar",
    newSearch: "Neue Suche",
    noVehiclesInTimeRange: "Keine Fahrzeuge in diesem Zeitraum verfügbar",
    tryDifferentTimeRange: "Versuche einen anderen Zeitraum",
    openInMaps: "In Karten öffnen",
    reservedNow: "Gerade reserviert",
    equipment: "Ausstattung",
    contact: "Kontakt",
    stateOpened: "Bestätigt",
    stateProtected: "Geschützt",
    upcoming: "Bevorstehend",
    ended: "Beendet",
    copyPin: "PIN kopieren",
    confirmBooking: "Dieses Fahrzeug verbindlich reservieren?",
    purpose: "Zweck",
    purposePersonal: "Privat",
    purposeBusiness: "Geschäftlich",
    locationNotFound: "Standort nicht gefunden – bitte Adresse in den Einstellungen prüfen",
    deleteConfirmTitle: "Diese Reservierung löschen?",
    deleteAction: "Löschen",
    cancel: "Abbrechen",
    demoLoginHint:
      "Du bist mit der Zemtu-Demo verbunden (demo.zemtu.com). Trag in den Einstellungen die Zemtu-URL deines Anbieters ein, z. B. https://deinefirma.zemtu.com.",
    serverUnreachable:
      "Zemtu ist nicht erreichbar. Prüfe die Zemtu-URL in den Einstellungen und deine Internetverbindung.",
    checkSettings: "Einstellungen prüfen",
    checkUrl: "Zemtu-URL",
    checkLogin: "Login",
    checkLocation: "Standort",
    checkVehicles: "Fahrzeuge",
    checking: "Wird geprüft …",
    skipped: "Übersprungen",
    urlOk: "Erreichbar",
    urlDemo: "Erreichbar – das ist die Zemtu-Demo, nicht dein Anbieter",
    urlNotZemtu: "Erreichbar, aber das scheint kein Zemtu-Server zu sein",
    loginOk: "Angemeldet als {user}",
    loginFailed: "Login fehlgeschlagen",
    locationNotSet: "Nicht gesetzt (optional) – Fahrzeuge werden nach Name sortiert",
    locationCoordinates: "Koordinaten {value}",
    locationAddress: "Gefunden: {value}",
    vehiclesFound: "{count} Fahrzeuge sichtbar",
    noVehiclesVisible: "Login klappt, aber für dieses Konto sind keine Fahrzeuge sichtbar",
    allChecksPassed: "Alles ist richtig eingerichtet",
    checkAgain: "Erneut prüfen",
    searchInfo: "Suchinformationen",
    loadingReservations: "Reservierungen werden geladen...",
    authenticationRequired: "Authentifizierung erforderlich",
    currentReservation: "Aktuelle Reservierung",
    nextReservation: "Nächste Reservierung",
    upcomingReservations: "Kommende Reservierungen",
    until: "bis",
    ongoing: "Läuft",
    inHours: "in",
    inMinutes: "in",
    refreshReservations: "Aktualisieren",
    openZemtu: "Zemtu Extension öffnen",
    actions: "Aktionen",
    // Date formatting
    on: "am",
    from: "von",
    to: "bis",
    oclock: "Uhr",
    today: "Heute",
  },
};

export function getTranslations(language: string): Translations {
  return translations[language] || translations.en;
}
