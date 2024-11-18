import React from 'react';
import '../styles/Participants.css';
import { HiUserGroup } from "react-icons/hi2";
/**
 * Component to display the number of participants
 * @param {string} count - the number of participants
 * @returns 
 */
export const Participants = ({ count }) => {

    return (
        <div className='participantsCount'><HiUserGroup size={24} /> {count}</div>
    );
};

export default Participants;
