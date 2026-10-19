// Desc: Define constant variables
// Voice languages a guide can speak and a listener can listen in - same set the backend
// currently supports for transcription + translation. The order is the order they are shown in
const VOICE_LANGUAGE_KEYS = ["ja-JP", "en-US", "ko-KR", "th-TH", "cmn-CN", "cmn-TW", "fr-FR", "es-ES"]
export const SPEAK_VOICE_LANGUAGES_KEY = "ja-JP"

// UI languages the application ships translations for
export const SUPPORTED_UI_LANGUAGES = ["en", "ja", "ko", "es", "fr", "th", "zh-CN", "zh-TW"]
export const FALLBACK_UI_LANGUAGE = "en"

// Listening language used when the UI language is not one of the listening languages
export const DEFAULT_LISTEN_VOICE_LANGUAGE_KEY = "ja-JP"

// The UI language can be reported with a region ("ja-JP", "en-GB", "zh-Hans-CN"),
// so only the base tag is used whenever it is compared with a fixed language code
export const getBaseLanguage = (language) =>
    (language || FALLBACK_UI_LANGUAGE).toLowerCase().split(/[-_]/)[0]

// Names of the voice languages, written in each UI language. Keyed by UI language, then by
// voice-language key. Used by both the speaking and the listening selector
const VOICE_LANGUAGE_NAMES = {
    en: { "ja-JP": "Japanese", "en-US": "English", "ko-KR": "Korean", "th-TH": "Thai", "cmn-CN": "Chinese (Simplified)", "cmn-TW": "Chinese (Traditional)", "fr-FR": "French", "es-ES": "Spanish" },
    ja: { "ja-JP": "日本語", "en-US": "英語", "ko-KR": "韓国語", "th-TH": "タイ語", "cmn-CN": "中国語（簡体字）", "cmn-TW": "中国語（繁体字）", "fr-FR": "フランス語", "es-ES": "スペイン語" },
    ko: { "ja-JP": "일본어", "en-US": "영어", "ko-KR": "한국어", "th-TH": "태국어", "cmn-CN": "중국어 (간체)", "cmn-TW": "중국어 (번체)", "fr-FR": "프랑스어", "es-ES": "스페인어" },
    es: { "ja-JP": "Japonés", "en-US": "Inglés", "ko-KR": "Coreano", "th-TH": "Tailandés", "cmn-CN": "Chino (simplificado)", "cmn-TW": "Chino (tradicional)", "fr-FR": "Francés", "es-ES": "Español" },
    fr: { "ja-JP": "Japonais", "en-US": "Anglais", "ko-KR": "Coréen", "th-TH": "Thaï", "cmn-CN": "Chinois (simplifié)", "cmn-TW": "Chinois (traditionnel)", "fr-FR": "Français", "es-ES": "Espagnol" },
    th: { "ja-JP": "ภาษาญี่ปุ่น", "en-US": "ภาษาอังกฤษ", "ko-KR": "ภาษาเกาหลี", "th-TH": "ภาษาไทย", "cmn-CN": "ภาษาจีน (ตัวย่อ)", "cmn-TW": "ภาษาจีน (ตัวเต็ม)", "fr-FR": "ภาษาฝรั่งเศส", "es-ES": "ภาษาสเปน" },
    "zh-CN": { "ja-JP": "日语", "en-US": "英语", "ko-KR": "韩语", "th-TH": "泰语", "cmn-CN": "简体中文", "cmn-TW": "繁体中文", "fr-FR": "法语", "es-ES": "西班牙语" },
    "zh-TW": { "ja-JP": "日語", "en-US": "英語", "ko-KR": "韓語", "th-TH": "泰語", "cmn-CN": "簡體中文", "cmn-TW": "繁體中文", "fr-FR": "法語", "es-ES": "西班牙語" },
}

