import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Modal, Box, Typography, Button, IconButton, Paper } from '@mui/material';

// รายชื่อเครื่องจักรในฐานข้อมูล
export type QrcodeScannerModalProps = {
  open: boolean;
  onClose: () => void;
};

export function QrcodeScannerModal() {
  const [open, setOpen] = useState(false);
  const [scanResult, setScanResult] = useState([]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <Button variant="contained" onClick={handleOpen}>
        Open QR Scanner
      </Button>

      <Modal open={open} onClose={handleClose} aria-labelledby="qr-scanner-modal" aria-describedby="scan-qr-codes">
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: '80%', md: '500px' },
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 3,
            borderRadius: 1,
            outline: 'none',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" component="h2">
              QR Code Scanner
            </Typography>
            <IconButton onClick={handleClose}>X</IconButton>
          </Box>

          <Paper
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Scanner
              onScan={(result) => {
                console.log('QR Code scanned:', result);
                // setScanResult(result);
                handleClose(); // ปิด Modal เมื่อสแกนสำเร็จ
              }}
              onError={(error: unknown) => {
                console.error(error instanceof Error ? error.message : 'Unknown error');
              }}
            />
          </Paper>

          {scanResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Scanned Result:</Typography>
              <Typography
                variant="body1"
                sx={{
                  wordBreak: 'break-all',
                  bgcolor: 'action.hover',
                  p: 1,
                  borderRadius: 1,
                }}
              >
                {scanResult}
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={handleClose}>
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
}
