import IconButton from '@mui/material/IconButton';
import { SvgColor } from 'src/components/svg-color';
import { useEffect } from 'react';

type FullScreenProps = {
  fullScreen: boolean;
  setFullScreen: (value: boolean) => void;
};

export function FullScreen({ fullScreen, setFullScreen }: FullScreenProps) {
  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [setFullScreen]);

  return (
    <IconButton onClick={handleFullScreen}>
      <SvgColor src={fullScreen ? '/assets/icons/iconify/exit-fullscreen.svg' : '/assets/icons/iconify/fullscreen.svg'} />
    </IconButton>
  );
}
