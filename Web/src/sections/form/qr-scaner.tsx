// ## ตั้งค่า zxing_reader.wasm
// # ไฟล์ node_modules\barcode-detector\dist\es\ponyfill.js บรรทัดที่ 166
//     const Di = "2.1.0", Ii = "37b847798a1af55d3a289a9516a751fcafae3c23", ci = {
//         locateFile: (i, f) => {
//             const p = i.match(/_(.+?)\.wasm$/);
//             return p ? `https://fastly.jsdelivr.net/npm/zxing-wasm@2.1.0/dist/${p[1]}/${i}` : f + i;
//         }
//     }, Rt = /* @__PURE__ */ new WeakMap();
// # แก้ return p ? `https://fastly.jsdelivr.net/npm/zxing-wasm@2.1.0/dist/${p[1]}/${i}` : f + i;
// # เป็น return p ? `/${p[1]}/${i}` : f + i; หรือ return p ? `/reader/zxing_reader.wasm` : f + i;

import React, { useState, useEffect } from 'react';
import { Modal, Box, TextField, IconButton, InputAdornment, Paper, Typography, Collapse } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import { Scanner } from '@yudiel/react-qr-scanner';

import { SvgColor } from 'src/components/svg-color';

interface QrScanerProps {
  id?: string;
  name: string;
  value: string;
  error?: boolean;
  onChange: (name: string, value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const QrScaner: React.FC<QrScanerProps> = ({ id, name, value, error, onChange, label = '', placeholder = '', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [qrError, setQrError] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    setQrError(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Box sx={{ width: '100%' }}>
        <TextField
          fullWidth
          id={id}
          name={name}
          label={label}
          placeholder={placeholder}
          value={value ?? ''}
          error={error}
          onChange={(event) => {
            onChange(event.target.name, event.target.value);
            setQrError(false);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 3 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  onClick={() => {
                    handleOpen();
                    setQrError(false);
                  }}
                >
                  <SvgColor width={40} height={40} src="/assets/icons/iconify/f7--qrcode-viewfinder.svg" sx={{ marginRight: 0.5 }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Collapse in={qrError} timeout={500} sx={{ width: '100%' }}>
          <Typography
            width="100%"
            color="white"
            mb={3}
            py={1.5}
            borderRadius={1}
            textAlign="center"
            variant="subtitle1"
            component="div"
            bgcolor="#FF5630"
          >
            รูปแบบ QR CODE ไม่ถูกต้อง
          </Typography>
        </Collapse>
      </Box>

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
          <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" mb={2}>
            <Typography variant="h4" color="#155263" fontWeight={900}>
              แสกน QR CODE ที่หน้าจอ
            </Typography>
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
              constraints={{
                facingMode: 'environment',
              }}
              onScan={(result) => {
                const _value = result[0].rawValue;
                if (_value.startsWith('ESP32')) {
                  onChange(name, _value.trim());
                } else {
                  setQrError(true);
                  console.warn('Scanned value does not start with ESP32:', value);
                }

                handleClose();
              }}
              onError={(err: unknown) => {
                console.error(err instanceof Error ? err.message : 'Unknown error');
              }}
            />
          </Paper>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <LoadingButton fullWidth size="large" type="button" color="error" variant="contained" onClick={handleClose}>
              <SvgColor width={30} height={30} src="/assets/icons/iconify/ic--twotone-cancel.svg" sx={{ marginRight: 0.5 }} color="white" />
              ยกเลิก
            </LoadingButton>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default QrScaner;
