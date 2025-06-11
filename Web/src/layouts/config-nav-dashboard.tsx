import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor width="100%" height="100%" src={`/assets/icons/navbar/${name}.svg`} />
);

export const navData = [
  {
    title: 'Home',
    path: '/',
    icon: icon('ic-home'),
  },
  {
    title: 'รายการผลิต',
    path: '/production',
    icon: icon('ic-cart'),
  },
  {
    title: 'การใช้พลังงาน',
    path: '/energy',
    icon: icon('ic-energy'),
  },
    {
    title: 'รายงานเครื่องจักร',
    path: '/machine-report',
    icon: icon('ic-machine-report'),
  },
  {
    title: 'ออกจากระบบ',
    path: '/login',
    icon: icon('ic-lock'),
  }
];
