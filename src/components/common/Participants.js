import '../../styles/Participants.css';
import { HiUserGroup } from "react-icons/hi2";
/**
 * Component to display the number of participants
 * @param {string} count - the number of participants
 * @returns 
 */
export const Participants = ({ count }) => {

    return (
        <div className='participantsCount'>
            <HiUserGroup size={35} />
            <p className='countNumber'>{count}</p>
        </div>
    );
};

export default Participants;
