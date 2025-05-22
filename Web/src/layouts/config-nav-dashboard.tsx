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
  // {
  //   title: 'Dashboard',
  //   path: '/dashboard',
  //   icon: icon('ic-analytics'),
  // },
  {
    title: 'รายการผลิต',
    path: '/production',
    icon: icon('ic-cart'),
  },
  // {
  //   title: 'ข้อมูลการชั่งน้ำหนัก',
  //   path: '/balance',
  //   icon: icon('ic-scale'),
  // },
  // {
  //   title: 'ประสิทธิภาพการผลิต',
  //   path: '/performance',
  //   icon: icon('ic-performance'),
  // },
  {
    title: 'การใช้พลังงาน',
    path: '/energy',
    icon: icon('ic-energy'),
  },
  {
    title: 'ออกจากระบบ',
    path: '/login',
    icon: icon('ic-lock'),
  }
];
