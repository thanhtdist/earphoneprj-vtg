// Tells a reload of the Guide page from the first visit of a device to a tour: sessionStorage survives a
// reload, but a new tab or another device starts empty. A Guide device that joins after another one follows
// its language, and one that reloads gets the language selection back.
//
// Safari throws on sessionStorage in private browsing instead of returning null: without it every visit
// counts as the first one.

const keyOf = (tourId) => `guideJoined.${tourId}`;

/** Remember that this tab has joined the tour as a Guide. */
export const markTourJoined = (tourId) => {
  try {
    window.sessionStorage.setItem(keyOf(tourId), '1');
  } catch (error) {
    console.warn('Could not remember that the tour was joined:', error);
  }
};

/** Whether this tab has already joined the tour as a Guide. */
export const hasJoinedTour = (tourId) => {
  try {
    return window.sessionStorage.getItem(keyOf(tourId)) === '1';
  } catch (error) {
    return false;
  }
};
