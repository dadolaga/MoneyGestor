import { Slide } from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import { forwardRef, ReactElement, Ref } from "react";

export const TransitionDialog = forwardRef((
    props: TransitionProps & {
        children: ReactElement<any, any>;
    },
    ref: Ref<unknown>,
) => {
    return <Slide direction="down" ref={ref} {...props} />;
});

TransitionDialog.displayName = "TransitionDialog";