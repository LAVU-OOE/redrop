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
    static locale = null;          // currently active locale
    static systemLocale = null;    // browser's best match
    static initialLocale = null;   // saved or system locale
    static $htmlRoot = null;

    // Initialize static properties (call this once)
    static init() {
        Localization.$htmlRoot = document.querySelector('html');
        if (!Localization.$htmlRoot) {
            console.warn('Localization: <html> element not found – using fallback');
            Localization.$htmlRoot = document.documentElement;
        }

        // Get browser languages (fallback to ['en'])
        const languages = navigator.languages || [navigator.language || 'en'];
        Localization.systemLocale = Localization.getSupportedOrDefaultLocales(languages);

        let storedLanguageCode = localStorage.getItem('language_code');
        Localization.initialLocale = storedLanguageCode && Localization.localeIsSupported(storedLanguageCode)
            ? storedLanguageCode
            : Localization.systemLocale;

        // Set default locale for translation fallback
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
        // Prevent re-fetch if same locale and we already have translations
        if (locale === Localization.locale && Object.keys(Localization.translations).length > 0) {
            return;
        }
        const success = await Localization.fetchTranslations(locale);
        if (!success) {
            // If fetch fails, try default locale
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
        const attrs = element.getAttribute("data-i18n-attrs").split(" ");

        attrs.forEach(attr => {
            if (attr === "text") {
                element.innerText = Localization.getTranslation(key);
            } else {
                element.setAttribute(attr, Localization.getTranslation(key, attr));
            }
        });
    }

    static getTranslationFromTranslationsObj(translationObj, key, attr) {
        let translation;
        try {
            const keys = key.split(".");
            let obj = translationObj;
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]];
                if (!obj) throw new Error(`Missing translation object for key part: ${keys[i]}`);
            }
            let lastKey = keys[keys.length - 1];
            if (attr) lastKey += "_" + attr;
            translation = obj[lastKey];
        } catch (e) {
            console.error(e);
        }
        if (!translation) {
            throw new Error(`Translation misses entry. Key: ${key} Attribute: ${attr}`);
        }
        return translation;
    }

    static addDataToTranslation(translation, data) {
        for (let j in data) {
            if (!translation.includes(`{{${j}}}`)) {
                throw new Error(`Translation misses data placeholder: ${j}`);
            }
            translation = translation.replace(`{{${j}}}`, data[j]);
        }
        return translation;
    }

    static getTranslation(key, attr = null, data = {}, useDefault = false) {
        let translationObj = useDefault
            ? Localization.translationsDefaultLocale
            : Localization.translations;

        let translation;

        try {
            translation = Localization.getTranslationFromTranslationsObj(translationObj, key, attr);
            translation = Localization.addDataToTranslation(translation, data);
        } catch (e) {
            console.warn(e);
            Localization.logTranslationMissingOrBroken(key, attr, data, useDefault);
            Localization.logHelpCallKey(key, attr);
            Localization.logHelpCall();

            if (useDefault || Localization.currentLocaleIsDefault()) {
                translation = "";
            } else {
                console.log(`Using default language ${Localization.defaultLocale.toUpperCase()} instead.`);
                translation = Localization.getTranslation(key, attr, data, true);
            }
        }

        return Localization.escapeHTML(translation);
    }

    static logTranslationMissingOrBroken(key, attr, data, useDefault) {
        let usedLocale = useDefault
            ? Localization.defaultLocale.toUpperCase()
            : (Localization.locale ? Localization.locale.toUpperCase() : 'UNKNOWN');
        console.warn(`Missing or broken translation for language ${usedLocale}.\n`, 'key:', key, 'attr:', attr, 'data:', data);
    }

    static logHelpCall() {
        console.log("Help translating PairDrop: https://hosted.weblate.org/engage/pairdrop/");
    }

    static logHelpCallKey(key, attr) {
        let locale = Localization.locale ? Localization.locale.toLowerCase() : 'en';
        let keyComplete = !attr || attr === "text" ? key : `${key}_${attr}`;
        console.warn(`Translate this string here: https://hosted.weblate.org/browse/pairdrop/pairdrop-spa/${locale}/?q=${keyComplete}`);
    }

    static escapeHTML(unsafeText) {
        let div = document.createElement('div');
        div.innerText = unsafeText;
        return div.innerHTML;
    }
}

// Auto‑init when script loads
Localization.init();