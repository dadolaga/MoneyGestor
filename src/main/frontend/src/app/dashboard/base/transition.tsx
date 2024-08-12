import { Slide } from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import { forwardRef } from "react";

export const TransitionDialog = forwardRef((
    props: TransitionProps & {
        children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>,
) => {
    return <Slide direction="down" ref={ref} {...props} />;
});

TransitionDialog.displayName = "TransitionDialog";