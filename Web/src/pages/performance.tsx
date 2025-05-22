import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { MachineView } from 'src/sections/performance/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`รายละเอียดผลิต - ${CONFIG.appName}`}</title>
      </Helmet>
      <MachineView/>
    </>
  );
}
