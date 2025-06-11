import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { MachineReportView } from 'src/sections/machine_report/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`รายงานเครื่องจักร - ${CONFIG.appName}`}</title>
      </Helmet>
      <MachineReportView/>
    </>
  );
}
