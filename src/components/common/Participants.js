import '../../styles/Participants.css';
import { HiUser, HiUserGroup } from "react-icons/hi2";
import { getUserStyle } from '../../utils/getUserStyle';

/**
 * Component to display the number of participants.
 * Row 1 is the total (the original group icon + number); row 2 breaks it
 * down by role (guide/sub-guide/user) when that data is available. Older
 * backends only send the total, so the breakdown row is simply left out.
 * @param {number} count - the total number of participants
 * @param {{guide: number, subGuide: number, user: number}} [breakdown]
 * @returns
 */
export const Participants = ({ count, breakdown }) => {
    const hasBreakdown = breakdown != null
        && [breakdown.guide, breakdown.subGuide, breakdown.user].every((n) => typeof n === 'number');

    return (
        <div className='participantsCount'>
            <div className='participantsTotal' style={{ color: '#6F6f6f' }}>
                <HiUserGroup size={26} />
                <span>{count}</span>
            </div>
            {hasBreakdown && (
                <div className='participantsBreakdown'>
                    <span className='participantsRole' style={{ color: getUserStyle('Guide') }}>
                        <HiUser size={18} />{breakdown.guide}
                    </span>
                    <span className='participantsRole' style={{ color: getUserStyle('Sub-Guide') }}>
                        <HiUser size={18} />{breakdown.subGuide}
                    </span>
                    <span className='participantsRole' style={{ color: getUserStyle('User') }}>
                        <HiUser size={18} />{breakdown.user}
                    </span>
                </div>
            )}
        </div>
    );
};

export default Participants;
