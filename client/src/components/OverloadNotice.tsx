import { useHouseCanvas } from "../context/useHouseCanvas";
import styles from "./OverloadNotice.module.css";

function OverloadNotice() {
    const { overload, resetWorld, setIsPlaying, keepGoingAfterOverload } = useHouseCanvas();
    if (!overload) return null;

    const startOver = () => {
        resetWorld();
        setIsPlaying(true);
    };

    return (
        <div className={styles.notice} role="alert">
            <p className={styles.title}>Paused: the world got too big for this device</p>
            <p className={styles.body}>
                {overload.houseCount.toLocaleString()} houses made each tick take too long. Reset to
                start over, or keep going if you don't mind a slower simulation.
            </p>
            <div className={styles.actions}>
                <button type="button" data-variant="primary" onClick={startOver}>
                    Reset world
                </button>
                <button type="button" onClick={keepGoingAfterOverload}>
                    Keep going
                </button>
            </div>
        </div>
    );
}

export default OverloadNotice;
