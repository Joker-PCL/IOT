import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import Collapse from '@mui/material/Collapse';

import { useNavigate } from 'react-router-dom';

import Avatar from '@mui/material/Avatar';
import { SvgColor } from 'src/components/svg-color';

import { LoginApi, LogoutApi } from '../../api/api';

// ----------------------------------------------------------------------
export type FormProps = {
  username: string;
  password: string;
};

export function SignInView() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormDataError] = useState({
    username: false,
    password: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const getData = await LogoutApi(); // Wait for the promise to resolve
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  const [form, setForm] = useState<FormProps>({
    username: '',
    password: '',
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));

    setFormDataError({
      ...formError,
      [name]: false,
    });

    setIsError(false);
  };

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const newFormError = {
        username: form.username === '',
        password: form.password === '',
      };

      setFormDataError(newFormError);

      if (form.username && form.password) {
        const fetchData = async () => {
          try {
            const response = await LoginApi(form); // Wait for the promise to resolve
            console.log('Code', response);
            navigate('/', { replace: true });
          } catch (error) {
            console.error('Error fetching data:', error);
            setErrorMessage(error.response.data.message);
            setIsError(true);
          }
        };

        fetchData(); // Call the async function to fetch the data
      }
    },
    [form, navigate]
  );

  const renderForm = (
    <Box
      component="form"
      autoComplete="on" // สำคัญ
      display="flex"
      flexDirection="column"
      alignItems="flex-end"
      onSubmit={handleSubmit} // สำคัญ!
    >
      <TextField
        fullWidth
        name="username"
        label="Username"
        defaultValue={form?.username}
        error={formError?.username}
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <TextField
        fullWidth
        name="password"
        label="Password"
        onChange={handleChange}
        defaultValue={form?.password}
        error={formError?.password}
        InputLabelProps={{ shrink: true }}
        type={showPassword ? 'text' : 'password'}
        sx={{ mb: 3 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                {showPassword ? (
                  <SvgColor width="30px" height="30px" src="/assets/icons/iconify/password-show.svg" />
                ) : (
                  <SvgColor width="30px" height="30px" src="/assets/icons/iconify/password-hide.svg" />
                )}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Collapse in={isError} timeout={500} sx={{ width: '100%' }}>
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
          {errorMessage}
        </Typography>
      </Collapse>

      <LoadingButton
        fullWidth
        size="large"
        type="submit" // สำคัญ!
        color="inherit"
        variant="contained"
      >
        Sign in
      </LoadingButton>
    </Box>
  );

  return (
    <>
      <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" sx={{ mb: 5 }}>
        <Avatar sx={{ width: 150, height: 150, mb: 3, border: '1px solid gray' }} alt="Remy Sharp" src="/polipharm.png" />
        <Typography variant="h5">Sign in</Typography>
        <Typography variant="body2" color="text.secondary">
          Don’t have an account?
          <Link variant="subtitle2" sx={{ ml: 0.5 }}>
            Get started
          </Link>
        </Typography>
      </Box>
      {renderForm}
    </>
  );
}
