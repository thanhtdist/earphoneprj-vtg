// Desc: Define constant variables
// Voice languages the guide can speak in, in english(default) - same set the backend
// currently supports for transcription + translation (mirrors LISTEN_VOICE_LANGUAGES below)
export const SPEAK_VOICE_LANGUAGES = [
    { key: "ja-JP", label: "Japanese" },
    { key: "en-US", label: "English" },
    { key: "cmn-CN", label: "Chinese" },
    { key: "ko-KR", label: "Korean" },
    { key: "es-ES", label: "Spanish" },
    { key: "fr-FR", label: "French" },
    { key: "th-TH", label: "Thailand" },
]

// Voice languages the guide can speak in, in Japanese
export const JA_SPEAK_VOICE_LANGUAGES = [
    { key: "ja-JP", label: "日本語" },
    { key: "en-US", label: "英語" },
    { key: "cmn-CN", label: "中国語" },
    { key: "ko-KR", label: "韓国語" },
    { key: "es-ES", label: "スペイン語" },
    { key: "fr-FR", label: "フランス語" },
    { key: "th-TH", label: "タイ語" },
]
export const SPEAK_VOICE_LANGUAGES_KEY = "ja-JP"

// Voice languages in enalish(default)
export const LISTEN_VOICE_LANGUAGES = [
    { key: "ja-JP", label: "Japanese" },
    { key: "en-US", label: "English" },
    { key: "cmn-CN", label: "Chinese" },
    { key: "ko-KR", label: "Korean" },
    { key: "es-ES", label: "Spanish" },
    { key: "fr-FR", label: "French" },
    { key: "th-TH", label: "Thai" },
]

// Voice languages in Japanese
export const JA_LISTEN_VOICE_LANGUAGES = [
    { key: "ja-JP", label: "日本語" },
    { key: "en-US", label: "英語" },
    { key: "cmn-CN", label: "中国語" },
    { key: "ko-KR", label: "韓国語" },
    { key: "es-ES", label: "スペイン語" },
    { key: "fr-FR", label: "フランス語" },
    { key: "th-TH", label: "タイ語" },
]

// UI languages the application ships translations for
export const SUPPORTED_UI_LANGUAGES = ["en", "ja"]
export const FALLBACK_UI_LANGUAGE = "en"

// Listening language used when the UI language is not one of the listening languages
export const DEFAULT_LISTEN_VOICE_LANGUAGE_KEY = "ja-JP"

// The UI language can be reported with a region ("ja-JP", "en-GB", "zh-Hans-CN"),
// so only the base tag is used whenever it is compared with a fixed language code
export const getBaseLanguage = (language) =>
    (language || FALLBACK_UI_LANGUAGE).toLowerCase().split(/[-_]/)[0]

// Options of the listening language selector, labelled in the current UI language
export const getListenVoiceLanguages = (uiLanguage) =>
    getBaseLanguage(uiLanguage) === "ja" ? JA_LISTEN_VOICE_LANGUAGES : LISTEN_VOICE_LANGUAGES

// Options of the guide's speaking-language selector, labelled in the current UI language
export const getSpeakVoiceLanguages = (uiLanguage) =>
    getBaseLanguage(uiLanguage) === "ja" ? JA_SPEAK_VOICE_LANGUAGES : SPEAK_VOICE_LANGUAGES

// Listening language preselected for a UI language ("ja-JP" -> "ja-JP", "en-GB" -> "en-US")
export const getDefaultListenVoiceLanguageKey = (uiLanguage) => {
    // Chinese is "cmn-CN" for Amazon Polly but "zh" for the browser
    const base = getBaseLanguage(uiLanguage)
    const voiceBase = base === "zh" ? "cmn" : base
    return (
        LISTEN_VOICE_LANGUAGES.find((lang) => getBaseLanguage(lang.key) === voiceBase)?.key ||
        DEFAULT_LISTEN_VOICE_LANGUAGE_KEY
    )
}

// Chat message translation (task #13).
// A reader reads chat in the language they picked to listen in (viewers) or in their UI
// language (guide / sub-guide, who have no listening language). A message is translated once,
// on send, into every chat language except the sender's own, and the results are stored in the
// message Metadata so late joiners and readers who switch language get them without re-calling
// Translate.

// Voice-language selector key ("th-TH", "cmn-CN", "ja-JP"...) -> Amazon Translate code.
// Mirrors getNormalizedLanguageCode in MultiLangAudio.js but also folds "ja-JP"/"en-US" to the
// bare tag Amazon Translate expects.
export const CHAT_LANGUAGE_BY_VOICE_KEY = {
    "ja-JP": "ja",
    "en-US": "en",
    "cmn-CN": "zh",
    "ko-KR": "ko",
    "es-ES": "es",
    "fr-FR": "fr",
    "th-TH": "th",
}

// Amazon Translate code for a reader given their voice-language key (falls back to the base tag).
export const getChatLanguageCode = (voiceLanguageKey) =>
    CHAT_LANGUAGE_BY_VOICE_KEY[voiceLanguageKey] || getBaseLanguage(voiceLanguageKey)

// Every language chat can be read in - the listening languages, as Amazon Translate codes.
// The source language is auto-detected rather than assumed from the sender's chat language (a
// listener can type in a different language than the one they picked to listen in), so sending a
// message costs one Translate call per entry here - the entry matching the detected source is
// dropped from the stored translations afterwards.
export const CHAT_TRANSLATION_LANGUAGES = [
    ...new Set(LISTEN_VOICE_LANGUAGES.map((lang) => getChatLanguageCode(lang.key))),
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