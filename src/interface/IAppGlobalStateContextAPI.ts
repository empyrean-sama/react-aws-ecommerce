import ESnackbarMsgVariant from "../enum/ESnackbarMsgVariant";
import IUserDetails from "./IUserDetails";
import ICollectionRecord from "./product/ICollectionRecord";
import IAppGlobalCartState from "./IAppGlobalCartState";
import ICartEntry from "./product/ICartEntry";
import AuthService from "../service/AuthService";

export default interface IAppGlobalStateContextAPI {
    /**
     * The authentication service instance
     */
    authService: AuthService;

    /**
     * Use to show a snackbar message
     * @param msg The message to display in the snackbar
     * @param variant The variant/type of the snackbar message (e.g., success, error) default is 'info'
     * @param autoHideDuration Duration in milliseconds before the snackbar auto-hides. If undefined, the snackbar will persist. default is 3000 ms
     * @returns nothing
     */
    showMessage: (msg: string, variant?: ESnackbarMsgVariant, autoHideDuration?: number | null) => void;

    /**
     * This method should be called to notify the app of the currently logged in user details
     * @param userDetails The user details to set as logged in details
     * @returns The logged in user details or null if no user is logged in
     */
    setLoggedInDetails: (userDetails: IUserDetails | null) => void;

    /**
     * Refreshes the logged in user details from the server
     */
    refreshLoggedInDetails: () => Promise<void>;

    /**
     * This method gets the currently logged in user details
     * @returns The logged in user details or null if no user is logged in
     */
    getLoggedInDetails: () => IUserDetails | null;

    /**
     * Logs out the current user
     * @returns A promise that resolves when the logout process is complete
     */
    logout: () => Promise<void>;

    /**
     * The list of favourite collections
     */
    favouriteCollections: ICollectionRecord[];

    /**
     * Refreshes the list of favourite collections
     */
    refreshFavouriteCollections: () => Promise<void>;

    /**
     * The user's cart state
     */
    cartState: IAppGlobalCartState;

    /**
     * The total number of items in the cart
     */
    cartItemCount: number;

    /**
     * Refreshes the cart from the backend or local storage
     */
    refreshCart: () => Promise<void>;

    /**
     * Sets the cart (replaces contents)
     */
    setCart: (cart: ICartEntry) => Promise<void>;

    /**
     * Updates the cart (patches entries)
     */
    updateCart: (cartEntry: ICartEntry) => Promise<void>;
}