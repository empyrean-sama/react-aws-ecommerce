import React from 'react';
import { TextField, Box, Paper, List, ListItemButton, ListItemText, CircularProgress, Fade, TextFieldProps, Typography, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { JsonLike } from '../../infrastructure/lambda/Helper';

export interface AutofillTextFieldProps extends TextFieldProps<'standard'> {
    /**
     * This will automatically be called when we want to fetch suggestions, Will ignore all errors and just not show suggestions if any error occurs.
     * @param trimmedInput The input text after trimming whitespace (the trimmedInput will never be an empty string aka "").
     * @returns A promise that resolves to an array of suggestions.
     */
    tryFetchSuggestions: (trimmedInput: string) => Promise<ISuggestion[]>;

    /**
     * The suggestion selected by the user from the dropdown.
     * This is a callback that will be called when a suggestion is selected.
     * @param suggestion The suggestion selected by the user.
     * @returns void.
     */
    onSuggestionSelected?: (suggestion: ISuggestion) => void;

    /**
     * A callback that is called whenever the text input value changes.
     * Works similar to the `onChange` prop of a standard TextField, but only provides the new text value.
     * @param newText: The new text input value. to update state with.
     * @returns nothing, is expected to cause side effects.
     */
    onTextInputChange: (newText: string) => void;

    /**
     * Please use `onTextInputChange` instead of this prop.
     ** The component will handle onChange internally to provide the autofill functionality.
     */
    onChange?: never;
}

export interface ISuggestion {
    labelTitle: string;
    labelDescription: string;
    value: JsonLike;
}

export default function AutofillTextField({tryFetchSuggestions, onSuggestionSelected, onTextInputChange, ...props}: AutofillTextFieldProps) {

    // State variables
    const [suggestions, setSuggestions] = React.useState<ISuggestion[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);

    // Ref's to manage making the request only for the latest input after debounce
    const latestRequestTextRef = React.useRef<string>("");
    const requestJobRef = React.useRef<NodeJS.Timeout | null>(null);

    // Remove any pending timeouts on unmount
    React.useEffect(() => {
        return () => {
            if (requestJobRef.current) {
                // There is a pending request job, clear it
                clearTimeout(requestJobRef.current);
            }
        };
    }, []);

    /**
     * The user has selected a suggestion from the dropdown.
     * @param suggestion The suggestion selected by the user.
     */
    function applySuggestion(suggestion: ISuggestion) {
        // update the text field value and notify parent, finally stop showing new suggestions
        onTextInputChange(suggestion.labelTitle);
        if(onSuggestionSelected) {
            onSuggestionSelected(suggestion);
        }
        setSuggestions([]);
    }

    function handleOnChange(newText: string) {
        // Instantly update the text field value..
        onTextInputChange(newText);

        // Clean the text
        const trimmedText = newText.trim();
        
        if(trimmedText === "") {
            // If the text is empty, clear suggestions & stop processing
            setSuggestions([]);
            if (requestJobRef.current) {
                clearTimeout(requestJobRef.current);
                requestJobRef.current = null;
            }
            return;
        }
        else {
            // If there is a pending request job, clear it
            if (requestJobRef.current) {
                clearTimeout(requestJobRef.current);
                requestJobRef.current = null;
            }

            // Set a new timeout to fetch suggestions after a delay
            requestJobRef.current = setTimeout(async () => {
                setIsLoadingSuggestions(true);
                try {
                    latestRequestTextRef.current = trimmedText;
                    const fetchedSuggestions = await tryFetchSuggestions(latestRequestTextRef.current);
                    if (latestRequestTextRef.current === trimmedText) {
                        // Ensure that the input text hasn't changed since the request was made
                        setSuggestions(fetchedSuggestions);
                    }
                }
                catch (error) {
                    setSuggestions([]);
                }
                finally {
                    setIsLoadingSuggestions(false);
                }
            }, 300);
        }
    }

    function handleOnBlur(e: React.FocusEvent<HTMLInputElement, Element>) {
        // Hide suggestions when the input loses focus and the new focused element is not part of the suggestions list
        const relatedTarget = e.relatedTarget as HTMLElement | null;
        if (!relatedTarget || !relatedTarget.closest(".MuiList-root")) {
            setSuggestions([]);
        }
    }

    return (
        <Box sx={{ position: "relative" }}>
            <TextField
                value={props.value}
                onChange={(e) => handleOnChange(e.target.value)}
                {...props}
                onBlur={handleOnBlur}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        )
                    }
                }}
            />
            <Fade in={isLoadingSuggestions} unmountOnExit>
                <CircularProgress size={16} sx={{ position: "absolute", top: 10, right: 10 }} />
            </Fade>
            {suggestions.length > 0 && (
                <Paper
                    elevation={4}
                    sx={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        mt: 0.5,
                        maxHeight: 240,
                        overflowY: "auto",
                        // Ensure suggestions appear above maps and other overlays
                        zIndex: (theme) => theme.zIndex.modal + 1,
                    }}
                >
                    <List dense disablePadding>
                        {suggestions.map((suggestion, index) => (
                            <ListItemButton key={index} onClick={() => applySuggestion(suggestion)}>
                                <ListItemText primary={suggestion.labelTitle} secondary={suggestion.labelDescription} />
                            </ListItemButton>
                        ))}
                    </List>
                </Paper>
            )}
        </Box>
    );
}