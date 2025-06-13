// Desc: Define constant variables
// Voice languages
export const SPEAK_VOICE_LANGUAGES = [
    { key: "ja-JP", label: "日本語" },
]
export const SPEAK_VOICE_LANGUAGES_KEY = "ja-JP"

// Voice languages in enalish(default)
export const LISTEN_VOICE_LANGUAGES = [
    { key: "ja-JP", label: "Japanese" },
    { key: "en-US", label: "English" },
    { key: "cmn-CN", label: "Chinese" },
]

// Voice languages in Japanese
export const JA_LISTEN_VOICE_LANGUAGES = [
    { key: "ja-JP", label: "日本語" },
    { key: "en-US", label: "英語" },
    { key: "cmn-CN", label: "中国" },
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