import React, { useState, useRef, KeyboardEvent } from 'react';
import { Modal, Box, Chip, TextField, IconButton, InputAdornment, Paper, Typography, Collapse } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import { Scanner } from '@yudiel/react-qr-scanner';

import { SvgColor } from 'src/components/svg-color';

interface MultiInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const MultiInput: React.FC<MultiInputProps> = ({ values = [], onChange, label = '', placeholder = '', disabled = false }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [qrError, setQrError] = useState(false);

  const handleAddItem = () => {
    if (inputValue.startsWith('ESP32') && inputValue.trim() && !values.includes(inputValue.trim())) {
      onChange([...values, inputValue.trim()]);
      setInputValue('');
    } else {
      setQrError(true);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    onChange(newValues);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddItem();
    } else {
      setQrError(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const items = pasteData
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item);

    if (items.length > 0) {
      const newItems = [...new Set([...values, ...items])];
      onChange(newItems);
      setInputValue('');
    }
  };

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
          variant="outlined"
          label={label}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          inputRef={inputRef}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 1 }}>
                {values.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 0.5 }}>
                    {values.map((value, index) => (
                      <Chip
                        key={`${value}-${index}`}
                        label={value}
                        onDelete={() => handleRemoveItem(index)}
                        deleteIcon={<SvgColor width={30} height={30} src="/assets/icons/iconify/ic--twotone-cancel.svg" sx={{ marginRight: 0.5 }} />}
                        size="medium"
                      />
                    ))}
                  </Box>
                )}
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton edge="end" onClick={handleAddItem} disabled={!inputValue.trim() || disabled} size="medium">
                  <SvgColor width={30} height={30} src="/assets/icons/iconify/add.svg" sx={{ marginRight: 0.5 }} color="#BFD641" />
                </IconButton>
                <IconButton edge="end" onClick={handleOpen}>
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
            mb={2}
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
              onScan={(result) => {
                const value = result[0].rawValue;
                if (value.startsWith('ESP32') && !values.includes(value.trim())) {
                  onChange([...values, value.trim()]);
                } else {
                  setQrError(true);
                  console.warn('Scanned value does not start with ESP32:', value);
                }

                handleClose();
              }}
              onError={(error: unknown) => {
                console.error(error instanceof Error ? error.message : 'Unknown error');
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

export default MultiInput;
