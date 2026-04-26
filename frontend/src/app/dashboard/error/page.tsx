import { Box, Typography } from '@mui/material';

export default function Error() {
    return (
        <Box width="100%" display="flex" justifyContent="center" alignItems="center" flexDirection="column" gap={4} >
            <Typography variant='h2' color='error' textTransform="uppercase">Something with server went wrong</Typography>
            <img src="/server_error.png" style={{ height: '40vh' }} />
            <Typography variant='h5' color='textSecondary'>Please try again later</Typography>
        </Box>
    );
}
