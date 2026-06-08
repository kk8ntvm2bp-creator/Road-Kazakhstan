import { createContext, useContext, useState } from 'react'

const T = {
  KZ: {
    // Navigation
    dashboard:   'Басқару тақтасы',
    map:         'Интерактивті карта',
    analytics:   'Аналитика',
    reports:     'Есептер',
    upload:      'Жүктеу және талдау',
    logout:      'Шығу',
    regions:     'Аймақтар',

    // Header
    search:          'Жол учаскесін іздеу...',
    searching:       'Іздеу...',
    noResults:       'Нәтиже табылмады',
    allReportsGo:    'Барлық есептерге өту →',
    notifications:   'Ескертулер',
    noNotif:         'Ескертулер жоқ',
    criticalWord:    'критикалық',
    lang:            'Тіл',

    // Dashboard — stat cards
    totalScans:  'Жалпы сканерлеу',
    critAlerts:  'Критикалық ескертулер',
    avgPci:      'Орташа PCI',
    totalDef:    'Анықталған ақаулар',
    allTime:     'барлық уақытта',
    highSevSub:  'High severity',
    roadQualSub: 'жол сапасы',
    allDefSub:   'барлық ақаулар',

    // Dashboard — charts
    pciDistTitle: 'PCI Таралуы',
    byScans:      'сканерлер бойынша',
    recentScans:  'Соңғы сканерлеулер',
    noScans:      'Жол сканерлеулері жоқ',
    uploadFirst:  'Бірінші сканерді жүктеу',
    pciTrendTitle:'PCI Тренд',
    byTime:       'уақыт бойынша өзгерісі',
    defUnit:      'ақау',

    // Dashboard — quick actions
    actionScan:    'Жол сканерлеу',
    actionScanSub: 'Фото жүктеу',
    actionMap:     'Карта',
    actionMapSub:  'Интерактивті карта',
    actionAnal:    'Аналитика',
    actionAnalSub: 'ҚЗ vs Германия',
    actionRep:     'Есептер',
    actionRepSub:  'PDF / CSV жүктеу',

    // Upload — general
    scanTitle:        'Жол сканерлеу',
    locationLabel:    'Орналасуы',
    tabCity:          'Қала',
    tabGps:           'GPS',
    tabSearch:        'Іздеу',
    tabMap:           'Карта',
    notesLabel:       'Ескертпе (міндетті емес)',
    notesPlaceholder: 'Жол учаскесі туралы ескертпе...',
    analyzeBtn:       'Талдауды бастау',
    analyzingBtn:     'Анализ жүргізілуде...',
    analyzingTitle:   'Анализ жүргізілуде',
    analyzingCv:      'Computer Vision · PCI есептеу',
    resultEmpty:      'Нәтиже осында пайда болады',
    uploadToStart:    'Сурет жүктеп, анализ бастаңыз',
    chooseFile:       'Алдымен файл таңдаңыз',

    // Upload — not road
    notRoadTitle: 'Жол суреті емес',
    notRoadHint:  'Асфальт бетінің суретін жүктеңіз — жоғарыдан немесе бүйірінен түсірілген жол фотосы жақсы нәтиже береді',
    otherPhoto:   'Басқа сурет таңдау',

    // Upload — result panel
    anotResult:   'Аннотацияланған нәтиже',
    hideBtn:      'Жасыру',
    showBtn:      'Көрсету',
    pciIndex:     'PCI Индексі',
    defectsCount: 'Ақаулар',
    damageLabel:  'Зақым',
    severityLabel:'Ауырлық',
    viewReport:   'Есепті көру',
    newImage:     'Жаңа сурет',
    defectsFoundTitle: 'Анықталған ақаулар',
    analysisDone: 'Анализ сәтті аяқталды!',
    analysisError:'Анализ қатесі',

    // Upload — GPS
    gpsDetect:       'GPS орнымды анықтау',
    gpsDetected:     'GPS анықталды ✓',
    gpsDetecting:    'GPS анықталуда...',
    gpsLowAccuracy:  '⚠️ Дәлдік төмен — Карта режимін қолданыңыз',
    gpsNoBrowser:    'Браузер геолокацияны қолдамайды',
    gpsNoPermission: 'GPS рұқсаты жоқ',
    gpsNotFound:     'Орын анықталмады',
    gpsTimeout:      'GPS уақыт шегі өтті',
    gpsError:        'GPS қатесі',
    streetFinding:   'Көше атауы анықталуда...',

    // Upload — map picker
    mapPickTitle:  'Картада орын таңдаңыз',
    mapPickHint:   'Нүктені жылжыту үшін картаны басыңыз',
    mapPickBtn:    'Картада орын таңдау',
    mapChangeBtn:  'Картада өзгерту',
    determining:   'Анықталуда...',
    clickToSelect: 'Картаны басып орын таңдаңыз',
    selectBtn:     'Таңдау',
    streetSearchPh:'ул. Абая, Алматы...',

    // Reports
    filterBtn:    'Фильтр',
    searchLocPh:  'Орналасуы бойынша іздеу...',
    allSeverity:  'Барлық ауырлық',
    allPci:       'Барлық PCI',
    clearBtn:     'Тазалау',
    noReportsMsg: 'Есептер жоқ. Жол сканерлеуін жүктеңіз.',
    noSearchRes:  'Іздеу нәтижелері жоқ',
    clearFilters: 'Фильтрлерді тазалау',
    noDefects:    'Ақаулар анықталмады',
    noteLabel:    'Ескертпе',
    areaLabel:    'Аудан',
    confLabel:    'сенімділік',
    deleteConfirm:'Жоюды растайсыз ба?',

    // Analytics
    analyticsTitle:   'Қазақстан және Германия жолдарын салыстыру',
    kzAvgPci:         'ҚЗ Орташа PCI',
    deAvgPci:         'ГЕ Орташа PCI',
    kzRoads:          'ҚЗ Жолдар',
    deRoads:          'ГЕ Жолдар',
    kzLabel:          'Қазақстан',
    deLabel:          'Германия',
    totalLabel:       'Жалпы',
    pciCatCompTitle:  'PCI санаттары бойынша салыстыру (%)',
    defectTypesTitle: 'Ақау түрлері бойынша (%)',
    kzPieTitle:       'Қазақстан жол сапасы үлестірімі',
    statsTableTitle:  'Жалпы статистика',
    indicatorCol:     'Көрсеткіш',
    avgPciRow:        'Орташа PCI',
    totalKmRow:       'Жалпы жолдар (км)',
    critSegRow:       'Критикалық учаскелер',
    budgetRow:        'Жылдық бюджет (млн $)',

    // Defect names
    defPothole:      'Шұңқыр',
    defAlligator:    'Тор жарық',
    defLongitudinal: 'Бойлық жарық',
    defTransverse:   'Көлденең жарық',
    defRutting:      'Із қалу',
    defRaveling:     'Тозу',

    // Map page
    totalPoints: 'Жалпы нүктелер',
    criticalPts: 'Критикалық',
    goodState:   'Жақсы күй',
    mapEmptyMsg: 'Карта нүктелері жоқ',
    pciLevels:   'PCI Деңгейлері',
    scanRoad:    'Жол сканерлеу',

    // Common toasts
    loadError:    'Деректерді жүктеу қатесі',
    deleteError:  'Жою қатесі',
    pdfLoaded:    'PDF жүктелді',
    pdfError:     'PDF жүктеу қатесі',
    csvLoaded:    'CSV жүктелді',
    csvError:     'CSV жүктеу қатесі',
    imgLoadError: 'Сурет жүктелмеді',
    deleted:      'Жойылды',
    exportError:  'Экспорт қатесі',
  },

  RU: {
    // Navigation
    dashboard:   'Панель управления',
    map:         'Интерактивная карта',
    analytics:   'Аналитика',
    reports:     'Отчёты',
    upload:      'Загрузка и анализ',
    logout:      'Выйти',
    regions:     'Регионы',

    // Header
    search:          'Поиск дорожного участка...',
    searching:       'Поиск...',
    noResults:       'Нет результатов',
    allReportsGo:    'Перейти ко всем отчётам →',
    notifications:   'Уведомления',
    noNotif:         'Нет уведомлений',
    criticalWord:    'критических',
    lang:            'Язык',

    // Dashboard — stat cards
    totalScans:  'Всего сканирований',
    critAlerts:  'Критические оповещения',
    avgPci:      'Средний PCI',
    totalDef:    'Выявлено дефектов',
    allTime:     'за всё время',
    highSevSub:  'High severity',
    roadQualSub: 'качество дороги',
    allDefSub:   'все дефекты',

    // Dashboard — charts
    pciDistTitle: 'Распределение PCI',
    byScans:      'по сканерам',
    recentScans:  'Последние сканирования',
    noScans:      'Нет сканирований дорог',
    uploadFirst:  'Загрузить первое сканирование',
    pciTrendTitle:'Тренд PCI',
    byTime:       'изменение во времени',
    defUnit:      'деф.',

    // Dashboard — quick actions
    actionScan:    'Сканировать дорогу',
    actionScanSub: 'Загрузить фото',
    actionMap:     'Карта',
    actionMapSub:  'Интерактивная карта',
    actionAnal:    'Аналитика',
    actionAnalSub: 'KZ vs Германия',
    actionRep:     'Отчёты',
    actionRepSub:  'Скачать PDF / CSV',

    // Upload — general
    scanTitle:        'Сканирование дороги',
    locationLabel:    'Местоположение',
    tabCity:          'Город',
    tabGps:           'GPS',
    tabSearch:        'Поиск',
    tabMap:           'Карта',
    notesLabel:       'Примечание (необязательно)',
    notesPlaceholder: 'Заметка о дорожном участке...',
    analyzeBtn:       'Начать анализ',
    analyzingBtn:     'Выполняется анализ...',
    analyzingTitle:   'Выполняется анализ',
    analyzingCv:      'Computer Vision · Расчёт PCI',
    resultEmpty:      'Результат появится здесь',
    uploadToStart:    'Загрузите фото и начните анализ',
    chooseFile:       'Сначала выберите файл',

    // Upload — not road
    notRoadTitle: 'Это не дорога',
    notRoadHint:  'Загрузите фото асфальтного покрытия — сделанное сверху или сбоку',
    otherPhoto:   'Выбрать другое фото',

    // Upload — result panel
    anotResult:   'Аннотированный результат',
    hideBtn:      'Скрыть',
    showBtn:      'Показать',
    pciIndex:     'Индекс PCI',
    defectsCount: 'Дефекты',
    damageLabel:  'Повреждение',
    severityLabel:'Серьёзность',
    viewReport:   'Смотреть отчёт',
    newImage:     'Новое фото',
    defectsFoundTitle: 'Обнаруженные дефекты',
    analysisDone: 'Анализ успешно завершён!',
    analysisError:'Ошибка анализа',

    // Upload — GPS
    gpsDetect:       'Определить местоположение GPS',
    gpsDetected:     'GPS определён ✓',
    gpsDetecting:    'Определение GPS...',
    gpsLowAccuracy:  '⚠️ Низкая точность — используйте режим Карта',
    gpsNoBrowser:    'Браузер не поддерживает геолокацию',
    gpsNoPermission: 'Нет разрешения GPS',
    gpsNotFound:     'Местоположение не найдено',
    gpsTimeout:      'Превышено время ожидания GPS',
    gpsError:        'Ошибка GPS',
    streetFinding:   'Определение названия улицы...',

    // Upload — map picker
    mapPickTitle:  'Выберите место на карте',
    mapPickHint:   'Нажмите на карту для выбора точки',
    mapPickBtn:    'Выбрать на карте',
    mapChangeBtn:  'Изменить на карте',
    determining:   'Определение...',
    clickToSelect: 'Нажмите на карту для выбора',
    selectBtn:     'Выбрать',
    streetSearchPh:'ул. Абая, Алматы...',

    // Reports
    filterBtn:    'Фильтр',
    searchLocPh:  'Поиск по местоположению...',
    allSeverity:  'Все уровни',
    allPci:       'Все PCI',
    clearBtn:     'Сбросить',
    noReportsMsg: 'Нет отчётов. Загрузите сканирование дороги.',
    noSearchRes:  'Нет результатов поиска',
    clearFilters: 'Сбросить фильтры',
    noDefects:    'Дефекты не обнаружены',
    noteLabel:    'Примечание',
    areaLabel:    'Площадь',
    confLabel:    'уверенность',
    deleteConfirm:'Подтвердить удаление?',

    // Analytics
    analyticsTitle:   'Сравнение дорог Казахстана и Германии',
    kzAvgPci:         'KZ Средний PCI',
    deAvgPci:         'DE Средний PCI',
    kzRoads:          'KZ Дороги',
    deRoads:          'DE Дороги',
    kzLabel:          'Казахстан',
    deLabel:          'Германия',
    totalLabel:       'Всего',
    pciCatCompTitle:  'Сравнение по категориям PCI (%)',
    defectTypesTitle: 'По типам дефектов (%)',
    kzPieTitle:       'Распределение качества дорог Казахстана',
    statsTableTitle:  'Общая статистика',
    indicatorCol:     'Показатель',
    avgPciRow:        'Средний PCI',
    totalKmRow:       'Всего дорог (км)',
    critSegRow:       'Критические участки',
    budgetRow:        'Годовой бюджет (млн $)',

    // Defect names
    defPothole:      'Выбоина',
    defAlligator:    'Сетчатые трещины',
    defLongitudinal: 'Продольная трещина',
    defTransverse:   'Поперечная трещина',
    defRutting:      'Колейность',
    defRaveling:     'Выкрашивание',

    // Map page
    totalPoints: 'Всего точек',
    criticalPts: 'Критических',
    goodState:   'Хорошее состояние',
    mapEmptyMsg: 'Нет точек на карте',
    pciLevels:   'Уровни PCI',
    scanRoad:    'Сканировать дорогу',

    // Common toasts
    loadError:    'Ошибка загрузки данных',
    deleteError:  'Ошибка удаления',
    pdfLoaded:    'PDF скачан',
    pdfError:     'Ошибка скачивания PDF',
    csvLoaded:    'CSV скачан',
    csvError:     'Ошибка скачивания CSV',
    imgLoadError: 'Не удалось загрузить изображение',
    deleted:      'Удалено',
    exportError:  'Ошибка экспорта',
  }
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'KZ')

  function toggle() {
    const next = lang === 'KZ' ? 'RU' : 'KZ'
    setLang(next)
    localStorage.setItem('lang', next)
  }

  const t = (key) => T[lang]?.[key] ?? T.KZ[key] ?? key

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
