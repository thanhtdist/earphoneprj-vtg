
export const getBrowserVersionInfo = () => {
    const ua = navigator.userAgent;
    let browserName = "Unknown";
    let fullVersion = "Unknown";
    let majorVersion = "Unknown";

    // Extract browser name and version
    if (/MSIE|Trident/.test(ua)) {
        browserName = "Internet Explorer";
        if (/MSIE (\d+\.\d+)/.test(ua)) {
            fullVersion = RegExp.$1;
        } else if (/Trident.*rv:(\d+\.\d+)/.test(ua)) {
            fullVersion = RegExp.$1;
        }
    } else if (/Edg/.test(ua)) {
        browserName = "Microsoft Edge";
        fullVersion = ua.match(/Edg\/(\d+\.\d+)/)[1];
    } else if (/Chrome/.test(ua) && !/Chromium|OPR|Edg/.test(ua)) {
        browserName = "Chrome";
        fullVersion = ua.match(/Chrome\/(\d+\.\d+)/)[1];
    } else if (/Firefox/.test(ua)) {
        browserName = "Firefox";
        fullVersion = ua.match(/Firefox\/(\d+\.\d+)/)[1];
    } else if (/Safari/.test(ua) && !/Chrome|Chromium/.test(ua)) {
        browserName = "Safari";
        fullVersion = ua.match(/Version\/(\d+\.\d+)/)[1];
    } else if (/OPR/.test(ua)) {
        browserName = "Opera";
        fullVersion = ua.match(/OPR\/(\d+\.\d+)/)[1];
    }

    // Extract major version number
    majorVersion = parseInt(fullVersion, 10);

    return {
        name: browserName,
        version: fullVersion,
        majorVersion: majorVersion,
        userAgent: ua
    };
}