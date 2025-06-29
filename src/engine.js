let challengerForced = false;
export function selectBuilderRole(iteration) {
    if (iteration === 2 && !challengerForced) {
        challengerForced = true;
        return 'builder2';
    }
    const constructiveChallenger = Math.random() < 0.2 ? 'builder2' : null;
    return constructiveChallenger ? 'builder2' : null;
}