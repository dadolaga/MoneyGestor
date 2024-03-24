import { faCircle } from '@fortawesome/free-solid-svg-icons';
import './css/jumpingDots.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function JumpingDots() {

    return (
        <span className="jumping-dots">
            <span className='dot pos-1'>
                <FontAwesomeIcon icon={faCircle} />
            </span>
            <span className='dot pos-2'>
                <FontAwesomeIcon icon={faCircle} />
            </span>
            <span className='dot pos-3'>
                <FontAwesomeIcon icon={faCircle} />
            </span>
        </span>
    )
}