const metricReport = (meetingSession, logger, userType) => {
    const observer = {
      attendeePresenceReceived: (attendeeId, present) => {
        if (present) {
          logger.info(`${userType} attendeePresenceReceived ${attendeeId} has joined the meeting.`);
        } else {
          logger.info(`${userType} attendeePresenceReceived ${attendeeId} has left the meeting.`);
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

        logger.info(
          `${userType} Sending video bitrate in kilobits per second: ${videoUpstreamBitrate / 1000
          } and sending packets per second: ${videoPacketSentPerSecond}`
        );
        logger.info(`${userType} Available outgoing network bandwidth ${availableOutgoingBitrate}`);
        logger.info(`${userType} Available incoming network bandwidth ${availableIncomingBitrate}`);
        logger.info(
          `${userType} Sending bandwidth is ${availableOutgoingBitrate / 1000}, and receiving bandwidth is ${availableIncomingBitrate / 1000
          }`
        );
        logger.info(`${userType} Audio speaker delay is ${audioSpeakerDelayMs}`);
      },
      connectionDidBecomePoor: () => {
        logger.info(`${userType} Your connection is poor`);
      },
      connectionDidBecomeGood: () => {
        logger.info(`${userType} Your connection is good`);
      },
      connectionDidSuggestStopVideo: () => {
        logger.info(`${userType} Recommend turning off your video`);
      },
      videoSendDidBecomeUnavailable: () => {
        // Chime SDK allows a total of 25 simultaneous videos per meeting.
        // If you try to share more video, this method will be called.
        // See videoAvailabilityDidChange below to find out when it becomes available.
        logger.info(`${userType} You cannot share your video`);
      },
      videoAvailabilityDidChange: videoAvailability => {
        // canStartLocalVideo will also be true if you are already sharing your video.
        if (videoAvailability.canStartLocalVideo) {
          logger.info(`${userType} You can share your video`);
        } else {
          logger.info(`${userType} You cannot share your video`);
        }
      },
    };

    meetingSession.audioVideo.addObserver(observer);
  };

  export default metricReport;