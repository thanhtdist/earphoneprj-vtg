// Helpers to notice that the microphone in use has changed.
//
// On iOS, plugging a headset in or unplugging it is handled by the OS. WebKit never lists
// it as a separate microphone (https://bugs.webkit.org/show_bug.cgi?id=174833), so the
// browser keeps reporting one single audio input with the same deviceId, and on the devices
// tested here only its label moves ("iPhone マイク" <-> "ヘッドセット").
//
// The Chime SDK does not report that as a device change, and AWS lists it as a known issue
// ("audioInputsChanged event is not firing when Bluetooth devices are connected or
// disconnected", aws/amazon-chime-sdk-js#1059). Both of its paths stop short:
//  - MediaDeviceProxyHandler, the 1s fallback poll installed when the browser has no
//    `ondevicechange`, only synthesizes the event when a deviceId appears or vanishes;
//  - DefaultDeviceController.handleDeviceChange runs off the `devicechange` event and
//    compares whole MediaDeviceInfo entries, but with a single unchanged entry the lists
//    it diffs come out equal (aws/amazon-chime-sdk-js#445).
// So `audioInputsChanged` stays silent and the capture keeps the route it was opened with.
//
// Note this watcher inherits the same limit: it can only see a route change that the label
// reflects. A device where the label stays "iPhone マイク" would go unnoticed here too.

// Identity of the microphones currently reported, label included on purpose
export const audioInputFingerprint = (devices) =>
    (devices || []).map(device => `${device.deviceId}|${device.label}`).join(',');

// Identifiers of the microphones reported, kept so the next read can tell which entries
// are new — that is what a headset being plugged back in looks like outside iOS
export const audioInputIds = (devices) =>
    new Set((devices || []).map(device => device.deviceId));

// Labels that name a headset or a Bluetooth microphone, in the languages this app runs in.
// "phone" on its own is left out on purpose: it also matches "iPhone マイク"
const HEADSET_LABEL_PATTERN =
    /headset|headphone|earphone|earbud|airpod|bluetooth|ヘッドセット|ヘッドホン|ヘッドフォン|イヤホン|イヤフォン|ブルートゥース/i;

export const isHeadsetAudioInput = (device) => HEADSET_LABEL_PATTERN.test(device?.label || '');

/**
 * Pick the microphone to use for a freshly read device list.
 * A headset that has just appeared wins, so plugging one back in takes over the capture
 * on the platforms that report it as a separate entry (Android, desktop). On iOS the entry
 * keeps its deviceId and only its label moves, so nothing is ever new there and the current
 * selection is kept — the caller restarts the input anyway, which is what reopens the route.
 * The first device is the last resort, for when the selected one has been removed.
 *
 * @param {MediaDeviceInfo[]} devices microphones currently reported
 * @param {string} selectedDeviceId microphone selected right now
 * @param {Set<string>|null} knownDeviceIds identifiers seen at the previous read, null on the first one
 */
export const pickPreferredAudioInput = (devices, selectedDeviceId, knownDeviceIds) => {
    const list = devices || [];
    if (list.length === 0) {
        return '';
    }
    if (knownDeviceIds) {
        const reconnected = list.find(
            device => !knownDeviceIds.has(device.deviceId) && isHeadsetAudioInput(device)
        );
        if (reconnected) {
            return reconnected.deviceId;
        }
    }
    // Fall back to the first device when the selected one has been removed
    const isSelectedAvailable = list.some(device => device.deviceId === selectedDeviceId);
    return isSelectedAvailable ? selectedDeviceId : list[0].deviceId;
};

/**
 * Read the microphones straight from the browser.
 * The SDK is deliberately not used here: listAudioInputDevices(true) calls getUserMedia
 * again whenever a label is empty, and doing that on a timer while the microphone is live
 * would disturb the capture it is meant to watch.
 */
export const listAudioInputs = async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) {
        return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
};
