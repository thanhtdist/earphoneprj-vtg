// This function returns a color code based on the user type
export const getUserStyle = (userType) => {
    switch (userType) {
        case 'Guide':
            return '#C60226';
        case 'User':
            return '#16A085';
        case 'Sub-Guide':
            return '#E57A00';
        default:
            return "#C60226"; // Default color for guide
    }
}