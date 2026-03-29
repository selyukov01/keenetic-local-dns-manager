import type { PartialTranslations } from "./translations";

export const ru: PartialTranslations = {
  // Common
  cancel: "Отмена",
  save: "Сохранить",
  saving: "Сохранение...",
  delete: "Удалить",
  deleting: "Удаление...",
  edit: "Редактировать",
  back: "Назад",
  retry: "Повторить",
  settings: "Настройки",
  error: "Ошибка",
  close: "Закрыть",

  // Header
  demo: "Демо",
  logout: "Выйти",

  // Theme toggle
  toggleTheme: "Переключить тему",
  themeLight: "Светлая",
  themeDark: "Тёмная",
  themeSystem: "Системная",

  // Language
  switchLanguage: "Сменить язык",
  language: "Язык",

  // Connection status
  connectionNotConfigured: "Не настроен",
  connectionConnecting: "Подключение",
  connectionError: "Ошибка",
  connectionConnected: "Подключен",

  // Home page
  setupTitle: "Настройка подключения",
  setupDescription: "Для работы с DNS записями необходимо настроить подключение к интернет-центру Keenetic.",
  goToSettings: "Перейти к настройкам",
  connectionErrorTitle: "Ошибка подключения",
  connectionErrorDescription: "Не удалось подключиться к интернет-центру Keenetic. Проверьте настройки подключения.",
  unknownError: "Неизвестная ошибка",

  // DNS Table
  refresh: "Обновить",
  refreshing: "Обновление данных...",
  exportJson: "Экспорт в JSON",
  importJson: "Импорт из JSON",
  addRecord: "Добавить запись",
  selectedRecords: "Выбрано записей:",
  deleteSelected: "Удалить выбранные",
  deleteSelectedTitle: "Удалить выбранные записи?",
  deleteSelectedDescription: (count: number) => {
    const word = count === 1 ? "запись" : count < 5 ? "записи" : "записей";
    return `Вы уверены, что хотите удалить ${count} ${word}? Это действие нельзя отменить.`;
  },
  filterByDomain: "Фильтр по домену",
  filterByIp: "Фильтр по IP",
  resetFilters: "Сбросить",
  showing: "Показано:",
  of: "из",
  domain: "Домен",
  ipAddress: "IP-адрес",
  actions: "Действия",
  selectAll: "Выбрать все",
  selectRecord: (domain: string) => `Выбрать ${domain}`,
  noRecordsFiltered: "Записи не найдены. Попробуйте изменить фильтры.",
  noRecords: "Нет DNS записей. Добавьте первую запись.",
  totalRecords: "Всего записей",
  deleteAllRecords: "Удалить все записи",
  deleteAllTitle: "Удалить все DNS записи?",
  deleteAllDescription: (count: number) =>
    `Это действие удалит все ${count} DNS записей с вашего интернет-центра. Это действие нельзя отменить!`,
  deleteAllConfirmLabel: "Я понимаю, что все записи будут удалены безвозвратно",
  deleteAll: "Удалить все",
  deleteRecordTitle: "Удалить запись?",
  deleteRecordDescription: (domain: string, address: string) =>
    `Вы уверены, что хотите удалить DNS запись ${domain} → ${address}? Это действие нельзя отменить.`,

  // DNS Table toasts
  dnsRecordUpdated: "DNS запись обновлена",
  dnsRecordDeleted: "DNS запись удалена",
  dnsRecordAdded: "DNS запись добавлена",
  dnsRecordsAdded: (count: number) => `Добавлено ${count} записей`,
  dnsRecordsDeleted: (count: number) => `Удалено ${count} записей`,
  allDnsRecordsDeleted: "Все DNS записи удалены",
  noRecordsToExport: "Нет записей для экспорта",
  exported: (count: number) => `Экспортировано ${count} записей`,
  importingRecords: "Импорт записей...",
  noNewRecordsToImport: "Нет новых записей для импорта",
  noNewRecordsToImportDesc: "Все записи уже существуют или файл пуст",
  imported: (count: number) => `Импортировано ${count} записей`,
  importError: "Ошибка импорта",
  invalidFileFormat: "Неверный формат файла",
  fileMustContainArray: "Файл должен содержать массив записей",
  failedToUpdateRecord: "Не удалось обновить запись",
  failedToDeleteRecord: "Не удалось удалить запись",
  failedToDeleteRecords: "Не удалось удалить записи",
  failedToAddRecord: "Не удалось добавить запись",
  failedToAddRecords: "Не удалось добавить записи",

  // DNS Form Dialog
  addDnsRecords: "Добавить DNS записи",
  editDnsRecord: "Редактировать DNS запись",
  addDnsRecordsDesc: "Добавьте одну или несколько статических DNS записей.",
  editDnsRecordDesc: "Измените домен или IP-адрес записи. Запись будет пересоздана и добавлена в конец таблицы.",
  addAnotherRecord: "Добавить ещё запись",
  add: "Добавить",
  addCount: (count: number) => `Добавить ${count} записей`,
  atLeastOneRecord: "Необходима хотя бы одна запись",

  // Duplicate detection
  duplicatesFound: "Обнаружены совпадения",
  duplicateSingleDesc: "Запись с таким доменом уже существует. Вы уверены, что хотите продолжить?",
  duplicateMultipleDesc: "Некоторые записи с такими доменами уже существуют. Вы уверены, что хотите продолжить?",
  alreadyExistsWithAddress: "уже существует с адресом",
  alreadyExistsWithAddresses: "уже существует с адресами",
  addAnyway: "Всё равно добавить",

  // Login page
  loginTitle: "Вход",
  loginDescription: "Введите учетные данные для входа в Keenetic DNS manager",
  loginLabel: "Логин",
  passwordLabel: "Пароль",
  loginPlaceholder: "Логин",
  loginButton: "Войти",
  loggingIn: "Вход...",
  invalidCredentials: "Неверный логин или пароль",
  authError: "Ошибка авторизации",

  // Settings page
  settingsTitle: "Настройки",
  settingsDescription: "Настройки подключения к интернет-центру Keenetic",
  demoModeTitle: "Демо режим",
  demoModeDescription: "Настройки хранятся только в вашем браузере и не сохраняются на сервере. При закрытии вкладки или очистке данных сайта настройки будут потеряны.",
  envSettingsTitle: "Настройки из окружения",
  envSettingsDescription: (mode: string) =>
    `Режим работы: ${mode === "auth" ? "с авторизацией" : "без авторизации"}. Настройки интернет-центра загружены из переменных окружения сервера.`,
  routerConnectionTitle: "Подключение к интернет-центру",
  routerAddressLabel: "Адрес интернет-центра",
  routerAddressDescription: "IP-адрес или hostname вашего интернет-центра Keenetic",
  loginFieldLabel: "Логин",
  passwordFieldLabel: "Пароль",
  testConnection: "Проверить соединение",
  testing: "Проверка...",
  connected: "Подключено",
  connectionFailed: "Ошибка",
  connectionSuccess: "Подключение успешно!",
  connectionFailedDesc: "Проверьте адрес, логин и пароль",
  connectionErrorDesc: "Ошибка подключения",
  saveDemoSettings: "Сохранить",
  settingsSaved: "Настройки сохранены",
  settingsSavedDesc: "Настройки сохранены в вашем браузере",
  forgetSettings: "Забыть настройки",
  settingsCleared: "Настройки очищены",
  envConfigTitle: "Конфигурация .env.local",
  envConfigDescription: "Для изменения настроек отредактируйте файл .env.local в корне проекта.",
  configExample: "Пример конфигурации",
  restartServerNote: "После изменения файла перезапустите сервер.",

  // Validations
  ipRequired: "IP-адрес обязателен",
  invalidIpFormat: "Неверный формат IPv4 адреса",
  domainRequired: "Домен обязателен",
  domainTooLong: "Домен слишком длинный",
  invalidDomainFormat: "Неверный формат домена",
  hostRequired: "Адрес интернет-центра обязателен",
  invalidHostFormat: "Неверный формат адреса (IP или hostname)",
  loginRequired: "Логин обязателен",
  passwordRequired: "Пароль обязателен",
};
