declare module '*.scss';
declare module '*.png';

import { PaperPropsVariantOverrides } from "@mui/material";
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides extends PaperPropsVariantOverrides {
    compact: true;
  }
}