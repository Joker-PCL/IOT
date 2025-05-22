import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { EnergyView } from 'src/sections/energy/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`การใช้พลังงาน - ${CONFIG.appName}`}</title>
      </Helmet>
      <EnergyView/>
    </>
  );
}
