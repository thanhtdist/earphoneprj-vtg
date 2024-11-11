const metricReport = (meetingSession) => {
    const observer = {
      attendeePresenceReceived: (attendeeId, present) => {
        if (present) {
          console.log(`attendeePresenceReceived ${attendeeId} has joined the meeting.`);
        } else {
          console.log(`attendeePresenceReceived ${attendeeId} has left the meeting.`);
        }
      },
      metricsDidReceive: clientMetricReport => {
        const metricReport = clientMetricReport.getObservableMetrics();

        const {
          videoPacketSentPerSecond,
          videoUpstreamBitrate,
          availableOutgoingBitrate,
          availableIncomingBitrate,
          audioSpeakerDelayMs,
        } = metricReport;

        console.log(
          `Sending video bitrate in kilobits per second: ${videoUpstreamBitrate / 1000
          } and sending packets per second: ${videoPacketSentPerSecond}`
        );
        console.log(
          `Sending bandwidth is ${availableOutgoingBitrate / 1000}, and receiving bandwidth is ${availableIncomingBitrate / 1000
          }`
        );
        console.log(`Audio speaker delay is ${audioSpeakerDelayMs}`);
      },
      connectionDidBecomePoor: () => {
        console.log('Your connection is poor');
      },
      connectionDidBecomeGood: () => {
        console.log('Your connection is good');
      },
      connectionDidSuggestStopVideo: () => {
        console.log('Recommend turning off your video');
      },
      videoSendDidBecomeUnavailable: () => {
        // Chime SDK allows a total of 25 simultaneous videos per meeting.
        // If you try to share more video, this method will be called.
        // See videoAvailabilityDidChange below to find out when it becomes available.
        console.log('You cannot share your video');
      },
      videoAvailabilityDidChange: videoAvailability => {
        // canStartLocalVideo will also be true if you are already sharing your video.
        if (videoAvailability.canStartLocalVideo) {
          console.log('You can share your video');
        } else {
          console.log('You cannot share your video');
        }
      },
    };

    meetingSession.audioVideo.addObserver(observer);
  };

  export default metricReport;