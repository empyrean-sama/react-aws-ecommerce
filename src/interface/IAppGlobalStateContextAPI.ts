import ESnackbarMsgVariant from "../enum/ESnackbarMsgVariant";

export default interface IAppGlobalStateContextAPI {
    /**
     * Use to show a snackbar message
     * @param msg The message to display in the snackbar
     * @param variant The variant/type of the snackbar message (e.g., success, error) default is 'info'
     * @param autoHideDuration Duration in milliseconds before the snackbar auto-hides. If undefined, the snackbar will persist. default is 3000 ms
     * @returns nothing
     */
    showMessage: (msg: string, variant?: ESnackbarMsgVariant, autoHideDuration?: number | null) => void;
}