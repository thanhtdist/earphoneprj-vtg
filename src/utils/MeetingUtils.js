
import {
    getMeeting
} from '../apis/api';
import JSONCookieUtils from './JSONCookieUtils';

// Function to check if the meeting is available
export const checkAvailableMeeting = async (meetingId, userType) => {
    try {
        const meeting = await getMeeting(meetingId);
        console.log('Meeting found:', meeting);
        return meeting; // Return the meeting object if found
    } catch (error) {
        console.error('Error checking the meeting:', error);

        // Handle "Meeting not found" error specifically
        try {
            const errorResponse = JSON.parse(error);
            if (errorResponse?.error?.includes('not found')) {
                JSONCookieUtils.deleteCookie(userType); // Delete the cookie if the meeting is not found
                // Show alert and close page if the user clicks OK
                // if (window.confirm('Live audio ended. Please join the next live audio session. Click OK to close this page.')) {
                //     window.close();
                // }
                if(userType !== 'Main-Guide') {
                    alert('Live audio ended. Please join the next live audio session. Click OK to close this page');
                    window.close();
                } else {
                    window.location.href = '/';
                }

            }
        } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
        }

        // Return null to indicate failure
        return null;
    }
}; // No dependencies as `getMeeting` and `JSONCookieUtils` are external