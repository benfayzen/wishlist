import { createContext } from "svelte";

type ListViewPreference = "list" | "tile";
type ListViewPreferenceState = { value: ListViewPreference };

// Context to share across components
const [getPreference, setPreference] = createContext<ListViewPreferenceState>();

// Initialize the context with a reactive object storing the preference
export const initListViewPreference = (preference: ListViewPreference) => {
    const preferenceState: ListViewPreferenceState = $state({ value: preference });
    setPreference(preferenceState);
};

// Capture this state during component initialization before using it in event handlers.
export const getListViewPreferenceState = getPreference;

// Get the reactive object from the context and update the value
export const setListViewPreference = (preference: ListViewPreference) => {
    getPreference().value = preference;
};

export const getListViewPreference = () => {
    return getPreference().value;
};
