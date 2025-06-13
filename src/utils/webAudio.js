// Step 1: Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Step 2: Play using Web Audio API
export const playAudioFromBase64 = async (base64Audio) => {
    const audioContext = new (window.AudioContext)();
    console.log('🔊 Initializing audio context...base64Audio', base64Audio);
    const arrayBuffer = base64ToArrayBuffer(base64Audio);
    console.log('🔊 Starting audio arrayBuffer...', arrayBuffer);
    try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('🔊 Audio decoded successfully audioBuffer:', audioBuffer);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        console.log('🔊 Audio playback started.');
    } catch (error) {
        console.error('❌ Error decoding audio:', error);
    }
}
