
import {
    getMeeting,
    createMeeting,
    createAppInstanceUsers,
    createChannel,
} from '../apis/api';
//import JSONCookieUtils from './JSONCookieUtils';
import { v4 as uuidv4 } from 'uuid';

// Function to check if the meeting is available
export const checkAvailableMeeting = async (meetingId, userType) => {
    try {
        const meeting = await getMeeting(meetingId);
        console.log('Meeting found:', meeting);
        return meeting; // Return the meeting object if found
    } catch (error) {
        console.error('Error checking the meeting:', error);

        // // Handle "Meeting not found" error specifically
        // try {
        //     const errorResponse = JSON.parse(error);
        //     if (errorResponse?.error?.includes('not found')) {
        //         JSONCookieUtils.deleteCookie(userType); // Delete the cookie if the meeting is not found
        //         // Show alert and close page if the user clicks OK
        //         // if (window.confirm('Live audio ended. Please join the next live audio session. Click OK to close this page.')) {
        //         //     window.close();
        //         // }
        //         if(userType !== 'Main-Guide') {
        //             alert('Live audio ended. Please join the next live audio session. Click OK to close this page');
        //             window.close();
        //         } else {
        //             window.location.href = '/';
        //         }

        //     }
        // } catch (parseError) {
        //     console.error('Failed to parse error response:', parseError);
        // }

        // // Return null to indicate failure
        // return null;
    }
}; // No dependencies as `getMeeting` and `JSONCookieUtils` are external

// Create a new meeting and channel
export  const createMeetingAndChannel = async () => {
        const meeting = await createMeeting();
        const meetingId = meeting.MeetingId;
        console.log('Meeting created:', meeting);
        const userID = uuidv4();
        const userName = 'channelAdmin';
        const userArn = await createAppInstanceUsers(userID, userName);
        console.log('channelAdmin created:', userArn);
        const channelArn = await createChannel(userArn);
        console.log('channelArn created:', userArn);
        const channelId = channelArn.split('/').pop();
        console.log('channelId:', channelId);
        return { meetingId, channelId };
    }