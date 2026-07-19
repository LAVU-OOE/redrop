class Localization {
    // Static properties (set once)
    static defaultLocale = "en";
    static supportedLocales = [
        "ar", "be", "bg", "ca", "cs", "da", "de", "en", "es", "et", "eu", "fa", "fr", "he", "hu", "id", "it", "ja",
        "kn", "ko", "nb", "nl", "nn", "pl", "pt-BR", "ro", "ru", "sk", "ta", "tr", "uk", "zh-CN", "zh-HK", "zh-TW"
    ];
    static supportedLocalesRtl = ["ar", "he"];
    static translations = {};
    static translationsDefaultLocale = {};
    static locale = null;
    static systemLocale = null;
    static initialLocale = null;
    static $htmlRoot = null;

    static init() {
        Localization.$htmlRoot = document.querySelector('html');
        if (!Localization.$htmlRoot) {
            console.warn('Localization: <html> element not found – using fallback');
            Localization.$htmlRoot = document.documentElement;
        }

        const languages = navigator.languages || [navigator.language || 'en'];
        Localization.systemLocale = Localization.getSupportedOrDefaultLocales(languages);

        let storedLanguageCode = localStorage.getItem('language_code');
        Localization.initialLocale = storedLanguageCode && Localization.localeIsSupported(storedLanguageCode)
            ? storedLanguageCode
            : Localization.systemLocale;

        Localization.locale = Localization.initialLocale;
        console.log('Localization initialized. System:', Localization.systemLocale, 'Initial:', Localization.initialLocale);
    }

    static localeIsSupported(locale) {
        return Localization.supportedLocales.indexOf(locale) > -1;
    }

    static localeIsRtl(locale) {
        return Localization.supportedLocalesRtl.indexOf(locale) > -1;
    }

    static currentLocaleIsRtl() {
        return Localization.localeIsRtl(Localization.locale);
    }

    static currentLocaleIsDefault() {
        return Localization.locale === Localization.defaultLocale;
    }

    static getSupportedOrDefaultLocales(locales) {
        let localesGeneric = locales
            .map(locale => locale.split("-")[0])
            .filter(locale => locales.indexOf(locale) === -1);
        return locales.find(Localization.localeIsSupported)
            || localesGeneric.find(Localization.localeIsSupported)
            || Localization.defaultLocale;
    }

    static async setInitialTranslation() {
        await Localization.fetchDefaultTranslations();
        await Localization.setTranslation(Localization.initialLocale);
    }

    static async setTranslation(locale) {
        if (!locale) locale = Localization.systemLocale;
        if (locale === Localization.locale && Object.keys(Localization.translations).length > 0) {
            return;
        }
        const success = await Localization.fetchTranslations(locale);
        if (!success) {
            console.warn('Failed to fetch translations for', locale, '– falling back to', Localization.defaultLocale);
            await Localization.fetchTranslations(Localization.defaultLocale);
            locale = Localization.defaultLocale;
        }
        await Localization.translatePage();

        if (Localization.localeIsRtl(locale)) {
            Localization.$htmlRoot.setAttribute('dir', 'rtl');
        } else {
            Localization.$htmlRoot.removeAttribute('dir');
        }
        Localization.$htmlRoot.setAttribute('lang', locale);
        Localization.locale = locale;

        console.log("Page successfully translated",
            `System language: ${Localization.systemLocale}`,
            `Selected language: ${locale}`
        );

        if (typeof Events !== 'undefined') {
            Events.fire("translation-loaded");
        }
    }

    static async fetchDefaultTranslations() {
        Localization.translationsDefaultLocale = await Localization.fetchTranslationsFor(Localization.defaultLocale);
    }

    static async fetchTranslations(newLocale) {
        if (newLocale === Localization.locale && Object.keys(Localization.translations).length > 0) return true;
        const newTranslations = await Localization.fetchTranslationsFor(newLocale);
        if (!newTranslations) return false;
        Localization.translations = newTranslations;
        return true;
    }

    static getLocale() {
        return Localization.locale;
    }

    static isSystemLocale() {
        return !localStorage.getItem('language_code');
    }

    static async fetchTranslationsFor(newLocale) {
        try {
            const response = await fetch(`lang/${newLocale}.json`, {
                method: 'GET',
                credentials: 'include'
            });
            if (response.status !== 200) return false;
            return await response.json();
        } catch (e) {
            console.warn('Failed to fetch translations for', newLocale, e);
            return false;
        }
    }

    static async translatePage() {
        document
            .querySelectorAll("[data-i18n-key]")
            .forEach(element => Localization.translateElement(element));
    }

    static async translateElement(element) {
        const key = element.getAttribute("data-i18n-key");
        let attrs = element.getAttribute("data-i18n-attrs");
        if (!attrs) attrs = "text";
        const attrsArray = attrs.split(" ");

        attrsArray.forEach(attr => {
            let translationKey = key;
            if (attr !== "text") {
                translationKey = key + "." + attr;  // use dot to access nested object
            }
            const translation = Localization.getTranslation(translationKey);
            if (attr === "text") {
                element.innerText = translation;
            } else {
                element.setAttribute(attr, translation);
            }
        });
    }

    static getTranslationFromTranslationsObj(translationObj, key) {
        let translation;
        try {
            const keys = key.split(".");
            let obj = translationObj;
            for (let i = 0; i < keys.length; i++) {
                obj = obj[keys[i]];
                if (!obj) throw new Error(`Missing translation object for key part: ${keys[i]}`);
            }
            translation = obj;
        } catch (e) {
            console.error(e);
        }
        if (!translation) {
            throw new Error(`Translation misses entry. Key: ${key}`);
        }
        return translation;
    }

    static addDataToTranslation(translation, data) {
        Object.keys(data).forEach(j => {
            if (!translation.includes(`{{${j}}}`)) {
                throw new Error(`Translation misses data placeholder: ${j}`);
            }
            translation = translation.replace(`{{${j}}}`, data[j]);
        });
        return translation;
    }

    static getTranslation(key, data = {}, useDefault = false) {
        let translationObj = useDefault
            ? Localization.translationsDefaultLocale
            : Localization.translations;

        let translation;

        try {
            translation = Localization.getTranslationFromTranslationsObj(translationObj, key);
            translation = Localization.addDataToTranslation(translation, data);
        } catch (e) {
            console.warn(e);
            Localization.logTranslationMissingOrBroken(key, data, useDefault);
            Localization.logHelpCallKey(key);
            Localization.logHelpCall();

            if (useDefault || Localization.currentLocaleIsDefault()) {
                translation = "";
            } else {
                console.log(`Using default language ${Localization.defaultLocale.toUpperCase()} instead.`);
                translation = Localization.getTranslation(key, data, true);
            }
        }

        return Localization.escapeHTML(translation);
    }

    static logTranslationMissingOrBroken(key, data, useDefault) {
        let usedLocale = useDefault
            ? Localization.defaultLocale.toUpperCase()
            : (Localization.locale ? Localization.locale.toUpperCase() : 'UNKNOWN');
        console.warn(`Missing or broken translation for language ${usedLocale}.\n`, 'key:', key, 'data:', data);
    }

    static logHelpCall() {
        console.log("Help translating redrop: https://hosted.weblate.org/engage/redrop/");
    }

    static logHelpCallKey(key) {
        let locale = Localization.locale ? Localization.locale.toLowerCase() : 'en';
        console.warn(`Translate this string here: https://hosted.weblate.org/browse/redrop/redrop-spa/${locale}/?q=${key}`);
    }

    static escapeHTML(unsafeText) {
        let div = document.createElement('div');
        div.innerText = unsafeText;
        return div.innerHTML;
    }
}

Localization.init();