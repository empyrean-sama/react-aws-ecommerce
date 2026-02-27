declare module '*.scss';
declare module '*.png';

declare const process: {
  env: Record<string, string | undefined>;
};

import { PaperPropsVariantOverrides } from "@mui/material";
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides extends PaperPropsVariantOverrides {
    compact: true;
  }
}