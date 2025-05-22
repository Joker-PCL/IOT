import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ProcuctionDetailsView } from 'src/sections/details/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`รายละเอียดผลิต - ${CONFIG.appName}`}</title>
      </Helmet>
      <ProcuctionDetailsView/>
    </>
  );
}
