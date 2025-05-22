import type { Theme, SxProps } from '@mui/material/styles';

import TextField from '@mui/material/TextField';
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete';

import type { ProductListsProps } from './production';

// ----------------------------------------------------------------------
type PostSearchProps = {
  posts: ProductListsProps[];
  onSearch: (event: React.SyntheticEvent, value: string) => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  product_name: string | '';
  disabled?: boolean;  // Add this line
  error: boolean;
  sx?: SxProps<Theme>;
};

export function ProductSearch({ posts, onSearch, onChange, product_name, disabled, error, sx }: PostSearchProps) {
  return (
    <Autocomplete
      autoHighlight
      fullWidth
      freeSolo
      disabled={disabled}  // Add this line
      onInputChange={onSearch}
      value={product_name ?? ''}  // Add this line
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
      getOptionLabel={(option) => typeof option === 'string' ? option : (option.product_name).toUpperCase()}
      isOptionEqualToValue={(option, value) => option.product_name === value.product_name}
      renderInput={(params) => (
        <TextField
          {...params}
          name="product_name"
          label="ชื่อยา"
          placeholder='Product name...'
          value={product_name ?? ''}
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