// Options of the speaking and listening language selectors, labelled in the current UI language
// (English when the UI language has no names above)
export const getVoiceLanguages = (uiLanguage) => {
    const names =
        VOICE_LANGUAGE_NAMES[uiLanguage] ||
        VOICE_LANGUAGE_NAMES[getBaseLanguage(uiLanguage)] ||
        VOICE_LANGUAGE_NAMES[FALLBACK_UI_LANGUAGE]
    return VOICE_LANGUAGE_KEYS.map((key) => ({ key, label: names[key] }))
}

// Listening language preselected for a UI language ("ja-JP" -> "ja-JP", "en-GB" -> "en-US")
export const getDefaultListenVoiceLanguageKey = (uiLanguage) => {
    // Chinese is "cmn-CN" for Amazon Polly but "zh" for the browser
    const base = getBaseLanguage(uiLanguage)
    const voiceBase = base === "zh" ? "cmn" : base
    if (uiLanguage === "zh-TW") {
        return "cmn-TW"
    }
    return (
        VOICE_LANGUAGE_KEYS.find((key) => getBaseLanguage(key) === voiceBase) ||
        DEFAULT_LISTEN_VOICE_LANGUAGE_KEY
    )
}

// Chat message translation (task #13).
// A reader reads chat in the language they picked to listen in (viewers) or in their UI
// language (guide / sub-guide, who have no listening language). A message is translated once,
// on send, into every chat language except the sender's own, and the results are stored in the
// message Metadata so late joiners and readers who switch language get them without re-calling
// Translate.

// Voice-language selector key ("th-TH", "cmn-CN", "ja-JP"...) -> Amazon Translate code
// ("ja-JP"/"en-US" are folded to the bare tag Amazon Translate expects).
export const LANGUAGE_BY_VOICE_KEY = {
    "ja-JP": "ja",
    "en-US": "en",
    "cmn-CN": "zh",
    "cmn-TW": "zh-TW",
    "ko-KR": "ko",
    "es-ES": "es",
    "fr-FR": "fr",
    "th-TH": "th",
}

// Amazon Translate code for a reader given their voice-language key (falls back to the base tag).
// Also the code of the Guide's source language, to compare it with the one of a listener
export const getLanguageCode = (voiceLanguageKey) =>
    LANGUAGE_BY_VOICE_KEY[voiceLanguageKey] || getBaseLanguage(voiceLanguageKey)

// Language the Guide is taken to speak until the server says otherwise, as an Amazon Translate code
export const DEFAULT_GUIDE_LANGUAGE_CODE = getLanguageCode(SPEAK_VOICE_LANGUAGES_KEY)

// Amazon Transcribe code of a voice-language key, among the ones Chime accepts ("zh-TW" and "es-ES" are not:
// both Chinese keys are the same spoken Mandarin)
const TRANSCRIBE_CODE_BY_VOICE_KEY = {
    "cmn-CN": "zh-CN",
    "cmn-TW": "zh-CN",
    "es-ES": "es-US",
}
export const getTranscribeLanguageCode = (voiceLanguageKey) =>
    TRANSCRIBE_CODE_BY_VOICE_KEY[voiceLanguageKey] || voiceLanguageKey

// Every language chat can be read in - the voice languages, as Amazon Translate codes.
// The source language is auto-detected rather than assumed from the sender's chat language (a
// listener can type in a different language than the one they picked to listen in), so sending a
// message costs one Translate call per entry here - the entry matching the detected source is
// dropped from the stored translations afterwards.
export const CHAT_TRANSLATION_LANGUAGES = [
    ...new Set(VOICE_LANGUAGE_KEYS.map((key) => getLanguageCode(key))),
]

//Text To Speech (TTS) engine
export const TTS_ENGINE = [
    { key: "standard", label: "Standard" }, 
    { key: "neural", label: "Neural" },
    { key: "long-form", label: "Long-form" },
    { key: "generative", label: "Generative" },
]

// Stability
export const STABILITY = [
    { key: "low", label: "Low" },
    { key: "medium", label: "Medium" },
    { key: "high", label: "High" },
]

export const EMAIL_FORMAT =/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i