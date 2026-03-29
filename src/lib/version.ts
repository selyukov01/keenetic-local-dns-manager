// Версия приложения из package.json
// Импортируем напрямую — Next.js поддерживает JSON импорты
import packageJson from "../../package.json";

export const APP_VERSION = packageJson.version;
