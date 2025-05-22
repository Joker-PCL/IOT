import { Typography } from '@mui/material';

export function Copyright() {
    return (
        <Typography className='copy-rights' variant="body2" color="text.secondary" align="center" sx={{ mb: '0.5rem' }}>
            {'Copyright © '}
            {new Date().getFullYear()}
            {' Engineering Department All Rights Reserved.'}
        </Typography >
    )
}