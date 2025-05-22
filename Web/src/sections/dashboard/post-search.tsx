import type { Theme, SxProps } from '@mui/material/styles';

import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete';

import SvgIcon from '@mui/material/SvgIcon';

import type { DashboardProps } from './post-item';

// ----------------------------------------------------------------------

type PostSearchProps = {
  posts: DashboardProps[];
  onSearch: (event: React.SyntheticEvent, value: string) => void;
  sx?: SxProps<Theme>;
};

export function PostSearch({ posts, onSearch, sx }: PostSearchProps) {
  return (
    <Autocomplete
      sx={{ width: 280 }}
      autoHighlight
      freeSolo
      onInputChange={onSearch}
      popupIcon={null}
      slotProps={{
        paper: {
          sx: {
            width: 320,
            [`& .${autocompleteClasses.option}`]: {
              typography: 'body2',
            },
            ...sx,
          },
        },
      }}
      options={posts}
      getOptionLabel={(option) => typeof option === 'string' ? option : option.machine_name_en}
      isOptionEqualToValue={(option, value) => option.machine_name_en === value.machine_name_en}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="ค้นหาเครื่องจักร..."
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SvgIcon>
                  <path
                    fill="currentColor"
                    d="m20.71 19.29l-3.4-3.39A7.92 7.92 0 0 0 19 11a8 8 0 1 0-8 8a7.92 7.92 0 0 0 4.9-1.69l3.39 3.4a1 1 0 0 0 1.42 0a1 1 0 0 0 0-1.42M5 11a6 6 0 1 1 6 6a6 6 0 0 1-6-6"
                  />
                </SvgIcon>
              </InputAdornment>
            ),
          }}
        />
      )}
    />
  );
}
