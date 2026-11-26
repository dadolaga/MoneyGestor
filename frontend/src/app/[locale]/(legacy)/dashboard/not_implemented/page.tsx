import { Box, Typography } from '@mui/material';

export default function notImplemented() {
    return (
        <Box display={'flex'} height="100%" flexDirection={'column'} alignItems="center" gap={3} p={1} pt={20}>
            <Typography color="textPrimary" variant="h3">
                This page is not implemented yet.
            </Typography>
            <Typography color="textSecondary" variant="h5">
                We are at work to implement this page as soon as possible.
            </Typography>
        </Box>
    );
}
