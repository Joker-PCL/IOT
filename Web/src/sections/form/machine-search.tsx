import type { Theme, SxProps } from '@mui/material/styles';

import TextField from '@mui/material/TextField';
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete';

import type { MachineListsProps } from './production';

// ----------------------------------------------------------------------
type PostSearchProps = {
  posts: MachineListsProps[];
  onSearch: (event: React.SyntheticEvent, value: string) => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: string | '';
  disabled?: boolean;
  error: boolean;
  sx?: SxProps<Theme>;
};

export function MachineSearch({ posts, onSearch, onChange, setValue, disabled=false, error, sx }: PostSearchProps) {
  return (
    <Autocomplete
      autoHighlight
      fullWidth
      freeSolo
      onInputChange={onSearch}
      value={setValue ?? ''} // Add this line
      disabled={disabled}
      popupIcon={null}
      slotProps={{
        paper: {
          sx: {
            [`& .${autocompleteClasses.option}`]: {
              typography: 'body2',
            },
            ...sx,
          },
        },
      }}
      options={posts}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.machine_name_en)}
      isOptionEqualToValue={(option, value) => option.machine_name_en === value.machine_name_en}
      renderInput={(params) => (
        <TextField
          {...params}
          name="machine_name_en"
          label="เครื่องจักร"
          placeholder="Machine..."
          value={setValue ?? ''}
          error={error}
          fullWidth
          onChange={onChange}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 3 }}
        />
      )}
    />
  );
}
